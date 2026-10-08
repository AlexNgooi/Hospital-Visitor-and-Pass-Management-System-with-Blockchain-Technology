import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createChildEnvironment } from "./environment.mjs";

// All override values are inert test strings; no native database or real secret is consulted.
test("OS/runtime allowlist drops inherited application credentials and unrelated values", () => {
  const clean = createChildEnvironment({
    Path: "runtime-path",
    SystemRoot: "os-root",
    JAVA_HOME: "runtime-home",
    HSAAS_DB_URL: "ignored",
    HSAAS_DB_PASSWORD: "public-fixture-only",
    CLASSPATH: "ignored",
    DOCKER_HOST: "ignored",
  });
  assert.deepEqual(clean, {
    PATH: "runtime-path",
    SYSTEMROOT: "os-root",
    JAVA_HOME: "runtime-home",
  });
  assert.ok(Object.isFrozen(clean));
});

for (const name of [
  "SPRING_DATASOURCE_URL",
  "SPRING_APPLICATION_JSON",
  "SPRING_CONFIG_LOCATION",
  "SPRING_CONFIG_ADDITIONAL_LOCATION",
  "SPRING_CONFIG_IMPORT",
  "SPRING_CONFIG_NAME",
  "SPRING_PROFILES_ACTIVE",
  "SPRING_PROFILES_INCLUDE",
  "SPRING_PROFILES_GROUP_INTEGRATION_M01",
  "JAVA_TOOL_OPTIONS",
  "JDK_JAVA_OPTIONS",
  "_JAVA_OPTIONS",
  "JAVA_OPTS",
  "NODE_OPTIONS",
]) {
  test("rejects inherited injection variable " + name, () => {
    // Case-insensitive checks cover Windows spelling aliases without reflecting the supplied value.
    assert.throws(
      () => createChildEnvironment({ [name.toLowerCase()]: "inert-override" }),
      {
        message: "Inherited application/runtime configuration is not allowed",
      },
    );
  });
}

test("host Spring datasource override refuses the actual harness before any resource startup", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "hsaas-m01-env-negative-"));
  // Resolve and verify the owned deletion target before running the test or entering cleanup.
  const target = resolve(scratch);
  assert.equal(dirname(target), resolve(tmpdir()));
  assert.ok(basename(target).startsWith("hsaas-m01-env-negative-"));
  try {
    const clean = createChildEnvironment(process.env);
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(new URL("./harness.mjs", import.meta.url))],
      {
        cwd: scratch,
        windowsHide: true,
        encoding: "utf8",
        timeout: 10000,
        env: {
          ...clean,
          SPRING_DATASOURCE_URL: "jdbc:mysql://127.0.0.1:9/ignored",
        },
      },
    );
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /^REFUSED inherited Spring\/JVM\/runtime configuration; no resources started/,
    );
    assert.ok(
      !result.stderr.includes("jdbc:") && !result.stderr.includes("127.0.0.1"),
    );
    // The entry guard precedes even output directory creation and all Docker/Java/port operations.
    assert.deepEqual(await readdir(scratch), []);
  } finally {
    // Remove only this mkdtemp directory after verifying its resolved parent and generated basename.
    await rm(target, { recursive: true, force: true });
  }
});
