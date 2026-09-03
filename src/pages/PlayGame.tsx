import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "../components/CountdownTimer";
import AnswerButton from "../components/AnswerButton";
import ScorePopup from "../components/ScorePopup";
import Leaderboard from "../components/Leaderboard";

export default function PlayGame() {
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
      ? {
          gameId: gameId as any,
          questionIndex: game.currentQuestionIndex,
        }
      : "skip"
  );
  const players = useQuery(
    api.games.getPlayers,
    gameId ? { gameId: gameId as any } : "skip"
  );

  const submitAnswer = useMutation(api.players.submitAnswer);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({
    correct: false,
    points: 0,
    streak: 0,
  });
  const [startTime] = useState(Date.now());
  const questionStartTime = useRef(Date.now());

  const playerId = localStorage.getItem(`quizplay_player_${gameId}`);

  // Get the current question
  const currentQuestion = questions?.[game?.currentQuestionIndex ?? -1];
  const isHost = false; // Players don't need host controls

  // Check if player already answered this question
  const playerAnswer = questionAnswers?.find(
    (a) => a.playerId === playerId
  );

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setAnswered(false);
    setShowPopup(false);
    questionStartTime.current = Date.now();
  }, [game?.currentQuestionIndex]);

  // Check if game finished
  useEffect(() => {
    if (game?.status === "finished") {
      navigate(`/game/${gameId}/results`);
    }
  }, [game?.status, gameId, navigate]);

  const handleAnswer = useCallback(
    async (optionIndex: number) => {
      if (answered || !game || !playerId || selectedOption !== null) return;

      setSelectedOption(optionIndex);
      setAnswered(true);

      const timeElapsed = (Date.now() - questionStartTime.current) / 1000;

      try {
        const result = await submitAnswer({
          gameId: game._id,
          playerId: playerId as any,
          questionIndex: game.currentQuestionIndex,
          selectedOption: optionIndex,
          timeElapsed,
        });

        setPopupData({
          correct: result.correct ?? false,
          points: result.points ?? 0,
          streak: result.streak ?? 0,
        });
        setShowPopup(true);
        setTimeout(() => setShowPopup(false), 2500);
      } catch (e) {
        console.error("Failed to submit answer:", e);
      }
    },
    [answered, game, playerId, selectedOption, submitAnswer]
  );

  const handleTimeUp = useCallback(() => {
    if (!answered) {
      setAnswered(true);
      setSelectedOption(-1);
      setPopupData({ correct: false, points: 0, streak: 0 });
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 2000);
    }
  }, [answered]);

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

  // Game finished - redirect to results
  if (game.status === "finished") {
    return null;
  }

  // Showing results (leaderboard between questions)
  if (game.status === "showingResults" && game.showLeaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <div className="card-glass rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-center mb-6 text-gradient">
              Question Results
            </h2>

            {/* Show correct answer */}
            {currentQuestion && (
              <div className="text-center mb-6">
                <p className="text-white/50 text-sm mb-2">Correct answer:</p>
                <p className="text-lg font-bold text-kahoot-green">
                  {currentQuestion.options[currentQuestion.correctIndex]}
                </p>
                {leaderboard && (
                  <p className="text-sm text-white/30 mt-2">
                    {questionAnswers?.filter((a) => a.correct).length ?? 0} of{" "}
                    {questionAnswers?.length ?? 0} answered correctly
                  </p>
                )}
              </div>
            )}

            <Leaderboard entries={leaderboard ?? []} compact />

            <div className="text-center mt-6">
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-primary-light"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>
              <p className="text-white/30 text-sm mt-2">
                Waiting for next question...
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Lobby state
  if (game.status === "lobby") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-glass rounded-3xl p-8 text-center max-w-md w-full">
          <div className="text-4xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Waiting to Start</h2>
          <p className="text-white/50">
            The host will start the game shortly...
          </p>
        </div>
      </div>
    );
  }

  // No current question yet
  if (!currentQuestion) {
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

  return (
    <div className="min-h-screen flex flex-col px-4 py-6">
      <ScorePopup
        show={showPopup}
        correct={popupData.correct ?? false}
        points={popupData.points ?? 0}
        streak={popupData.streak ?? 0}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/40">
          Question {(game.currentQuestionIndex ?? 0) + 1} of {questions.length}
        </div>
        <div className="text-sm text-white/40">
          Score: <span className="text-white font-bold tabular-nums">
            {players?.find((p) => p._id === playerId)?.score ?? 0}
          </span>
        </div>
      </div>

      {/* Timer */}
      <div className="flex justify-center mb-6">
        <CountdownTimer
          duration={currentQuestion.timeLimit}
          onTimeUp={handleTimeUp}
          isActive={!answered && game.status === "question"}
          size={100}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={game.currentQuestionIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full"
        >
          <div className="card-glass rounded-3xl p-8 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-center leading-relaxed">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Answer Buttons - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {currentQuestion.options.map((option, i) => (
              <AnswerButton
                key={`${game.currentQuestionIndex}-${i}`}
                text={option}
                index={i}
                onClick={() => handleAnswer(i)}
                selected={selectedOption === i}
                disabled={answered}
              />
            ))}
          </div>

          {/* Answered indicator */}
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mt-6"
            >
              <p className="text-white/50">
                {selectedOption === -1
                  ? "Time's up!"
                  : "Answer submitted! Waiting for other players..."}
              </p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
