import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getPlayers, startGame, subscribeToPlayers, subscribeToGame, type Player } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function Lobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamePin, setGamePin] = useState("");
  const [copied, setCopied] = useState(false);

  const hostPlayerId = localStorage.getItem(`quizplay_player_${gameId}`);
  const isHost = players.find((p) => p.id === hostPlayerId)?.is_host ?? false;

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then((g) => { if (g) setGamePin(g.pin); });
    const unsubGame = subscribeToGame(gameId, (game) => {
      if (game.status !== "lobby") navigate(isHost ? `/game/${gameId}/host` : `/game/${gameId}/play`);
    });
    const unsubPlayers = subscribeToPlayers(gameId, setPlayers);
    return () => { unsubGame(); unsubPlayers(); };
  }, [gameId, navigate, isHost]);

  const handleStartGame = async () => { if (players.length < 1 || !gameId) return; try { await startGame(gameId); } catch (e) { console.error(e); } };
  const copyPin = async () => { try { await navigator.clipboard.writeText(gamePin); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
  const copyLink = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#/join?pin=${gamePin}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };

  if (players.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
        <div className="card-glass rounded-3xl p-10 text-center">
          <p className="text-white/40 text-sm uppercase tracking-widest mb-3">Game PIN</p>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center justify-center gap-2.5 mb-3">
            {gamePin.split("").map((d, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl brand-gradient flex items-center justify-center text-2xl sm:text-3xl font-black shadow-lg shadow-primary/20">{d}</motion.div>
            ))}
          </motion.div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <button onClick={copyPin} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">{copied ? "✓ Copied" : "📋 Copy PIN"}</button>
            <button onClick={copyLink} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors">🔗 Copy Link</button>
          </div>
          <p className="text-white/25 text-xs mb-8">Share with players to join</p>

          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="font-bold">Players</span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-xs font-bold">{players.length}</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-sm font-bold shrink-0">{p.name.charAt(0).toUpperCase()}</div>
                    <span className="font-medium flex-1 text-left text-sm">{p.name}{p.is_host && <span className="ml-2 text-xs text-amber-500">★ Host</span>}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div key={i} className="w-2 h-2 rounded-full bg-primary-light" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
              ))}
            </div>
            <p className="text-white/25 text-xs mt-2">Waiting for host to start...</p>
          </div>

          {isHost ? (
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleStartGame}
              className="w-full px-6 py-4 rounded-2xl brand-gradient text-lg font-bold shadow-xl shadow-primary/25">
              Start Game ({players.length} player{players.length !== 1 ? "s" : ""}) 🚀
            </motion.button>
          ) : (
            <p className="text-white/25 text-sm">Only the host can start</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
