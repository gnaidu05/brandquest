import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listQuizzes, deleteQuiz, createGameWithHost, type Quiz } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [authorId] = useState(() => {
    const stored = localStorage.getItem("quizplay_author_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("quizplay_author_id", id);
    return id;
  });

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingGame, setStartingGame] = useState<string | null>(null);
  const [hostName, setHostName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listQuizzes(authorId)
      .then(setQuizzes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authorId]);

  const handleDelete = async (id: string) => {
    await deleteQuiz(id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  };

  const startGameForQuiz = async (quizId: string) => {
    if (!hostName.trim() || creating) return;
    setCreating(true);
    try {
      const result = await createGameWithHost(quizId, hostName.trim());
      localStorage.setItem(`quizplay_player_${result.gameId}`, result.playerId);
      navigate(`/game/${result.gameId}`);
    } catch (e: any) {
      console.error("Failed to create game:", e);
      setError(e?.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold">My Quizzes</h1>
            <p className="text-white/50 mt-1">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/admin/create")}
            className="px-6 py-3 rounded-xl kahoot-gradient font-bold flex items-center gap-2"
          >
            + New Quiz
          </motion.button>
        </motion.div>

        {loading ? (
          <div className="text-center py-16 text-white/50">Loading...</div>
        ) : quizzes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-glass rounded-3xl p-16 text-center"
          >
            <div className="text-6xl mb-6">📝</div>
            <h2 className="text-2xl font-bold mb-3">No quizzes yet</h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Create your first quiz to start hosting interactive game sessions.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/admin/create")}
              className="px-8 py-3 rounded-xl kahoot-gradient font-bold"
            >
              Create Your First Quiz →
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {quizzes.map((quiz, i) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-glass rounded-2xl overflow-hidden hover:bg-white/10 transition-colors"
                >
                  <div
                    className="h-32 flex items-center justify-center"
                    style={{ backgroundColor: quiz.cover_color + "33" }}
                  >
                    <span className="text-5xl font-black opacity-50" style={{ color: quiz.cover_color }}>
                      {quiz.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold mb-1 line-clamp-1">{quiz.title}</h3>
                    <p className="text-sm text-white/50 line-clamp-2 mb-4">
                      {quiz.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-lg">
                        {quiz.question_count} question{quiz.question_count !== 1 ? "s" : ""}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          className="text-xs text-white/40 hover:text-kahoot-red transition-colors px-2 py-1"
                        >
                          Delete
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setStartingGame(quiz.id)}
                          className="text-sm px-4 py-1.5 rounded-lg bg-kahoot-green hover:bg-kahoot-green-light font-medium transition-colors"
                        >
                          Start Game
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Start Game Modal */}
      <AnimatePresence>
        {startingGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setStartingGame(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass rounded-3xl p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold mb-2">Start Game</h2>
              <p className="text-white/50 mb-6">Enter your name as the host</p>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Your name (host)"
                className="w-full bg-white/10 rounded-xl px-4 py-3 mb-6 outline-none focus:ring-2 focus:ring-primary placeholder:text-white/30 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && hostName.trim()) startGameForQuiz(startingGame);
                }}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStartingGame(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-medium transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startGameForQuiz(startingGame)}
                  disabled={!hostName.trim() || creating}
                  className="flex-1 px-4 py-3 rounded-xl kahoot-gradient font-bold disabled:opacity-50"
                >
              {creating ? "Creating..." : "Start →"}
            </motion.button>
          </div>
          {error && <p className="text-kahoot-red text-sm mt-3 text-center">{error}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
