import type { SVGProps } from "react";

/**
 * Stroke icons on a 24px grid, sized by the `size` prop and coloured by
 * `currentColor`. Emoji were standing in for icons before; they render
 * differently on every platform and ignore the surrounding text colour.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PenSquareIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
  </Icon>
);

export const BroadcastIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
    <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
  </Icon>
);

export const TrophyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M6 3h12v6a6 6 0 0 1-12 0Z" />
    <path d="M12 15v4" />
    <path d="M8 21h8" />
  </Icon>
);

export const ZapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m20 6-11 11-5-5" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const TimerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 2h4" />
    <path d="M12 14v-4" />
    <circle cx="12" cy="14" r="8" />
  </Icon>
);

export const KeyIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
    <path d="m21 2-9.6 9.6" />
    <circle cx="7.5" cy="15.5" r="5.5" />
  </Icon>
);


export const ChartBarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="6" rx="0.5" />
    <rect x="12.5" y="8" width="3" height="10" rx="0.5" />
    <rect x="18" y="5" width="3" height="13" rx="0.5" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 4 14 8-14 8V4Z" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);

export const XIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Icon>
);

export const FlameIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 2S6 8 6 13a6 6 0 0 0 12 0c0-2-1.2-3.8-2.5-5-.7 1.3-1.6 2-2.5 2 .8-3-1-6-1-8Z" />
  </Icon>
);

/**
 * A podium/leaderboard rank badge. Numbers rather than medal emoji, which
 * render inconsistently across platforms and cannot be recoloured.
 */
export function RankBadge({ rank, size = 28 }: { rank: number; size?: number }) {
  const tone =
    rank === 1 ? "bg-lime text-ink-950"
    : rank === 2 ? "bg-silver text-ink-950"
    : rank === 3 ? "bg-punch text-ink-950"
    : "bg-white/10 text-slate-300";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold tabular-nums ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {rank}
    </span>
  );
}

/**
 * The QuizMode mark: a Laser Lime "Q" with a Cyber Purple play triangle set in
 * its counter. Drawn rather than tiled so it keeps its edges at any size and
 * inherits nothing from the surface behind it.
 */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="14.2" cy="14.2" r="9.6" stroke="#c8ff32" strokeWidth="4.6" />
      <path d="M20.6 20.6 L26.6 26.6" stroke="#c8ff32" strokeWidth="4.6" strokeLinecap="round" />
      <path d="M11.6 9.9 L19.4 14.2 L11.6 18.5 Z" fill="#8257ff" />
    </svg>
  );
}
