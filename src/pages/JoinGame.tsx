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
        if (g && g.status === "lobby") {
          setGameFound(true);
          setError("");
          setStep("name");
        } else if (g) {
          setError("Game already in progress");
          setGameFound(false);
        } else {
          setError("Game not found. Check the PIN.");
          setGameFound(false);
        }
      });
    }
  }, [pin]);

  const handleJoin = async () => {
    if (!gameFound || !name.trim() || joining) return;
    setJoining(true);
    setError("");
    try {
      const game = await getGameByPin(pin);
      if (!game) { setError("Game not found"); return; }
      const playerId = await joinGame(game.id, name.trim(), false);
      localStorage.setItem(`quizplay_player_${game.id}`, playerId);
      navigate(`/game/${game.id}/play`);
    } catch (e: any) {
      setError(e.message || "Failed to join game");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-kahoot-red/10 animate-float" />
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-kahoot-blue/10 animate-float" style={{ animationDelay: "0.7s" }} />
        <div className="absolute bottom-20 left-1/4 w-20 h-20 rounded-full bg-kahoot-yellow/10 animate-float" style={{ animationDelay: "1.2s" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative">
        <button onClick={() => navigate("/")} className="text-white/50 hover:text-white transition-colors mb-6 block">← Back to Home</button>

        <div className="card-glass rounded-3xl p-8">
          {step === "pin" ? (
            <>
              <div className="text-center mb-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl kahoot-gradient flex items-center justify-center">
                  <span className="text-4xl">🎮</span>
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">Join a Game</h1>
                <p className="text-white/50">Enter the 6-digit game PIN</p>
              </div>

              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div key={i} className={`w-14 h-16 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${pin.length > i ? "bg-primary/40 border-2 border-primary-light" : "bg-white/5 border-2 border-white/10"}`}
                    animate={pin.length === i ? { scale: [1, 1.05, 1] } : {}} transition={{ duration: 1, repeat: Infinity }}>
                    {pin[i] || ""}
                  </motion.div>
                ))}
              </div>

              <input type="text" value={pin} onChange={(e) => { const val = e.target.value.replace(/\D/g, "").slice(0, 6); setPin(val); }}
                placeholder="Enter PIN here" autoFocus maxLength={6}
                className="w-full bg-white/10 rounded-xl px-5 py-4 text-center text-2xl font-mono tracking-[0.3em] outline-none focus:ring-2 focus:ring-primary placeholder:text-white/20 text-white" />

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-kahoot-red text-sm text-center mt-4">{error}</motion.p>}
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-kahoot-green/30 flex items-center justify-center">
                  <span className="text-4xl">✓</span>
                </motion.div>
                <h1 className="text-3xl font-bold mb-2">What's your name?</h1>
                <p className="text-white/50">Other players will see this during the game</p>
              </div>

              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your nickname" autoFocus maxLength={20}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleJoin(); }}
                className="w-full bg-white/10 rounded-xl px-5 py-4 text-xl text-center outline-none focus:ring-2 focus:ring-primary placeholder:text-white/20 text-white mb-6" />

              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-kahoot-red text-sm text-center mb-4">{error}</motion.p>}

              <div className="flex gap-3">
                <button onClick={() => { setStep("pin"); setPin(""); setError(""); setGameFound(false); }}
                  className="px-4 py-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-medium">←</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleJoin} disabled={!name.trim() || joining}
                  className="flex-1 px-6 py-4 rounded-xl kahoot-gradient font-bold disabled:opacity-30">
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
