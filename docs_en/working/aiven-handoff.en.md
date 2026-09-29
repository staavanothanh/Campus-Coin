# Aiven Connection Handoff — Working Information

## Purpose

Document secure access and querying instructions to verify database connectivity. This file contains no Service URIs, hosts, usernames, passwords, CA certificates, or `.env` values; personal connection credentials are only entered directly into DBeaver.

## Known State

- User possesses an Aiven MySQL endpoint and default database information `defaultdb`; username/password are manually entered into the client by the user.
- Connectivity, owner/service mapping, database contents, or confirmation that the database represents Campus Coin have not been verified. `defaultdb` is not synonymous with the application database/schema `campus_coin`.
- Developer B's DB handoff notes migrations `0001`–`0030` applied on `campus_coin`, roles `cc_migrate`/`cc_runtime` provisioned, clone `campus_coin_clone` available, and app utilizing provider admin; these are reports from branch B and remain unverified in this merge pass.
- Current read-only probe on `campus_coin_clone` confirms MySQL 8.4.8/TLS, rows `0001`–`0030`, and `0031_create_oauth_challenges.sql`; local `0032_email_auth.sql` and `0033_auth_rate_limits.sql` match checksums of external rows `0004`/`0005` but are not yet applied at `0032`/`0033`.
- Do not run `db:migrate` on the shared target until ownership, grants, backup/restore, and pending auth migration rollouts are formally verified.

## Connecting with DBeaver

1. Open **Database → New Database Connection → MySQL** and select Host connection type.
2. Enter Host, Port, Database (`defaultdb`), username, and password into their respective fields. Do not paste the `mysql://...` URI into the JDBC URL; console-generated URIs may format credentials differently from host fields.
3. On the SSL tab, enable SSL and set mode to `REQUIRED` to match provided `ssl-mode=REQUIRED`. This mode enforces TLS encryption but does not verify CA/hostname.
4. When a project CA is downloaded directly from the Aiven Overview, configure the CA file and switch to `VERIFY_IDENTITY` if supported by client. For Aiven MySQL, the project CA is required for `VERIFY_CA`/`VERIFY_IDENTITY`; `VERIFY_IDENTITY` also verifies the hostname. Do not fetch CAs from third-party sources, do not commit CAs to Git, and do not treat an unverified local `ca.pem` as correct.
5. Click Test Connection. If successful, open SQL Editor and execute in sequence:

```sql
SELECT 1 AS connection_ok;
SELECT DATABASE() AS selected_database, CURRENT_USER() AS db_account;
SELECT VERSION() AS mysql_version;
SHOW TABLES;
```

These queries merely verify visible connectivity and schemas. Do not execute `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `ALTER`, `DROP`, seeds, or migrations on `defaultdb`. DBeaver's read-only toggle is an advisory UI aid; read-only guarantees must be enforced by database accounts.

Aiven states the default user `avnadmin` possesses full administrative privileges. If the owner provisions a dedicated testing user, grant minimum `SELECT` permissions; user creation and privilege assignment belong to the owner. Usernames and passwords are typed directly into DBeaver, never committed to source, docs, or shell history.

## Prerequisites for Campus Coin Usage

The DB owner and Team Leader must confirm the target database belongs to Campus Coin and that the environment is cleared for use. Next, run `npm run db:preflight`/`db:status` using verified configuration, ensure backups can be restored, verify CA and roles, and run only authorized migrations. `npm run db:datatest` and MySQL integration tests create and drop temporary databases; run them only against isolated services/instances.

The runtime role must adhere to least-privilege; `avnadmin` is overly broad and must not be used as the application runtime role. Distribute CAs through secure secret/runtime stores and keep local `.env` and CA files out of Git.

## Troubleshooting Connection Failures

Verify the service is running, credentials, host/port, TLS mode, driver compatibility, Aiven service IP filtering rules, and local network egress. If the driver reports SSL CA issues, retrieve the CA from Aiven Overview. Never disable TLS or pass credentials into command-line arguments/history to bypass errors.

## Referenced Official Documentation

- [Aiven: DBeaver connection](https://aiven.io/docs/products/mysql/howto/connect-with-dbeaver)
- [Aiven: TLS/SSL certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates)
- [Aiven: MySQL service users and grants](https://aiven.io/docs/products/mysql/howto/manage-service-users)
- [DBeaver: MySQL connection settings](https://dbeaver.com/docs/dbeaver/Database-driver-MySQL/) and [SSL configuration](https://dbeaver.com/docs/dbeaver/SSL-Configuration/)
- [MySQL Connector/J: SSL modes](https://dev.mysql.com/doc/connectors/en/connector-j-connp-props-security.html)
