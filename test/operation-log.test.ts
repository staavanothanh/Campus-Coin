import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDbOperationLogArgs } from "../src/infrastructure/db/operation-log.js";

test("database operation log parser accepts bounded migration metadata", () => {
  assert.deepEqual(
    parseDbOperationLogArgs(["campus-coin", "staging", "migration", "success", "812", "0028", "CHG-123", "-"]),
    {
      projectKey: "campus-coin",
      environment: "staging",
      operation: "migration",
      outcome: "success",
      durationMs: 812,
      migrationVersion: "0028",
      externalReference: "CHG-123",
      errorCode: null,
    },
  );
});

test("database operation log parser requires a stable error code, not raw error text", () => {
  assert.throws(
    () => parseDbOperationLogArgs(["campus-coin", "production", "restore", "failure", "24", "-", "backup-42", "Connection password rejected"]),
    /stable error-code/,
  );
});
