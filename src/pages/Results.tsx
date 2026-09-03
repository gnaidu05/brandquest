import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getQuestions, getLeaderboard, getNonHostPlayers, type LeaderboardEntry } from "../lib/api";
import { motion } from "framer-motion";
import Leaderboard from "../components/Leaderboard";

export default function Results() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then((g) => { if (g) getQuestions(g.quiz_id).then((qs) => setQuestionCount(qs.length)); });
    getLeaderboard(gameId).then(setLeaderboard);
    getNonHostPlayers(gameId).then((ps) => setPlayerCount(ps.length));
  }, [gameId]);

  if (leaderboard.length === 0) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <motion.div initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 120, delay: 0.2 }} className="text-8xl mb-6">🏆</motion.div>
          <h1 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight"><span className="text-gradient">Game Over!</span></h1>
          <p className="text-white/40 text-lg">{questionCount} questions • {playerCount} player{playerCount !== 1 ? "s" : ""}</p>
        </motion.div>

        {/* Podium */}
        {podium.length >= 3 && (
          <div className="flex items-end justify-center gap-3 sm:gap-5 mb-16">
            {/* 2nd */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col items-center w-28 sm:w-36">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl sm:text-3xl font-black mb-2 border border-white/10">{podium[1].name.charAt(0)}</div>
              <p className="font-bold text-sm truncate w-full text-center">{podium[1].name}</p>
              <p className="text-white/40 text-xs mb-2">{podium[1].score.toLocaleString()}</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 110 }} transition={{ delay: 0.7, duration: 0.5 }}
                className="w-full rounded-t-xl bg-gradient-to-t from-white/[0.03] to-white/[0.08] flex items-center justify-center pb-2"><span className="text-3xl">🥈</span></motion.div>
              <p className="text-xs text-white/30 mt-1.5">#2</p>
            </motion.div>
            {/* 1st */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center w-32 sm:w-40">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full kahoot-gradient flex items-center justify-center text-3xl sm:text-4xl font-black mb-2 ring-4 ring-kahoot-yellow/40 shadow-xl shadow-primary/20">{podium[0].name.charAt(0)}</motion.div>
              <p className="font-bold text-base sm:text-lg truncate w-full text-center text-kahoot-yellow">{podium[0].name}</p>
              <p className="text-white/40 text-sm mb-2">{podium[0].score.toLocaleString()}</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 170 }} transition={{ delay: 0.5, duration: 0.5 }}
                className="w-full rounded-t-xl bg-gradient-to-t from-kahoot-yellow/5 to-kahoot-yellow/15 flex items-center justify-center pb-2"><span className="text-4xl">🥇</span></motion.div>
              <p className="text-xs text-kahoot-yellow/70 mt-1.5 font-medium">#1</p>
            </motion.div>
            {/* 3rd */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex flex-col items-center w-28 sm:w-36">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 flex items-center justify-center text-xl sm:text-2xl font-black mb-2 border border-white/10">{podium[2].name.charAt(0)}</div>
              <p className="font-bold text-sm truncate w-full text-center">{podium[2].name}</p>
              <p className="text-white/40 text-xs mb-2">{podium[2].score.toLocaleString()}</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 80 }} transition={{ delay: 0.9, duration: 0.5 }}
                className="w-full rounded-t-xl bg-gradient-to-t from-white/[0.03] to-white/[0.06] flex items-center justify-center pb-2"><span className="text-2xl">🥉</span></motion.div>
              <p className="text-xs text-white/30 mt-1.5">#3</p>
            </motion.div>
          </div>
        )}

        {podium.length < 3 && leaderboard.length > 0 && <div className="max-w-md mx-auto mb-12"><Leaderboard entries={leaderboard} /></div>}
        {rest.length > 0 && <div className="max-w-md mx-auto mb-12"><Leaderboard entries={rest} /></div>}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="text-center">
          <button onClick={() => navigate("/")} className="px-10 py-4 rounded-2xl kahoot-gradient text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 transition-shadow">
            Play Again 🎮
          </button>
        </motion.div>
      </div>
    </div>
  );
}
