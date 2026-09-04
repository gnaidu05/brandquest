import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppError, getGameByPin, joinGame } from "../lib/api";
import { motion } from "framer-motion";

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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-[10%] w-40 h-40 rounded-full bg-kahoot-red/8 blur-2xl animate-float" />
        <div className="absolute top-40 right-[15%] w-32 h-32 rounded-full bg-kahoot-blue/8 blur-2xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-kahoot-yellow/8 blur-2xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <button
          onClick={() => navigate("/")}
          className={`text-white/50 hover:text-white transition-colors mb-6 flex items-center gap-1 text-sm rounded-lg ${focusRing}`}
        >
          ← Back to Home
        </button>

        <div className="card-glass rounded-3xl p-10">
          {step === "pin" ? (
            <>
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-2xl kahoot-gradient flex items-center justify-center shadow-xl shadow-primary/20">
                  <span className="text-4xl">🎮</span>
                </motion.div>
                <h1 className="text-3xl font-black mb-2 tracking-tight">Join a Game</h1>
                <p className="text-white/60">Enter the 6-digit game PIN</p>
              </div>

              <div className="flex justify-center gap-3 mb-8" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                    pinError && pin.length > i
                      ? "bg-kahoot-red/20 border-2 border-kahoot-red/50"
                      : pin.length > i
                        ? "bg-primary/30 border-2 border-primary/50"
                        : "bg-white/[0.03] border-2 border-white/5"
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
                className={`w-full bg-white/5 border rounded-xl px-5 py-4 text-center text-2xl font-mono tracking-[0.4em] outline-none focus:ring-1 placeholder:text-white/20 text-white ${
                  pinError
                    ? "border-kahoot-red/60 focus:border-kahoot-red focus:ring-kahoot-red/30"
                    : "border-white/10 focus:border-primary/50 focus:ring-primary/30"
                }`}
              />

              <div id="pin-status" role="status" aria-live="polite" className="min-h-[1.75rem] mt-4 text-sm text-center">
                {lookup.status === "checking" && <span className="text-white/60">Checking PIN…</span>}
                {pinError && (
                  <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-kahoot-red-light">
                    {pinError}
                  </motion.p>
                )}
              </div>

              {/* Only a failed request is worth retrying — a PIN the server
                  answered for needs a different PIN, not another attempt. */}
              {lookup.status === "failed" && (
                <button
                  onClick={() => setAttempt((n) => n + 1)}
                  className={`w-full mt-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold transition-colors ${focusRing}`}
                >
                  Try again
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-kahoot-green/20 border border-kahoot-green/30 flex items-center justify-center">
                  <span className="text-4xl">✓</span>
                </motion.div>
                <h1 className="text-3xl font-black mb-2 tracking-tight">What's your name?</h1>
                <p className="text-white/60">Other players will see this during the game</p>
              </div>

              <input
                type="text"
                aria-label="Your nickname"
                value={name}
                onChange={(e) => { setName(e.target.value); if (joinError) setJoinError(""); }}
                placeholder="Your nickname" autoFocus maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleJoin(); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-xl text-center outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/20 text-white mb-4"
              />

              <div role="alert" className="min-h-[1.5rem] mb-2 text-sm text-center">
                {joinError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-kahoot-red-light">
                    {joinError}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={backToPin}
                  aria-label="Back to PIN entry"
                  className={`px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors font-medium ${focusRing}`}
                >
                  ←
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleJoin}
                  disabled={!name.trim() || joining}
                  className={`flex-1 px-6 py-4 rounded-xl kahoot-gradient font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 ${focusRing}`}
                >
                  {joining ? "Joining…" : "Join Game →"}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
