import { motion } from "framer-motion";

interface AnswerButtonProps {
  text: string;
  index: number;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  variant?: "default" | "compact" | "icon";
  /** Render as a colour/shape key rather than a control (no dimming). */
  swatch?: boolean;
}

// Each option carries a shape as well as a colour, so the four stay
// distinguishable without relying on colour alone. `fg` keeps text legible on
// each fill: the light fills take dark text, and the two that carry white text
// use the 600 step so 18px labels clear 4.5:1.
const COLORS = [
  { bg: "bg-rose-600", fg: "text-white", hover: "hover:brightness-110", icon: "▲" },
  { bg: "bg-indigo-600", fg: "text-white", hover: "hover:brightness-110", icon: "◆" },
  { bg: "bg-amber-500", fg: "text-amber-950", hover: "hover:brightness-110", icon: "●" },
  { bg: "bg-teal-500", fg: "text-teal-950", hover: "hover:brightness-110", icon: "■" },
];

export default function AnswerButton({
  text,
  index,
  onClick,
  selected,
  disabled,
  variant = "default",
  swatch = false,
}: AnswerButtonProps) {
  const color = COLORS[index % 4];

  if (variant === "icon") {
    return (
      <motion.button
        whileHover={!disabled ? { scale: 1.05 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
        onClick={onClick}
        disabled={disabled}
        className={`w-16 h-16 rounded-2xl ${color.bg} ${color.fg} flex items-center justify-center text-2xl font-bold transition-all ${
          selected ? "ring-4 ring-white scale-105" : ""
        } ${disabled && !swatch ? "opacity-50 cursor-not-allowed" : swatch ? "" : "cursor-pointer"} ${swatch ? "" : color.hover}`}
      >
        {color.icon}
      </motion.button>
    );
  }

  if (variant === "compact") {
    return (
      <motion.button
        whileHover={!disabled ? { scale: 1.02 } : undefined}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-3 p-3 rounded-xl ${color.bg} ${color.fg} transition-all text-left ${
          selected ? "ring-4 ring-white" : ""
        } ${disabled && !swatch ? "opacity-50 cursor-not-allowed" : swatch ? "" : "cursor-pointer"} ${swatch ? "" : color.hover}`}
      >
        <span className="text-lg w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          {color.icon}
        </span>
        <span className="text-sm font-medium line-clamp-2">{text}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`game-btn flex items-center gap-4 p-5 rounded-2xl ${color.bg} ${color.fg} transition-all ${
        selected ? "ring-4 ring-white" : ""
      } ${disabled && !swatch ? "opacity-50 cursor-not-allowed" : swatch ? "" : "cursor-pointer"} ${swatch ? "" : color.hover}`}
    >
      <span className="text-2xl w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        {color.icon}
      </span>
      <span className="text-lg font-semibold line-clamp-2">{text}</span>
    </motion.button>
  );
}

export { COLORS };
