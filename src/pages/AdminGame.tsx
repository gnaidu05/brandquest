import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion } from "framer-motion";
import CountdownTimer from "../components/CountdownTimer";
import AnswerButton from "../components/AnswerButton";
import Leaderboard from "../components/Leaderboard";

export default function AdminGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const game = useQuery(api.games.get, gameId ? { id: gameId as any } : "skip");
  const questions = useQuery(
    api.quizzes.getQuestions,
    game ? { quizId: game.quizId } : "skip"
  );
  const leaderboard = useQuery(
    api.games.getLeaderboard,
    gameId ? { gameId: gameId as any } : "skip"
  );
  const questionAnswers = useQuery(
    api.games.getQuestionAnswers,
    game && game.currentQuestionIndex >= 0
      ? { gameId: gameId as any, questionIndex: game.currentQuestionIndex }
      : "skip"
  );

  const showResults = useMutation(api.games.showResults);
  const nextQuestion = useMutation(api.games.nextQuestion);

  const currentQuestion = questions?.[game?.currentQuestionIndex ?? -1];

  useEffect(() => {
    if (game?.status === "finished") {
      navigate(`/game/${gameId}/results`);
    }
  }, [game?.status, gameId, navigate]);

  const handleNextQuestion = async () => {
    if (!game) return;
    try {
      await showResults({ gameId: game._id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdvanceFromResults = async () => {
    if (!game) return;
    try {
      await nextQuestion({ gameId: game._id });
    } catch (e) {
      console.error(e);
    }
  };

  if (!game || !questions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Lobby
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

  // Results between questions
  if (game.status === "showingResults") {
    const isLastQuestion = game.currentQuestionIndex >= questions.length - 1;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <div className="card-glass rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-center mb-6 text-gradient">
              Question Results
            </h2>

            {currentQuestion && (
              <div className="text-center mb-6">
                <p className="text-white/50 text-sm mb-2">Correct answer:</p>
                <p className="text-xl font-bold text-kahoot-green">
                  {currentQuestion.options[currentQuestion.correctIndex]}
                </p>
                <p className="text-sm text-white/30 mt-2">
                  {questionAnswers?.filter((a) => a.correct).length ?? 0} of{" "}
                  {questionAnswers?.length ?? 0} answered correctly
                </p>
              </div>
            )}

            <div className="mb-6">
              <Leaderboard entries={leaderboard ?? []} />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={isLastQuestion ? handleNextQuestion : handleAdvanceFromResults}
              className="w-full px-6 py-4 rounded-2xl kahoot-gradient text-xl font-bold"
            >
              {isLastQuestion
                ? "See Final Results 🏆"
                : `Next Question → (${game.currentQuestionIndex + 2} of ${questions.length})`}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Active question
  const answeredCount = questionAnswers?.length ?? 0;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-white/40">
          Question {(game.currentQuestionIndex ?? 0) + 1} of {questions.length}
        </div>
        <div className="text-sm text-white/40">
          Answers: <span className="text-white font-bold">{answeredCount}</span>
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center mb-4">
        <CountdownTimer
          duration={currentQuestion?.timeLimit ?? 20}
          onTimeUp={() => {}}
          isActive={false}
          size={80}
        />
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Question */}
        <div className="card-glass rounded-3xl p-6 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-center">
            {currentQuestion?.text}
          </h2>
        </div>

        {/* Answer options - compact view */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {currentQuestion?.options.map((option, i) => {
            const count = questionAnswers?.filter((a) => a.selectedOption === i).length ?? 0;
            const isCorrect = i === currentQuestion.correctIndex;
            return (
              <div
                key={i}
                className={`p-3 rounded-xl flex items-center gap-3 ${
                  isCorrect ? "bg-kahoot-green/20 ring-1 ring-kahoot-green/30" : "bg-white/5"
                }`}
              >
                <AnswerButton text="" index={i} variant="icon" disabled />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{option}</div>
                </div>
                <div className="text-xl font-bold tabular-nums">
                  {count}
                </div>
              </div>
            );
          })}
        </div>

        {/* Show Results Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNextQuestion}
          className="w-full px-6 py-4 rounded-2xl kahoot-gradient text-xl font-bold"
        >
          Show Results 📊
        </motion.button>
      </div>
    </div>
  );
}
