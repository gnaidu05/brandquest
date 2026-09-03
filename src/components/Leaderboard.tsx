import { motion } from "framer-motion";

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
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="w-full">
      {!compact && (
        <h2 className="text-2xl font-bold text-center mb-4 text-gradient">
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
                ? "bg-primary/30 ring-2 ring-primary-light"
                : entry.rank <= 3
                ? "bg-white/10"
                : "bg-white/5"
            }`}
          >
            <span className="text-xl w-10 text-center shrink-0">
              {entry.rank <= 3 ? medals[entry.rank - 1] : (
                <span className="text-sm font-bold text-white/50">
                  #{entry.rank}
                </span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{entry.name}</div>
              {!compact && (
                <div className="text-xs text-white/50">
                  {entry.correctCount}/{entry.totalAnswered} correct
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="font-bold tabular-nums">
                {entry.score.toLocaleString()}
              </div>
              {!compact && (
                <div className="text-xs text-white/50">pts</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {entries.length === 0 && (
        <div className="text-center text-white/40 py-8">
          No players yet
        </div>
      )}
    </div>
  );
}
