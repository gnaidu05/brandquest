import { motion, AnimatePresence } from "framer-motion";

interface ScorePopupProps {
  show: boolean;
  correct: boolean;
  points: number;
  streak: number;
}

export default function ScorePopup({
  show,
  correct,
  points,
  streak,
}: ScorePopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: -20 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className={`text-6xl font-black mb-2 ${
                correct ? "text-kahoot-green" : "text-kahoot-red"
              }`}
            >
              {correct ? "✓ Correct!" : "✗ Incorrect"}
            </motion.div>
            {correct && points > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-kahoot-yellow"
              >
                +{points.toLocaleString()} pts
                {streak >= 3 && (
                  <span className="ml-2 text-sm">
                    🔥 {streak} streak
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
