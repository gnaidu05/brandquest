import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogoMark } from "./Icons";

export default function Navbar() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isJoin = location.pathname === "/join";
  const [scrolled, setScrolled] = useState(false);

  // The bar is fixed, so page content scrolls underneath it. Fade in a
  // backdrop once the page moves to keep the links readable over content.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link =
    "inline-flex min-h-11 items-center rounded-lg px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 px-6 transition-colors duration-300 ${
        scrolled ? "border-b border-white/10 bg-ink-950/85 backdrop-blur-xl" : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between py-3.5" aria-label="Main">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light"
        >
          <LogoMark size={34} />
          <span className="font-display text-lg font-semibold tracking-tight text-white">QuizPlay</span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            to="/join"
            aria-current={isJoin ? "page" : undefined}
            className={`${link} ${isJoin ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
          >
            Join a game
          </Link>
          <Link
            to="/admin"
            aria-current={isAdmin ? "page" : undefined}
            className={`${link} btn-primary px-4 font-semibold ${isAdmin ? "ring-1 ring-white/25" : ""}`}
          >
            Host
          </Link>
        </div>
      </nav>
    </header>
  );
}
