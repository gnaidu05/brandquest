import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl kahoot-gradient flex items-center justify-center">
            <span className="text-xl font-bold">Q</span>
          </div>
          <span className="text-xl font-bold tracking-tight">
            QuizPlay
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium text-sm"
          >
            Join Game
          </Link>
          <Link
            to="/admin"
            className="px-4 py-2 rounded-lg kahoot-gradient hover:opacity-90 transition-opacity font-medium text-sm"
          >
            Admin
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
