import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="min-h-screen flex items-center justify-center font-poppins text-[color:hsl(var(--game-text))] p-4"
      style={{ background: "var(--gradient-game-bg)" }}
    >
      <div
        className="rounded-3xl p-8 backdrop-blur-md text-center max-w-md w-full space-y-4"
        style={{
          background: "hsla(var(--game-card-bg), 0.8)",
          border: "2px solid hsl(var(--game-border))",
          boxShadow: "var(--game-card-shadow)",
        }}
      >
        <h1
          className="text-6xl font-bold"
          style={{
            background: "var(--gradient-game-title)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </h1>
        <p className="text-xl opacity-80">Diese Seite gibt es nicht.</p>
        <Link to="/">
          <Button className="w-full text-lg py-4" style={{ background: "var(--gradient-button-primary)" }}>
            🏠 Zurück zum Start
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
