# Historical implementation evidence

Input/output: versioned module handoffs, reviews, source decisions and actual check receipts.
Responsibility: retain the facts and methods used for each recorded version; historical infrastructure references are provenance, not current setup instructions. Do not rewrite an old PASS as if it ran against the new native fixture.
Current execution routes: ../runbooks/MANUAL_NATIVE.md, ../runbooks/MANUAL_R01_R03.md and ../../backend/LOCAL_TESTING.md.
Human check: compare commit/environment/scope and NOT_RUN before relying on a result. Old launcher and diagram paths may name retired artifacts recoverable from Git, not live dependencies. This folder is not an instruction source for starting services or tests.
