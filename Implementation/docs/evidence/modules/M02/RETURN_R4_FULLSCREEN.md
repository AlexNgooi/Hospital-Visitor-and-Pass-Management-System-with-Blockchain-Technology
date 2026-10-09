# R4 fullscreen overflow return

Current source **f81512dfe571469386352e73bf54ef234534869b**, parent R4 delivery 1299abc. Only feature CSS fullscreen alignment and its browser helper changed. Normal R4/source-d6ebe1f evidence stays historical; this phase's receipt is in `R4_FULLSCREEN/`.

Coordinator's additional actual 375×568 + 200% CSS zoom fullscreen inspection found headingTop=-153 at scrollTop=0: unsafe flex centering placed overflow before scroll origin, where overflow:auto could not recover it. The feature now uses safe center on both axes, with flex-start fallback for engines lacking safe alignment. It keeps centering when content fits and uses start alignment when enlarged content overflows. QR dimensions, font sizes, buttons, quiet zone and normal layout were not reduced or changed.

The new browser check enters actual fullscreen through the Full screen button at that short/enlarged viewport. It checks heading/QR start coordinates at scroll origin, scrolls the actual Revoke display control into view, then returns to scroll origin and verifies the heading is recoverable. It exits fullscreen and continues all previous normal-viewport/flow checks. QR pixels are hidden only for the screenshot.

- Frontend complete **95 tests PASS**, start 2026-10-09 **18:44:22+08**; test TypeScript/build/lint exit 0, helper lint repeated at 18:46. Bundle JS460.17kB/gzip144.62kB; CSS19.84kB/gzip4.98kB.
- Actual backend/MySQL/Vite browser: **28 checks PASS**, 0 uncaught page exceptions; completed **18:47:14+08** on source f81512d. The previous 27 checks were all re-executed and passed, including seven normal document-fit gates, software resized PNG decode, native guidance disclosure and unknown-source retry.
- Fullscreen: viewport375×568, headingTop=18 / headingLeft=18, imageTop=122 / imageLeft=18, image450×450, initial scrollTop=0. scrollHeight453/clientHeight282 and scrollWidth241/clientWidth186 are CSS scroll dimensions under zoom. Computed justify-content and align-items are safe center. `bottomAccessible=true` and `topRecoverable=true`.
- Backend tree is unchanged from reviewed 835689f; no API/V4/shared CSS/M03 edits. This UI-only phase does not rerun backend or claim a new backend result.

The screenshot shows the scrollable controls view, with QR pixels removed through temporary CSS. The complete 28-check JSON contains this phase's normal fit/decode results, but unchanged normal screenshots remain in prior R4/ evidence rather than being relabeled as this phase. Resized decode is the previously documented nearest-neighbor canvas software simulation, not physical camera evidence. Physical camera/production HTTPS/OS sleep or native zoom/actual M03 submission remain NOT_RUN.

The fresh owned harness was stopped through /stop (204), finished normal cleanup, and its container/18292/15292/15293 listeners were independently verified absent. Named hsaas-m02-real browser was closed. User5173/native DB/.env remained untouched. Application source is committed before receipt capture; the following documentation/artifact-only delivery SHA is sent to coordinator. No main merge/push/deploy occurred; coordinator re-review is required.
