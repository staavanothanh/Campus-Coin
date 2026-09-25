import { test } from "node:test";
import assert from "node:assert/strict";
import type { Db } from "../src/infrastructure/db/pool.ts";
import { updateUserCategory } from "../src/application/category.service.ts";

test("category update rolls back when its audit insert fails", async () => {
  const auditError = new Error("audit insert failed");
  const statements: string[] = [];
  let didCommit = false;
  let didRollback = false;
  let didRelease = false;

  const connection = {
    beginTransaction: async () => undefined,
    commit: async () => {
      didCommit = true;
    },
    rollback: async () => {
      didRollback = true;
    },
    release: () => {
      didRelease = true;
    },
    query: async (sql: string) => {
      statements.push(sql);
      if (sql.startsWith("UPDATE categories")) return [{ affectedRows: 1 }, []];
      if (sql.startsWith("SELECT id, name_en")) {
        return [[{
          id: 41,
          name_en: "Books",
          name_vi: "Sách",
          applies_to: "payment",
          status: "disabled",
          is_default: 0,
        }], []];
      }
      if (sql.startsWith("INSERT INTO audit_events")) throw auditError;
      throw new Error(`unexpected query: ${sql}`);
    },
  };
  const db = { getConnection: async () => connection } as unknown as Db;

  await assert.rejects(
    updateUserCategory(db, { userId: 7, categoryId: 41, status: "disabled" }),
    (error: unknown) => error === auditError,
  );

  assert.equal(statements.length, 3);
  assert.match(statements[0]!, /^UPDATE categories/);
  assert.match(statements[2]!, /^INSERT INTO audit_events/);
  assert.equal(didCommit, false);
  assert.equal(didRollback, true);
  assert.equal(didRelease, true);
});
