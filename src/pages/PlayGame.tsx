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
    return subscribeToGame(gameId, (updatedGame) => {
      setGame(updatedGame);
      getLeaderboard(gameId).then(setLeaderboard);
    });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !game || game.current_question_index < 0) return;
    return subscribeToAnswers(gameId, game.current_question_index, setAnswers);
  }, [gameId, game?.current_question_index, game?.status]);

  useEffect(() => {
    setSelectedOption(null);
    setAnswered(false);
    setShowPopup(false);
    questionStartTime.current = Date.now();
  }, [game?.current_question_index]);

  useEffect(() => {
    if (game?.status === "finished") navigate(`/game/${gameId}/results`);
  }, [game?.status, gameId, navigate]);

  const currentQuestion = questions[game?.current_question_index ?? -1];

  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (answered || !game || !playerId || selectedOption !== null) return;
    setSelectedOption(optionIndex);
    setAnswered(true);
    const timeElapsed = (Date.now() - questionStartTime.current) / 1000;
    try {
      const result = await submitAnswer(game.id, playerId, game.current_question_index, optionIndex, timeElapsed);
      setPopupData({ correct: result.correct, points: result.points, streak: result.streak });
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2500);
      getLeaderboard(gameId!).then(setLeaderboard);
    } catch (e) { console.error("Failed to submit answer:", e); }
  }, [answered, game, playerId, selectedOption, gameId]);

  const handleTimeUp = useCallback(() => {
    if (!answered && game) {
      setAnswered(true);
      setSelectedOption(-1);
      setPopupData({ correct: false, points: 0, streak: 0 });
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);
    }
  }, [answered, game]);

  if (!game || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (game.status === "finished") return null;

  if (game.status === "showingResults" && game.show_leaderboard) {
    const correctCount = answers.filter((a) => a.correct).length;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-lg">
          <div className="card-glass rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gradient">Question Results</h2>
            {currentQuestion && (
              <div className="text-center mb-6">
                <p className="text-white/50 text-sm mb-2">Correct answer:</p>
                <p className="text-lg font-bold text-kahoot-green">{currentQuestion.options[currentQuestion.correct_index]}</p>
                <p className="text-sm text-white/30 mt-2">{correctCount} of {answers.length} answered correctly</p>
              </div>
            )}
            <Leaderboard entries={leaderboard} compact />
            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-2.5 h-2.5 rounded-full bg-primary-light"
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
                ))}
              </div>
              <p className="text-white/30 text-sm mt-2">Waiting for next question...</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (game.status === "lobby") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-glass rounded-3xl p-8 text-center max-w-md w-full">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Waiting to Start</h2>
          <p className="text-white/50">The host will start the game shortly...</p>
        </div>
      </div>
    );
  }

  const myScore = players.find((p) => p.id === playerId)?.score ?? 0;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      <ScorePopup show={showPopup} correct={popupData.correct} points={popupData.points} streak={popupData.streak} />
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/40">Question {(game.current_question_index ?? 0) + 1} of {questions.length}</div>
        <div className="text-sm text-white/40">Score: <span className="text-white font-bold tabular-nums">{myScore}</span></div>
      </div>
      <div className="flex justify-center mb-6">
        <CountdownTimer duration={currentQuestion.time_limit} onTimeUp={handleTimeUp}
          isActive={!answered && game.status === "question"} size={100} startTime={game.question_start_time} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={game.current_question_index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full">
          <div className="card-glass rounded-3xl p-8 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center leading-relaxed">{currentQuestion.text}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {currentQuestion.options.map((option, i) => (
              <AnswerButton key={`${game.current_question_index}-${i}`} text={option} index={i}
                onClick={() => handleAnswer(i)} selected={selectedOption === i} disabled={answered} />
            ))}
          </div>
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-6">
              <p className="text-white/50">{selectedOption === -1 ? "Time's up!" : "Answer submitted! Waiting for other players..."}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
