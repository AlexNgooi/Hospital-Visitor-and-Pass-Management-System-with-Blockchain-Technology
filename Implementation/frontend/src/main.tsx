import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "./index.css";
import App from "./App.tsx";
import "./app/entry";
import { registrationFeatures } from "./features/registration";

// Capture/clear the entry fragment before React bootstrap or any API request runs.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App features={registrationFeatures} />
    </BrowserRouter>
  </StrictMode>,
);
