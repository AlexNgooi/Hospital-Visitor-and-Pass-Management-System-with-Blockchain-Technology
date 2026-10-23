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
const runtimeKeysPath = resolve(output, "runtime-keys.json");
const name = "hsaas-manual-m00-m07", owner = "hsaas-manual-m00-m07-v1", database = "hsaas_manual_m00_m07";
const backendPort = 18407, webPort = 15417, controlPort = 15418;
const execute = promisify(execFile), children = [], logs = [];
let environment, containerId, dbEnvironment, dbPassword, signingKey, hashingKey, control, stopping = false, controlBusy = false;
let interrupted = false, acceptingUsers = false;
let stage = "configuration guard";
let keyVersion = "demo", resumeId, preserveDatabase = false, databaseStartedHere = false, resetOldCapabilities = false;

/** Only launcher-owned fixed messages are printable; subprocess errors may contain private arguments or environment data. */
class DemoFailure extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Exact allowlisted runtime environment prevents inherited Spring/JVM options from selecting a real database. */
function exec(command, args, options = {}) {
  if (interrupted && !stopping) throw new Error("Demonstration startup interrupted");
  return execute(command, args, { windowsHide: true, env: environment, maxBuffer: 1024 * 1024, ...options });
}
/** Logs remain local and ignored; process failures are reported without command lines, credentials or SQL output. */
function launch(command, args, env, filename, cwd) {
  if (interrupted) throw new Error("Demonstration startup interrupted");
  const log = createWriteStream(resolve(output, filename), { flags: "w" }); logs.push(log);
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.once("error", () => { child.spawnFailed = true; });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child); return child;
}
/** Refuse occupied ports instead of stopping an existing user service. */
async function freePort(port) {
  try {
    await new Promise((accept, reject) => {
      const server = tcpServer(); server.once("error", reject);
      server.listen(port, "127.0.0.1", () => server.close(accept));
    });
  } catch {
    throw new DemoFailure("PORT_UNAVAILABLE", `Loopback port ${port} is occupied or unavailable. Check its owner; do not stop unrelated services.`);
  }
}
/** Prepared artifacts are checked without reading their contents into diagnostic output. */
async function requireFile(path, message) {
  try { await access(path); }
  catch { throw new DemoFailure("PREPARATION_MISSING", message); }
}
/** Read-only prerequisites also verify saved ownership for resume; no containers, processes, seeds or runtime files are created here. */
async function preflight(resume = false) {
  stage = "Java availability";
  let java;
  try { java = await exec("java", ["-version"], { timeout: 10000 }); }
  catch { throw new DemoFailure("JAVA_UNAVAILABLE", "Java is unavailable. Install/configure JDK 21 and reopen the terminal."); }
  const major = Number((java.stderr + java.stdout).match(/version\s+"(\d+)/)?.[1]);
  if (!Number.isInteger(major) || major < 21) throw new DemoFailure("JAVA_VERSION", "JDK 21 or newer is required for this demonstration.");
  stage = "prepared application files";
  await requireFile(resolve(backend, "target/hsaas-backend-0.0.1-SNAPSHOT.jar"), "Backend JAR is missing. Run the skip-tests Maven package/classpath command in MANUAL_M00_M07.md.");
  await requireFile(resolve(frontend, "node_modules/vite/bin/vite.js"), "Frontend dependencies are missing. Run pnpm.cmd install --frozen-lockfile in Implementation/frontend.");
  const classpathPath = resolve(backend, "target/manual-demo-classpath.txt");
  await requireFile(classpathPath, "Runtime classpath is missing. Run the Maven package/dependency:build-classpath command in MANUAL_M00_M07.md.");
  const classpath = (await readFile(classpathPath, "utf8")).trim();
  if (!classpath) throw new DemoFailure("PREPARATION_MISSING", "Runtime classpath is empty. Regenerate it with the runbook's Maven command.");
  stage = "Docker Engine availability";
  let docker;
  try { docker = await exec("docker", ["info", "--format", "{{.OSType}}"], { timeout: 10000 }); }
  catch (failure) {
    if (failure.code === "ENOENT") throw new DemoFailure("DOCKER_CLI_MISSING", "Docker CLI is missing. Install/configure Docker Desktop before starting the demonstration.");
    throw new DemoFailure("DOCKER_ENGINE_UNAVAILABLE", "Docker Engine is not reachable. Open Docker Desktop, wait until the Linux engine is running, then run this command again. No native database was used.");
  }
  if (docker.stdout.trim() !== "linux") throw new DemoFailure("DOCKER_LINUX_REQUIRED", "This MySQL demonstration requires Docker Desktop's Linux containers engine.");
  stage = "loopback ports and container ownership";
  for (const port of [backendPort, webPort, controlPort]) await freePort(port);
  const existing = await exec("docker", ["ps", "-a", "--filter", "name=^/" + name + "$", "--format", "{{.ID}}"], { timeout: 10000 });
  if (resume) {
    // Adoption requires the exact prior control record AND the original container label/name, never just a reused name.
    const state = JSON.parse(await readFile(statePath, "utf8"));
    const id = existing.stdout.trim();
    if (!id || state.owner !== owner || !String(state.containerId).startsWith(id)) throw new DemoFailure("RESUME_IDENTITY", "Resume requires this launcher's saved container identity and matching ownership.");
    const identity = await exec("docker", ["inspect", "--format", '{{.Id}}|{{.Name}}|{{index .Config.Labels "hsaas.demo.owner"}}|{{.State.Status}}', state.containerId]);
    if (!["exited", "running", "created"].some(status => identity.stdout.trim() === `${state.containerId}|/${name}|${owner}|${status}`)) throw new DemoFailure("RESUME_IDENTITY", "Container ownership or state does not permit resume.");
    resumeId = state.containerId;
  } else if (existing.stdout.trim()) throw new DemoFailure("CONTAINER_EXISTS", "The demonstration container name already exists. Use resume to preserve this launcher's matching database; never delete unrelated containers.");
  return classpath;
}
/** Only read-only infrastructure/health readiness is polled; user business workflows are never executed here. */
async function ready(check, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (interrupted) throw new Error("Demonstration startup interrupted");
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
  await writeFile(resolve(directory, "keys.json"), JSON.stringify({ format: owner, database, signingKey, hashingKey, keyVersion }), { mode: 0o600 });
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
      || (keys.keyVersion !== undefined && (typeof keys.keyVersion !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(keys.keyVersion)))
      || ![keys.signingKey, keys.hashingKey].every(key => typeof key === "string" && /^[A-Za-z0-9+/]{43}=$/.test(key))) throw new Error("Invalid demonstration backup");
  await access(resolve(directory, "database.sql"));
  return { directory, ...keys };
}
/** Cleanup uses exact child handles; fresh databases are disposable, while resumed databases and their private identity/keys are retained. */
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
  if (containerId) {
    await ownedContainer();
    if (!preserveDatabase) await exec("docker", ["rm", "-f", containerId]);
    else if (databaseStartedHere || acceptingUsers) await exec("docker", ["stop", containerId]);
  }
  for (const log of logs) log.end();
  if (!preserveDatabase) { await rm(statePath, { force: true }); await rm(runtimeKeysPath, { force: true }); }
  if (failure) throw new Error("An owned child has not exited");
  console.log(preserveDatabase ? "Owned demonstration stopped; resumed database and private runtime keys retained." : "Owned demonstration stopped; database deleted; saved backup bundles retained.");
}
/** CLI controls need a private local bearer token and never accept browser-origin requests. */
async function command(action) {
  const state = JSON.parse(await readFile(statePath, "utf8"));
  if (state.owner !== owner || typeof state.token !== "string" || !/^[0-9a-f]{64}$/.test(state.token)) throw new Error("No valid running demonstration");
  const response = await fetch(`http://127.0.0.1:${controlPort}/${action}`, { method: "POST", headers: { authorization: "Bearer " + state.token } });
  if (!response.ok) throw new Error("Demonstration control failed");
  console.log(await response.text());
}
/** Starts a fresh environment, restores a private backup, or resumes the exact owned database without re-seeding business data. */
async function start(restorePath, resume = false) {
  const classpath = await preflight(resume);
  stage = "local restore bundle validation";
  const bundle = restorePath ? await restoreBundle(restorePath) : null;
  await mkdir(output, { recursive: true });
  signingKey = bundle?.signingKey ?? randomBytes(32).toString("base64");
  hashingKey = bundle?.hashingKey ?? randomBytes(32).toString("base64");
  keyVersion = bundle?.keyVersion ?? "demo";
  dbPassword = randomBytes(24).toString("hex"); const rootPassword = randomBytes(24).toString("hex");
  if (resume) {
    preserveDatabase = true; containerId = resumeId;
    await ownedContainer();
    // Read only the owned container's required connection secret internally; never emit inspect/environment output.
    const inspected = await exec("docker", ["inspect", "--format", "{{json .Config.Env}}", containerId]);
    const variables = new Map(JSON.parse(inspected.stdout).map(value => { const separator = value.indexOf("="); return [value.slice(0, separator), value.slice(separator + 1)]; }));
    if (variables.get("MYSQL_DATABASE") !== database || variables.get("MYSQL_USER") !== "manual_demo" || !variables.get("MYSQL_PASSWORD")) throw new DemoFailure("RESUME_DATABASE", "The owned container does not match the demonstration database configuration.");
    dbPassword = variables.get("MYSQL_PASSWORD");
    // New launchers persist keys privately for future resumes. Older launchers kept them only in memory, so fail closed on old authority.
    try {
      const keys = JSON.parse(await readFile(runtimeKeysPath, "utf8"));
      if (keys.containerId !== containerId || typeof keys.keyVersion !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(keys.keyVersion)
          || ![keys.signingKey, keys.hashingKey].every(key => typeof key === "string" && /^[A-Za-z0-9+/]{43}=$/.test(key))) throw new Error("Invalid runtime keys");
      signingKey = keys.signingKey; hashingKey = keys.hashingKey; keyVersion = keys.keyVersion;
    } catch (failure) {
      if (failure.code !== "ENOENT") throw new DemoFailure("RESUME_KEYS", "Private runtime keys are unreadable or mismatched; preserve them and inspect this demonstration before retrying.");
      keyVersion = "resume-" + randomBytes(8).toString("hex"); resetOldCapabilities = true;
    }
    stage = "resuming the owned demonstration database";
    const current = await exec("docker", ["inspect", "--format", "{{.State.Running}}", containerId]);
    if (current.stdout.trim() !== "true") { await exec("docker", ["start", containerId]); databaseStartedHere = true; }
  } else {
  stage = "disposable MySQL container creation (Docker/image availability)";
  const created = await exec("docker", ["run", "--detach", "--name", name, "--label", "hsaas.demo.owner=" + owner,
    "--publish", "127.0.0.1::3306", "--env", "MYSQL_ROOT_PASSWORD", "--env", "MYSQL_DATABASE", "--env", "MYSQL_USER", "--env", "MYSQL_PASSWORD", "mysql:8.0.45"],
    { env: { ...environment, MYSQL_ROOT_PASSWORD: rootPassword, MYSQL_DATABASE: database, MYSQL_USER: "manual_demo", MYSQL_PASSWORD: dbPassword } });
  containerId = created.stdout.trim();
  }
  // A signal during docker run is handled only after capturing its returned ID, so cleanup cannot orphan that container.
  if (interrupted) throw new Error("Demonstration startup interrupted");
  stage = "disposable MySQL readiness";
  await ready(async () => { await exec("docker", ["exec", "--env", "MYSQL_PWD", containerId, "mysql", "-umanual_demo", database, "-N", "-e", "SELECT 1"], { env: { ...environment, MYSQL_PWD: dbPassword } }); return true; });
  const mapping = await exec("docker", ["port", containerId, "3306/tcp"]), dbPort = Number(mapping.stdout.trim().split(":").at(-1));
  if (!Number.isSafeInteger(dbPort) || dbPort === 3306) throw new Error("Invalid disposable database port");
  if (bundle || resetOldCapabilities) {
    stage = "restoring the owned demonstration database";
    if (bundle) await sqlTransfer(["exec", "-i", "--env", "MYSQL_PWD", containerId, "mysql", "-umanual_demo", database], resolve(bundle.directory, "database.sql"), true);
    // Restore preserves business/history/keys, but must never resurrect browser cookies, QR grants or in-flight scan authority.
    const revoke = [
      "START TRANSACTION",
      "UPDATE auth_session_contexts SET state='REVOKED',revoked_at=UTC_TIMESTAMP(6) WHERE state<>'REVOKED'",
      "UPDATE app_session_bindings SET invalidated_at=COALESCE(invalidated_at,UTC_TIMESTAMP(6))",
      "UPDATE registration_qr_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6))",
      "UPDATE registration_qr_challenges SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6))",
      "UPDATE registration_entry_grants SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE consumed_at IS NULL",
      "UPDATE reader_devices SET active_scan_job_id=NULL",
      "UPDATE scan_jobs SET status='CANCELLED' WHERE status IN ('CLAIMED','SUCCEEDED')",
      "DELETE FROM SPRING_SESSION",
      "COMMIT"
    ].join("; ");
    await exec("docker", ["exec", "--env", "MYSQL_PWD", containerId, "mysql", "-umanual_demo", database, "-e", revoke], { env: { ...environment, MYSQL_PWD: dbPassword } });
  }
  dbEnvironment = { ...environment, HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${dbPort}/${database}?connectionTimeZone=UTC`, HSAAS_DB_USER: "manual_demo", HSAAS_DB_PASSWORD: dbPassword,
    HSAAS_PORT: String(backendPort), HSAAS_ENVIRONMENT: "test", READER_MODE: "mock", MRN_MODE: "mock", NOTIFICATION_MODE: "disabled", BLOCKCHAIN_MODE: "disabled" };
  // Command-line flags close external configuration imports; secrets remain in the child environment rather than argv.
  dbEnvironment.IDEMPOTENCY_HMAC_KEY = hashingKey;
  // The generated child-only JSON supplies an exact map key; no inherited Spring JSON is accepted.
  dbEnvironment.SPRING_APPLICATION_JSON = JSON.stringify({ hsaas: { qr: { keys: { [keyVersion]: signingKey } } } });
  await writeFile(runtimeKeysPath, JSON.stringify({ containerId, signingKey, hashingKey, keyVersion }), { mode: 0o600 });
  stage = "backend readiness (see Implementation/tmp/manual-demo/backend.log)";
  const server = launch("java", ["-jar", "target/hsaas-backend-0.0.1-SNAPSHOT.jar", "--spring.profiles.active=manual-demo",
    "--spring.config.location=classpath:/application.yaml", "--spring.config.additional-location=", "--spring.config.import=", "--spring.profiles.include=", "--spring.profiles.group.manual-demo=",
    "--server.address=127.0.0.1", "--hsaas.environment=test", "--hsaas.secure-cookie=false", "--hsaas.reader-mode=mock", "--hsaas.mrn-mode=mock", "--hsaas.notification-mode=disabled", "--hsaas.blockchain-mode=disabled",
    "--hsaas.bootstrap.enabled=false", "--hsaas.qr.enabled=true", "--hsaas.registration.enabled=true", "--hsaas.review.enabled=true", "--hsaas.lifecycle.enabled=true",
    "--hsaas.qr.origin=http://127.0.0.1:" + webPort, "--hsaas.qr.active-key=" + keyVersion, "--hsaas.hash-key-version=" + keyVersion, "--logging.level.root=WARN"], dbEnvironment, "backend.log", backend);
  await ready(async () => (await fetch(`http://127.0.0.1:${backendPort}/api/health`)).status === 200, server);
  if (!bundle && !resume) {
    stage = "synthetic reference/account seed";
    await exec("java", ["--class-path", classpath, resolve(implementation, "scripts/ManualDemoSeed.java")], { cwd: implementation, env: dbEnvironment });
  }
  stage = "frontend readiness (see Implementation/tmp/manual-demo/frontend.log)";
  const vite = launch(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { ...environment, HSAAS_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}` }, "frontend.log", frontend);
  await ready(async () => (await fetch(`http://127.0.0.1:${webPort}/login`)).status === 200, vite);
  const token = randomBytes(32).toString("hex");
  stage = "private loopback control setup";
  control = createServer(async (request, response) => {
    if (request.method !== "POST" || request.headers.origin || request.headers.authorization !== "Bearer " + token) { response.writeHead(403).end(); return; }
    // Do not delete a container while its backup is streaming, or run overlapping database controls.
    if (controlBusy) { response.writeHead(409).end("An owned control operation is already running."); return; }
    controlBusy = true;
    try {
      if (request.url === "/backup") { const directory = await backup(); response.writeHead(200, { "Content-Type": "text/plain", "Cache-Control": "no-store" }).end("Backup saved: " + directory); }
      else if (request.url === "/stop") { response.writeHead(200).end(preserveDatabase ? "Stopping owned demonstration; resumed database retained." : "Stopping owned demonstration; database deleted, saved backups retained."); await cleanup(); process.exit(0); }
      else response.writeHead(404).end();
    } catch { response.writeHead(500).end("Owned demonstration control failed; see local diagnostics."); }
    finally { controlBusy = false; }
  });
  await new Promise((accept, reject) => { control.once("error", reject); control.listen(controlPort, "127.0.0.1", accept); });
  await writeFile(statePath, JSON.stringify({ owner, token, containerId, backendPort, webPort, controlPort, dbPort, preserveDatabase }), { mode: 0o600 });
  if (interrupted) throw new Error("Demonstration startup interrupted");
  acceptingUsers = true;
  console.log(`READY manual demonstration: http://127.0.0.1:${webPort}/login`);
  console.log(preserveDatabase ? "Existing demonstration data preserved; stop retains this database. Use backup for a separate recovery copy." : "Synthetic accounts only; no business checks executed. Use backup before stop to preserve data.");
  if (resetOldCapabilities) console.log("Older in-memory keys were unavailable. Previous login/QR/scan authority revoked; use new sessions and commands. Historical data retained.");
}

try {
  try { environment = createChildEnvironment(process.env); }
  catch { throw new DemoFailure("CONFIGURATION_REFUSED", "Inherited Spring/JVM/Node overrides were refused. Use a clean terminal without those configuration overrides; no resources were started."); }
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "check") {
    await preflight();
    console.log("Prerequisites ready: Java, prepared files, Linux Docker Engine, ports and container name checked. No services or containers were started.");
  }
  else if ((args[0] === "start" && (args.length === 1 || args.length === 3 && args[1] === "--restore")) || (args.length === 1 && args[0] === "resume")) {
    // Register before the first resource is created; startup unwinds its current operation before exact owned cleanup.
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
      interrupted = true;
      if (acceptingUsers) void cleanup().then(() => process.exit(0), () => { console.error("Owned cleanup requires follow-up"); process.exit(1); });
    });
    await start(args[2], args[0] === "resume");
  }
  else if (args.length === 1 && ["stop", "backup"].includes(args[0])) { stage = "private local " + args[0] + " control"; await command(args[0]); }
  else throw new DemoFailure("USAGE", "Use check, start [--restore directory], resume, backup, or stop.");
} catch (failure) {
  if (failure instanceof DemoFailure) console.error(`Manual demonstration refused [${failure.code}]: ${failure.message}`);
  else console.error(`Manual demonstration failed during ${stage}. Check ignored local logs for that stage; no native database fallback is attempted.`);
  if (containerId) { try { await cleanup(); } catch { console.error("Exact owned resources require manual cleanup follow-up."); } }
  process.exitCode = 1;
}
