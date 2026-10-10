import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createServer as tcpServer } from "node:net";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createChildEnvironment } from "../real-integration/environment.mjs";

// Refusal happens before filesystem writes, port checks, Docker, Java, or automatic Flyway startup.
let childEnvironment;
try {
  childEnvironment = createChildEnvironment(process.env);
} catch {
  console.error(
    "REFUSED inherited Spring/JVM/runtime configuration; no resources started",
  );
  process.exit(1);
}
const executeFile = promisify(execFile);
/** Every subprocess shares the clean environment unless supplied with explicit disposable values. */
function exec(command, args, options = {}) {
  return executeFile(command, args, {
    ...options,
    windowsHide: true,
    env: options.env ?? childEnvironment,
  });
}
const frontend = process.cwd();
const backend = resolve(frontend, "../backend");
const output = resolve(frontend, "output/playwright/m03-registration");
const name = "hsaas-m03-real-visitor-registration";
const owner = "m03-visitor-registration-integration";
const backendPort = 18303;
const webPort = 15303;
const controlPort = 15304;
let containerId;
let control;
let databasePaused = false;
const children = [];
const spawnFailures = new WeakSet();
const processNames = new WeakMap();
const logs = [];
let cleanupPromise;
let databaseEnvironment;
let classpath;
await mkdir(output, { recursive: true });

/** Refuse conflicting fixed loopback ports; the database itself receives a random mapped port. */
async function checkPort(port) {
  await new Promise((accept, reject) => {
    const server = tcpServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close(accept));
  });
}

