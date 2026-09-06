import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getQuestions, getLeaderboard, getNonHostPlayers, type LeaderboardEntry } from "../lib/api";
import { motion } from "framer-motion";
import Leaderboard from "../components/Leaderboard";
import { PlayIcon, RankBadge, TrophyIcon } from "../components/Icons";

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

  if (leaderboard.length === 0) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-2 border-lime border-t-transparent rounded-full animate-spin" /></div>;

  const podium = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.15 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-lime/25 bg-lime/10 text-lime"
          >
            <TrophyIcon size={30} />
          </motion.span>
          <h1 className="font-display mb-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">Game over</h1>
          <p className="text-lg text-slate-300">{questionCount} questions · {playerCount} player{playerCount !== 1 ? "s" : ""}</p>
        </motion.div>

        {/* Podium */}
        {podium.length >= 3 && (
          <div className="flex items-end justify-center gap-3 sm:gap-5 mb-16">
            {/* 2nd */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="flex flex-col items-center w-28 sm:w-36">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl sm:text-3xl font-bold mb-2 border border-white/10">{podium[1].name.charAt(0)}</div>
              <p className="font-bold text-sm truncate w-full text-center">{podium[1].name}</p>
              <p className="mb-2 text-xs text-slate-400">{podium[1].score.toLocaleString()}</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 110 }} transition={{ delay: 0.7, duration: 0.5 }}
                className="flex w-full items-center justify-center rounded-t-xl border-x border-t border-white/10 bg-gradient-to-t from-white/[0.02] to-white/[0.10] pb-2"><RankBadge rank={2} size={34} /></motion.div>
              <p className="mt-1.5 text-xs text-slate-400">#2</p>
            </motion.div>
            {/* 1st */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-col items-center w-32 sm:w-40">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full brand-gradient flex items-center justify-center text-3xl sm:text-4xl font-bold mb-2 ring-4 ring-lime/40 shadow-xl shadow-primary/20">{podium[0].name.charAt(0)}</motion.div>
              <p className="font-bold text-base sm:text-lg truncate w-full text-center text-lime">{podium[0].name}</p>
              <p className="mb-2 text-sm text-slate-400">{podium[0].score.toLocaleString()}</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 170 }} transition={{ delay: 0.5, duration: 0.5 }}
                className="flex w-full items-center justify-center rounded-t-xl border-x border-t border-lime/25 bg-gradient-to-t from-lime/5 to-lime/20 pb-2"><RankBadge rank={1} size={40} /></motion.div>
              <p className="mt-1.5 text-xs font-semibold text-lime">#1</p>
            </motion.div>
            {/* 3rd */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex flex-col items-center w-28 sm:w-36">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/10 flex items-center justify-center text-xl sm:text-2xl font-bold mb-2 border border-white/10">{podium[2].name.charAt(0)}</div>
              <p className="font-bold text-sm truncate w-full text-center">{podium[2].name}</p>
              <p className="mb-2 text-xs text-slate-400">{podium[2].score.toLocaleString()}</p>
              <motion.div initial={{ height: 0 }} animate={{ height: 80 }} transition={{ delay: 0.9, duration: 0.5 }}
                className="flex w-full items-center justify-center rounded-t-xl border-x border-t border-white/10 bg-gradient-to-t from-white/[0.02] to-white/[0.08] pb-2"><RankBadge rank={3} size={30} /></motion.div>
              <p className="mt-1.5 text-xs text-slate-400">#3</p>
            </motion.div>
          </div>
        )}

        {podium.length < 3 && leaderboard.length > 0 && <div className="max-w-md mx-auto mb-12"><Leaderboard entries={leaderboard} /></div>}
        {rest.length > 0 && <div className="max-w-md mx-auto mb-12"><Leaderboard entries={rest} /></div>}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className="text-center">
          <button onClick={() => navigate("/")} className="btn-primary inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold">
            <PlayIcon size={18} /> Play again
          </button>
        </motion.div>
      </div>
    </div>
  );
}
