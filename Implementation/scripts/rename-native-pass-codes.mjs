import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createChildEnvironment } from './child-environment.mjs';

/** Explicit inventory maintenance for the dedicated native demo only; never starts services or migrates schemas. */
const database = 'hsaas_manual_native', owner = 'hsaas-pass-naming-v1';
// manual-demo.mjs pins the application environment to test while its inventory data remains synthetic.
const dataEnvironment = 'test';
const prefixes = { EXECUTIVE: 'exec-', PENJAGA: 'penj-', VENDOR: 'vend-', CONTRACTOR: 'cont-' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let stage = 'arguments';

/** Read the original private config in place and supply the password only through the child environment. */
async function main() {
  const args = process.argv.slice(2);
  if (![2, 4].includes(args.length) || args[0] !== '--runtime-root' || (args.length === 4 && args[2] !== '--apply')) throw new Error();
  const runtime = await realpath(resolve(args[1]));
  const planDirectory = resolve(runtime, 'tmp/manual-demo-native/pass-naming');
  const environment = createChildEnvironment(process.env);
  stage = 'dedicated native configuration';
  const config = JSON.parse(await readFile(resolve(runtime, 'infra/.env.native.json'), 'utf8'));
  if (config.user !== database || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535
      || typeof config.password !== 'string' || !config.password || config.password.startsWith('REPLACE_')
      || typeof config.mysql !== 'string' || !config.mysql) throw new Error();
  const mysqlArgs = ['--no-defaults', '--protocol=TCP', '--host=127.0.0.1', `--port=${config.port}`,
    `--user=${database}`, '--connect-timeout=3', '--skip-reconnect', '--batch', '--raw', '--skip-column-names', database];
  // SQL travels through stdin, avoiding shell parsing and Windows command-line length limits.
  const sql = query => new Promise((accept, reject) => {
    const child = spawn(config.mysql, mysqlArgs, { windowsHide: true,
      env: { ...environment, MYSQL_PWD: config.password }, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = []; let size = 0, failed = false, diagnostic = '';
    const timer = setTimeout(() => { failed = true; child.kill(); }, 30000);
    child.stdout.on('data', chunk => { size += chunk.length; if (size > 8 * 1024 * 1024) { failed = true; child.kill(); } else chunks.push(chunk); });
    child.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk.toString('utf8')).slice(-4096); });
    child.on('error', () => { clearTimeout(timer); reject(new Error()); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || failed) {
        // Only the numeric server code and input line may leave this boundary, never the diagnostic text.
        const match = diagnostic.match(/ERROR (\d+) \([A-Z0-9]+\) at line (\d+)/);
        if (match) stage += ` [MySQL ${match[1]}, line ${match[2]}]`;
        reject(new Error());
      } else accept({ stdout: Buffer.concat(chunks).toString('utf8') });
    });
    child.stdin.on('error', () => { failed = true; });
    child.stdin.end(query + ';\n');
  });
  stage = 'dedicated native connection';
  const identity = (await sql('SELECT DATABASE(),SUBSTRING_INDEX(CURRENT_USER(),\'@\',1)')).stdout.trim();
  if (identity !== `${database}\t${database}`) throw new Error();

  if (args.length === 2) {
    stage = 'read-only inventory plan';
    const output = (await sql('SELECT id,HEX(card_code),category_code,status,version,DATE_FORMAT(enrolled_at,\'%Y-%m-%d %H:%i:%s.%f\'),environment,data_origin FROM cards ORDER BY enrolled_at,id')).stdout.trim();
    const counts = Object.fromEntries(Object.keys(prefixes).map(category => [category, 0]));
    const cards = output ? output.split(/\r?\n/).map(line => {
      const [id, oldHex, category, status, version, enrolledAt, sourceEnvironment, source] = line.split('\t');
      const checks = { id: uuid.test(id), category: Boolean(prefixes[category]), environment: sourceEnvironment === dataEnvironment,
        source: ['SIMULATED', 'SYNTHETIC'].includes(source), state: /^(AVAILABLE|ISSUED|OVERDUE|LOST|DISABLED)$/.test(status),
        version: /^\d+$/.test(version) && BigInt(version) < 9007199254740991n, code: /^(?:[0-9A-F]{2}){1,64}$/.test(oldHex) };
      const invalid = Object.entries(checks).find(([, valid]) => !valid);
      if (invalid) { stage = `inventory validation: ${invalid[0]}`; throw new Error(); }
      const number = ++counts[category];
      if (number > 9999) throw new Error();
      return { id, oldHex, category, status, version, enrolledAt, source, newCode: `${prefixes[category]}${number}`, temporaryCode: `rename-${randomUUID()}` };
    }) : [];
    const plan = { owner, database, environment: dataEnvironment, port: config.port, id: randomUUID(), createdAt: new Date().toISOString(), counts, cards };
    await mkdir(planDirectory, { recursive: true });
    const path = resolve(planDirectory, `${plan.id}.json`);
    // This private original-name mapping is written before any mutation and never contains credentials or visitor data.
    await writeFile(path, JSON.stringify(plan, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ mode: 'PLAN_ONLY', plan: path, total: cards.length, counts,
      changes: cards.filter(card => card.oldHex !== Buffer.from(card.newCode, 'ascii').toString('hex').toUpperCase()).length }));
    return;
  }

  stage = 'saved plan validation';
  const planPath = await realpath(resolve(args[3]));
  if (dirname(planPath) !== await realpath(planDirectory)) throw new Error();
  const plan = JSON.parse(await readFile(planPath, 'utf8'));
  if (plan.owner !== owner || plan.database !== database || plan.environment !== dataEnvironment || plan.port !== config.port || !uuid.test(plan.id)
      || !Array.isArray(plan.cards) || plan.cards.length > 39996) throw new Error();
  const counts = Object.fromEntries(Object.keys(prefixes).map(category => [category, 0]));
  const ids = new Set(), temporaryCodes = new Set();
  let previousOrder = '';
  for (const card of plan.cards) {
    const order = `${card.enrolledAt}/${card.id}`;
    if (!uuid.test(card.id) || ids.has(card.id) || !prefixes[card.category] || card.newCode !== `${prefixes[card.category]}${++counts[card.category]}`
        || counts[card.category] > 9999 || !/^rename-[0-9a-f-]{36}$/.test(card.temporaryCode) || temporaryCodes.has(card.temporaryCode)
        || !/^(?:[0-9A-F]{2}){1,64}$/.test(card.oldHex) || !/^\d+$/.test(card.version) || BigInt(card.version) >= 9007199254740991n
        || !/^(AVAILABLE|ISSUED|OVERDUE|LOST|DISABLED)$/.test(card.status) || !['SIMULATED', 'SYNTHETIC'].includes(card.source)
        || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}$/.test(card.enrolledAt) || order < previousOrder) throw new Error();
    ids.add(card.id); temporaryCodes.add(card.temporaryCode); previousOrder = order;
  }
  const hex = text => `0x${Buffer.from(text, 'ascii').toString('hex')}`;
  const changed = plan.cards.filter(card => card.oldHex !== Buffer.from(card.newCode, 'ascii').toString('hex').toUpperCase()).length;
  // CHECK failures abort mysql batch execution; disconnect rolls back every pending update and audit insert.
  const statements = [
    'SET SESSION innodb_lock_wait_timeout=10', 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE', 'START TRANSACTION',
    'CREATE TEMPORARY TABLE pass_name_guard (n INT NOT NULL CHECK (n=0))',
    'CREATE TEMPORARY TABLE pass_name_plan (id CHAR(36) PRIMARY KEY,old_code VARBINARY(64),new_code VARBINARY(64) UNIQUE,temp_code VARBINARY(64) UNIQUE,category VARCHAR(16),state VARCHAR(16),old_version BIGINT,enrolled_at DATETIME(6),source VARCHAR(16))',
  ];
  if (plan.cards.length) statements.push(`INSERT INTO pass_name_plan VALUES ${plan.cards.map(card =>
    `('${card.id}',0x${card.oldHex},${hex(card.newCode)},${hex(card.temporaryCode)},'${card.category}','${card.status}',${card.version},'${card.enrolledAt}','${card.source}')`).join(',')}`);
  statements.push(
    // Full-range card locks also fence concurrent enrollment; no registration/assignment row is rewritten.
    'SELECT id FROM cards ORDER BY id FOR UPDATE',
    `INSERT INTO pass_name_guard SELECT IF((SELECT COUNT(*) FROM cards)=${plan.cards.length} AND NOT EXISTS(SELECT 1 FROM cards c LEFT JOIN pass_name_plan p ON p.id=c.id WHERE p.id IS NULL OR BINARY c.card_code<>p.old_code OR c.category_code<>p.category OR c.status<>p.state OR c.version<>p.old_version OR c.enrolled_at<>p.enrolled_at OR c.environment<>'${dataEnvironment}' OR c.data_origin<>p.source),0,1)`,
    // MySQL permits only one reference to a temporary table per statement, so collision checking is separate.
    'INSERT INTO pass_name_guard SELECT IF(NOT EXISTS(SELECT 1 FROM cards c JOIN pass_name_plan p ON BINARY c.card_code=p.temp_code),0,1)',
    'UPDATE cards c JOIN pass_name_plan p ON p.id=c.id SET c.card_code=p.temp_code WHERE p.old_code<>p.new_code',
    `INSERT INTO pass_name_guard SELECT IF(ROW_COUNT()=${changed},0,1)`,
    'UPDATE cards c JOIN pass_name_plan p ON p.id=c.id SET c.card_code=p.new_code,c.version=p.old_version+1 WHERE p.old_code<>p.new_code',
    `INSERT INTO pass_name_guard SELECT IF(ROW_COUNT()=${changed},0,1)`,
    // The maintenance actor is deliberately null, not an impersonated administrator. Audit contains no labels or PII.
    "INSERT INTO audit_events(event_id,action,target_ref,actor_id,snapshot_version,safe_snapshot,occurred_at) SELECT UUID(),'CARD_RENAMED',CONCAT('CARD:',id),NULL,1,JSON_OBJECT('previousState',state,'state',state,'previousVersion',old_version,'version',old_version+1,'origin','LOCAL'),UTC_TIMESTAMP(6) FROM pass_name_plan WHERE old_code<>new_code",
    `INSERT INTO pass_name_guard SELECT IF(ROW_COUNT()=${changed},0,1)`,
    'INSERT INTO pass_name_guard SELECT IF(NOT EXISTS(SELECT 1 FROM cards c JOIN pass_name_plan p ON p.id=c.id WHERE BINARY c.card_code<>p.new_code OR c.version<>p.old_version+IF(p.old_code<>p.new_code,1,0) OR c.status<>p.state),0,1)',
    'COMMIT', `SELECT 'COMMITTED-${plan.id}'`,
  );
  stage = 'atomic rename (if interrupted, inspect the saved plan before retrying)';
  const result = await sql(statements.join(';\n'));
  if (!result.stdout.includes(`COMMITTED-${plan.id}`)) throw new Error();
  console.log(JSON.stringify({ mode: 'COMMITTED', plan: planPath, total: plan.cards.length, renamed: changed, counts }));
}

// Never expose child command text, connection configuration, SQL errors or private file contents on failure.
main().catch(() => { console.error(`Pass naming stopped at: ${stage}. No automatic retry.`); process.exitCode = 1; });
