# M04 actual HTTP/browser candidate

**NOT_RUN** until coordinator approves the actual M03 V5/root/registration API dependency baseline. The harness has no mock registration/review/auth implementation; a missing real root fails backend startup. Candidate syntax/type compilation does not establish acceptance.

The dedicated `harness.html` injects only the exported M04 FeatureSlot into the existing App through a test MemoryRouter. Real auth/review clients use same-origin Vite `/api` forwarding. Production main/app/lib are unchanged. Public roots are created through real QR display/current/exchange/schema/MRN/submission calls; Java fixtures seed only synthetic users/counter/categories/destinations and controlled faults.

Resources are owned: loopback backend **18404**, Vite **15414**, fixed-control **15415**, Docker name `hsaas-m04-review-real-ecca`, owner label `m04-ecca-real-review`, random database port/name `hsaas_m04_integration`. Occupied ports/existing Docker name are refused. M01 `createChildEnvironment` is imported read-only; Spring/JVM/runtime injection is rejected before resources, only OS/runtime coordinates and explicit disposable values reach children. Classpath config is explicit with no `.env`/native DB/bootstrap/external integration fallback.

After the exact dependency is imported and tested, build its backend JAR and generate an ignored runtime classpath under frontend/output/playwright/m04-runtime-classpath.txt using Maven `dependency:build-classpath`. Run from frontend:

```powershell
# This launches only owned temporary resources after the reviewed complete root baseline is present.
node tests/counter-review-real/harness.mjs
```

Use a dedicated Playwright CLI session for `http://127.0.0.1:15414/tests/counter-review-real/harness.html`, then run the `browser.js` CLI expression. It covers four actual public submissions, masked detail/manual Penjaga checks, response loss after actual commit, original key recovery after GET, real reason rejection on mobile, competing staff conflict and actual epoch revocation. Cookies/CSRF/QR fragment/body/key values stay in memory and are never returned; screenshots show only masked authenticated review views, without login inputs/QR rendering. No trace/HAR is saved. Retain only sanitized receipt/screenshots/hash manifest as evidence.

Stop via POST `http://127.0.0.1:15415/stop` and close only the dedicated browser session. Inspect cleanup.json and verify these three owned listeners are gone. Diagnostics remain ignored and must not be exported wholesale. Java backend ReviewMysqlTests additionally covers persisted replay/concurrency/audit rollback and controlled actual 1062 replay-only MISS; it never INSERTs a registration root. Actual run results and defects are recorded separately after execution.
