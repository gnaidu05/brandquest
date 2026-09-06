import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import {
  ArrowRightIcon,
  BroadcastIcon,
  CheckIcon,
  KeyIcon,
  LogoMark,
  PenSquareIcon,
  TimerIcon,
  TrophyIcon,
  UsersIcon,
  ZapIcon,
} from "../components/Icons";

const features = [
  {
    icon: PenSquareIcon,
    title: "Build in minutes",
    desc: "Write questions, set a timer per question, and pick the right answer. No setup, no templates to learn.",
    tint: "text-lime bg-lime/10 ring-lime/30",
  },
  {
    icon: BroadcastIcon,
    title: "Host live",
    desc: "Share a six-digit PIN and players join from any browser. Questions advance when you say so.",
    tint: "text-volt bg-volt/10 ring-volt/30",
  },
  {
    icon: TrophyIcon,
    title: "Live leaderboard",
    desc: "Scores, streaks and rankings update as answers land, so the room always knows where it stands.",
    tint: "text-grape bg-grape/10 ring-grape/30",
  },
  {
    icon: ZapIcon,
    title: "Speed scoring",
    desc: "Faster correct answers earn more, and consecutive hits build a streak bonus worth chasing.",
    tint: "text-punch bg-punch/10 ring-punch/30",
  },
];

const steps = [
  { icon: PenSquareIcon, title: "Write your quiz", desc: "Add questions and answers, and set how long players get." },
  { icon: KeyIcon, title: "Start a game", desc: "QuizMode issues a six-digit PIN for the session." },
  { icon: UsersIcon, title: "Players join", desc: "They enter the PIN and a nickname — no account needed." },
  { icon: TrophyIcon, title: "Watch it unfold", desc: "The leaderboard updates live as each answer comes in." },
];

