# Shared staff workspace database upgrade

This branch starts from the published V11 schema. V12 removes the counters and user_counter_permissions tables and the counter columns from QR displays, grants, registrations, reader devices, scan jobs and pass assignments. V1 through V11 are unchanged. The unreleased branch that limited the number of active counters has a different V12 and is outside this upgrade path.

## What the upgrade retains

- Registration IDs, categories, destinations, source data and review actors.
- Open and closed Pass assignments, their dates, issue/return staff IDs and audit events. After the upgrade, authorized staff see the current environment's shared queue and can return Passes issued by a previous shift.
- Staff authorization for every Counter Staff account with an active grant to at least one active legacy counter. Accounts without such a grant remain disabled for visitor operations. The administrator enables or disables this access from Staff management.
- Historical audit entries and completed QR or scan records remain available. An unfinished registration form must be reopened from the new QR. In-progress legacy scans are cancelled.

## Existing dedicated native database

1. Check the applied migration version and confirm the intended environment. An existing native database should be on V11 immediately before this upgrade.
2. Follow [MANUAL_NATIVE](MANUAL_NATIVE.md) to make a complete private database and key backup with the old release running. Then stop the owned application processes so the old binaries and in-flight writes cannot overlap the migration.
3. Start this branch's built frontend and backend together with Flyway enabled. The following command uses the existing native configuration in place when run from the new checkout root with its frontend built and backend packaged.

```powershell
node Implementation/scripts/manual-demo.mjs start --runtime-root 'C:/Users/alexy/Documents/FYP Dev/Implementation'
```

4. Verify V12 in Flyway history. Compare registrations, open/returned Pass counts and staff access against the backup. Retain the pre-upgrade backup if historical counter locations are needed. MySQL DDL commits independently. If migration fails partway, stop the application and inspect the Flyway history and schema before retrying. Restoring the old release requires the V11-compatible backup.
5. On a staff account, open the current QR, submit a fresh synthetic registration, complete review and issue a Pass. Sign out and sign in as a second authorized staff member. Confirm the Pass appears in their list and return it. Verify the issue and return staff IDs in admin history. Confirm a staff account with access disabled cannot list, review, issue, return or create a QR, and that disabling access invalidates its existing session.

The new demo seed can initialize a separate empty native database directly at V12. Business rows and original counter history are not needed for fresh demo setup.

Migration execution, native launch and browser/business acceptance are NOT_RUN.
