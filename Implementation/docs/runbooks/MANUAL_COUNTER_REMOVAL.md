# Shared staff workspace database upgrade

This branch starts from the published V11 schema. V12 removes the counters and user_counter_permissions tables and the counter columns from QR displays, grants, registrations, reader devices, scan jobs and pass assignments. V1 through V11 are unchanged. The unreleased branch that limited the number of active counters has a different V12 and is outside this upgrade path.

## What the upgrade retains

- Registration IDs, categories, destinations, source data and review actors.
- Open and closed Pass assignments, their dates, issue/return staff IDs and audit events. After the upgrade, authorized staff see the current environment's shared queue and can return Passes issued by a previous shift.
- Staff authorization for every Counter Staff account with an active grant to at least one active legacy counter. Accounts without such a grant remain disabled for visitor operations. The administrator enables or disables this access from Staff management.
- Historical audit entries and completed QR or scan records remain available. An unfinished registration form must be reopened from the new QR. In-progress legacy scans are cancelled.

## Existing dedicated native database

1. Check the applied migration version and confirm the intended environment. An existing native database should be on V11 immediately before this upgrade.
2. Finish active issuance/returns and pause staff writes. Record the pre-upgrade results below, then follow [MANUAL_NATIVE](MANUAL_NATIVE.md) to make a complete private database and key backup with the old release running. Then stop the owned application processes so the old binaries and in-flight writes cannot overlap the migration.
3. Start this branch's built frontend and backend together with Flyway enabled. The following command uses the existing native configuration in place when run from the new checkout root with its frontend built and backend packaged.

```powershell
node Implementation/scripts/manual-demo.mjs start --runtime-root 'C:/Users/alexy/Documents/FYP Dev/Implementation'
```

4. Verify V12 in Flyway history. Compare registrations, open/returned Pass counts and staff access against the backup. Retain the pre-upgrade backup if historical counter locations are needed. MySQL DDL commits independently. If migration fails partway, stop the application and inspect the Flyway history and schema before retrying. Restoring the old release requires the V11-compatible backup.
5. On a staff account, open the current QR, submit a fresh synthetic registration, complete review and issue a Pass. Sign out and sign in as a second authorized staff member. Confirm the Pass appears in their list and return it. Verify the issue and return staff IDs in admin history. Confirm a staff account with access disabled cannot list, review, issue, return or create a QR, and that disabling access invalidates its existing session.

## Read-only upgrade verification

Use the dedicated native database account and confirm the first query prints the expected schema before continuing. Capture these counts before starting V12 and again after startup, before creating acceptance records.

```sql
SELECT DATABASE() AS target_schema;
SELECT version, description, success
FROM flyway_schema_history
WHERE version IS NOT NULL
ORDER BY installed_rank DESC LIMIT 3;

SELECT status, COUNT(*) AS registrations
FROM visitor_registrations GROUP BY status;
SELECT COALESCE(closure_reason, 'OPEN') AS disposition, COUNT(*) AS passes
FROM card_assignments GROUP BY closure_reason;
```

Record the number of existing staff accounts that should retain access before V12. Matching grants to multiple active legacy counters must count once.

```sql
SELECT COUNT(*) AS staff_with_legacy_access
FROM users u
WHERE u.role = 'COUNTER_STAFF'
  AND EXISTS (
    SELECT 1 FROM user_counter_permissions p JOIN counters c ON c.id = p.counter_id
    WHERE p.user_id = u.id AND p.active = TRUE AND c.active = TRUE
  );
```

After V12, look for a successful version 12 in Flyway history and compare the registration and Pass counts to the pre-upgrade output. The following checks should produce the same number of staff with access and zero remaining legacy columns and tables.

```sql
SELECT COUNT(*) AS staff_with_access
FROM users WHERE role = 'COUNTER_STAFF' AND staff_access_enabled = TRUE;
SELECT COUNT(*) AS legacy_columns
FROM information_schema.columns WHERE table_schema = DATABASE()
  AND column_name IN ('counter_id', 'issue_counter_id', 'return_counter_id');
SELECT COUNT(*) AS legacy_tables
FROM information_schema.tables WHERE table_schema = DATABASE()
  AND table_name IN ('counters', 'user_counter_permissions');
```

The new demo seed can initialize a separate empty native database directly at V12. Business rows and original counter history are not needed for fresh demo setup.

Migration execution, native launch and browser/business acceptance are NOT_RUN.
