import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getGameByPin, joinGame } from "../lib/api";
import { motion } from "framer-motion";

export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [name, setName] = useState("");
  const [step, setStep] = useState<"pin" | "name">(searchParams.get("pin") ? "name" : "pin");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [gameFound, setGameFound] = useState(false);

  useEffect(() => {
    if (searchParams.get("pin")) setPin(searchParams.get("pin")!);
  }, [searchParams]);

  useEffect(() => {
    if (pin.length === 6) {
      getGameByPin(pin).then((g) => {
        if (g && g.status === "lobby") { setGameFound(true); setError(""); setStep("name"); }
        else if (g) { setError("Game already in progress"); setGameFound(false); }
        else { setError("Game not found. Check the PIN."); setGameFound(false); }
      });
    } else { setGameFound(false); }
  }, [pin]);

  const handleJoin = async () => {
    if (!gameFound || !name.trim() || joining) return;
    setJoining(true); setError("");
    try {
      const game = await getGameByPin(pin);
      if (!game) { setError("Game not found"); return; }
      const playerId = await joinGame(game.id, name.trim(), false);
      localStorage.setItem(`quizplay_player_${game.id}`, playerId);
      navigate(`/game/${game.id}/play`);
    } catch (e: any) { setError(e.message || "Failed to join"); } finally { setJoining(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-[10%] w-40 h-40 rounded-full bg-kahoot-red/8 blur-2xl animate-float" />
        <div className="absolute top-40 right-[15%] w-32 h-32 rounded-full bg-kahoot-blue/8 blur-2xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-kahoot-yellow/8 blur-2xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        <button onClick={() => navigate("/")} className="text-white/30 hover:text-white transition-colors mb-6 flex items-center gap-1 text-sm">← Back to Home</button>

        <div className="card-glass rounded-3xl p-10">
          {step === "pin" ? (
            <>
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-2xl kahoot-gradient flex items-center justify-center shadow-xl shadow-primary/20">
                  <span className="text-4xl">🎮</span>
                </motion.div>
                <h1 className="text-3xl font-black mb-2 tracking-tight">Join a Game</h1>
                <p className="text-white/40">Enter the 6-digit game PIN</p>
              </div>

              <div className="flex justify-center gap-3 mb-8">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${pin.length > i ? "bg-primary/30 border-2 border-primary/50" : "bg-white/[0.03] border-2 border-white/5"}`}
                    animate={pin.length === i ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}>
                    {pin[i] || ""}
                  </motion.div>
                ))}
              </div>

              <input type="text" value={pin} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setPin(v); }}
                placeholder="000000" autoFocus maxLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-center text-2xl font-mono tracking-[0.4em] outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/10 text-white" />

              {error && <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-kahoot-red text-sm text-center mt-4">{error}</motion.p>}
            </>
          ) : (
            <>
              <div className="text-center mb-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 150, damping: 12 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-kahoot-green/20 border border-kahoot-green/30 flex items-center justify-center">
                  <span className="text-4xl">✓</span>
                </motion.div>
                <h1 className="text-3xl font-black mb-2 tracking-tight">What's your name?</h1>
                <p className="text-white/40">Other players will see this during the game</p>
              </div>

              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your nickname" autoFocus maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleJoin(); }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-xl text-center outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 placeholder:text-white/15 text-white mb-6" />

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-kahoot-red text-sm text-center mb-4">{error}</motion.p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep("pin"); setPin(""); setError(""); setGameFound(false); }}
                  className="px-5 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-colors font-medium">←</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleJoin} disabled={!name.trim() || joining}
                  className="flex-1 px-6 py-4 rounded-xl kahoot-gradient font-bold disabled:opacity-30 shadow-lg shadow-primary/20">
                  {joining ? "Joining..." : "Join Game →"}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
