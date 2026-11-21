import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "leaflet/dist/leaflet.css";
import "./leafletIcon"; // fix + register colored markers
import App from "./App.jsx";
import { ReportsProvider } from "./context/ReportsContext";
import { startFaviconCycle } from "./favicon";

// Cycle the tab favicon through 1.png / 2.png / 3.png (cache-busted so it swaps).
startFaviconCycle(["/1.png", "/2.png", "/3.png"], 3000);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ReportsProvider>
        <App />
      </ReportsProvider>
    </BrowserRouter>
  </StrictMode>
);
