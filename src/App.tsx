import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { BottomNav, PageLayout, TopBar } from "@/components/layout";
import { MapScreen } from "@/components/map";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AboutPage, AirPage, ReportsPage, StatsPage } from "@/pages";

/** Old CleanCity links (/map#focus=<id>) → new map URL (/?r=<id>). */
function LegacyMapRedirect() {
  const { hash, search } = useLocation();
  const id = new URLSearchParams(search).get("focus") || hash.match(/focus=([^&]+)/)?.[1];
  return <Navigate to={id ? `/?r=${id}` : "/"} replace />;
}

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <TopBar />
      <Routes>
        <Route path="/" element={<MapScreen />} />
        <Route path="/map" element={<LegacyMapRedirect />} />
        <Route path="/reports" element={<PageLayout><ReportsPage /></PageLayout>} />
        <Route path="/air" element={<PageLayout><AirPage /></PageLayout>} />
        <Route path="/stats" element={<PageLayout><StatsPage /></PageLayout>} />
        <Route path="/about" element={<PageLayout><AboutPage /></PageLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
