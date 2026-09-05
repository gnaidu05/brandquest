import { useEffect, useState } from "react";

/**
 * True below Tailwind's `sm` breakpoint. For sizes that have to be numbers
 * (an SVG's width, say) and so cannot be expressed as a responsive class.
 */
export function useIsNarrow(maxWidth = 640): boolean {
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth < maxWidth,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [maxWidth]);

  return narrow;
}
