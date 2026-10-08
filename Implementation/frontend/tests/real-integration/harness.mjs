import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createServer as tcpServer } from "node:net";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const exec = promisify(execFile);
const frontend = process.cwd();
const backend = resolve(frontend, "../backend");
const output = resolve(frontend, "output/playwright/real-integration");
const name = "hsaas-m01-real-4156";
const owner = "m01-4156-integration";
const backendPort = 18091;
const webPort = 15191;
const controlPort = 15192;
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
      "tests/real-integration/FixtureSeed.java",
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
  console.log("PASS cleanup of owned M01 integration resources");
}

try {
  for (const port of [backendPort, webPort, controlPort]) await checkPort(port);
  classpath = (
    await readFile(
      resolve(frontend, "output/playwright/real-runtime-classpath.txt"),
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
        ...process.env,
        MYSQL_ROOT_PASSWORD: rootPassword,
        MYSQL_DATABASE: "hsaas_m01_integration",
        MYSQL_USER: "m01_integration",
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
      { env: { ...process.env, MYSQL_PWD: rootPassword } },
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
      env: { ...process.env, MYSQL_PWD: rootPassword },
    },
  );
  const mapping = await exec("docker", ["port", containerId, "3306/tcp"]);
  const dbPort = Number(mapping.stdout.trim().split(":").at(-1));
  databaseEnvironment = {
    ...process.env,
    HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${dbPort}/hsaas_m01_integration?connectionTimeZone=UTC`,
    HSAAS_DB_USER: "m01_integration",
    HSAAS_DB_PASSWORD: databasePassword,
    // Public synthetic login fixture, never a real hospital staff credential or deployment default.
    M01_FIXTURE_PASSWORD: "Synthetic-only-password_1",
    HSAAS_PORT: String(backendPort),
  };
  const server = launch(
    "java",
    [
      "-jar",
      "target/hsaas-backend-0.0.1-SNAPSHOT.jar",
      "--spring.profiles.active=integration-m01",
      "--spring.config.import=",
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
        ...process.env,
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
      if (request.method !== "POST") {
        response.writeHead(405).end();
        return;
      }
      const action = request.url.slice(1);
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
        profile: "integration-m01 (no .env import)",
        modes: "test / disabled / manual / disabled / disabled",
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
