import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, FlameIcon, XIcon } from "./Icons";

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
              className={`font-display mb-2 flex items-center justify-center gap-3 text-5xl font-bold ${
                correct ? "text-teal-300" : "text-rose-300"
              }`}
            >
              {correct ? <CheckIcon size={44} /> : <XIcon size={44} />}
              {correct ? "Correct!" : "Incorrect"}
            </motion.div>
            {correct && points > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-amber-300"
              >
                +{points.toLocaleString()} pts
                {streak >= 3 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-sm text-orange-300">
                    <FlameIcon size={15} /> {streak} streak
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
