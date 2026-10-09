# Registration entry contract

- Inputs: planning/02 section 9; planning/03 R01/R06; planning/04 C07/C10/C12; M00 SESSION_SPIKE.
- Responsibility: signed rotating entry challenges, one anonymous pending form, atomic replacement and transaction-participating consumption. QR does not prove physical presence or authorize NFC/card/PII access.
- Outputs: V4, module controllers/services/DTOs, tests and M02 evidence. No M03 registration aggregate or framework-session writes.
- Locks: M00 sorted user/counter/binding/owner prefix, sorted display, entry context, challenge then sorted grants. Discover IDs before locks; rollback on changed pointer; never chase new identities.
- Verification: disposable MySQL only, servlet/CSRF and full QR race/rollback tests; enabled configuration requires an explicit backend keyring and controlled origin. Never read a developer .env.
