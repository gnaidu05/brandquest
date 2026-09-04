import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuiz } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../components/Navbar";
import AnswerButton from "../components/AnswerButton";
import { CheckIcon, PlusIcon, XIcon } from "../components/Icons";

// Quiz cover swatches, drawn from the app's own palette.
const COVER_COLORS = ["#0d9488", "#0891b2", "#0284c7", "#4f46e5", "#7c3aed", "#c026d3", "#e11d48", "#ea580c", "#d97706", "#475569"];
const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
interface QuestionDraft { text: string; options: string[]; correctIndex: number; timeLimit: number; }

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
  const [coverColor, setCoverColor] = useState("#0d9488");
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 }]);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addQuestion = () => { setQuestions([...questions, { text: "", options: ["", "", "", ""], correctIndex: 0, timeLimit: 20 }]); setActiveQuestion(questions.length); };
  const removeQuestion = (i: number) => { if (questions.length <= 1) return; const q = questions.filter((_, idx) => idx !== i); setQuestions(q); setActiveQuestion(Math.min(activeQuestion, q.length - 1)); };
  const updateQuestion = (i: number, field: keyof QuestionDraft, val: any) => { const q = [...questions]; (q[i] as any)[field] = val; setQuestions(q); };

  const validate = (): string[] => {
    const e: string[] = [];
    if (!title.trim()) e.push("Quiz title is required");
    questions.forEach((q, i) => {
      if (!q.text.trim()) e.push(`Question ${i + 1}: text is required`);
      q.options.forEach((o, j) => { if (!o.trim()) e.push(`Question ${i + 1}, Option ${j + 1}: empty`); });
    });
    return e;
  };

  const handleSave = async () => {
    const errs = validate(); setErrors(errs);
    if (errs.length > 0) return;
    setSaving(true);
    try {
      await createQuiz(title.trim(), description.trim(), coverColor, authorId, questions.map((q) => ({ text: q.text.trim(), options: q.options.map((o) => o.trim()), correctIndex: q.correctIndex, timeLimit: q.timeLimit })));
      navigate("/admin");
    } catch (e) { setErrors(["Failed to save. Try again."]); } finally { setSaving(false); }
  };

  const currentQ = questions[activeQuestion];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="page-container max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <button onClick={() => navigate("/admin")} className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-sm text-slate-300 transition-colors hover:text-white">← Back to Dashboard</button>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Create New Quiz</h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Settings */}
          <div className="lg:col-span-1 space-y-5">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card-glass rounded-2xl p-6">
              <h3 className="font-bold mb-5">Quiz Details</h3>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-300">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Awesome Quiz"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/20 text-white" />
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-slate-300">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..." rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/20 text-white resize-none" />
              <label className="mb-2 block text-xs uppercase tracking-wider text-slate-300">Cover Color</label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cover colour">
                {COVER_COLORS.map((c, i) => (
                  <button key={c} type="button" onClick={() => setCoverColor(c)}
                    role="radio" aria-checked={coverColor === c} aria-label={`Cover colour ${i + 1}`}
                    className={`h-9 w-9 rounded-lg transition-all ${coverColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-transparent scale-105" : "opacity-75 hover:scale-105 hover:opacity-100"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="card-glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Questions <span className="font-normal text-slate-400">({questions.length})</span></h3>
                <button onClick={addQuestion} className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-teal-500/20 px-3 text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-500/30"><PlusIcon size={13} /> Add</button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {questions.map((q, i) => (
                  <button key={i} onClick={() => setActiveQuestion(i)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 text-sm ${activeQuestion === i ? "bg-teal-500/20 ring-1 ring-teal-400/40" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                    <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    <span className="line-clamp-1 flex-1 text-slate-200">{q.text || "Untitled question"}</span>
                    {questions.length > 1 && (
                      <span onClick={(e) => { e.stopPropagation(); removeQuestion(i); }} className="px-1 text-slate-500 transition-colors hover:text-rose-300" aria-label={`Remove question ${i + 1}`}><XIcon size={14} /></span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Question Editor */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div key={activeQuestion} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card-glass rounded-2xl p-7">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Question {activeQuestion + 1}</h3>
                  <div className="flex items-center gap-2">
                    <label className="text-xs uppercase tracking-wider text-slate-300">Time:</label>
                    <select value={currentQ.timeLimit} onChange={(e) => updateQuestion(activeQuestion, "timeLimit", Number(e.target.value))}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 outline-none text-white text-sm">
                      {TIME_OPTIONS.map((t) => (<option key={t} value={t} className="bg-slate-800">{t}s</option>))}
                    </select>
                  </div>
                </div>

                <input type="text" value={currentQ.text} onChange={(e) => updateQuestion(activeQuestion, "text", e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-5 py-4 text-lg mb-7 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/15 text-white" />

                <div className="grid grid-cols-2 gap-3">
                  {currentQ.options.map((opt, i) => (
                    <div key={i}>
                      <label className="mb-1.5 block text-xs text-slate-400">
                        Option {i + 1}
                        {currentQ.correctIndex === i && <span className="ml-1.5 inline-flex items-center gap-1 font-medium text-teal-300"><CheckIcon size={12} /> correct</span>}
                      </label>
                      <AnswerButton text={opt || "Enter answer..."} index={i} variant="compact"
                        onClick={() => updateQuestion(activeQuestion, "correctIndex", i)} />
                      <input type="text" value={opt} onChange={(e) => { const o = [...currentQ.options]; o[i] = e.target.value; updateQuestion(activeQuestion, "options", o); }}
                        placeholder={`Option ${i + 1}`}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 mt-2 text-sm outline-none focus:border-primary/50 placeholder:text-white/15 text-white" />
                    </div>
                  ))}
                </div>

                <p className="mt-5 text-center text-xs text-slate-400">Click a color button to mark it as the correct answer</p>

                <div className="flex items-center justify-between mt-7 pt-6 border-t border-white/5">
                  <button onClick={() => setActiveQuestion(Math.max(0, activeQuestion - 1))} disabled={activeQuestion === 0}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors disabled:opacity-20 text-sm">← Previous</button>
                  <span className="text-xs tabular-nums text-slate-400">{activeQuestion + 1} / {questions.length}</span>
                  {activeQuestion < questions.length - 1 ? (
                    <button onClick={() => setActiveQuestion(Math.min(questions.length - 1, activeQuestion + 1))}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm">Next →</button>
                  ) : (
                    <button onClick={addQuestion} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-teal-500/20 px-4 text-sm font-semibold text-teal-200 transition-colors hover:bg-teal-500/30"><PlusIcon size={15} /> Add question</button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {errors.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                {errors.map((err, i) => (<p key={i} className="text-sm text-rose-400">{err}</p>))}
              </motion.div>
            )}

            <motion.button whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.99 }} onClick={handleSave} disabled={saving}
              className="w-full mt-5 px-6 py-4 rounded-2xl brand-gradient text-lg font-bold disabled:opacity-40 shadow-lg shadow-primary/20 transition-all">
              {saving ? "Saving..." : `Save Quiz (${questions.length} question${questions.length !== 1 ? "s" : ""})`}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
