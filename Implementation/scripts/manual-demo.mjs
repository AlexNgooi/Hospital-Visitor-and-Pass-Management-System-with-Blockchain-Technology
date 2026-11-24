import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createServer as tcpServer } from 'node:net';
import { createWriteStream, createReadStream } from 'node:fs';
import { access, mkdir, open, readFile, writeFile, rename, rm, realpath } from 'node:fs/promises';
import { dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createChildEnvironment } from './child-environment.mjs';

/** Native MySQL launcher: manages its child applications, never the database service or schema lifecycle. */
const implementation = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backend = resolve(implementation, 'backend'), frontend = resolve(implementation, 'frontend');
// Worktree artifacts may use an explicitly selected existing runtime without copying its private files.
const args = process.argv.slice(2), runtimeOption = args.indexOf('--runtime-root');
const runtimeArgument = runtimeOption < 0 ? undefined : args[runtimeOption + 1];
if (runtimeOption >= 0) args.splice(runtimeOption, 2);
const noMigrateOption = args.indexOf('--no-migrate'), noMigrate = noMigrateOption >= 0;
if (noMigrate) args.splice(noMigrateOption, 1);
const runtimeRoot = runtimeArgument ? resolve(runtimeArgument) : implementation;
const output = resolve(runtimeRoot, 'tmp/manual-demo-native'), backups = resolve(output, 'backups');
const statePath = resolve(output, 'control.json'), keysPath = resolve(output, 'runtime-keys.json');
const lockPath = resolve(output, 'launcher.lock');
const database = 'hsaas_manual_native', owner = 'hsaas-manual-native-v1';
const backendPort = 18407, webPort = 15417, controlPort = 15418;
const execute = promisify(execFile), children = [], logs = [];
let environment, config, keys, control, stopping = false, interrupted = false, accepting = false, controlBusy = false;
let lockHeld = false;
let stage = 'configuration: copy infra/.env.native.example.json to infra/.env.native.json and set credentials';

