import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createServer as tcpServer } from "node:net";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createChildEnvironment } from "../real-integration/environment.mjs";

// Reject inherited Spring/JVM/runtime configuration before filesystem, ports, Docker or Java are touched.
let cleanChildEnvironment;
try { cleanChildEnvironment = createChildEnvironment(process.env); }
catch { console.error("REFUSED inherited configuration; no M04 resources started"); process.exit(1); }
const execute = promisify(execFile);
const frontend = process.cwd(), backend = resolve(frontend, "../backend");
const output = resolve(frontend, "output/playwright/counter-review-real");
const name = "hsaas-m04-review-real-ecca", owner = "m04-ecca-real-review";
const backendPort = 18404, webPort = 15414, controlPort = 15415;
const children = [], logs = [];
let containerId, databaseEnvironment, classpath, control, cleanupStarted = false, outputCreated = false;

/** Only OS/runtime allowlisted variables and explicit disposable values reach subprocesses; windows stay hidden. */
function exec(command, args, options = {}) {
  return execute(command, args, { ...options, windowsHide: true, env: options.env ?? cleanChildEnvironment });
}
/** Diagnostics stay in ignored local files; never print errors containing URL/password/cookie/entry payloads. */
function launch(command, args, environment, filename, cwd) {
  const log = createWriteStream(resolve(output, filename)); logs.push(log);
  const child = spawn(command, args, { cwd, env: environment, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  // Missing executables become a bounded sanitized startup failure, rather than an unhandled event skipping owned cleanup.
  child.once("error", () => { child.spawnFailed = true; });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child); return child;
}
/** Refuse occupied loopback ports instead of stopping any existing user or module service. */
async function checkPort(port) {
  await new Promise((accept, reject) => { const server = tcpServer(); server.once("error", reject); server.listen(port, "127.0.0.1", () => server.close(accept)); });
}
/** Only read-only readiness checks repeat; application writes/fixture actions are each executed once. */
async function waitFor(check, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child && (child.spawnFailed || child.exitCode !== null || child.signalCode !== null)) throw new Error("Owned M04 process exited");
    try { if (await check()) return; } catch { /* Poll only health or disposable database readiness. */ }
    await new Promise((accept) => setTimeout(accept, 1000));
  }
  throw new Error("Owned M04 readiness timeout");
}
/** Source-launched Java fixture accepts only its own database and a fixed action, with no root row insertion. */
async function fixture(action) {
  await exec("java", ["--class-path", classpath, "tests/counter-review-real/FixtureSeed.java", action], { cwd: frontend, env: databaseEnvironment });
}
/** Stop exact child handles and remove only the container whose ownership label matches this run. */
async function cleanup() {
  if (cleanupStarted) return; cleanupStarted = true; control?.close();
  for (const child of children) {
    if (!child.spawnFailed && child.exitCode === null && child.signalCode === null) {
      child.kill();
      await Promise.race([new Promise((accept) => child.once("exit", accept)), new Promise((accept) => setTimeout(accept, 5000))]);
    }
  }
  if (containerId) {
    const inspected = await exec("docker", ["inspect", "--format", '{{index .Config.Labels "hsaas.test.owner"}}', containerId]);
    if (inspected.stdout.trim() !== owner) throw new Error("M04 container ownership mismatch");
    await exec("docker", ["rm", "-f", containerId]);
  }
  for (const log of logs) log.end();
  // A signalled child has signalCode rather than exitCode; both represent actual exit, never just child.killed.
  const ownedChildrenExited = children.every((child) => child.exitCode !== null || child.signalCode !== null || (child.spawnFailed && child.pid === undefined));
  if (outputCreated) await writeFile(resolve(output, "cleanup.json"), JSON.stringify({ ownedChildrenExited, ownedContainerRemoved: Boolean(containerId) }));
  if (!ownedChildrenExited) throw new Error("An exact owned child requires cleanup follow-up");
  console.log("PASS M04 owned cleanup");
}

