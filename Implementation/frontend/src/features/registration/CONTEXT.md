# R01 manual form UI — 2026-10-27

- Current manual-registration-v2 metadata renders IC-only Penjaga/Vendor/Contractor, IC-or-LESEN Executive, Penjaga address/MRN, Executive ward/patient and company/multiple locations for Vendor/Contractor. No legacy extra mandatory fields.
- Penjaga mock response fills read-only patient name/ward/bed. MRN/context/category changes clear old proof/display; request generation rejects late responses. Failure retains inputs and offers a catalogue ward for manual staff review.
- Penjaga pass terms have a separate unchecked checkbox/version from privacy. All draft/proof/unknown-command memory stays scoped to the original form; server controls captured times/patient snapshot.
- Retain existing visual conventions and keyboard/touch labels, error summary and exact-command UNKNOWN recovery. Build/lint only; no browser/application/test execution. Earlier module test directions below are historical.

# Visitor Registration

Responsibility: versioned demo visitor fields, optional mock/manual MRN feedback, privacy acknowledgement and exact-command recovery.
Inputs: original M02 EntryGrant, server schema, shared ApiClient and reviewed C14/C15 contract.
Outputs: one minimal public reference. No pass, card, sending consent or patient record is produced.
Boundary: drafts and feedback capabilities remain in memory. M02 guards ordinary inputs; UNKNOWN recovery lives outside its fieldset and retains its original command.
Verification: component/transport tests, disposable MySQL/servlet and browser evidence; coordinator owns merge approval.