/** Failures are sanitized by the top-level handler; command arguments and secrets never reach stdout. */
function exec(command, args, options = {}) {
  return execute(command, args, { windowsHide: true, env: environment, timeout: 15000, maxBuffer: 1024 * 1024, ...options });
}
/** Native access is limited to a fixed, separately provisioned schema/account on loopback TCP. */
async function configure() {
  environment = createChildEnvironment(process.env);
  config = JSON.parse(await readFile(resolve(runtimeRoot, 'infra/.env.native.json'), 'utf8'));
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535
      || config.user !== 'hsaas_manual_native' || typeof config.password !== 'string' || !config.password || config.password.startsWith('REPLACE_')
      || ![config.mysql, config.mysqldump].every(value => typeof value === 'string' && value.length)) throw new Error('Invalid configuration');
}
function sqlArgs(dump = false) {
  // mysql accepts connect-timeout; mysqldump 8.0 rejects it before producing a backup.
  return ['--no-defaults', '--protocol=TCP', '--host=127.0.0.1', `--port=${config.port}`, `--user=${config.user}`, ...(dump ? [] : ['--connect-timeout=3'])];
}
async function sql(query) {
  return exec(config.mysql, [...sqlArgs(), '--batch', '--skip-column-names', database, '--execute', query],
    { env: { ...environment, MYSQL_PWD: config.password } });
}
/** Read-only preflight does not start applications, initialize schema, or write runtime files. */
async function preflight() {
  stage = 'Java 21 and prepared application files';
  const java = await exec('java', ['-version']);
  const major = Number((java.stdout + java.stderr).match(/version\s+"(\d+)/)?.[1]);
  if (!Number.isInteger(major) || major < 21) throw new Error('JDK 21 required');
  for (const file of [resolve(backend, 'target/hsaas-backend-0.0.1-SNAPSHOT.jar'),
    resolve(backend, 'target/manual-demo-classpath.txt'), resolve(frontend, 'node_modules/vite/bin/vite.js')]) await access(file);
  const classpath = (await readFile(resolve(backend, 'target/manual-demo-classpath.txt'), 'utf8')).trim();
  if (!classpath) throw new Error('Missing classpath');
  stage = 'native MySQL connection: provision the dedicated schema/account per MANUAL_NATIVE.md';
  await sql('SELECT 1'); await exec(config.mysqldump, ['--version']);
  stage = 'application port availability';
  for (const port of [backendPort, webPort, controlPort]) await new Promise((accept, reject) => {
    const server = tcpServer(); server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(accept));
  });
  return classpath;
}
/** Hidden, directly owned child handles avoid shell processes and unrelated process cleanup. */
function launch(command, args, env, filename, cwd) {
  if (interrupted) throw new Error('Interrupted');
  const log = createWriteStream(resolve(output, filename), { flags: 'w', mode: 0o600 }); logs.push(log);
  const child = spawn(command, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.once('error', () => { child.spawnFailed = true; });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child); return child;
}
async function ready(url, child) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    if (interrupted || child.spawnFailed || child.exitCode !== null || child.signalCode !== null) throw new Error('Application exited');
    try { if ((await fetch(url, { signal: AbortSignal.timeout(3000) })).ok) return; } catch { /* Bounded health checks only. */ }
    await new Promise(accept => setTimeout(accept, 1000));
  }
  throw new Error('Readiness timeout');
}
/** Native dumps and matching keys stay in ignored local storage; partial backups have no completion marker. */
async function transfer(command, args, filename, restore = false) {
  const child = spawn(command, args, { windowsHide: true, env: { ...environment, MYSQL_PWD: config.password },
    stdio: [restore ? 'pipe' : 'ignore', restore ? 'ignore' : 'pipe', 'ignore'] });
  const done = new Promise((accept, reject) => {
    child.once('error', reject); child.once('exit', code => code === 0 ? accept() : reject(new Error('SQL transfer failed')));
  });
  await Promise.all([done, restore ? pipeline(createReadStream(filename), child.stdin)
    : pipeline(child.stdout, createWriteStream(filename, { flags: 'wx', mode: 0o600 }))]);
}
async function backup() {
  const directory = resolve(backups, new Date().toISOString().replaceAll(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex'));
  await mkdir(directory, { recursive: true });
  await transfer(config.mysqldump, [...sqlArgs(true), '--single-transaction', '--set-gtid-purged=OFF', '--no-tablespaces', database], resolve(directory, 'database.sql'));
  await writeFile(resolve(directory, 'keys.json'), JSON.stringify(keys), { mode: 0o600 });
  await writeFile(resolve(directory, 'complete.json'), JSON.stringify({ owner, createdAt: new Date().toISOString() }), { mode: 0o600 });
  return directory;
}
function validKeys(value) {
  return value.owner === owner && value.database === database && value.port === config.port
    && typeof value.version === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value.version)
    && [value.signing, value.hashing].every(key => typeof key === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(key));
}
/** Restore is explicit and only targets an empty dedicated schema; old browser/QR/scan authority is revoked. */
async function restoreBundle(requested) {
  const root = await realpath(backups), directory = await realpath(resolve(requested)), child = relative(root, directory);
  if (!child || child.startsWith('..') || isAbsolute(child)) throw new Error('Invalid backup path');
  const marker = JSON.parse(await readFile(resolve(directory, 'complete.json'), 'utf8'));
  keys = JSON.parse(await readFile(resolve(directory, 'keys.json'), 'utf8'));
  if (marker.owner !== owner || !validKeys(keys)) throw new Error('Invalid backup');
  await transfer(config.mysql, [...sqlArgs(), database], resolve(directory, 'database.sql'), true);
  await sql(['START TRANSACTION', "UPDATE auth_session_contexts SET state='REVOKED',revoked_at=UTC_TIMESTAMP(6) WHERE state<>'REVOKED'",
    'UPDATE app_session_bindings SET invalidated_at=COALESCE(invalidated_at,UTC_TIMESTAMP(6))',
    'UPDATE registration_qr_sessions SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6))',
    'UPDATE registration_qr_challenges SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6))',
    'UPDATE registration_entry_grants SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(6)) WHERE consumed_at IS NULL',
    'UPDATE reader_devices SET active_scan_job_id=NULL', "UPDATE scan_jobs SET status='CANCELLED' WHERE status IN ('CLAIMED','SUCCEEDED')",
    'DELETE FROM SPRING_SESSION', 'COMMIT'].join('; '));
}
/** Stopping never drops data, deletes keys, or stops the user's native MySQL service. */
async function cleanup() {
  if (stopping) return; stopping = true; control?.close();
  let failed = false;
  for (const child of children) if (!child.spawnFailed && child.exitCode === null && child.signalCode === null) {
    child.kill();
    await Promise.race([new Promise(accept => child.once('exit', accept)), new Promise(accept => setTimeout(accept, 5000))]);
    if (child.exitCode === null && child.signalCode === null) failed = true;
  }
  for (const log of logs) log.end();
  if (accepting) await rm(statePath, { force: true });
  if (failed) throw new Error('An owned application process is still running');
  if (lockHeld) { await rm(lockPath); lockHeld = false; }
  console.log('Application stopped. Native database, private keys and backups retained.');
}
/** CLI commands require a per-launch private bearer and refuse browser-origin requests. */
async function command(action) {
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  if (state.owner !== owner || !/^[0-9a-f]{64}$/.test(state.token)) throw new Error('Invalid control identity');
  const response = await fetch(`http://127.0.0.1:${controlPort}/${action}`, { method: 'POST', signal: AbortSignal.timeout(120000),
    headers: { authorization: 'Bearer ' + state.token } });
  if (!response.ok) throw new Error('Control failed');
  console.log(await response.text());
}
/** New schemas require explicit initialization; normal start/resume never re-seeds existing data. */
async function start(initialize, restorePath) {
  const classpath = await preflight();
  await mkdir(output, { recursive: true });
  stage = 'exclusive launcher lock: another launch or an interrupted launch requires inspection';
  // Exclusive creation prevents concurrent launchers from replacing private keys or sharing control state.
  const lock = await open(lockPath, 'wx', 0o600); lockHeld = true;
  try { await lock.writeFile(JSON.stringify({ owner, pid: process.pid })); } finally { await lock.close(); }
  stage = 'schema initialization guard: use start --initialize only for a new empty dedicated schema';
  const tables = Number((await sql("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'")).stdout.trim());
  if (!Number.isSafeInteger(tables) || ((initialize || restorePath) && tables !== 0) || (!initialize && !restorePath && tables === 0)) throw new Error('Invalid schema state');
  stage = 'persisted private keys: existing databases require their original keys';
  if (restorePath) await restoreBundle(restorePath);
  else {
    try { keys = JSON.parse(await readFile(keysPath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT' || !initialize) throw error;
      keys = { owner, database, port: config.port, version: 'native-' + randomBytes(8).toString('hex'),
        signing: randomBytes(32).toString('base64'), hashing: randomBytes(32).toString('base64') };
    }
  }
  if (!validKeys(keys)) throw new Error('Private key identity mismatch');
  // Atomic replacement protects persisted keys from truncation if the launcher is interrupted during a write.
  const pendingKeys = resolve(output, 'runtime-keys.pending.json');
  await writeFile(pendingKeys, JSON.stringify(keys), { mode: 0o600 });
  await rename(pendingKeys, keysPath);
  const env = { ...environment, HSAAS_DB_URL: `jdbc:mysql://127.0.0.1:${config.port}/${database}?connectionTimeZone=UTC`,
    HSAAS_DB_USER: config.user, HSAAS_DB_PASSWORD: config.password, HSAAS_PORT: String(backendPort), IDEMPOTENCY_HMAC_KEY: keys.hashing,
    SPRING_APPLICATION_JSON: JSON.stringify({ hsaas: { qr: { keys: { [keys.version]: keys.signing } } } }) };
  stage = 'backend readiness: Implementation/tmp/manual-demo-native/backend.log';
  const server = launch('java', ['-jar', 'target/hsaas-backend-0.0.1-SNAPSHOT.jar',
    ...(noMigrate ? ['--spring.flyway.enabled=false'] : []),
    '--spring.config.location=classpath:/application.yaml', '--spring.config.additional-location=', '--spring.config.import=',
    '--server.address=127.0.0.1', '--hsaas.environment=test', '--hsaas.secure-cookie=false', '--hsaas.reader-mode=mock', '--hsaas.mrn-mode=mock',
    '--hsaas.notification-mode=disabled', '--hsaas.blockchain-mode=disabled', '--hsaas.bootstrap.enabled=false',
    '--hsaas.qr.enabled=true', '--hsaas.registration.enabled=true', '--hsaas.review.enabled=true', '--hsaas.lifecycle.enabled=true',
    `--hsaas.qr.origin=http://127.0.0.1:${webPort}`, `--hsaas.qr.active-key=${keys.version}`, `--hsaas.hash-key-version=${keys.version}`,
    '--logging.level.root=WARN'], env, 'backend.log', backend);
  await ready(`http://127.0.0.1:${backendPort}/api/health`, server);
  if (initialize) {
    stage = 'synthetic reference/account seed';
    await exec('java', ['--class-path', classpath, resolve(implementation, 'scripts/ManualDemoSeed.java')], { env, cwd: implementation });
  }
  stage = 'frontend readiness: Implementation/tmp/manual-demo-native/frontend.log';
  const vite = launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(webPort), '--strictPort'],
    { ...environment, HSAAS_BACKEND_ORIGIN: `http://127.0.0.1:${backendPort}` }, 'frontend.log', frontend);
  await ready(`http://127.0.0.1:${webPort}/login`, vite);
  const token = randomBytes(32).toString('hex');
  control = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.headers.origin || request.headers.authorization !== 'Bearer ' + token) { response.writeHead(403).end(); return; }
    if (controlBusy) { response.writeHead(409).end(); return; } controlBusy = true;
    try {
      if (request.url === '/backup') {
        const directory = await backup();
        response.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }).end('Backup saved: ' + directory);
      } else if (request.url === '/stop') { response.writeHead(200).end('Stopping application; database retained.'); await cleanup(); process.exit(0); }
      else response.writeHead(404).end();
    } catch { if (!response.headersSent) response.writeHead(500).end('Control failed. Database retained.'); }
    finally { controlBusy = false; }
  });
  await new Promise((accept, reject) => { control.once('error', reject); control.listen(controlPort, '127.0.0.1', accept); });
  await writeFile(statePath, JSON.stringify({ owner, token }), { mode: 0o600 }); accepting = true;
  if (interrupted) throw new Error('Interrupted');
  console.log(`READY manual demonstration: http://127.0.0.1:${webPort}/login`);
  console.log('Native MySQL data persists. Use stop before closing this terminal; start/resume preserves existing data.');
  // A crashed service unwinds its sibling rather than leaving the launcher apparently healthy.
  for (const child of children) child.once('exit', () => { if (!stopping) void cleanup().then(() => process.exit(1), () => process.exit(1)); });
}

