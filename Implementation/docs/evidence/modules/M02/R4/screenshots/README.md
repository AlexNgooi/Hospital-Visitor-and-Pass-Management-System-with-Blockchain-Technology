# R4 compact viewport visual receipt

Source d6ebe1f, actual MySQL/servlet/Vite with synthetic records. Captured 2026-10-09 18:35:45+08. QR pixels are deliberately hidden by temporary CSS only during screenshots; actual PNG original/resized decode is performed in memory separately. No token/cookie/PII is delivered.

| Images | Size / state |
|---|---|
| live-display-desktop.png / live-display-desktop1440.png | 1366×768 / 1440×900, entire default document fits, 280px QR and 44px Full screen/Revoke controls |
| live-display-mobile.png | 375×812, entire default document fits, 260px QR/countdown/actions, visible deadlines/safety, collapsed guidance |
| live-guidance-expanded-mobile.png | Keyboard Enter opened complete guidance with visible focus; safe vertical scrolling |
| live-display-short-screen.png / live-display-mobile-zoom200.png | Short375×568 / CSSzoom200; safe scrolling, no horizontal clipping, content retained |
| revoke-unknown-hidden.png / revoke-unknown-counter-changed.png | 375×812 compact recovery; original display counter and 44px Retry remain first-screen after counter switch |
| revoke-unknown-desktop.png / revoke-unknown-desktop1440.png | Unknown revoke fits entire normal desktop document, no blank QR placeholder |
| display-offline-hidden.png / revoked-display-hidden.png | QR unavailable/revoked stays hidden, no false authority claim |
| visitor-entry-mobile.png / visitor-restart-confirmation.png / visitor-confirmed-restart.png / visitor-unknown-recovered.png | Retained entry/restart/cancel/confirmed/response-loss scenarios, without M03 fields/submission |

Direct visual review covered normal mobile/desktop, changed-counter recovery and expanded guidance; the zoom/short-screen images retain readable controls and scrollable content. Viewport bounds/full-document fit/decode/axe/storage/fragment proofs and 16 image hashes are in the phase JSON receipts. Nearest-neighbor canvas at measured CSS dimensions is a software decode simulation; physical camera, physical OS zoom and production TLS remain NOT_RUN.
