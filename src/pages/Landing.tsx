import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";

const features = [
  { icon: "🎯", title: "Create Quizzes", desc: "Build interactive quizzes with multiple choice questions, custom timers, and beautiful themes.", color: "card-red", accent: "text-kahoot-red-light" },
  { icon: "🎮", title: "Live Games", desc: "Host real-time sessions with PIN access. Players compete to answer quickly and accurately.", color: "card-blue", accent: "text-kahoot-blue-light" },
  { icon: "🏆", title: "Leaderboards", desc: "Track scores, streaks, and rankings live as players compete for the top spot.", color: "card-yellow", accent: "text-kahoot-yellow-light" },
  { icon: "⚡", title: "Instant Feedback", desc: "Animated score popups and streak bonuses keep every player engaged.", color: "card-green", accent: "text-kahoot-green-light" },
];

const steps = [
  { num: "1", title: "Create a Quiz", desc: "Add questions, set timers, choose answers." },
  { num: "2", title: "Start a Game", desc: "Get a unique 6-digit PIN." },
  { num: "3", title: "Players Join", desc: "Enter PIN and nickname to play." },
  { num: "4", title: "See Results", desc: "Watch the leaderboard update live." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [joinPin, setJoinPin] = useState("");

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* HERO — anchored below navbar, centered column */}
      <section className="relative px-6 pt-40 pb-20 overflow-hidden">
        <div className="absolute top-28 left-[8%] w-28 h-28 rounded-full bg-kahoot-red/20 blur-2xl animate-float" />
        <div className="absolute top-1/2 right-[10%] w-24 h-24 rounded-full bg-kahoot-blue/20 blur-2xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/4 left-[15%] w-20 h-20 rounded-full bg-kahoot-yellow/20 blur-2xl animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-1/3 right-[15%] w-32 h-32 rounded-full bg-kahoot-green/15 blur-2xl animate-float" style={{ animationDelay: "0.5s" }} />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-6xl mx-auto relative z-10"
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-8 rounded-3xl kahoot-gradient flex items-center justify-center animate-pulse-glow shadow-2xl"
          >
            <span className="text-5xl font-black">Q</span>
          </motion.div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
            <span className="rainbow-text">Make Learning</span>
            <br />
            <span className="text-kahoot-yellow">Fun & Engaging</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Create interactive quizzes and host live game sessions.
            Challenge friends, compete in real-time, and make every question count.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/admin")}
              className="px-10 py-4 rounded-2xl kahoot-gradient-warm text-lg font-bold shadow-xl shadow-kahoot-red/20 hover:shadow-2xl transition-shadow"
            >
              Create a Quiz →
            </motion.button>

            <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1.5 border border-white/10">
              <input
                type="text"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Game PIN"
                className="bg-transparent px-5 py-3 text-lg font-mono tracking-widest w-40 outline-none placeholder:text-white/20 text-center"
                onKeyDown={(e) => { if (e.key === "Enter" && joinPin.length === 6) navigate(`/join?pin=${joinPin}`); }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { if (joinPin.length === 6) navigate(`/join?pin=${joinPin}`); }}
                className="px-7 py-3 rounded-xl kahoot-gradient-green font-bold transition-colors"
              >
                Join
              </motion.button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/40"
          >
            {[
              { dot: "bg-kahoot-green", label: "Free to use" },
              { dot: "bg-kahoot-blue", label: "No sign-up for players" },
              { dot: "bg-kahoot-yellow", label: "Works on any device" },
            ].map((item) => (
              <span key={item.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                {item.label}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
              Everything You Need to <span className="text-gradient-blue">Engage</span>
            </h2>
            <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
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
                className={`card-glass rounded-2xl p-7 text-center ${f.color}`}
              >
                <div className={`text-5xl mb-5 ${f.accent}`}>{f.icon}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">
              How It <span className="text-kahoot-green">Works</span>
            </h2>
            <p className="text-lg text-white/40 max-w-xl mx-auto leading-relaxed">
              From creation to celebration — the whole flow takes minutes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="text-center"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto mb-5 shadow-lg ${
                  i === 0 ? "kahoot-gradient bg-kahoot-red shadow-kahoot-red/20" :
                  i === 1 ? "bg-kahoot-blue shadow-kahoot-blue/20" :
                  i === 2 ? "bg-kahoot-yellow shadow-kahoot-yellow/20" :
                  "kahoot-gradient-green shadow-kahoot-green/20"
                }`}>
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto"
        >
          <div className="card-glass rounded-3xl p-12 sm:p-16 relative overflow-hidden text-center max-w-3xl mx-auto">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-kahoot-blue/20 blur-3xl" />
            <h2 className="text-3xl sm:text-4xl font-black mb-4 tracking-tight relative z-10">Ready to Start?</h2>
            <p className="text-white/40 mb-10 text-lg leading-relaxed relative z-10">
              Create your first quiz in minutes and host live game sessions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin")}
                className="px-10 py-4 rounded-2xl kahoot-gradient text-lg font-bold shadow-xl shadow-primary/30"
              >
                Get Started Free →
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/join")}
                className="px-10 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-lg font-bold transition-colors"
              >
                Join a Game
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/25">
          <span>QuizPlay — Game-Based Learning Platform</span>
          <span>Built with React, Supabase & Tailwind</span>
        </div>
      </footer>
    </div>
  );
}