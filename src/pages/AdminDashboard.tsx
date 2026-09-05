import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listQuizzes, deleteQuiz, createGameWithHost, type Quiz } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import { AlertIcon, ArrowRightIcon, PenSquareIcon, PlayIcon, PlusIcon, TrashIcon } from "../components/Icons";

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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    listQuizzes(authorId).then(setQuizzes).catch(console.error).finally(() => setLoading(false));
  }, [authorId]);

  // Deleting a quiz is irreversible, so the button asks once before doing it.
  const handleDelete = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setConfirmDelete(null);
    setDeleting(id);
    setError("");
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      console.error("Delete failed", e);
      setError("Couldn't delete that quiz. Check your connection and try again.");
    } finally {
      setDeleting(null);
    }
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
        {/* The start-game modal has its own error slot; this one covers failures
            that happen on the page itself, such as a delete that did not land. */}
        {error && !startingGame && (
          <div role="alert" className="mb-6 flex items-center gap-2 rounded-xl border border-punch/30 bg-punch/10 px-4 py-3 text-sm text-punch">
            <AlertIcon size={16} />
            {error}
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">My Quizzes</h1>
            <p className="mt-1.5 text-slate-400">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} created</p>
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
          <div className="py-24 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card rounded-2xl p-14 text-center">
            <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lime">
              <PenSquareIcon size={28} />
            </span>
            <h2 className="text-2xl font-bold mb-3">No quizzes yet</h2>
            <p className="mx-auto mb-8 max-w-md leading-relaxed text-slate-300">
              Create your first quiz to start hosting interactive game sessions.
            </p>
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/admin/create")}
              className="px-8 py-3.5 rounded-xl brand-gradient font-bold shadow-lg shadow-primary/20"
            >
              Create your first quiz <ArrowRightIcon size={16} />
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
                  className="card group flex flex-col overflow-hidden rounded-2xl"
                >
                  <div className="h-36 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: quiz.cover_color + "22" }}>
                    <div className="absolute inset-0 opacity-10" style={{ background: `radial-gradient(circle at 30% 50%, ${quiz.cover_color}, transparent 70%)` }} />
                    <span className="text-6xl font-black opacity-30 relative z-10" style={{ color: quiz.cover_color }}>
                      {quiz.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 title={quiz.title} className="font-display mb-1.5 line-clamp-2 text-lg font-bold leading-snug">{quiz.title}</h3>
                    <p title={quiz.description || undefined} className="mb-5 line-clamp-2 text-sm leading-relaxed text-slate-300">
                      {quiz.description || "No description"}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-lg bg-white/8 px-3 py-1.5 text-xs text-slate-300">
                        {quiz.question_count} question{quiz.question_count !== 1 ? "s" : ""}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(quiz.id)}
                          onBlur={() => setConfirmDelete((c) => (c === quiz.id ? null : c))}
                          disabled={deleting === quiz.id}
                          aria-label={confirmDelete === quiz.id ? `Confirm deleting ${quiz.title}` : `Delete ${quiz.title}`}
                          className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            confirmDelete === quiz.id
                              ? "bg-punch/15 text-punch ring-1 ring-punch/40"
                              : "text-slate-400 hover:bg-punch/10 hover:text-punch"
                          }`}
                        >
                          <TrashIcon size={14} />
                          {deleting === quiz.id ? "Deleting…" : confirmDelete === quiz.id ? "Tap to confirm" : "Delete"}
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setStartingGame(quiz.id)}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-lime px-4 text-sm font-semibold text-ink-950 transition-colors hover:brightness-110"
                        >
                          <PlayIcon size={14} /> Start game
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
              className="card w-full max-w-md rounded-2xl p-8"
            >
              <div className="text-center mb-8">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-white">
                  <PlayIcon size={22} />
                </span>
                <h2 className="text-2xl font-bold mb-1">Start Game</h2>
                <p className="text-sm text-slate-400">Enter your name as the host</p>
              </div>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 mb-6 outline-none focus:border-lime/60 focus:ring-2 focus:ring-lime/25 placeholder:text-slate-500 text-white text-center text-lg"
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
                  {creating ? "Creating…" : <>Start <ArrowRightIcon size={15} /></>}
                </motion.button>
              </div>
              {error && <p className="mt-4 text-center text-sm text-punch">{error}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
