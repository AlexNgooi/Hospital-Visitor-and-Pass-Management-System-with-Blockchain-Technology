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
import { counterReviewFeatures } from "./features/counter/review";
import { counterLifecycleFeatures, adminInventoryFeatures } from "./features/counter/lifecycle";
import { administrationFeatures } from "./features/administration";

// Compose reviewed modules under their existing role gates; ADMIN inventory never inherits staff issue/return authority.
// Entry fragment capture above still runs before rendering or authenticated API activity.
const applicationFeatures = [
  ...registrationFeatures,
  ...counterReviewFeatures,
  ...counterLifecycleFeatures,
  ...adminInventoryFeatures,
  ...administrationFeatures,
];

// Capture/clear the entry fragment before React bootstrap or any API request runs.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App features={applicationFeatures} />
    </BrowserRouter>
  </StrictMode>,
);
