import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getQuestions, getNonHostPlayers, getLeaderboard, getQuestionAnswers, submitAnswer, subscribeToGame, subscribeToAnswers, type Question, type Player, type Answer, type LeaderboardEntry } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "../components/CountdownTimer";
import AnswerButton from "../components/AnswerButton";
import ScorePopup from "../components/ScorePopup";
import Leaderboard from "../components/Leaderboard";

export default function PlayGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({ correct: false, points: 0, streak: 0 });
  const questionStartTime = useRef(Date.now());
  const playerId = localStorage.getItem(`quizplay_player_${gameId}`);

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then((g) => { setGame(g); if (g) getQuestions(g.quiz_id).then(setQuestions); });
    getNonHostPlayers(gameId).then(setPlayers);
    getLeaderboard(gameId).then(setLeaderboard);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    return subscribeToGame(gameId, (ug) => { setGame(ug); getLeaderboard(gameId).then(setLeaderboard); });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !game || game.current_question_index < 0) return;
    return subscribeToAnswers(gameId, game.current_question_index, setAnswers);
  }, [gameId, game?.current_question_index, game?.status]);

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

  if (!game || !currentQuestion) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (game.status === "finished") return null;

  // Lobby
  if (game.status === "lobby") return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card-glass rounded-3xl p-10 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold mb-2">Waiting to Start</h2>
        <p className="text-white/40 text-sm">The host will begin shortly...</p>
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
              <p className="text-white/40 text-sm mb-2">Correct answer:</p>
              <p className="text-lg font-bold text-teal-500">{currentQuestion.options[currentQuestion.correct_index]}</p>
              <p className="text-xs text-slate-400 mt-2">{answers.filter((a) => a.correct).length} of {answers.length} correct</p>
            </div>
            <Leaderboard entries={leaderboard} compact />
            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (<motion.div key={i} className="w-2 h-2 rounded-full bg-primary-light" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />))}
              </div>
              <p className="text-white/25 text-xs mt-2">Next question soon...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const myScore = players.find((p) => p.id === playerId)?.score ?? 0;

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-3xl mx-auto">
      <ScorePopup show={showPopup} correct={popupData.correct} points={popupData.points} streak={popupData.streak} />

      <div className="flex items-center justify-between mb-5">
        <span className="text-xs uppercase tracking-wider text-slate-400">Q{(game.current_question_index ?? 0) + 1}/{questions.length}</span>
        <span className="text-sm font-bold tabular-nums">{myScore} pts</span>
      </div>

      <div className="flex justify-center mb-6">
        <CountdownTimer duration={currentQuestion.time_limit} onTimeUp={handleTimeUp} isActive={!answered && game.status === "question"} size={100} startTime={game.question_start_time} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={game.current_question_index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="flex-1 flex flex-col">
          <div className="card-glass rounded-2xl p-8 mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-center leading-relaxed">{currentQuestion.text}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((option, i) => (
              <AnswerButton key={`${game.current_question_index}-${i}`} text={option} index={i} onClick={() => handleAnswer(i)} selected={selectedOption === i} disabled={answered} />
            ))}
          </div>

          {answered && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-5">
              <p className="text-white/35 text-sm">{selectedOption === -1 ? "Time's up!" : "Waiting for other players..."}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
