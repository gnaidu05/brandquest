import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuiz } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import AnswerButton from "../components/AnswerButton";

const COVER_COLORS = [
  "#46178f", "#e21b3c", "#1368ce", "#d89e00", "#26890c",
  "#7b2cbf", "#ff6b35", "#06b6d4", "#f43f5e", "#8b5cf6",
];

const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

interface QuestionDraft {
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

export default function CreateQuiz() {
  const navigate = useNavigate();

  const [authorId] = useState(() => {
    const stored = localStorage.getItem("quizplay_author_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("quizplay_author_id", id);
    return id;
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("#46178f");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 },
  ]);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 }]);
    setActiveQuestion(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setActiveQuestion(Math.min(activeQuestion, newQuestions.length - 1));
  };

  const updateQuestion = (index: number, field: keyof QuestionDraft, value: string | number | string[]) => {
    const newQuestions = [...questions];
    (newQuestions[index] as any)[field] = value;
    setQuestions(newQuestions);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!title.trim()) errs.push("Quiz title is required");
    if (questions.length === 0) errs.push("At least one question is required");
    questions.forEach((q, i) => {
      if (!q.text.trim()) errs.push(`Question ${i + 1}: text is required`);
      q.options.forEach((opt, j) => {
        if (!opt.trim()) errs.push(`Question ${i + 1}, Option ${j + 1}: is empty`);
      });
    });
    return errs;
  };

  const handleSave = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    setSaving(true);
    try {
      await createQuiz(
        title.trim(),
        description.trim(),
        coverColor,
        authorId,
        questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()),
          correctIndex: q.correctIndex,
          timeLimit: q.timeLimit,
        }))
      );
      navigate("/admin");
    } catch (e) {
      console.error("Failed to create quiz:", e);
      setErrors(["Failed to save quiz. Please try again."]);
    } finally {
      setSaving(false);
    }
  };

  const currentQ = questions[activeQuestion];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button onClick={() => navigate("/admin")} className="text-white/50 hover:text-white transition-colors mb-4 flex items-center gap-2">
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Create New Quiz</h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Settings */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card-glass rounded-2xl p-6">
              <h3 className="font-bold mb-4">Quiz Details</h3>
              <label className="block text-sm text-white/50 mb-1.5">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Awesome Quiz"
                className="w-full bg-white/10 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-primary placeholder:text-white/30 text-white" />

              <label className="block text-sm text-white/50 mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." rows={3}
                className="w-full bg-white/10 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-primary placeholder:text-white/30 text-white resize-none" />

              <label className="block text-sm text-white/50 mb-2">Cover Color</label>
              <div className="flex flex-wrap gap-2 mb-4">
                {COVER_COLORS.map((c) => (
                  <button key={c} onClick={() => setCoverColor(c)}
                    className={`w-8 h-8 rounded-lg transition-all ${coverColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-110" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </motion.div>

            {/* Question Navigator */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card-glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Questions ({questions.length})</h3>
                <button onClick={addQuestion} className="text-sm px-3 py-1 rounded-lg bg-primary/30 hover:bg-primary/50 transition-colors">+ Add</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {questions.map((q, i) => (
                  <button key={i} onClick={() => setActiveQuestion(i)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${activeQuestion === i ? "bg-primary/30 ring-1 ring-primary-light" : "bg-white/5 hover:bg-white/10"}`}>
                    <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</span>
                    <span className="text-sm line-clamp-1 flex-1">{q.text || "Untitled question"}</span>
                    {questions.length > 1 && (
                      <span onClick={(e) => { e.stopPropagation(); removeQuestion(i); }} className="text-white/30 hover:text-kahoot-red transition-colors text-xs">✕</span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Question Editor */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div key={activeQuestion} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card-glass rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Question {activeQuestion + 1}</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-white/50">Time:</label>
                    <select value={currentQ.timeLimit} onChange={(e) => updateQuestion(activeQuestion, "timeLimit", Number(e.target.value))}
                      className="bg-white/10 rounded-lg px-3 py-1.5 outline-none text-white">
                      {TIME_OPTIONS.map((t) => (<option key={t} value={t} className="bg-slate-800">{t}s</option>))}
                    </select>
                  </div>
                </div>

                <input type="text" value={currentQ.text} onChange={(e) => updateQuestion(activeQuestion, "text", e.target.value)}
                  placeholder="Enter your question..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-lg mb-6 outline-none focus:ring-2 focus:ring-primary placeholder:text-white/20 text-white" />

                <div className="grid grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => (
                    <div key={i}>
                      <label className="text-xs text-white/40 mb-1 block">
                        Option {i + 1}
                        {currentQ.correctIndex === i && <span className="text-kahoot-green ml-1">(correct)</span>}
                      </label>
                      <AnswerButton text={opt || "Enter answer..."} index={i} variant="compact"
                        onClick={() => updateQuestion(activeQuestion, "correctIndex", i)} />
                      <input type="text" value={opt} onChange={(e) => { const newOpts = [...currentQ.options]; newOpts[i] = e.target.value; updateQuestion(activeQuestion, "options", newOpts); }}
                        placeholder={`Option ${i + 1}`}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 mt-2 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-white/20 text-white" />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-white/30 mt-4 text-center">Click an answer button to mark it as correct</p>

                <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                  <button onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))} disabled={activeQuestion === 0}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-30">← Previous</button>
                  <span className="text-sm text-white/40">{activeQuestion + 1} of {questions.length}</span>
                  {activeQuestion < questions.length - 1 ? (
                    <button onClick={() => setActiveQuestion(Math.min(questions.length - 1, activeQuestion + 1))}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">Next →</button>
                  ) : (
                    <button onClick={addQuestion} className="px-4 py-2 rounded-xl bg-primary/30 hover:bg-primary/50 transition-colors">+ Add Question</button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {errors.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-kahoot-red/20 border border-kahoot-red/30 rounded-xl p-4">
                {errors.map((err, i) => (<p key={i} className="text-sm text-kahoot-red-light">{err}</p>))}
              </motion.div>
            )}

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
              className="w-full mt-6 px-6 py-4 rounded-2xl kahoot-gradient text-lg font-bold disabled:opacity-50 transition-opacity">
              {saving ? "Saving..." : `Save Quiz (${questions.length} question${questions.length !== 1 ? "s" : ""})`}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
