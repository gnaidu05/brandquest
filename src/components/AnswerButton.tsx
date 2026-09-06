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
// Each option carries a shape as well as a colour, so the four stay
// distinguishable without relying on colour alone. Foregrounds are chosen per
// fill: blue, lime and pink read best with near-black, and the purple uses the
// deepened step so white clears AA on body-size text.
const COLORS = [
  { bg: "bg-volt", fg: "text-ink-950", hover: "hover:brightness-110", icon: "▲" },
  { bg: "bg-grape-deep", fg: "text-white", hover: "hover:brightness-110", icon: "◆" },
  { bg: "bg-lime", fg: "text-ink-950", hover: "hover:brightness-110", icon: "■" },
  { bg: "bg-punch", fg: "text-ink-950", hover: "hover:brightness-110", icon: "●" },
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
        className={`flex w-full items-center gap-3 rounded-xl p-3 text-left ${color.bg} ${color.fg} transition-all ${
          selected ? "ring-4 ring-white" : ""
        } ${disabled && !swatch ? "opacity-50 cursor-not-allowed" : swatch ? "" : "cursor-pointer"} ${swatch ? "" : color.hover}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-lg">
          {color.icon}
        </span>
        <span className="min-w-0 flex-1 break-words text-sm font-medium leading-snug">{text}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      onClick={onClick}
      disabled={disabled}
      className={`game-btn flex w-full items-center gap-3 rounded-2xl p-4 text-left sm:gap-4 sm:p-5 ${color.bg} ${color.fg} transition-all ${
        selected ? "ring-4 ring-white" : ""
      } ${disabled && !swatch ? "opacity-50 cursor-not-allowed" : swatch ? "" : "cursor-pointer"} ${swatch ? "" : color.hover}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl sm:h-12 sm:w-12 sm:text-2xl">
        {color.icon}
      </span>
      {/* min-w-0 lets the label shrink inside the flex row; without it a long
          answer pushes past the tile instead of wrapping. Answers are never
          clamped — a player cannot choose what they cannot read. */}
      <span className="min-w-0 flex-1 break-words text-base font-semibold leading-snug hyphens-auto sm:text-lg">{text}</span>
    </motion.button>
  );
}

export { COLORS };
