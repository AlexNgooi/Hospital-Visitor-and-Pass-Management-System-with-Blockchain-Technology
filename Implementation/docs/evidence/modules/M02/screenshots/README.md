# M02 browser visual receipt

Actual servlet backend and disposable MySQL 8.0.45; synthetic records only. Current tested source 835689f, capture completed 2026-10-09 13:38:34+08. The live QR is intentionally invisible in delivered screenshots: a temporary CSS rule hides all QR images during capture and is removed immediately afterward. The actual UI renders decodable QR pixels; the component decoder and browser next-slot checks verify that separately.

| Image | Observed state |
|---|---|
| live-display-desktop.png | 1440×1000, signed live display, long counter ID, explicit revoke |
| live-display-mobile.png | 375×812, actions reachable, long ID preserved, QR image removed for evidence |
| live-display-mobile-zoom200.png | 200% CSS zoom simulation, no horizontal overflow, safe vertical scrolling |
| display-offline-hidden.png | Actual offline event immediately hides the code and explains recovery |
| visitor-entry-mobile.png | Fragment cleared, browser-bound entry active, M03 unavailable notice |
| visitor-restart-confirmation.png | Exact old/new scope labels, cancel/confirm, visible keyboard focus |
| visitor-confirmed-restart.png | New counter/category accepted only after explicit confirmation |
| visitor-unknown-recovered.png | Processed exchange response lost; GET recovered the exact current context |
| revoke-unknown-hidden.png | Processed revoke response lost; original counter retained, code hidden, explicit retry available |
| revoke-unknown-counter-changed.png | Selected counter changed, original counter still explicit, retry target unchanged |
| revoked-display-hidden.png | Explicit revoke confirmed, no scannable code retained |

Visual checks cover the 11 delivered states: readable text, reachable actions, accurate unavailable states, no QR pixels or personal records. The two new unknown-revoke states and final confirmation were inspected directly, in addition to prior desktop/mobile/zoom/entry visual checks. Axe/geometry/storage/fragment outcomes are in ../browser-verification.json; image SHA-256 values are in ../delivery-manifest.json. This is local CSS zoom evidence, not physical camera/production HTTPS or OS zoom/UAT evidence. Vertical scrolling is intentional for mobile and enlarged content; no content is clipped to force one-screen display.
