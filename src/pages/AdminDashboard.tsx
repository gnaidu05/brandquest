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
    listQuizzes(authorId).then(setQuizzes).catch(console.error).finally(() => setLoading(false));
  }, [authorId]);

  const handleDelete = async (id: string) => {
    await deleteQuiz(id);
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  };

  const startGameForQuiz = async (quizId: string) => {
    if (!hostName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const result = await createGameWithHost(quizId, hostName.trim());
      localStorage.setItem(`quizplay_player_${result.gameId}`, result.playerId);
      navigate(`/game/${result.gameId}`);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page-container">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">My Quizzes</h1>
            <p className="text-white/40 mt-1.5">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} created</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/admin/create")}
            className="px-6 py-3 rounded-xl brand-gradient font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="text-lg">+</span> New Quiz
          </motion.button>
        </motion.div>

        {loading ? (
          <div className="text-center py-24 text-white/30">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glass rounded-3xl p-16 text-center">
            <div className="text-7xl mb-6">📝</div>
            <h2 className="text-2xl font-bold mb-3">No quizzes yet</h2>
            <p className="text-white/40 mb-8 max-w-md mx-auto leading-relaxed">
              Create your first quiz to start hosting interactive game sessions.
            </p>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/admin/create")}
              className="px-8 py-3.5 rounded-xl brand-gradient font-bold shadow-lg shadow-primary/20"
            >
              Create Your First Quiz →
            </motion.button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {quizzes.map((quiz, i) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className={`card-glass rounded-2xl overflow-hidden group ${["card-red", "card-blue", "card-yellow", "card-green", "card-purple"][i % 5]}`}
                >
                  <div className="h-36 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: quiz.cover_color + "22" }}>
                    <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 30% 50%, ${quiz.cover_color}, transparent 70%)` }} />
                    <span className="text-6xl font-black opacity-30 relative z-10" style={{ color: quiz.cover_color }}>
                      {quiz.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-1.5 line-clamp-1">{quiz.title}</h3>
                    <p className="text-sm text-white/35 line-clamp-2 mb-5 leading-relaxed">
                      {quiz.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/30 bg-white/5 px-3 py-1.5 rounded-lg">
                        {quiz.question_count} question{quiz.question_count !== 1 ? "s" : ""}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          className="text-xs text-white/30 hover:text-rose-500 transition-colors px-2 py-1"
                        >
                          Delete
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setStartingGame(quiz.id)}
                          className="text-sm px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-300 font-medium transition-colors"
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
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-6"
            onClick={() => setStartingGame(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass rounded-3xl p-10 w-full max-w-md"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl brand-gradient flex items-center justify-center">
                  <span className="text-3xl">🎮</span>
                </div>
                <h2 className="text-2xl font-bold mb-1">Start Game</h2>
                <p className="text-white/40 text-sm">Enter your name as the host</p>
              </div>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-6 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/20 text-white text-center text-lg"
                onKeyDown={(e) => { if (e.key === "Enter" && hostName.trim()) startGameForQuiz(startingGame); }}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStartingGame(null)}
                  className="flex-1 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 font-medium transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startGameForQuiz(startingGame)}
                  disabled={!hostName.trim() || creating}
                  className="flex-1 px-4 py-3.5 rounded-xl brand-gradient font-bold disabled:opacity-40 shadow-lg shadow-primary/20"
                >
                  {creating ? "Creating..." : "Start →"}
                </motion.button>
              </div>
              {error && <p className="text-rose-500 text-sm mt-4 text-center">{error}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
