import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getQuestions, getLeaderboard, getQuestionAnswers, getNonHostPlayers, showResults, nextQuestion, subscribeToGame, subscribeToAnswers, type Question, type Answer, type LeaderboardEntry } from "../lib/api";
import { motion } from "framer-motion";
import CountdownTimer from "../components/CountdownTimer";
import AnswerButton from "../components/AnswerButton";
import Leaderboard from "../components/Leaderboard";

export default function AdminGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then((g) => { setGame(g); if (g) { getQuestions(g.quiz_id).then(setQuestions); getNonHostPlayers(g.id).then((ps) => setPlayerCount(ps.length)); } });
    getLeaderboard(gameId).then(setLeaderboard);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    return subscribeToGame(gameId, (g) => { setGame(g); getLeaderboard(gameId).then(setLeaderboard); getNonHostPlayers(gameId).then((ps) => setPlayerCount(ps.length)); });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !game || game.current_question_index < 0) return;
    return subscribeToAnswers(gameId, game.current_question_index, setAnswers);
  }, [gameId, game?.current_question_index, game?.status]);

  useEffect(() => { if (game?.status === "finished") navigate(`/game/${gameId}/results`); }, [game?.status, gameId, navigate]);

  if (!game || !questions.length) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const currentQuestion = questions[game.current_question_index];
  const isLastQuestion = game.current_question_index >= questions.length - 1;

  if (game.status === "lobby") return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card-glass rounded-3xl p-10 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold mb-2">Lobby</h2>
        <p className="text-white/40 text-sm">Go back to the lobby tab to start.</p>
      </div>
    </div>
  );

  if (game.status === "showingResults") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
          <div className="card-glass rounded-3xl p-10">
            <h2 className="text-3xl font-black text-center mb-6 text-gradient tracking-tight">Question Results</h2>
            {currentQuestion && (
              <div className="text-center mb-6">
                <p className="text-white/40 text-sm mb-2">Correct answer:</p>
                <p className="text-xl font-bold text-teal-500">{currentQuestion.options[currentQuestion.correct_index]}</p>
                <p className="text-xs text-white/30 mt-2">{answers.filter((a) => a.correct).length} of {answers.length} correct</p>
              </div>
            )}
            <div className="mb-6"><Leaderboard entries={leaderboard} /></div>
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={isLastQuestion ? async () => { if (game) await showResults(game.id); } : async () => { if (game) await nextQuestion(game.id); }}
              className="w-full px-6 py-4 rounded-2xl brand-gradient text-lg font-bold shadow-xl shadow-primary/20">
              {isLastQuestion ? "Final Results 🏆" : `Next Question → (${game.current_question_index + 2}/${questions.length})`}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-10 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <span className="text-xs text-white/30 uppercase tracking-wider">Q{(game.current_question_index ?? 0) + 1}/{questions.length}</span>
        <span className="text-sm text-white/50">
          <span className="text-white font-bold">{answers.length}</span> / {playerCount} answered
        </span>
      </div>

      <div className="flex justify-center mb-5">
        <CountdownTimer duration={currentQuestion?.time_limit ?? 20} onTimeUp={() => {}} isActive={game.status === "question"} size={80} startTime={game.question_start_time} />
      </div>

      <div className="card-glass rounded-2xl p-7 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-center">{currentQuestion?.text}</h2>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {currentQuestion?.options.map((option, i) => {
          const count = answers.filter((a) => a.selected_option === i).length;
          const isCorrect = i === currentQuestion.correct_index;
          return (
            <div key={i} className={`p-4 rounded-xl flex items-center gap-3 ${isCorrect ? "bg-teal-500/15 ring-1 ring-teal-500/25" : "bg-white/[0.03]"}`}>
              <AnswerButton text="" index={i} variant="icon" disabled />
              <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate text-white/70">{option}</div></div>
              <div className="text-xl font-bold tabular-nums text-white/90">{count}</div>
            </div>
          );
        })}
      </div>

      <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }} onClick={async () => { if (game) await showResults(game.id); }}
        className="w-full px-6 py-4 rounded-2xl brand-gradient text-lg font-bold shadow-xl shadow-primary/20">Show Results 📊</motion.button>
    </div>
  );
}