/** Keep backend diagnostics ignored; never print subprocess errors that may contain private connection state. */
function launch(command, args, options, filename) {
  const log = createWriteStream(resolve(output, filename));
  logs.push(log);
  const child = spawn(command, args, {
    ...options,
    env: options.env ?? childEnvironment,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  processNames.set(child, filename.replace(".log", ""));
  // Spawn errors may carry private environment/connection context; retain only their occurrence.
  child.on("error", () => {
    spawnFailures.add(child);
    if (!log.writableEnded) log.write("Owned subprocess error; details suppressed\n");
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  children.push(child);
  return child;
}

/** Bounded readiness waits fail if an owned process exits; no auth POST is ever retried. */
async function waitFor(check, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child && (spawnFailures.has(child) || child.exitCode !== null || child.signalCode !== null))
      throw new Error("Owned process exited before readiness");
    try {
      if (await check()) return;
    } catch {
      /* Only read-only readiness is repeated. */
    }
    await new Promise((accept) => setTimeout(accept, 1000));
  }
  throw new Error("Owned resource readiness timed out");
}

/** Execute an allowlisted fixture action over the actual temporary MySQL connection. */
async function fixture(action) {
  await exec(
    "java",
    [
      "--class-path",
      classpath,
      "tests/registration/M03FixtureSeed.java",
      action,
    ],
    {
      cwd: frontend,
      env: databaseEnvironment,
      windowsHide: true,
      maxBuffer: 1048576,
    },
  );
}

/** A kill request is not exit evidence; only actual completion or an unspawned failed child satisfies cleanup. */
function exited(child) {
  return child.exitCode !== null || child.signalCode !== null || spawnFailures.has(child) && !child.pid;
}
/** Stop only this exact process handle and require a bounded, observed completion. */
async function stopChild(child) {
  if (exited(child)) return;
  await new Promise((accept, reject) => {
    const finish = () => { if (exited(child)) { clearTimeout(timer);child.off("exit", finish);child.off("error", finish);accept(); } };
    const timer = setTimeout(() => {
      child.off("exit", finish);child.off("error", finish);
      reject(new Error("Owned process exit timed out"));
    }, 10000);
    child.on("exit", finish);child.on("error", finish);
    try { child.kill();finish(); }
    catch { if (exited(child)) finish(); else { clearTimeout(timer);child.off("exit", finish);child.off("error", finish);reject(new Error("Owned process could not be stopped")); } }
  });
}

/** Stop exact live handles, await bounded exits, check the exact container label, then measure all owned ports. */
function cleanup() {
  // Concurrent stop/signal paths share the same completion and cannot exit before cleanup finishes.
  cleanupPromise ??= cleanupOwnedResources();
  return cleanupPromise;
}

/** Record actual exit/port facts, including incomplete cleanup, before returning success or failure. */
async function cleanupOwnedResources() {
  let controlStopped = true;
  if (control?.listening) {
    try {
      await new Promise((accept, reject) => {
        const timeout = setTimeout(() => reject(new Error("Owned control shutdown timed out")), 10000);
        control.close(() => { clearTimeout(timeout);accept(); });
        control.closeIdleConnections();
      });
    } catch { controlStopped = false; }
  }
  const stops = await Promise.allSettled(children.map(stopChild));
  const ownedProcessesStopped = stops.every(result => result.status === "fulfilled") && children.every(exited);
  let ownedContainerRemoved = !containerId;
  if (containerId) {
    try {
      const inspected = await exec("docker", [
      "inspect",
      "--format",
      '{{index .Config.Labels "hsaas.test.owner"}}',
      containerId,
      ], { timeout: 15000 });
      if (inspected.stdout.trim() !== owner) throw new Error("Container ownership mismatch");
      if (databasePaused) await exec("docker", ["unpause", containerId], { timeout: 15000 });
      await exec("docker", ["rm", "-f", containerId], { timeout: 15000 });
      ownedContainerRemoved = true;
    } catch { ownedContainerRemoved = false; }
  }
  const ports = await Promise.allSettled([backendPort, webPort, controlPort].map(checkPort));
  const ownedPortsUnbound = controlStopped && ports.every(result => result.status === "fulfilled");
  // A timed-out child must not continue piping into an ended diagnostic stream.
  for (const child of children) { child.stdout.unpipe();child.stderr.unpipe(); }
  for (const log of logs) log.end();
  await writeFile(
    resolve(output, "cleanup.json"),
    JSON.stringify({
      ownedProcessesStopped, ownedContainerRemoved, ownedPortsUnbound,
      ownedContainerCreated: Boolean(containerId),
      processFacts: children.map(child => ({ kind: processNames.get(child), started: Boolean(child.pid),
        exitCode: child.exitCode, signalCode: child.signalCode, spawnFailed: spawnFailures.has(child), exited: exited(child) })),
      portFacts: [backendPort, webPort, controlPort].map((port, index) => ({ port, unbound: ports[index].status === "fulfilled" })),
    }),
  );
  if (!ownedProcessesStopped || !ownedContainerRemoved || !ownedPortsUnbound) throw new Error("Owned resource cleanup incomplete");
  console.log("PASS observed exits, owned container removal and three unbound ports");
}

try {
  for (const port of [backendPort, webPort, controlPort]) await checkPort(port);
  classpath = (
    await readFile(
      resolve(frontend, "output/playwright/m03-runtime-classpath.txt"),
      "utf8",
    )
  ).trim();
  const rootPassword = randomBytes(24).toString("hex");
  const databasePassword = randomBytes(24).toString("hex");
  const created = await exec(
    "docker",
    [
      "run",
      "--detach",
      "--name",
      name,
      "--label",
      "hsaas.test.owner=" + owner,
      "--publish",
      "127.0.0.1::3306",
      "--env",
      "MYSQL_ROOT_PASSWORD",
      "--env",
      "MYSQL_DATABASE",
      "--env",
      "MYSQL_USER",
      "--env",
      "MYSQL_PASSWORD",
      "mysql:8.0.45",
    ],
    {
      env: {
        ...childEnvironment,
        MYSQL_ROOT_PASSWORD: rootPassword,
        MYSQL_DATABASE: "hsaas_m03_integration",
        MYSQL_USER: "m03_integration",
        MYSQL_PASSWORD: databasePassword,
      },
    },
  );
  containerId = created.stdout.trim();
  await waitFor(async () => {
    await exec(
      "docker",
      [
        "exec",
        "--env",
        "MYSQL_PWD",
        containerId,
        "mysql",
        "-uroot",
        "-N",
        "-e",
        "SELECT 1",
      ],
      { env: { ...childEnvironment, MYSQL_PWD: rootPassword } },
    );
    return true;
  });
  // MySQL's binary-log guard needs this disposable-only setting for deterministic failure triggers.
  await exec(
    "docker",
    [
      "exec",
      "--env",
      "MYSQL_PWD",
      containerId,
      "mysql",
      "-uroot",
      "-e",
      "SET GLOBAL log_bin_trust_function_creators=1",
    ],
    {
      env: { ...childEnvironment, MYSQL_PWD: rootPassword },
    },
  );
  const mapping = await exec("docker", ["port", containerId, "3306/tcp"]);
  const dbPort = Number(mapping.stdout.trim().split(":").at(-1));
  databaseEnvironment = {
    ...childEnvironment,
    HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${dbPort}/hsaas_m03_integration?connectionTimeZone=UTC`,
    HSAAS_DB_USER: "m03_integration",
    HSAAS_DB_PASSWORD: databasePassword,
    // Public synthetic login fixture, never a real hospital staff credential or deployment default.
    M03_FIXTURE_PASSWORD: "Synthetic-only-password_1",
    // Submission hashing is explicitly scoped to this disposable run, including its retained key version.
    IDEMPOTENCY_KEY_VERSION: "browserfixture",
    IDEMPOTENCY_HMAC_KEY: randomBytes(32).toString("base64"),
    HSAAS_PORT: String(backendPort),
    HSAAS_ENVIRONMENT: "test",
    // Only this disposable run receives QR key material; it never appears in logs or process arguments.
    HSAAS_QR_ENABLED: "true",
    HSAAS_QR_ORIGIN: `http://127.0.0.1:${webPort}`,
    HSAAS_QR_ACTIVEKEY: "browserfixture",
    HSAAS_QR_KEYS_BROWSERFIXTURE: randomBytes(32).toString("base64"),
    READER_MODE: "disabled",
    MRN_MODE: "mock",
    NOTIFICATION_MODE: "disabled",
    BLOCKCHAIN_MODE: "disabled",
  };
  const server = launch(
    "java",
    [
      "-jar",
      "target/hsaas-backend-0.0.1-SNAPSHOT.jar",
      "--spring.profiles.active=integration-m03",
      // Only packaged reviewed configuration is eligible; cwd files and external profile groups cannot join.
      "--spring.config.location=classpath:/application.yaml",
      "--spring.config.additional-location=",
      "--spring.config.import=",
      "--spring.profiles.include=",
      "--spring.profiles.group.integration-m03=",
      "--server.address=127.0.0.1",
      "--hsaas.environment=test",
      "--hsaas.secure-cookie=false",
      "--hsaas.reader-mode=disabled",
      "--hsaas.mrn-mode=mock",
      "--hsaas.notification-mode=disabled",
      "--hsaas.blockchain-mode=disabled",
      "--hsaas.bootstrap.enabled=false",
      "--hsaas.registration.enabled=true",
      "--logging.level.root=WARN",
    ],
    { cwd: backend, env: databaseEnvironment },
    "backend.log",
  );
  await waitFor(
    async () =>
      (await fetch(`http://127.0.0.1:${backendPort}/api/health`)).status ===
      200,
    server,
  );
  await fixture("seed");
  const vite = launch(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
      "--port",
      String(webPort),
      "--strictPort",
    ],
    {
      cwd: frontend,
      env: {
        ...childEnvironment,
        HSAAS_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}`,
      },
    },
    "vite.log",
  );
  await waitFor(
    async () =>
      (await fetch(`http://127.0.0.1:${webPort}/login`)).status === 200,
    vite,
  );
  // Test control is loopback-only with fixed actions, separate from the real application and Vite proxy.
  control = createServer(async (request, response) => {
    try {
      if (request.method === "OPTIONS" && request.url === "/receipt") {
        response.writeHead(204, { "Access-Control-Allow-Origin": "http://127.0.0.1:15303", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" }).end(); return;
      }
      if (request.method !== "POST") {
        response.writeHead(405).end();
        return;
      }
      const action = request.url.slice(1);
      if (action === "receipt") {
        let body = ""; for await (const part of request) { body += part; if (body.length > 65536) throw new Error("Receipt too large"); }
        await writeFile(resolve(output, "browser-verification.json"), body); response.writeHead(204, { "Access-Control-Allow-Origin": "http://127.0.0.1:15303" }).end(); return;
      }
      if (["logout-fault", "clear-fault", "revoke-staff"].includes(action))
        await fixture(action);
      else if (action === "pause-db") {
        await exec("docker", ["pause", containerId]);
        databasePaused = true;
      } else if (action === "resume-db") {
        await exec("docker", ["unpause", containerId]);
        databasePaused = false;
      } else if (action === "stop") {
        response.writeHead(204).end();
        try { await cleanup();process.exit(0); }
        catch { console.error("FAIL owned resource cleanup; safe receipt records incomplete state");process.exit(1); }
        return;
      } else {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(204).end();
    } catch {
      response.writeHead(500).end();
    }
  });
  await new Promise((accept) =>
    control.listen(controlPort, "127.0.0.1", accept),
  );
  await writeFile(
    resolve(output, "resources.json"),
    JSON.stringify(
      {
        containerName: name,
        owner,
        mysqlImage: "mysql:8.0.45",
        dbPort,
        backendPort,
        webPort,
        controlPort,
        profile: "integration-m03 (no .env import)",
        modes: "test / disabled / mock / disabled / disabled",
        childEnvironment:
          "OS/runtime allowlist; inherited Spring/JVM/runtime injection rejected before startup",
        configurationLocation:
          "classpath:/application.yaml only; no file location, additional location, import, included profile or profile group",
      },
      null,
      2,
    ),
  );
  console.log(
    `READY real M00 + temporary MySQL: http://127.0.0.1:${webPort}; controls on loopback ${controlPort}`,
  );
  process.on("SIGINT", () => {
    void cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
  });
  process.on("SIGTERM", () => {
    void cleanup().then(() => process.exit(0)).catch(() => process.exit(1));
  });
} catch {
  console.error(
    "FAIL real integration harness startup; ignored local logs contain diagnostics",
  );
  try { await cleanup(); } catch { console.error("FAIL owned resource cleanup; safe receipt records incomplete state"); }
  process.exitCode = 1;
}
