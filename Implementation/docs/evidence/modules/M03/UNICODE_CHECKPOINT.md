# M03 Unicode normalization correction

2026-10-10, Asia/Singapore. Parent backend checkpoint 869c6cb. This small dependency correction changes only RegistrationFields.java, RegistrationFieldTests.java and RegistrationMysqlTests.java; C13/read eight dependency files, V1–V5 and other adapters remain unchanged. Its source SHA is the commit containing this record.

Coordinator requested consistent Unicode whitespace/space-character handling and a genuine NFC boundary. After original ISO controls/FORMAT and malformed surrogates are rejected, persisted NFC text trims Character.isWhitespace OR Character.isSpaceChar, including printable NBSP, figure and narrow spaces. An all-space value fails. Raw transport remains bounded at 8192; original parsed strings/presence are still hashed. Browser validation maps the same printable subset without a UTF16 maxlength.

Validation:

- backend .\mvnw.cmd -B -Dtest=RegistrationFieldTests,RegistrationMysqlTests test: 17 PASS, zero failures/errors/skips, exit 0, 13:30:41 +08.
- The real MySQL replay test submits a 300-UTF16 decomposed name, persists exactly 100 NFC codepoints, recovers the original key after grant expiry/revoke, and rejects a composed spelling with the same key (409).
- Unit checks cover printable spaces around text, all NBSP/figure/narrow spaces, original controls, 100/101 NFC boundaries and distinct original encoding.
- Full verify on the corrected backend executed all 109 tests successfully, zero failures/errors/skips, but packaging exited 1 at 13:27:36 because the owned browser server held the target JAR open on Windows. This is not reported as a successful full verify. The owned server will be stopped before final packaging verification.

This is a tested backend dependency correction for coordinator/M04 review. UI, complete browser/handoff and main merge remain separate. Native database, real hospital, hardware, notifications/blockchain, push and deployment are untouched.
