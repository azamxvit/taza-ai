import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./styles/index.css";
import "./i18n";
import App from "./App";
import { ReportsProvider } from "./context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ReportsProvider>
        <App />
      </ReportsProvider>
    </BrowserRouter>
  </StrictMode>
);
