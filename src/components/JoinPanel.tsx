import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { ArrowRightIcon, CheckIcon, CopyIcon, LinkIcon } from "./Icons";

/**
 * Everything a room needs to get into the game: the PIN at a size that reads
 * from the back, a QR that lands on the join page with the PIN already filled
 * in, and the plain URL for anyone who would rather type it.
 */

/** Where a player should land for this PIN. The app uses HashRouter. */
export function joinUrlFor(pin: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join?pin=${pin}`;
}

/** The same URL without the scheme — shorter to read off a screen. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  // Level M tolerates a projector's glare and a phone camera at an angle while
  // staying coarse enough to scan from a few metres back.
  const { path, count } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    // One path for every dark module beats thousands of <rect> nodes.
    let d = "";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
      }
    }
    return { path: d, count: n };
  }, [value]);

  const quiet = 4; // the spec's required quiet zone, in modules
  const box = count + quiet * 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      shapeRendering="crispEdges"
      className="rounded-xl"
      role="img"
      aria-label="QR code to join this game"
    >
      {/* Scanners need a light field behind the modules, whatever the page is. */}
      <rect width={box} height={box} fill="#ffffff" />
      <g transform={`translate(${quiet} ${quiet})`}>
        <path d={path} fill="#0a0f1a" />
      </g>
    </svg>
  );
}

export default function JoinPanel({ pin }: { pin: string }) {
  const [copied, setCopied] = useState<"pin" | "link" | null>(null);
  const url = joinUrlFor(pin);

  const copy = async (what: "pin" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "pin" ? pin : url);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard is unavailable over plain http and in some embedded views;
      // the PIN and URL are both on screen, so there is nothing to recover.
    }
  };

  const btn =
    "btn-ghost inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6" aria-label="How to join">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-7">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">Game PIN</p>
          <p className="font-display mb-3 font-bold tabular-nums leading-none text-white text-[2.75rem] tracking-[0.14em] sm:text-6xl">
            {pin || "······"}
          </p>
          <p className="mb-4 text-sm leading-relaxed text-slate-300">
            Scan the code, or go to{" "}
            <span className="font-medium text-lime">{displayUrl(url).split("#")[0]}</span>{" "}
            and enter the PIN.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <button onClick={() => copy("pin")} className={btn}>
              {copied === "pin" ? <><CheckIcon size={13} /> Copied</> : <><CopyIcon size={13} /> Copy PIN</>}
            </button>
            <button onClick={() => copy("link")} className={btn}>
              {copied === "link" ? <><CheckIcon size={13} /> Copied</> : <><LinkIcon size={13} /> Copy link</>}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={btn}
              title="Open the join page for this PIN in a new tab"
            >
              Open join page <ArrowRightIcon size={13} />
            </a>
          </div>
        </div>

        {pin && (
          <div className="shrink-0 rounded-xl bg-white p-2.5 shadow-lg shadow-black/30">
            <QrCode value={url} size={156} />
          </div>
        )}
      </div>
    </section>
  );
}
