import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  duration: number;
  onTimeUp: () => void;
  isActive: boolean;
  size?: number;
  startTime?: string | null;
}

export default function CountdownTimer({
  duration,
  onTimeUp,
  isActive,
  size = 120,
  startTime,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isActive || !startTime) {
      setTimeLeft(duration);
      return;
    }
    // Sync with server time
    const startMs = new Date(startTime).getTime();
    const update = () => {
      const elapsed = (Date.now() - startMs) / 1000;
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      setTimeLeft(remaining);
      if (remaining <= 0) onTimeUp();
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [isActive, startTime, duration, onTimeUp]);

  // Fallback for non-synced mode
  useEffect(() => {
    if (!isActive || startTime) return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive, startTime, timeLeft > 0, onTimeUp]);

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeLeft / duration;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (timeLeft <= 3) return "#f43f5e";
    if (timeLeft <= 7) return "#f59e0b";
    return "#14b8a6";
  };

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={timeLeft <= 3 && timeLeft > 0 ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5, repeat: timeLeft <= 3 && timeLeft > 0 ? Infinity : 0 }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={getColor()} strokeWidth="6" fill="none"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="timer-ring" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color: getColor() }}>{timeLeft}</span>
      </div>
    </motion.div>
  );
}
