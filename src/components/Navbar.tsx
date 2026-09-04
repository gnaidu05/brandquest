import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isJoin = location.pathname === "/join";
  const [scrolled, setScrolled] = useState(false);

  // The bar is fixed, so page content scrolls underneath it. Fade in a glass
  // backdrop once the page moves to keep the links readable over the content.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkBase =
    "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark";

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 transition-colors duration-300 ${
        scrolled
          ? "bg-bg-dark/80 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between py-3.5">
        <Link
          to="/"
          className="flex items-center gap-3 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          <div className="w-10 h-10 rounded-xl kahoot-gradient flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <span className="text-xl font-black">Q</span>
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:block">
            QuizPlay
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/join"
            aria-current={isJoin ? "page" : undefined}
            className={`${linkBase} ${
              isJoin
                ? "bg-white/15 text-white"
                : "bg-white/5 hover:bg-white/10 text-white/80 hover:text-white"
            }`}
          >
            Join Game
          </Link>
          <Link
            to="/admin"
            aria-current={isAdmin ? "page" : undefined}
            className={`${linkBase} kahoot-gradient text-white ${
              isAdmin
                ? "shadow-lg shadow-primary/30"
                : "opacity-90 hover:opacity-100 hover:shadow-lg hover:shadow-primary/30"
            }`}
          >
            Admin
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
