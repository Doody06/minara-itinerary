import { Link, useLocation } from "react-router-dom";

export function Navbar() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all ${isHome ? "bg-transparent" : "bg-card/90 backdrop-blur-md border-b border-border shadow-sm"}`}>
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="font-display text-2xl font-bold tracking-wide text-primary">
          MINARA
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Home</Link>
          <Link to="/plan" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">Plan a Trip</Link>
          <Link to="/faq" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">FAQ</Link>
        </div>
      </div>
    </nav>
  );
}
