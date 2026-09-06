import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppError, getGameByPin, joinGame } from "../lib/api";
import { motion } from "framer-motion";
import { ArrowRightIcon, CheckIcon, KeyIcon, LogoMark } from "../components/Icons";

/** Where the PIN lookup stands. `failed` is the only retryable state. */
type Lookup =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "found"; gameId: string }
  | { status: "rejected"; message: string }
  | { status: "failed"; message: string };

/** fetch has no default timeout, and supabase-js retries internally before it
 *  gives up, so an unreachable server can leave the lookup pending for a long
 *  time — or forever. Bound it so the user always gets an answer. */
const LOOKUP_TIMEOUT_MS = 6000;
const JOIN_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Only messages the app wrote for a player are shown as-is. Postgres errors and
 * raw fetch failures ("duplicate key value violates unique constraint",
 * "TypeError: Failed to fetch") stay in the console where they are useful.
 */
function messageFor(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error && e.message === "timeout")
    return "That took too long. Check your connection and try again.";
  return "Couldn't join the game. Check your connection and try again.";
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark";

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(() => (searchParams.get("pin") ?? "").replace(/\D/g, "").slice(0, 6));
  const [name, setName] = useState("");
  // Always start on the PIN step. A ?pin= deep link advances only once the
  // lookup confirms the game, so a stale or mistyped link can never present
  // the name step as though a game had been found.
  const [step, setStep] = useState<"pin" | "name">("pin");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  // Bumped on every lookup so a slow response for an older PIN cannot
  // overwrite the result for the one currently in the box.
  const requestId = useRef(0);

  useEffect(() => {
    const paramPin = (searchParams.get("pin") ?? "").replace(/\D/g, "").slice(0, 6);
    if (paramPin) setPin(paramPin);
  }, [searchParams]);

  useEffect(() => {
    if (pin.length !== 6) {
      requestId.current++;
      setLookup({ status: "idle" });
      return;
    }

    const id = ++requestId.current;
    setLookup({ status: "checking" });

    withTimeout(getGameByPin(pin), LOOKUP_TIMEOUT_MS)
      .then((game) => {
        if (id !== requestId.current) return;
        if (!game) {
          setLookup({ status: "rejected", message: "No game found with that PIN. Check the digits and try again." });
        } else if (game.status !== "lobby") {
          setLookup({
            status: "rejected",
            message:
              game.status === "finished"
                ? "That game has already finished."
                : "That game is already in progress, so it can't be joined.",
          });
        } else {
          setLookup({ status: "found", gameId: game.id });
          setStep("name");
        }
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        // The lookup itself failed, so we cannot say whether the PIN is valid.
        console.error("PIN lookup failed", e);
        setLookup({ status: "failed", message: "Couldn't check that PIN. Check your connection and try again." });
      });
  }, [pin, attempt]);

  const handleJoin = async () => {
    if (lookup.status !== "found" || !name.trim() || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const playerId = await withTimeout(joinGame(lookup.gameId, name.trim(), false), JOIN_TIMEOUT_MS);
      localStorage.setItem(`quizplay_player_${lookup.gameId}`, playerId);
      navigate(`/game/${lookup.gameId}/play`);
    } catch (e) {
      console.error("Join failed", e);
      setJoinError(messageFor(e));
    } finally {
      setJoining(false);
    }
  };

  const backToPin = () => {
    requestId.current++;
    setStep("pin");
    setPin("");
    setName("");
    setJoinError("");
    setLookup({ status: "idle" });
  };

  const pinError = lookup.status === "rejected" || lookup.status === "failed" ? lookup.message : "";

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="pointer-events-none fixed inset-0 bg-grid" aria-hidden="true" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate("/")}
          className={`mb-6 inline-flex items-center gap-2 rounded-lg text-sm text-slate-400 transition-colors hover:text-white ${focusRing}`}
        >
          <ArrowRightIcon size={15} className="rotate-180" />
          Back to home
        </button>

        <div className="card rounded-2xl p-8 shadow-2xl shadow-black/40 sm:p-10">
          {step === "pin" ? (
            <>
              <div className="text-center mb-10">
                <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-lime">
                  <KeyIcon size={24} />
                </span>
                <h1 className="font-display mb-2 text-2xl font-bold tracking-tight text-white">Join a game</h1>
                <p className="text-sm text-slate-400">Enter the six-digit PIN from your host</p>
              </div>

              <div className="flex justify-center gap-3 mb-8" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                    pinError && pin.length > i
                      ? "border-2 border-punch/50 bg-punch/15 text-white"
                      : pin.length > i
                        ? "border-2 border-lime/50 bg-lime/15 text-white"
                        : "border-2 border-white/8 bg-white/[0.02] text-slate-500"
                  }`}
                    animate={pin.length === i ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}>
                    {pin[i] || ""}
                  </motion.div>
                ))}
              </div>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label="Game PIN"
                aria-invalid={pinError ? true : undefined}
                aria-describedby={pinError ? "pin-status" : undefined}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" autoFocus maxLength={6}
                className={`w-full bg-white/5 border rounded-xl px-5 py-4 text-center text-2xl font-mono tracking-[0.4em] outline-none focus:ring-1 text-white placeholder:text-slate-600 ${
                  pinError
                    ? "border-punch/60 focus:border-punch focus:ring-punch/30"
                    : "border-white/12 focus:border-lime/60 focus:ring-lime/30"
                }`}
              />

              <div id="pin-status" role="status" aria-live="polite" className="min-h-[1.75rem] mt-4 text-sm text-center">
                {lookup.status === "checking" && <span className="text-slate-400">Checking PIN…</span>}
                {pinError && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-punch">
                    {pinError}
                  </motion.p>
                )}
              </div>

              {/* Only a failed request is worth retrying — a PIN the server
                  answered for needs a different PIN, not another attempt. */}
              {lookup.status === "failed" && (
                <button
                  onClick={() => setAttempt((n) => n + 1)}
                  className={`w-full mt-2 px-5 py-3 rounded-xl btn-ghost font-semibold text-white ${focusRing}`}
                >
                  Try again
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <motion.span
                  initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 16 }}
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-lime/30 bg-lime/15 text-lime"
                >
                  <CheckIcon size={26} />
                </motion.span>
                <h1 className="font-display mb-2 text-2xl font-bold tracking-tight text-white">You're in — what's your name?</h1>
                <p className="text-sm text-slate-400">Other players will see this on the leaderboard</p>
              </div>

              <input
                type="text"
                aria-label="Your nickname"
                value={name}
                onChange={(e) => { setName(e.target.value); if (joinError) setJoinError(""); }}
                placeholder="Your nickname" autoFocus maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleJoin(); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-xl text-center outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 text-white placeholder:text-slate-600 mb-4"
              />

              <div role="alert" className="min-h-[1.5rem] mb-2 text-sm text-center">
                {joinError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-punch">
                    {joinError}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={backToPin}
                  aria-label="Back to PIN entry"
                  className={`btn-ghost inline-flex items-center justify-center rounded-xl px-5 py-3.5 font-medium text-white ${focusRing}`}
                >
                  <ArrowRightIcon size={18} className="rotate-180" />
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleJoin}
                  disabled={!name.trim() || joining}
                  className={`btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${focusRing}`}
                >
                  {joining ? "Joining…" : <>Join game <ArrowRightIcon size={16} /></>}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
