import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "../../src/index.css";
import App from "../../src/App";
import { counterReviewFeatures } from "../../src/features/counter/review";

/** Only test routing is injected: auth, review and API transport use actual same-origin backend/session/CSRF, with no mock ports. */
createRoot(document.getElementById("root")!).render(
  <MemoryRouter initialEntries={["/staff/registrations"]}>
    <App features={counterReviewFeatures} />
  </MemoryRouter>,
);
