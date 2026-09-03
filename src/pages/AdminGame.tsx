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
    getGame(gameId).then((g) => {
      setGame(g);
      if (g) {
        getQuestions(g.quiz_id).then(setQuestions);
        getNonHostPlayers(g.id).then((ps) => setPlayerCount(ps.length));
      }
    });
    getLeaderboard(gameId).then(setLeaderboard);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    return subscribeToGame(gameId, (g) => {
      setGame(g);
      getLeaderboard(gameId).then(setLeaderboard);
      getNonHostPlayers(gameId).then((ps) => setPlayerCount(ps.length));
    });
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !game || game.current_question_index < 0) return;
    return subscribeToAnswers(gameId, game.current_question_index, setAnswers);
  }, [gameId, game?.current_question_index, game?.status]);

  useEffect(() => {
    if (game?.status === "finished") navigate(`/game/${gameId}/results`);
  }, [game?.status, gameId, navigate]);

  const handleShowResults = async () => { if (game) await showResults(game.id); };
  const handleNextQuestion = async () => { if (game) await nextQuestion(game.id); };

  // Calculate elapsed time for synced timer
  const getElapsedTime = (): number => {
    if (!game?.question_start_time) return 0;
    const start = new Date(game.question_start_time).getTime();
    return (Date.now() - start) / 1000;
  };

  if (!game || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentQuestion = questions[game.current_question_index];
  const isLastQuestion = game.current_question_index >= questions.length - 1;
  const elapsed = getElapsedTime();
  const timeLimit = currentQuestion?.time_limit ?? 20;
  const remaining = Math.max(0, timeLimit - elapsed);

  if (game.status === "lobby") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-glass rounded-3xl p-8 text-center max-w-md w-full">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Lobby</h2>
          <p className="text-white/50 mb-4">Return to the lobby tab to start the game.</p>
        </div>
      </div>
    );
  }

  if (game.status === "showingResults") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
          <div className="card-glass rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-gradient">Question Results</h2>
            {currentQuestion && (
              <div className="text-center mb-6">
                <p className="text-white/50 text-sm mb-2">Correct answer:</p>
                <p className="text-xl font-bold text-kahoot-green">{currentQuestion.options[currentQuestion.correct_index]}</p>
                <p className="text-sm text-white/30 mt-2">{answers.filter((a) => a.correct).length} of {answers.length} answered correctly</p>
              </div>
            )}
            <div className="mb-6"><Leaderboard entries={leaderboard} /></div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={isLastQuestion ? handleShowResults : handleNextQuestion}
              className="w-full px-6 py-4 rounded-2xl kahoot-gradient text-xl font-bold">
              {isLastQuestion ? "See Final Results 🏆" : `Next Question → (${game.current_question_index + 2} of ${questions.length})`}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-white/40">Question {(game.current_question_index ?? 0) + 1} of {questions.length}</div>
        <div className="text-sm text-white/40">
          Answers: <span className="text-white font-bold">{answers.length}</span>
          <span className="text-white/30"> / {playerCount}</span>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <CountdownTimer duration={timeLimit} onTimeUp={() => {}} isActive={game.status === "question"} size={80} startTime={game.question_start_time} />
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        <div className="card-glass rounded-3xl p-6 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-center">{currentQuestion?.text}</h2>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {currentQuestion?.options.map((option, i) => {
            const count = answers.filter((a) => a.selected_option === i).length;
            const isCorrect = i === currentQuestion.correct_index;
            return (
              <div key={i} className={`p-3 rounded-xl flex items-center gap-3 ${isCorrect ? "bg-kahoot-green/20 ring-1 ring-kahoot-green/30" : "bg-white/5"}`}>
                <AnswerButton text="" index={i} variant="icon" disabled />
                <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{option}</div></div>
                <div className="text-xl font-bold tabular-nums">{count}</div>
              </div>
            );
          })}
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleShowResults}
          className="w-full px-6 py-4 rounded-2xl kahoot-gradient text-xl font-bold">Show Results 📊</motion.button>
      </div>
    </div>
  );
}