try {
  // Reject malformed switches before reading private control or creating any runtime resources.
  if (runtimeOption >= 0 && (!runtimeArgument || runtimeArgument.startsWith('--'))
      || noMigrate && !['start', 'resume', 'check'].includes(args[0])
      || noMigrate && args.some(value => ['--initialize', '--restore'].includes(value))) throw new Error('Invalid launch options');
  if (args.length === 1 && ['stop', 'backup'].includes(args[0])) { stage = 'private control'; await command(args[0]); }
  else {
    await configure();
    if (args.length === 1 && args[0] === 'check') { await preflight(); console.log('Java, prepared files, native MySQL and ports checked. No services started or data changed.'); }
    else if (args.length === 1 && args[0] === 'schema-version') {
      // Report only the dedicated database name, latest version and migration success state.
      stage = 'native schema version check';
      const result = await sql("SELECT DATABASE(),version,success FROM flyway_schema_history WHERE version IS NOT NULL ORDER BY installed_rank DESC LIMIT 1");
      console.log(result.stdout.trim().replaceAll('\t', ' '));
    }
    else if ((args[0] === 'start' && (args.length === 1 || args.length === 2 && args[1] === '--initialize' || args.length === 3 && args[1] === '--restore'))
      || args.length === 1 && args[0] === 'resume') {
      for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
        interrupted = true;
        if (accepting) void cleanup().then(() => process.exit(0), () => process.exit(1));
      });
      await start(args[1] === '--initialize', args[1] === '--restore' ? args[2] : undefined);
    } else throw new Error('Use check, schema-version, start [--initialize | --restore directory], resume, backup, or stop');
  }
} catch {
  console.error(`Manual demonstration failed during ${stage}. See MANUAL_NATIVE.md and ignored logs; credentials are never printed.`);
  if (lockHeld || children.length) { try { await cleanup(); } catch { console.error('An owned application process needs manual follow-up. Database retained.'); } }
  process.exitCode = 1;
}
