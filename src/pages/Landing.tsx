import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";

const features = [
  {
    icon: "🎯",
    title: "Create Quizzes",
    desc: "Build interactive quizzes with multiple choice questions, custom timers, and beautiful themes.",
  },
  {
    icon: "🎮",
    title: "Live Games",
    desc: "Host real-time game sessions with PIN-based access. Players compete to answer quickly and accurately.",
  },
  {
    icon: "🏆",
    title: "Leaderboards",
    desc: "Track scores, streaks, and rankings. Watch live as players compete for the top spot.",
  },
  {
    icon: "⚡",
    title: "Instant Feedback",
    desc: "Players get immediate feedback on their answers with animated score popups and streak bonuses.",
  },
];

const steps = [
  { num: "1", title: "Create a Quiz", desc: "Add questions, set timers, and choose correct answers." },
  { num: "2", title: "Start a Game", desc: "Get a unique PIN to share with players." },
  { num: "3", title: "Play Together", desc: "Players join with the PIN and answer in real-time." },
  { num: "4", title: "See Results", desc: "Watch the leaderboard update live as answers come in." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [joinPin, setJoinPin] = useState("");

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-32 left-10 w-20 h-20 rounded-full bg-kahoot-red/20 animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-48 right-16 w-16 h-16 rounded-full bg-kahoot-blue/20 animate-float" style={{ animationDelay: "0.5s" }} />
        <div className="absolute bottom-40 left-20 w-12 h-12 rounded-full bg-kahoot-yellow/20 animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-32 right-10 w-24 h-24 rounded-full bg-kahoot-green/20 animate-float" style={{ animationDelay: "1.5s" }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-8 rounded-3xl kahoot-gradient flex items-center justify-center animate-pulse-glow"
          >
            <span className="text-5xl font-black">Q</span>
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-tight">
            <span className="text-gradient">Make Learning</span>
            <br />
            <span className="text-kahoot-yellow">Fun & Engaging</span>
          </h1>

          <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-10">
            Create interactive quizzes and host live game sessions.
            Challenge friends, compete in real-time, and make every
            question count.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/admin")}
              className="px-8 py-4 rounded-2xl kahoot-gradient text-lg font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow"
            >
              Create a Quiz →
            </motion.button>
            
            <div className="flex items-center gap-2 bg-white/10 rounded-2xl p-1.5">
              <input
                type="text"
                value={joinPin}
                onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter Game PIN"
                className="bg-transparent px-4 py-3 text-lg font-mono w-44 outline-none placeholder:text-white/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && joinPin.length === 6) {
                    navigate(`/join?pin=${joinPin}`);
                  }
                }}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (joinPin.length === 6) {
                    navigate(`/join?pin=${joinPin}`);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-kahoot-green hover:bg-kahoot-green-light font-bold transition-colors"
              >
                Join
              </motion.button>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-6 text-sm text-white/40"
          >
            <span>✨ Free to use</span>
            <span>•</span>
            <span>🌍 No sign-up required for players</span>
            <span>•</span>
            <span>📱 Works on any device</span>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to
              <span className="text-kahoot-blue"> Engage</span>
            </h2>
            <p className="text-lg text-white/50 max-w-xl mx-auto">
              From quiz creation to live gameplay, QuizPlay has all the tools to make
              interactive learning exciting.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-glass rounded-2xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="text-kahoot-green">Works</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center relative"
              >
                <div className="w-14 h-14 rounded-full kahoot-gradient flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-white/50">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute top-7 left-[calc(100%)] w-full h-px bg-gradient-to-r from-white/20 to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="card-glass rounded-3xl p-12">
            <h2 className="text-4xl font-bold mb-4">Ready to Start?</h2>
            <p className="text-white/50 mb-8 text-lg">
              Create your first quiz in minutes and start hosting live game sessions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/admin")}
                className="px-8 py-4 rounded-2xl kahoot-gradient text-lg font-bold"
              >
                Get Started Free →
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/join")}
                className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-lg font-bold transition-colors"
              >
                Join a Game
              </motion.button>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-white/30">
          <span>QuizPlay - Game-Based Learning Platform</span>
          <span>Made with ❤️ for interactive learning</span>
        </div>
      </footer>
    </div>
  );
}
