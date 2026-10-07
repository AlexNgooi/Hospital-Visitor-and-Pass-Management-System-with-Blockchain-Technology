# Visual review notes

This is an image-first concept pack. The numbered inventory in README.md is the functional specification. Generated small text is illustrative and must be replaced with real UI text during implementation.

## Targeted image revisions

- Board 02: correct submission instructions to send the visitor to the counter for verification before approval. Replace the required accuracy-only checkbox with explicit privacy acknowledgement; retain independent, unchecked, optional WhatsApp consent. Request a solid pale-grey board background.
- Board 03: remove an invented OKU inventory category; require only Executive, Penjaga, Vendor and Contractor. Normalize sample dates to 24 September 2026. Disable approval while the identity and ward verification checks are incomplete.
- Board 01: clean the outer background and frame captions; preserve all six registration forms.
- Board 04: remove admin menus from Counter Staff navigation, use the four supported categories, require physical NFC return rather than a QR-card scan, and avoid promising queued-message delivery.
- Board 05: correct category charts and inventory labels; explicitly show duplicate UID blocking enrollment and a reason-required lost-card action; disable is only available for an Available card.
- Board 06: align administrator navigation, use Issued/Returned report events, and distinguish Sui proof mismatch from MRN integration.
- Board 07: use Penjaga and the shared public reference in conflict examples; direct staff to the administrator for account recovery.
- Final caption pass: notification frames are N01–N04, not extra visitor portal screens. R-K7M2 is consistently Penjaga in both the queue and MRN review.

## Design checks

- Intended white on UPM red #CA0026 contrast: 5.93:1, calculated from the exact palette values. This does not assert pixel-level contrast for generated image text.
- Three role areas and the four visitor categories are specified; approval and issue remain separate.
- Inventory uses Available after return; Returned is a lifecycle event.
- No official crest is fabricated. HSAAS text is a design placeholder.
- QR patterns are for visual review, not working registration links.
- No accessibility interaction, responsive behavior, data submission, integration or permission enforcement can be verified in a static image.

## Edit prompts

02: Preserve six panels. Set V08 to "Sila ke Kaunter 01 untuk pengesahan." Remove any instruction to verify only after approval. V07 required acknowledgement: "Saya telah membaca notis privasi dan bersetuju dengan pemprosesan data untuk pendaftaran ini." Keep optional WhatsApp unchecked. Solid #F7F8FA outside background.

03: Preserve S01–S06. Exactly Executive, Penjaga, Vendor, Contractor categories; no OKU. Date 24 Sep 2026; proposed due 18:00. Disable approval with unchecked verification. Preserve NFC checks and absence of Pass ID before issue.