try {
  // Resource checks precede any launch; a conflicting container name is never adopted or removed.
  for (const port of [backendPort, webPort, controlPort]) await checkPort(port);
  const existing = await exec("docker", ["ps", "-a", "--filter", "name=^/" + name + "$", "--format", "{{.ID}}"]);
  if (existing.stdout.trim()) throw new Error("M04 container name already exists");
  await mkdir(output, { recursive: true });
  outputCreated = true;
  classpath = (await readFile(resolve(frontend, "output/playwright/m04-runtime-classpath.txt"), "utf8")).trim();
  const rootPassword = randomBytes(24).toString("hex"), databasePassword = randomBytes(24).toString("hex");
  const created = await exec("docker", ["run", "--detach", "--name", name, "--label", "hsaas.test.owner=" + owner,
    "--publish", "127.0.0.1::3306", "--env", "MYSQL_ROOT_PASSWORD", "--env", "MYSQL_DATABASE", "--env", "MYSQL_USER", "--env", "MYSQL_PASSWORD", "mysql:8.0.45"],
    { env: { ...cleanChildEnvironment, MYSQL_ROOT_PASSWORD: rootPassword, MYSQL_DATABASE: "hsaas_m04_integration", MYSQL_USER: "m04_integration", MYSQL_PASSWORD: databasePassword } });
  containerId = created.stdout.trim();
  await waitFor(async () => { await exec("docker", ["exec", "--env", "MYSQL_PWD", containerId, "mysql", "-uroot", "-N", "-e", "SELECT 1"], { env: { ...cleanChildEnvironment, MYSQL_PWD: rootPassword } }); return true; });
  await exec("docker", ["exec", "--env", "MYSQL_PWD", containerId, "mysql", "-uroot", "-e", "SET GLOBAL log_bin_trust_function_creators=1"], { env: { ...cleanChildEnvironment, MYSQL_PWD: rootPassword } });
  const mapping = await exec("docker", ["port", containerId, "3306/tcp"]), dbPort = Number(mapping.stdout.trim().split(":").at(-1));
  if (!Number.isSafeInteger(dbPort) || dbPort === 3306) throw new Error("Invalid disposable mapped port");
  databaseEnvironment = { ...cleanChildEnvironment, HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${dbPort}/hsaas_m04_integration?connectionTimeZone=UTC`,
    HSAAS_DB_USER: "m04_integration", HSAAS_DB_PASSWORD: databasePassword, M04_FIXTURE_PASSWORD: "Public-synthetic-review_1", HSAAS_PORT: String(backendPort),
    HSAAS_ENVIRONMENT: "test", READER_MODE: "disabled", MRN_MODE: "mock", NOTIFICATION_MODE: "disabled", BLOCKCHAIN_MODE: "disabled" };
  const server = launch("java", ["-jar", "target/hsaas-backend-0.0.1-SNAPSHOT.jar", "--spring.profiles.active=integration-m04",
    "--spring.config.location=classpath:/application.yaml", "--spring.config.additional-location=", "--spring.config.import=", "--spring.profiles.include=", "--spring.profiles.group.integration-m04=",
    "--server.address=127.0.0.1", "--hsaas.environment=test", "--hsaas.secure-cookie=false", "--hsaas.reader-mode=disabled", "--hsaas.mrn-mode=mock",
    "--hsaas.notification-mode=disabled", "--hsaas.blockchain-mode=disabled", "--hsaas.bootstrap.enabled=false", "--hsaas.qr.enabled=true", "--hsaas.registration.enabled=true", "--hsaas.review.enabled=true",
    "--hsaas.qr.origin=http://127.0.0.1:" + webPort, "--hsaas.qr.active-key=fixture", "--hsaas.qr.keys.fixture=" + Buffer.alloc(32).toString("base64"),
    "--hsaas.hash-key-version=fixture", "--hsaas.hash-key=" + Buffer.alloc(32).toString("base64"), "--logging.level.root=WARN"], databaseEnvironment, "backend.log", backend);
  await waitFor(async () => (await fetch(`http://127.0.0.1:${backendPort}/api/health`)).status === 200, server);
  await fixture("seed");
  const vite = launch(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"],
    { ...cleanChildEnvironment, HSAAS_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}` }, "vite.log", frontend);
  await waitFor(async () => (await fetch(`http://127.0.0.1:${webPort}/tests/counter-review-real/harness.html`)).status === 200, vite);
  // Fixed loopback controls fault only the owned database; no fake application response, arbitrary SQL or secret payload is exposed.
  control = createServer(async (request, response) => {
    try {
      if (request.method !== "POST") { response.writeHead(405).end(); return; }
      const action = request.url.slice(1);
      if (["audit-fault", "clear-fault", "revoke-staff"].includes(action)) await fixture(action);
      else if (action === "stop") { response.writeHead(204).end(); await cleanup(); process.exit(0); return; }
      else { response.writeHead(404).end(); return; }
      response.writeHead(204).end();
    } catch { response.writeHead(500).end(); }
  });
  await new Promise((accept) => control.listen(controlPort, "127.0.0.1", accept));
  await writeFile(resolve(output, "resources.json"), JSON.stringify({ owner, containerName: name, backendPort, webPort, controlPort, dbPort,
    profile: "integration-m04; classpath config only; no .env", modes: "test/disabled/mock/disabled/disabled", data: "Reference-only seed; roots via real public QR/submission HTTP" }, null, 2));
  console.log(`READY owned M04 real HTTP on loopback ${webPort}; cleanup control ${controlPort}`);
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void cleanup().then(() => process.exit(0)); });
} catch {
  console.error("FAIL owned M04 harness startup; diagnostics remain ignored and private");
  try { await cleanup(); } catch { console.error("Owned cleanup requires follow-up"); }
  process.exitCode = 1;
}
