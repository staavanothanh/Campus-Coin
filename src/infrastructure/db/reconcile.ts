import { reconcileFinancialProjections } from "../../application/reconciliation.service.ts";
import { DbEnvError } from "./env.ts";
import { closePool, getPool } from "./pool.ts";

async function main(): Promise<number> {
  try {
    const result = await reconcileFinancialProjections(getPool());
    console.log(
      `reconcile: checkedUsers=${result.checkedUsers} walletMismatches=${result.walletMismatches} savingsMismatches=${result.savingsMismatches} status=${result.isConsistent ? "pass" : "fail"}`,
    );
    return result.isConsistent ? 0 : 1;
  } catch (error) {
    if (error instanceof DbEnvError) {
      console.log(`FAIL  ${error.message}`);
    } else {
      const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "RECONCILIATION_FAILED";
      console.log(`FAIL  reconcile (${code})`);
    }
    return 1;
  } finally {
    await closePool().catch(() => undefined);
  }
}

process.exitCode = await main();
