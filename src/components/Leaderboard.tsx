import { motion } from "framer-motion";
import { RankBadge } from "./Icons";

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  compact?: boolean;
  highlight?: string;
}

export default function Leaderboard({
  entries,
  compact = false,
  highlight,
}: LeaderboardProps) {
  return (
    <div className="w-full">
      {!compact && (
        <h2 className="font-display mb-4 text-center text-xl font-semibold text-white">
          Leaderboard
        </h2>
      )}
      <div className="space-y-2">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              entry.name === highlight
                ? "bg-teal-500/20 ring-1 ring-teal-400/50"
                : entry.rank <= 3
                ? "bg-white/8"
                : "bg-white/5"
            }`}
          >
            <span className="flex w-10 shrink-0 justify-center">
              <RankBadge rank={entry.rank} size={28} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{entry.name}</div>
              {!compact && (
                <div className="text-xs text-slate-400">
                  {entry.correctCount}/{entry.totalAnswered} correct
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold tabular-nums">
                {entry.score.toLocaleString()}
              </div>
              {!compact && (
                <div className="text-xs text-slate-400">pts</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {entries.length === 0 && (
        <div className="text-center text-slate-400 py-8">
          No players yet
        </div>
      )}
    </div>
  );
}