const badges = [
  { label: "Free to use", tone: "text-volt" },
  { label: "No player sign-up", tone: "text-grape" },
  { label: "Works on any device", tone: "text-punch" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";

/** A still of a live round, so the hero shows the product rather than describing it. */
function GamePreview() {
  const options = [
    { label: "A", text: "Jupiter", tone: "border-lime/60 bg-lime/10 text-lime", correct: true },
    { label: "B", text: "Saturn", tone: "border-white/10 bg-white/[0.03] text-silver/75" },
    { label: "C", text: "Neptune", tone: "border-white/10 bg-white/[0.03] text-silver/75" },
    { label: "D", text: "Mars", tone: "border-white/10 bg-white/[0.03] text-silver/75" },
  ];

  return (
    <div className="neon-frame overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-punch/15 px-2.5 py-1 text-xs font-bold text-punch ring-1 ring-punch/40">
          <span className="h-1.5 w-1.5 rounded-full bg-punch animate-pulse-glow" />
          Live
        </span>
        <span className="font-mono text-xs tracking-widest text-volt">PIN 418 302</span>
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-volt">Question 3 of 10</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-punch">
          <TimerIcon size={14} /> 12s
        </span>
      </div>

      <p className="font-display mb-5 text-lg font-semibold leading-snug text-silver sm:text-xl">
        Which planet is the largest in our solar system?
      </p>

      <ul className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <li
            key={o.label}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-medium ${o.tone}`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-bold">
              {o.label}
            </span>
            <span className="flex-1">{o.text}</span>
            {o.correct && <CheckIcon size={16} className="text-lime" />}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-white/8 pt-4">
        <span className="flex items-center gap-1.5 text-xs text-slate-400">
          <UsersIcon size={14} /> 24 players answered
        </span>
        <div className="flex -space-x-1.5">
          {["bg-volt", "bg-grape", "bg-lime", "bg-punch"].map((c) => (
            <span key={c} className={`h-5 w-5 rounded-full ring-2 ring-ink-900 ${c}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [joinPin, setJoinPin] = useState("");
  const pinReady = joinPin.length === 6;

  const goToJoin = () => {
    if (pinReady) navigate(`/join?pin=${joinPin}`);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-grid" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/10 px-3 py-1.5 text-xs font-medium text-volt">
              <span className="h-1.5 w-1.5 rounded-full bg-volt" />
              Real-time quizzes for classrooms and teams
            </span>

            <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-silver sm:text-5xl lg:text-6xl">
              Turn any room into a{" "}
              <span className="text-gradient-brand">QuizMode.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-silver/80 sm:text-lg lg:mx-0">
              Create a live quiz, drop the PIN, and let the smartest chaos begin.
              Players join from any browser — no downloads, no accounts.
            </p>

            {/* Primary action, then the PIN entry for players. */}
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <button
                onClick={() => navigate("/admin")}
                className={`btn-primary inline-flex h-14 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold ${focusRing}`}
              >
                Create a quiz
                <ArrowRightIcon size={17} />
              </button>

              <div className="flex h-14 items-center gap-1.5 rounded-xl border border-white/12 bg-white/5 p-1.5 transition-colors focus-within:border-volt/60 focus-within:ring-2 focus-within:ring-volt/25">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-label="Game PIN"
                  value={joinPin}
                  onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === "Enter") goToJoin(); }}
                  placeholder="Game PIN"
                  className="h-full min-w-0 flex-1 bg-transparent px-3 text-center font-mono text-[15px] tracking-[0.2em] text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 sm:w-32 sm:flex-none"
                />
                <button
                  onClick={goToJoin}
                  disabled={!pinReady}
                  title={pinReady ? "Join this game" : "Enter all six digits to join"}
                  className={`h-full shrink-0 rounded-lg px-4 text-sm font-semibold transition-colors ${focusRing} ${
                    pinReady
                      ? "bg-volt text-ink-950 hover:brightness-110"
                      : "cursor-not-allowed bg-white/8 text-slate-400"
                  }`}
                >
                  Join
                </button>
              </div>
            </div>

            <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-400 lg:justify-start">
              {badges.map((b) => (
                <li key={b.label} className={`flex items-center gap-1.5 font-medium ${b.tone}`}>
                  <CheckIcon size={15} className="text-lime" />
                  {b.label}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <div className="absolute -inset-8 -z-10 rounded-[2.5rem] brand-gradient-soft blur-3xl" aria-hidden="true" />
            <GamePreview />
          </motion.div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="max-w-2xl"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-silver sm:text-4xl">
              Everything a live quiz needs
            </h2>
            <p className="mt-3 text-base leading-relaxed text-silver/75 sm:text-lg">
              The parts that make a room lean in — timing, scoring and a leaderboard that moves — without the setup.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="card flex flex-col p-6"
              >
                <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${f.tint}`}>
                  <f.icon size={21} />
                </span>
                <h3 className="font-display mb-2 text-base font-semibold text-silver">{f.title}</h3>
                <p className="text-sm leading-relaxed text-silver/60">{f.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="max-w-2xl"
          >
            <h2 className="font-display text-3xl font-bold tracking-tight text-silver sm:text-4xl">
              From blank page to full room
            </h2>
            <p className="mt-3 text-base leading-relaxed text-silver/75 sm:text-lg">
              Four steps, a couple of minutes.
            </p>
          </motion.div>

          <ol className="relative mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {/* The rule sits behind the step markers on wide screens. */}
            <span
              className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-white/12 to-transparent lg:block"
              aria-hidden="true"
            />
            {steps.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="relative"
              >
                <span className="relative mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/12 bg-ink-850 text-lime">
                  <s.icon size={20} />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full brand-gradient text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <h3 className="font-display mb-1.5 text-base font-semibold text-silver">{s.title}</h3>
                <p className="text-sm leading-relaxed text-silver/60">{s.desc}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-ink-900 px-6 py-14 text-center sm:px-14"
        >
          <div className="pointer-events-none absolute inset-0 brand-gradient-soft" aria-hidden="true" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight text-silver sm:text-4xl">
              Run your first quiz today
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-silver/75">
              Build it in a few minutes, share the PIN, and see the leaderboard move.
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => navigate("/admin")}
                className={`btn-primary inline-flex h-14 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold ${focusRing}`}
              >
                Create a quiz
                <ArrowRightIcon size={17} />
              </button>
              <button
                onClick={() => navigate("/join")}
                className={`btn-ghost inline-flex h-14 items-center justify-center rounded-xl px-6 text-[15px] font-semibold text-white ${focusRing}`}
              >
                Join a game
              </button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-white/8 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-display text-sm font-semibold"><span className="text-silver">Quiz</span><span className="text-lime">Mode</span></span>
          </div>
          <p className="text-sm text-silver/60">Live quizzes for classrooms and teams.</p>
        </div>
      </footer>
    </div>
  );
}
