import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl kahoot-gradient flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <span className="text-xl font-black">Q</span>
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:block">
            QuizPlay
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/join"
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              location.pathname === "/join"
                ? "bg-white/15 text-white"
                : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            }`}
          >
            Join Game
          </Link>
          <Link
            to="/admin"
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              isAdmin
                ? "kahoot-gradient shadow-lg shadow-primary/30"
                : "kahoot-gradient opacity-80 hover:opacity-100 hover:shadow-lg hover:shadow-primary/30"
            }`}
          >
            Admin
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
