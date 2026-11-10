# Native infrastructure contract

Input: current local-only runtime decision and MANUAL_NATIVE.md.
Responsibility: explicit loopback connection template for the separately provisioned hsaas_manual_native schema/account.
Output: .env.native.example.json and README. Private .env.native.json is ignored; SQL tests use their own account/schemas.
Verification: static configuration, syntax and build checks. Database connection/startup/migrations are user-run.
Boundary: no access to old hsaas_db, automatic adoption of old data or database-service control. Stop retains data and keys.
