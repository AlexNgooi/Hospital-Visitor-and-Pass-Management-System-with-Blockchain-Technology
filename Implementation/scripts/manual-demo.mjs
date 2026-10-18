import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createServer as tcpServer } from "node:net";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, realpath, access, rm } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createChildEnvironment } from "../frontend/tests/real-integration/environment.mjs";

/** User-run demonstration infrastructure only: no browser, business assertion or native-database fallback exists. */
const implementation = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = resolve(implementation, "frontend"), backend = resolve(implementation, "backend");
const output = resolve(implementation, "tmp/manual-demo"), backups = resolve(output, "backups");
const statePath = resolve(output, "control.json");
const name = "hsaas-manual-m00-m07", owner = "hsaas-manual-m00-m07-v1", database = "hsaas_manual_m00_m07";
const backendPort = 18407, webPort = 15417, controlPort = 15418;
const execute = promisify(execFile), children = [], logs = [];
let environment, containerId, dbEnvironment, dbPassword, signingKey, hashingKey, control, stopping = false, controlBusy = false;

/** Exact allowlisted runtime environment prevents inherited Spring/JVM options from selecting a real database. */
function exec(command, args, options = {}) {
  return execute(command, args, { windowsHide: true, env: environment, maxBuffer: 1024 * 1024, ...options });
}
/** Logs remain local and ignored; process failures are reported without command lines, credentials or SQL output. */
function launch(command, args, env, filename, cwd) {
  const log = createWriteStream(resolve(output, filename), { flags: "w" }); logs.push(log);
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.once("error", () => { child.spawnFailed = true; });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child); return child;
}
/** Refuse occupied ports instead of stopping an existing user service. */
async function freePort(port) {
  await new Promise((accept, reject) => {
    const server = tcpServer(); server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(accept));
  });
}
/** Only read-only infrastructure/health readiness is polled; user business workflows are never executed here. */
async function ready(check, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child && (child.spawnFailed || child.exitCode !== null || child.signalCode !== null)) throw new Error("Owned process exited");
    try { if (await check()) return; } catch { /* Readiness failures stay bounded and sanitized. */ }
    await new Promise(accept => setTimeout(accept, 1000));
  }
  throw new Error("Demonstration readiness timeout");
}
/** Every database control rechecks both exact container name and ownership label. */
async function ownedContainer() {
  if (!containerId || !/^[0-9a-f]{64}$/.test(containerId)) throw new Error("No owned container");
  const result = await exec("docker", ["inspect", "--format", '{{.Name}}|{{index .Config.Labels "hsaas.demo.owner"}}', containerId]);
  if (result.stdout.trim() !== `/${name}|${owner}`) throw new Error("Container ownership mismatch");
}
/** Stream SQL only between an owned database and an ignored local file, never through model-visible stdout. */
async function sqlTransfer(args, filename, restore = false) {
  await ownedContainer();
  const child = spawn("docker", args, { windowsHide: true, env: { ...environment, MYSQL_PWD: dbPassword }, stdio: [restore ? "pipe" : "ignore", restore ? "ignore" : "pipe", "ignore"] });
  const done = new Promise((accept, reject) => {
    child.once("error", reject);
    child.once("exit", code => code === 0 ? accept() : reject(new Error("Owned SQL transfer failed")));
  });
  await Promise.all([done, restore ? pipeline(createReadStream(filename), child.stdin) : pipeline(child.stdout, createWriteStream(filename, { mode: 0o600 }))]);
}
/** A backup includes matching demonstration keys; partial bundles are never accepted as restorable backups. */
async function backup() {
  const directory = resolve(backups, new Date().toISOString().replaceAll(/[:.]/g, "-") + "-" + randomBytes(3).toString("hex"));
  await mkdir(directory, { recursive: true });
  await sqlTransfer(["exec", "--env", "MYSQL_PWD", containerId, "mysqldump", "-umanual_demo", "--single-transaction", "--set-gtid-purged=OFF", "--no-tablespaces", database], resolve(directory, "database.sql"));
  await writeFile(resolve(directory, "keys.json"), JSON.stringify({ format: owner, database, signingKey, hashingKey }), { mode: 0o600 });
  await writeFile(resolve(directory, "complete.json"), JSON.stringify({ format: owner, createdAt: new Date().toISOString(), dataOrigin: "SYNTHETIC/SIMULATED" }), { mode: 0o600 });
  return directory;
}
/** Only backups created inside this launcher's own backup root can restore into a fresh disposable database. */
async function restoreBundle(requested) {
  const root = await realpath(backups), directory = await realpath(resolve(requested));
  const child = relative(root, directory);
  if (!child || child.startsWith("..") || isAbsolute(child)) throw new Error("Backup must be inside the demonstration backup directory");
  const complete = JSON.parse(await readFile(resolve(directory, "complete.json"), "utf8"));
  const keys = JSON.parse(await readFile(resolve(directory, "keys.json"), "utf8"));
  if (complete.format !== owner || keys.format !== owner || keys.database !== database
      || ![keys.signingKey, keys.hashingKey].every(key => typeof key === "string" && /^[A-Za-z0-9+/]{43}=$/.test(key))) throw new Error("Invalid demonstration backup");
  await access(resolve(directory, "database.sql"));
  return { directory, ...keys };
}
/** Cleanup uses only exact child handles and an ownership-checked container; backups are deliberately retained. */
async function cleanup() {
  if (stopping) return; stopping = true; control?.close();
  let failure = false;
  for (const child of children) {
    if (!child.spawnFailed && child.exitCode === null && child.signalCode === null) {
      child.kill();
      await Promise.race([new Promise(accept => child.once("exit", accept)), new Promise(accept => setTimeout(accept, 5000))]);
      if (child.exitCode === null && child.signalCode === null) failure = true;
    }
  }
  if (containerId) { await ownedContainer(); await exec("docker", ["rm", "-f", containerId]); }
  for (const log of logs) log.end();
  await rm(statePath, { force: true });
  if (failure) throw new Error("An owned child has not exited");
  console.log("Owned demonstration stopped; database deleted; saved backup bundles retained.");
}
/** CLI controls need a private local bearer token and never accept browser-origin requests. */
async function command(action) {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (state.owner !== owner || typeof state.token !== "string" || !/^[0-9a-f]{64}$/.test(state.token)) throw new Error("No valid running demonstration");
  const response = await fetch(`http://127.0.0.1:${controlPort}/${action}`, { method: "POST", headers: { authorization: "Bearer " + state.token } });
  if (!response.ok) throw new Error("Demonstration control failed");
  console.log(await response.text());
}
/** Starts a fresh isolated environment, or restores a user-selected local demonstration backup before Java runs. */
async function start(restorePath) {
  const bundle = restorePath ? await restoreBundle(restorePath) : null;
  for (const port of [backendPort, webPort, controlPort]) await freePort(port);
  const existing = await exec("docker", ["ps", "-a", "--filter", "name=^/" + name + "$", "--format", "{{.ID}}"]);
  if (existing.stdout.trim()) throw new Error("Demonstration container already exists");
  await access(resolve(backend, "target/hsaas-backend-0.0.1-SNAPSHOT.jar"));
  await access(resolve(frontend, "node_modules/vite/bin/vite.js"));
  const classpath = (await readFile(resolve(backend, "target/manual-demo-classpath.txt"), "utf8")).trim();
  if (!classpath) throw new Error("Prepare the runtime classpath first");
  await mkdir(output, { recursive: true });
  signingKey = bundle?.signingKey ?? randomBytes(32).toString("base64");
  hashingKey = bundle?.hashingKey ?? randomBytes(32).toString("base64");
  dbPassword = randomBytes(24).toString("hex"); const rootPassword = randomBytes(24).toString("hex");
  const created = await exec("docker", ["run", "--detach", "--name", name, "--label", "hsaas.demo.owner=" + owner,
    "--publish", "127.0.0.1::3306", "--env", "MYSQL_ROOT_PASSWORD", "--env", "MYSQL_DATABASE", "--env", "MYSQL_USER", "--env", "MYSQL_PASSWORD", "mysql:8.0.45"],
    { env: { ...environment, MYSQL_ROOT_PASSWORD: rootPassword, MYSQL_DATABASE: database, MYSQL_USER: "manual_demo", MYSQL_PASSWORD: dbPassword } });
  containerId = created.stdout.trim();
  await ready(async () => { await exec("docker", ["exec", "--env", "MYSQL_PWD", containerId, "mysql", "-uroot", "-N", "-e", "SELECT 1"], { env: { ...environment, MYSQL_PWD: rootPassword } }); return true; });
  const mapping = await exec("docker", ["port", containerId, "3306/tcp"]), dbPort = Number(mapping.stdout.trim().split(":").at(-1));
  if (!Number.isSafeInteger(dbPort) || dbPort === 3306) throw new Error("Invalid disposable database port");
  if (bundle) await sqlTransfer(["exec", "-i", "--env", "MYSQL_PWD", containerId, "mysql", "-umanual_demo", database], resolve(bundle.directory, "database.sql"), true);
  dbEnvironment = { ...environment, HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${dbPort}/${database}?connectionTimeZone=UTC`, HSAAS_DB_USER: "manual_demo", HSAAS_DB_PASSWORD: dbPassword,
    HSAAS_PORT: String(backendPort), HSAAS_ENVIRONMENT: "test", READER_MODE: "mock", MRN_MODE: "mock", NOTIFICATION_MODE: "disabled", BLOCKCHAIN_MODE: "disabled" };
  // Command-line flags close external configuration imports; secrets remain in the child environment rather than argv.
  dbEnvironment.IDEMPOTENCY_HMAC_KEY = hashingKey;
  // The generated child-only JSON supplies an exact map key; no inherited Spring JSON is accepted.
  dbEnvironment.SPRING_APPLICATION_JSON = JSON.stringify({ hsaas: { qr: { keys: { demo: signingKey } } } });
  const server = launch("java", ["-jar", "target/hsaas-backend-0.0.1-SNAPSHOT.jar", "--spring.profiles.active=manual-demo",
    "--spring.config.location=classpath:/application.yaml", "--spring.config.additional-location=", "--spring.config.import=", "--spring.profiles.include=", "--spring.profiles.group.manual-demo=",
    "--server.address=127.0.0.1", "--hsaas.environment=test", "--hsaas.secure-cookie=false", "--hsaas.reader-mode=mock", "--hsaas.mrn-mode=mock", "--hsaas.notification-mode=disabled", "--hsaas.blockchain-mode=disabled",
    "--hsaas.bootstrap.enabled=false", "--hsaas.qr.enabled=true", "--hsaas.registration.enabled=true", "--hsaas.review.enabled=true", "--hsaas.lifecycle.enabled=true",
    "--hsaas.qr.origin=http://127.0.0.1:" + webPort, "--hsaas.qr.active-key=demo", "--hsaas.hash-key-version=demo", "--logging.level.root=WARN"], dbEnvironment, "backend.log", backend);
  await ready(async () => (await fetch(`http://127.0.0.1:${backendPort}/api/health`)).status === 200, server);
  if (!bundle) await exec("java", ["--class-path", classpath, resolve(implementation, "scripts/ManualDemoSeed.java")], { cwd: implementation, env: dbEnvironment });
  const vite = launch(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { ...environment, HSAAS_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}` }, "frontend.log", frontend);
  await ready(async () => (await fetch(`http://127.0.0.1:${webPort}/login`)).status === 200, vite);
  const token = randomBytes(32).toString("hex");
  control = createServer(async (request, response) => {
    if (request.method !== "POST" || request.headers.origin || request.headers.authorization !== "Bearer " + token) { response.writeHead(403).end(); return; }
    // Do not delete a container while its backup is streaming, or run overlapping database controls.
    if (controlBusy) { response.writeHead(409).end("An owned control operation is already running."); return; }
    controlBusy = true;
    try {
      if (request.url === "/backup") { const directory = await backup(); response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("Backup saved: " + directory); }
      else if (request.url === "/stop") { response.writeHead(200).end("Stopping owned demonstration; saved backups retained."); await cleanup(); process.exit(0); }
      else response.writeHead(404).end();
    } catch { response.writeHead(500).end("Owned demonstration control failed; see local diagnostics."); }
    finally { controlBusy = false; }
  });
  await new Promise((accept, reject) => { control.once("error", reject); control.listen(controlPort, "127.0.0.1", accept); });
  await writeFile(statePath, JSON.stringify({ owner, token, containerId, backendPort, webPort, controlPort, dbPort }), { mode: 0o600 });
  console.log(`READY manual demonstration: http://127.0.0.1:${webPort}/login`);
  console.log("Synthetic accounts only; no business checks executed. Use backup before stop to preserve data.");
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { void cleanup().then(() => process.exit(0), () => { console.error("Owned cleanup requires follow-up"); process.exit(1); }); });
}

try {
  environment = createChildEnvironment(process.env);
  const args = process.argv.slice(2);
  if (args[0] === "start" && (args.length === 1 || args.length === 3 && args[1] === "--restore")) await start(args[2]);
  else if (args.length === 1 && ["stop", "backup"].includes(args[0])) await command(args[0]);
  else throw new Error("Use start [--restore directory], backup, or stop");
} catch {
  console.error("Manual demonstration command failed. Check dependencies, occupied ports and ignored local logs; no native database fallback is attempted.");
  if (containerId) { try { await cleanup(); } catch { console.error("Exact owned resources require manual cleanup follow-up."); } }
  process.exitCode = 1;
}
