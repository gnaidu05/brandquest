import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";

const features = [
  { icon: "🎯", title: "Create Quizzes", desc: "Build interactive quizzes with multiple choice questions, custom timers, and beautiful themes.", border: "card-red", chip: "bg-kahoot-red/15 ring-kahoot-red/30" },
  { icon: "🎮", title: "Live Games", desc: "Host real-time sessions with PIN access. Players compete to answer quickly and accurately.", border: "card-blue", chip: "bg-kahoot-blue/15 ring-kahoot-blue/30" },
  { icon: "🏆", title: "Leaderboards", desc: "Track scores, streaks, and rankings live as players compete for the top spot.", border: "card-yellow", chip: "bg-kahoot-yellow/15 ring-kahoot-yellow/30" },
  { icon: "⚡", title: "Instant Feedback", desc: "Animated score popups and streak bonuses keep every player engaged.", border: "card-green", chip: "bg-kahoot-green/15 ring-kahoot-green/30" },
];

const steps = [
  { num: "1", title: "Create a Quiz", desc: "Add questions, set timers, choose answers.", tile: "bg-kahoot-red shadow-kahoot-red/20 text-white" },
  { num: "2", title: "Start a Game", desc: "Get a unique 6-digit PIN.", tile: "bg-kahoot-blue shadow-kahoot-blue/20 text-white" },
  { num: "3", title: "Players Join", desc: "Enter PIN and nickname to play.", tile: "bg-kahoot-yellow shadow-kahoot-yellow/20 text-black" },
  { num: "4", title: "See Results", desc: "Watch the leaderboard update live.", tile: "bg-kahoot-green shadow-kahoot-green/20 text-white" },
];

const badges = [
  { dot: "bg-kahoot-green", label: "Free to use" },
  { dot: "bg-kahoot-blue", label: "No sign-up for players" },
  { dot: "bg-kahoot-yellow", label: "Works on any device" },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark";

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

      {/* HERO — centred in the viewport, offset for the fixed navbar */}
      <section className="relative flex min-h-[calc(100svh-4.5rem)] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-20 sm:pt-32">
        <div className="absolute top-28 left-[8%] w-28 h-28 rounded-full bg-kahoot-red/20 blur-2xl animate-float" />
        <div className="absolute top-1/2 right-[10%] w-24 h-24 rounded-full bg-kahoot-blue/20 blur-2xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-16 right-[15%] w-32 h-32 rounded-full bg-kahoot-green/15 blur-2xl animate-float" style={{ animationDelay: "0.5s" }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative z-10 w-full max-w-3xl text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
            className="w-20 h-20 mx-auto mb-8 rounded-3xl kahoot-gradient flex items-center justify-center shadow-2xl"
          >
            <span className="text-4xl font-black">Q</span>
          </motion.div>

          <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl font-black mb-6 leading-[1.08] tracking-tight text-balance">
            <span className="text-white">Make Learning</span>
            <br />
            <span className="rainbow-text">Fun &amp; Engaging</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            Create interactive quizzes and host live game sessions.
            Challenge friends, compete in real-time, and make every question count.
          </p>

          {/* Both calls to action share one height so they line up side by side,
              and stretch to the same width once they stack on small screens. */}
          <div className="mx-auto mb-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/admin")}
              className={`h-16 px-9 rounded-2xl kahoot-gradient-warm text-lg font-bold text-white shadow-xl shadow-kahoot-red/20 hover:shadow-2xl transition-shadow ${focusRing}`}
            >
              Create a Quiz →
            </motion.button>

            <div className="flex h-16 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 transition-colors focus-within:border-primary-light/60 focus-within:ring-2 focus-within:ring-primary-light/30">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Game PIN"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Game PIN"
                className="h-full min-w-0 flex-1 bg-transparent px-4 text-center text-lg font-mono tracking-widest text-white outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-white/40 sm:w-40 sm:flex-none"
                onKeyDown={(e) => { if (e.key === "Enter") goToJoin(); }}
              />
              <motion.button
                whileHover={pinReady ? { scale: 1.04 } : undefined}
                whileTap={pinReady ? { scale: 0.96 } : undefined}
                onClick={goToJoin}
                disabled={!pinReady}
                title={pinReady ? "Join this game" : "Enter all 6 digits to join"}
                className={`h-full shrink-0 rounded-xl px-6 font-bold text-white transition-opacity ${focusRing} ${
                  pinReady ? "kahoot-gradient-green" : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
              >
                Join
              </motion.button>
            </div>
          </div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60"
          >
            {badges.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                {item.label}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight text-balance">
              Everything You Need to <span className="text-gradient-blue">Engage</span>
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed text-pretty">
              From quiz creation to live gameplay, QuizPlay has all the tools to make
              interactive learning exciting.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1 }}
                className={`card-glass rounded-2xl p-7 text-center flex flex-col ${f.border}`}
              >
                <div
                  aria-hidden="true"
                  className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ring-1 ${f.chip}`}
                >
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 sm:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 tracking-tight">
              How It <span className="text-kahoot-green-light">Works</span>
            </h2>
            <p className="text-lg text-white/60 max-w-xl mx-auto leading-relaxed text-pretty">
              From creation to celebration — the whole flow takes minutes.
            </p>
          </motion.div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.li
                key={s.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="text-center"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-5 shadow-lg ${s.tile}`}>
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed max-w-[16rem] mx-auto text-pretty">{s.desc}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 pt-4 sm:pb-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="card-glass rounded-3xl p-10 sm:p-16 relative overflow-hidden text-center max-w-3xl mx-auto">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-kahoot-blue/20 blur-3xl" />
            <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight relative z-10">Ready to Start?</h2>
            <p className="text-white/60 mb-10 text-lg leading-relaxed relative z-10 text-pretty">
              Create your first quiz in minutes and host live game sessions.
            </p>
            <div className="relative z-10 mx-auto flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-4">
              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/admin")}
                className={`h-16 px-9 rounded-2xl kahoot-gradient text-lg font-bold text-white shadow-xl shadow-primary/30 ${focusRing}`}
              >
                Get Started Free →
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate("/join")}
                className={`h-16 px-9 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-lg font-bold transition-colors ${focusRing}`}
              >
                Join a Game
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-white/50 text-center">
          <span>QuizPlay — Game-Based Learning Platform</span>
          <span>Built with React, Supabase &amp; Tailwind</span>
        </div>
      </footer>
    </div>
  );
}
