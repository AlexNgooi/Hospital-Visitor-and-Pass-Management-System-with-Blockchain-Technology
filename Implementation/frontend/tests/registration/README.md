# M03 isolated browser verification

This harness starts only an owned temporary mysql:8.0.45, packaged backend and Vite on loopback. It rejects inherited Spring/JVM/runtime injection before resource creation, never imports developer .env, never connects to port 3306 or bootstraps a real account. It seeds synthetic staff/admin/counters/categories/destinations through an allowlisted Java fixture.

Prerequisites: Java 21, Docker, Node/npm/npx and baseline pnpm dependencies. Use this isolated worktree, not another module's target directory. Backend and frontend source must be stable during a run. **Stop the harness before packaging the backend again**: Windows holds the running JAR open.

From Implementation/backend:

~~~powershell
# Verify the complete backend and generate a runtime classpath for the owned fixture tool.
.\mvnw.cmd -B verify dependency:build-classpath '-Dmdep.outputFile=../frontend/output/playwright/m03-runtime-classpath.txt'
~~~

From Implementation/frontend, use separate terminals for the harness and CLI:

~~~powershell
# Launch only the disposable database, servlet, Vite and loopback test control.
node tests/registration/harness.mjs
~~~

~~~powershell
# Create an isolated browser, observe its initial page, and execute the reproducible owned scenario.
npx --yes --package @playwright/cli playwright-cli -s=m03 open http://127.0.0.1:15303/login
npx --yes --package @playwright/cli playwright-cli -s=m03 run-code --filename tests/registration/browser.js
# Close the browser and stop only resources created by this harness.
npx --yes --package @playwright/cli playwright-cli -s=m03 close
Invoke-WebRequest -Uri http://127.0.0.1:15304/stop -Method Post
~~~

Ports are backend 18303, Vite 15303 and control 15304; MySQL is randomly mapped on loopback. Conflicts fail before startup. Test control has fixed actions separate from application/Vite. Cleanup checks the exact created container's owner label before removing it; unrelated resources are not enumerated or deleted.

The CLI scenario uses real servlet cookies/CSRF, signed current QR exchange and persisted synthetic registrations. Response loss and initial schema 503 are controlled faults; offline routing does not forward to the server. Base submissions prove all categories and manual deferral, original-body/key recovery after committed response loss, original grant GET403, schema retry after parent revalidation, offline draft retention, cross-tab explicit replacement and empty adoption. It audits all four categories/three steps at 1366×768 and 375×812, default errors, expanded native help/error links, long-purpose keyboard scrolling and short-screen CSS 200% zoom.

Default full-page checks require document height <= viewport+1, no horizontal overflow, primary bounds within the viewport and 44px controls. Expanded help/error links and zoom allow necessary scrolling, recorded separately. Axe violations and unexpected browser exceptions fail. Raw bodies, keys, feedback capabilities, QR/token URLs and cookies never enter the safe receipt. Screenshots contain only synthetic values, never a QR image or capability. Ignored output/playwright/m03-registration holds diagnostics; only reviewed JSON/PNG/hash evidence is copied to M03 evidence.

Physical camera, native toolbar zoom, production HTTPS, live hospital, physical cards/reader, notifications and blockchain remain NOT_RUN/disabled. M04 endpoints are verified by M04/coordinator through the same root; this harness does not claim their approval.
