# Visitor Registration

Responsibility: versioned demo visitor fields, optional mock/manual MRN feedback, privacy acknowledgement and exact-command recovery.
Inputs: original M02 EntryGrant, server schema, shared ApiClient and reviewed C14/C15 contract.
Outputs: one minimal public reference. No pass, card, sending consent or patient record is produced.
Boundary: drafts and feedback capabilities remain in memory. M02 guards ordinary inputs; UNKNOWN recovery lives outside its fieldset and retains its original command.
Verification: component/transport tests, disposable MySQL/servlet and browser evidence; coordinator owns merge approval.
