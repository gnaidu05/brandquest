import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getGameQuestions, getNonHostPlayers, getLeaderboard, getAnswerTally, submitAnswer, subscribeToGame, type Question, type Player, type AnswerTally, type LeaderboardEntry } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "../components/CountdownTimer";
import AnswerButton from "../components/AnswerButton";
import ScorePopup from "../components/ScorePopup";
import Leaderboard from "../components/Leaderboard";
import { useIsNarrow } from "../lib/useIsNarrow";
import { TimerIcon } from "../components/Icons";

export default function PlayGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tally, setTally] = useState<AnswerTally | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({ correct: false, points: 0, streak: 0 });
  const questionStartTime = useRef(Date.now());
  const playerId = localStorage.getItem(`quizplay_player_${gameId}`);
  const timerSize = useIsNarrow() ? 76 : 100;

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then(setGame);
    getNonHostPlayers(gameId).then(setPlayers);
    getLeaderboard(gameId).then(setLeaderboard);
  }, [gameId]);

  // The server withholds each question's correct answer until the room has
  // been shown it, so what came back during the lobby has correct_index null.
  // Re-read the list when the game reveals one — once per question, not per
  // tick — so the results card has an answer to display.
  const revealKey = game && (game.status === "showingResults" || game.status === "finished")
    ? `${game.status}:${game.current_question_index}`
    : "";
  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    getGameQuestions(gameId)
      .then((qs) => { if (!cancelled) setQuestions(qs); })
      .catch((e) => console.error("Could not load the questions", e));
    return () => { cancelled = true; };
  }, [gameId, revealKey]);

  useEffect(() => {
    if (!gameId) return;
    return subscribeToGame(gameId, (ug) => { setGame(ug); getLeaderboard(gameId).then(setLeaderboard); });
  }, [gameId]);

  // A player needs the answer tally for one line on the results card, and
  // nothing before that. Subscribing to every insert made each client refetch
  // every answer on every answer, so a room of N cost N squared realtime
  // messages and N squared queries per question — the ceiling was about 30
  // players. Fetch once when results appear instead. The host keeps its live
  // subscription; it is the one screen that needs the count as it moves.
  useEffect(() => {
    if (!gameId || !game) return;
    if (game.status !== "showingResults" || game.current_question_index < 0) {
      setTally(null);
      return;
    }
    let cancelled = false;
    getAnswerTally(gameId, game.current_question_index)
      .then((t) => { if (!cancelled) setTally(t); })
      .catch((e) => console.error("Could not load the answer tally", e));
    return () => { cancelled = true; };
  }, [gameId, game?.status, game?.current_question_index]);

  useEffect(() => { setSelectedOption(null); setAnswered(false); setShowPopup(false); questionStartTime.current = Date.now(); }, [game?.current_question_index]);
  useEffect(() => { if (game?.status === "finished") navigate(`/game/${gameId}/results`); }, [game?.status, gameId, navigate]);

  const currentQuestion = questions[game?.current_question_index ?? -1];

  const handleAnswer = useCallback(async (opt: number) => {
    if (answered || !game || !playerId || selectedOption !== null) return;
    setSelectedOption(opt); setAnswered(true);
    const elapsed = (Date.now() - questionStartTime.current) / 1000;
    try {
      const r = await submitAnswer(game.id, playerId, game.current_question_index, opt, elapsed);
      setPopupData({ correct: r.correct, points: r.points, streak: r.streak });
      setShowPopup(true); setTimeout(() => setShowPopup(false), 2500);
      getLeaderboard(gameId!).then(setLeaderboard);
    } catch (e) { console.error(e); }
  }, [answered, game, playerId, selectedOption, gameId]);

  const handleTimeUp = useCallback(() => {
    if (!answered && game) { setAnswered(true); setSelectedOption(-1); setPopupData({ correct: false, points: 0, streak: 0 }); setShowPopup(true); setTimeout(() => setShowPopup(false), 2000); }
  }, [answered, game]);

  if (!game || !currentQuestion) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin" /></div>;
  if (game.status === "finished") return null;

  // Lobby
  if (game.status === "lobby") return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card-glass rounded-3xl p-10 text-center max-w-sm w-full">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lime">
          <TimerIcon size={26} />
        </span>
        <h2 className="text-2xl font-bold mb-2">Waiting to Start</h2>
        <p className="text-sm text-slate-400">The host will begin shortly…</p>
      </div>
    </div>
  );

  // Showing results between questions
  if (game.status === "showingResults" && game.show_leaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <div className="card-glass rounded-3xl p-10">
            <h2 className="text-2xl font-bold text-center mb-6 text-gradient">Question Results</h2>
            <div className="text-center mb-6">
              {currentQuestion.correct_index !== null && (
                <>
                  <p className="mb-2 text-sm text-slate-400">Correct answer:</p>
                  <p className="text-lg font-bold text-lime">{currentQuestion.options[currentQuestion.correct_index]}</p>
                </>
              )}
              {tally && tally.correctCount !== null && (
                <p className="text-xs text-slate-400 mt-2">{tally.correctCount} of {tally.answered} correct</p>
              )}
            </div>
            <Leaderboard entries={leaderboard} compact />
            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (<motion.div key={i} className="w-2 h-2 rounded-full bg-primary-light" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />))}
              </div>
              <p className="mt-2 text-xs text-slate-400">Next question soon...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const myScore = players.find((p) => p.id === playerId)?.score ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-10">
      <ScorePopup show={showPopup} correct={popupData.correct} points={popupData.points} streak={popupData.streak} />

      <div className="mb-3 flex items-center justify-between sm:mb-5">
        <span className="text-xs uppercase tracking-wider text-slate-400">Q{(game.current_question_index ?? 0) + 1}/{questions.length}</span>
        <span className="text-sm font-bold tabular-nums">{myScore} pts</span>
      </div>

      <div className="mb-4 flex justify-center sm:mb-6">
        <CountdownTimer duration={currentQuestion.time_limit} onTimeUp={handleTimeUp} isActive={!answered && game.status === "question"} size={timerSize} startTime={game.question_start_time} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={game.current_question_index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex-1 flex flex-col">
          {currentQuestion.image_url && (
            <img src={currentQuestion.image_url} alt=""
              className="mx-auto mb-4 max-h-28 w-auto max-w-full rounded-xl object-contain sm:mb-5 sm:max-h-56" />
          )}
          <div className="card-glass mb-5 rounded-2xl p-5 sm:mb-6 sm:p-7">
            <h2 className="text-balance text-center text-lg font-bold leading-snug sm:text-2xl">{currentQuestion.text}</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {currentQuestion.options.map((option, i) => (
              <AnswerButton key={`${game.current_question_index}-${i}`} text={option} index={i} onClick={() => handleAnswer(i)} selected={selectedOption === i} disabled={answered} />
            ))}
          </div>

          {answered && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-5">
              <p className="text-sm text-slate-400">{selectedOption === -1 ? "Time's up!" : "Waiting for other players..."}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
