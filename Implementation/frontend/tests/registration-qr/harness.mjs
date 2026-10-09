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
const output = resolve(frontend, "output/playwright/m02-qr");
const name = "hsaas-m02-real-bd17";
const owner = "m02-bd17-integration";
const backendPort = 18292;
const webPort = 15292;
const controlPort = 15293;
let containerId;
let control;
let databasePaused = false;
const children = [];
const logs = [];
let cleanupStarted = false;
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
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  children.push(child);
  return child;
}

/** Bounded readiness waits fail if an owned process exits; no auth POST is ever retried. */
async function waitFor(check, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (child && child.exitCode !== null)
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
      "tests/registration-qr/M02FixtureSeed.java",
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

/** Delete only the exact container created by this run after checking its ownership label. */
async function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  control?.close();
  for (const child of children) child.kill();
  if (containerId) {
    const inspected = await exec("docker", [
      "inspect",
      "--format",
      '{{index .Config.Labels "hsaas.test.owner"}}',
      containerId,
    ]);
    if (inspected.stdout.trim() !== owner)
      throw new Error("Container ownership mismatch");
    if (databasePaused) await exec("docker", ["unpause", containerId]);
    await exec("docker", ["rm", "-f", containerId]);
  }
  for (const log of logs) log.end();
  await writeFile(
    resolve(output, "cleanup.json"),
    JSON.stringify({
      ownedProcessesStopped: true,
      ownedContainerRemoved: true,
    }),
  );
  console.log("PASS cleanup of owned M02 integration resources");
}

try {
  for (const port of [backendPort, webPort, controlPort]) await checkPort(port);
  classpath = (
    await readFile(
      resolve(frontend, "output/playwright/m02-runtime-classpath.txt"),
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
        MYSQL_DATABASE: "hsaas_m02_integration",
        MYSQL_USER: "m02_integration",
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
    HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${dbPort}/hsaas_m02_integration?connectionTimeZone=UTC`,
    HSAAS_DB_USER: "m02_integration",
    HSAAS_DB_PASSWORD: databasePassword,
    // Public synthetic login fixture, never a real hospital staff credential or deployment default.
    M02_FIXTURE_PASSWORD: "Synthetic-only-password_1",
    HSAAS_PORT: String(backendPort),
    HSAAS_ENVIRONMENT: "test",
    // Only this disposable run receives QR key material; it never appears in logs or process arguments.
    HSAAS_QR_ENABLED: "true",
    HSAAS_QR_ORIGIN: `http://127.0.0.1:${webPort}`,
    HSAAS_QR_ACTIVEKEY: "browserfixture",
    HSAAS_QR_KEYS_BROWSERFIXTURE: randomBytes(32).toString("base64"),
    READER_MODE: "disabled",
    MRN_MODE: "manual",
    NOTIFICATION_MODE: "disabled",
    BLOCKCHAIN_MODE: "disabled",
  };
  const server = launch(
    "java",
    [
      "-jar",
      "target/hsaas-backend-0.0.1-SNAPSHOT.jar",
      "--spring.profiles.active=integration-m02",
      // Only packaged reviewed configuration is eligible; cwd files and external profile groups cannot join.
      "--spring.config.location=classpath:/application.yaml",
      "--spring.config.additional-location=",
      "--spring.config.import=",
      "--spring.profiles.include=",
      "--spring.profiles.group.integration-m02=",
      "--server.address=127.0.0.1",
      "--hsaas.environment=test",
      "--hsaas.secure-cookie=false",
      "--hsaas.reader-mode=disabled",
      "--hsaas.mrn-mode=manual",
      "--hsaas.notification-mode=disabled",
      "--hsaas.blockchain-mode=disabled",
      "--hsaas.bootstrap.enabled=false",
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
        response.writeHead(204, { "Access-Control-Allow-Origin": "http://127.0.0.1:15292", "Access-Control-Allow-Methods": "POST", "Access-Control-Allow-Headers": "Content-Type" }).end(); return;
      }
      if (request.method !== "POST") {
        response.writeHead(405).end();
        return;
      }
      const action = request.url.slice(1);
      if (action === "receipt") {
        let body = ""; for await (const part of request) { body += part; if (body.length > 65536) throw new Error("Receipt too large"); }
        await writeFile(resolve(output, "browser-verification.json"), body); response.writeHead(204, { "Access-Control-Allow-Origin": "http://127.0.0.1:15292" }).end(); return;
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
        await cleanup();
        process.exit(0);
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
        profile: "integration-m02 (no .env import)",
        modes: "test / disabled / manual / disabled / disabled",
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
    void cleanup().then(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void cleanup().then(() => process.exit(0));
  });
} catch {
  console.error(
    "FAIL real integration harness startup; ignored local logs contain diagnostics",
  );
  await cleanup();
  process.exitCode = 1;
}
