import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import TopBar from "./components/layout/TopBar";
import BottomNav from "./components/layout/BottomNav";
import Footer from "./components/Footer";
import MapScreen from "./components/MapScreen";
import ReportsPage from "./components/ReportsPage";
import StatsPage from "./components/StatsPage";
import AboutPage from "./components/AboutPage";

// Scrollable page under the floating top bar, with room for the mobile bottom nav.
function Page({ children }) {
  return (
    <main className="min-h-dvh pt-[92px] pb-[120px] md:pb-10">
      {children}
      <Footer />
    </main>
  );
}

// Old CleanCity links (/map#focus=<id>) → new map URL (/?r=<id>).
function LegacyMapRedirect() {
  const { hash, search } = useLocation();
  const id = new URLSearchParams(search).get("focus") || (hash.match(/focus=([^&]+)/) || [])[1];
  return <Navigate to={id ? `/?r=${id}` : "/"} replace />;
}

export default function App() {
  return (
    <>
      <TopBar />
      <Routes>
        <Route path="/" element={<MapScreen />} />
        <Route path="/map" element={<LegacyMapRedirect />} />
        <Route path="/reports" element={<Page><ReportsPage /></Page>} />
        <Route path="/stats" element={<Page><StatsPage /></Page>} />
        <Route path="/about" element={<Page><AboutPage /></Page>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}
