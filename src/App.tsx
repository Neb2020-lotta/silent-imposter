import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Room from "./pages/Room";
import Local from "./pages/Local";
import Instructions from "./pages/Instructions";
import AIMode from "./pages/AIMode";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { useSettings } from "@/lib/settings";
import { applyTheme } from "@/lib/themes";
import { applyAccentColor } from "@/lib/color";

const queryClient = new QueryClient();

function AnimationsRoot({ children }: { children: React.ReactNode }) {
  const { animations, theme, accentColor } = useSettings();
  useEffect(() => {
    document.documentElement.classList.toggle("no-anim", !animations);
  }, [animations]);
  useEffect(() => {
    applyTheme(theme);
    // Re-apply accent after theme change so the user override persists across themes.
    applyAccentColor(accentColor);
  }, [theme, accentColor]);
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AnimationsRoot>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/room/:code" element={<Room />} />
            <Route path="/local" element={<Local />} />
            <Route path="/ai" element={<AIMode />} />
            <Route path="/instructions" element={<Instructions />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AnimationsRoot>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
