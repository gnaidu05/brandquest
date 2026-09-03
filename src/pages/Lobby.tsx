import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlayers, startGame, subscribeToPlayers, subscribeToGame, type Player } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Lobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);

  const hostPlayerId = localStorage.getItem(`quizplay_player_${gameId}`);
  const isHost = players.find((p) => p.id === hostPlayerId)?.is_host ?? false;

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = subscribeToGame(gameId, (game) => {
      if (game.status !== "lobby") {
        navigate(isHost ? `/game/${gameId}/host` : `/game/${gameId}/play`);
      }
    });
    const unsubPlayers = subscribeToPlayers(gameId, setPlayers);
    return () => { unsubGame(); unsubPlayers(); };
  }, [gameId, navigate, isHost]);

  const handleStartGame = async () => {
    if (players.length < 1 || !gameId) return;
    try { await startGame(gameId); } catch (e) { console.error(e); }
  };

  const copyPin = async () => {
    // Extract pin from game - we need to get it from the game data
    // For now copy the gameId as fallback
    try {
      await navigator.clipboard.writeText(gameId || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  if (players.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="card-glass rounded-3xl p-8 text-center">
          <div className="mb-8">
            <p className="text-white/50 text-lg mb-2">Game PIN</p>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center justify-center gap-3">
              <div className="flex gap-2">
                {gameId?.slice(-6).split("").map((digit, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="w-16 h-20 rounded-xl kahoot-gradient flex items-center justify-center text-3xl font-black">{digit}</motion.div>
                ))}
              </div>
              <button onClick={copyPin} className="ml-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                {copied ? "✓" : "📋"}
              </button>
            </motion.div>
            {copied && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-kahoot-green text-sm mt-2">Copied!</motion.p>}
            <p className="text-white/30 text-sm mt-3">Share this PIN with players to join</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-lg font-bold">Players</span>
              <span className="px-2 py-0.5 rounded-full bg-primary/30 text-sm font-bold">{players.length}</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2">
              <AnimatePresence>
                {players.map((player, i) => (
                  <motion.div key={player.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center font-bold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium flex-1 text-left">
                      {player.name}
                      {player.is_host && <span className="ml-2 text-xs text-kahoot-yellow">★ Host</span>}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-3 h-3 rounded-full bg-primary-light"
                  animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
              ))}
            </div>
            <p className="text-white/30 text-sm mt-2">Waiting for the host to start the game...</p>
          </div>

          {isHost ? (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStartGame}
              className="w-full px-6 py-4 rounded-2xl kahoot-gradient text-xl font-bold shadow-lg shadow-primary/30">
              Start Game with {players.length} Player{players.length !== 1 ? "s" : ""} 🚀
            </motion.button>
          ) : (
            <div className="text-center text-white/40">Only the host can start the game</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
