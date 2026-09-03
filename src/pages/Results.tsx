import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getQuestions, getLeaderboard, type LeaderboardEntry } from "../lib/api";
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
    getGame(gameId).then((g) => {
      if (g) {
        getQuestions(g.quiz_id).then((qs) => setQuestionCount(qs.length));
      }
    });
    getLeaderboard(gameId).then((lb) => {
      setLeaderboard(lb);
      setPlayerCount(lb.length);
    });
  }, [gameId]);

  if (leaderboard.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }} className="text-7xl mb-4">🏆</motion.div>
          <h1 className="text-4xl md:text-5xl font-black mb-2"><span className="text-gradient">Game Over!</span></h1>
          <p className="text-white/50 text-lg">{questionCount} questions • {playerCount} player{playerCount !== 1 ? "s" : ""}</p>
        </motion.div>

        {/* Podium */}
        {podium.length >= 3 && (
          <div className="flex items-end justify-center gap-3 md:gap-6 mb-12">
            {/* 2nd */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="flex flex-col items-center w-28 md:w-36">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl md:text-3xl font-black mb-2 border-2 border-white/20">{podium[1].name.charAt(0)}</div>
              <p className="font-bold text-sm md:text-base truncate w-full text-center">{podium[1].name}</p>
              <p className="text-white/50 text-xs mb-2">{podium[1].score.toLocaleString()} pts</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 120 }} transition={{ delay: 0.8, duration: 0.5 }}
                className="w-full rounded-t-xl bg-gradient-to-t from-white/5 to-white/15 flex items-center justify-center pb-2"><span className="text-3xl">🥈</span></motion.div>
              <p className="text-sm text-white/40 mt-1">#2</p>
            </motion.div>
            {/* 1st */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center w-32 md:w-40">
              <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full kahoot-gradient flex items-center justify-center text-3xl md:text-4xl font-black mb-2 ring-4 ring-kahoot-yellow/50">{podium[0].name.charAt(0)}</motion.div>
              <p className="font-bold text-base md:text-lg truncate w-full text-center text-kahoot-yellow">{podium[0].name}</p>
              <p className="text-white/50 text-sm mb-2">{podium[0].score.toLocaleString()} pts</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 180 }} transition={{ delay: 0.6, duration: 0.5 }}
                className="w-full rounded-t-xl bg-gradient-to-t from-kahoot-yellow/10 to-kahoot-yellow/20 flex items-center justify-center pb-2"><span className="text-4xl">🥇</span></motion.div>
              <p className="text-sm text-kahoot-yellow mt-1">#1</p>
            </motion.div>
            {/* 3rd */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="flex flex-col items-center w-28 md:w-36">
              <div className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-white/10 flex items-center justify-center text-xl md:text-2xl font-black mb-2 border-2 border-white/20">{podium[2].name.charAt(0)}</div>
              <p className="font-bold text-sm md:text-base truncate w-full text-center">{podium[2].name}</p>
              <p className="text-white/50 text-xs mb-2">{podium[2].score.toLocaleString()} pts</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 90 }} transition={{ delay: 1, duration: 0.5 }}
                className="w-full rounded-t-xl bg-gradient-to-t from-white/5 to-white/10 flex items-center justify-center pb-2"><span className="text-2xl">🥉</span></motion.div>
              <p className="text-sm text-white/40 mt-1">#3</p>
            </motion.div>
          </div>
        )}

        {podium.length < 3 && leaderboard.length > 0 && <div className="max-w-md mx-auto mb-12"><Leaderboard entries={leaderboard} /></div>}
        {rest.length > 0 && <div className="max-w-md mx-auto mb-12"><Leaderboard entries={rest} /></div>}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="text-center">
          <button onClick={() => navigate("/")} className="px-8 py-4 rounded-2xl kahoot-gradient text-lg font-bold">Play Again 🎮</button>
        </motion.div>
      </div>
    </div>
  );
}
