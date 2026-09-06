import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getGame, getPlayers, startGame, subscribeToPlayers, subscribeToGame, type Player } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { PlayIcon } from "../components/Icons";
import JoinPanel from "../components/JoinPanel";

export default function Lobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamePin, setGamePin] = useState("");

  const hostPlayerId = localStorage.getItem(`quizplay_player_${gameId}`);
  const isHost = players.find((p) => p.id === hostPlayerId)?.is_host ?? false;
  // The host sits in the players table but is not competing, so every count
  // shown to the room excludes them.
  const playerCount = players.filter((p) => !p.is_host).length;

  useEffect(() => {
    if (!gameId) return;
    getGame(gameId).then((g) => { if (g) setGamePin(g.pin); });
    const unsubGame = subscribeToGame(gameId, (game) => {
      if (game.status !== "lobby") navigate(isHost ? `/game/${gameId}/host` : `/game/${gameId}/play`);
    });
    const unsubPlayers = subscribeToPlayers(gameId, setPlayers);
    return () => { unsubGame(); unsubPlayers(); };
  }, [gameId, navigate, isHost]);

  const handleStartGame = async () => { if (playerCount < 1 || !gameId) return; try { await startGame(gameId); } catch (e) { console.error(e); } };

  if (players.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="card rounded-2xl p-8 text-center sm:p-10">
          <div className="mb-8">
            <JoinPanel pin={gamePin} />
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="font-display font-semibold text-white">Players</span>
              <span className="rounded-full bg-lime/20 px-2.5 py-0.5 text-xs font-bold tabular-nums text-lime">{playerCount}</span>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-light to-primary flex items-center justify-center text-sm font-bold shrink-0">{p.name.charAt(0).toUpperCase()}</div>
                    <span className="font-medium flex-1 text-left text-sm">{p.name}{p.is_host && <span className="ml-2 rounded-md bg-lime/15 px-1.5 py-0.5 text-[11px] font-semibold text-lime">Host</span>}</span>
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
            <p className="mt-2 text-xs text-slate-400">
              {isHost ? "Players can keep joining until you start" : "Waiting for the host to start…"}
            </p>
          </div>

          {isHost ? (
            <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleStartGame}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-semibold">
              <PlayIcon size={18} />
              Start game ({playerCount} player{playerCount !== 1 ? "s" : ""})
            </motion.button>
          ) : (
            <p className="text-sm text-slate-400">Only the host can start</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
