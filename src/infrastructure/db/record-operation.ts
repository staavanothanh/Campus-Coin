import { parseDbOperationLogArgs, recordDbOperationLog } from "./operation-log.js";

try {
  const input = parseDbOperationLogArgs(process.argv.slice(2));
  const operationId = await recordDbOperationLog(input);
  console.log(`db operation recorded: ${operationId}`);
} catch (error) {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : "DB_OPERATION_LOG_FAILED";
  console.error(`FAIL  db operation log (${code})`);
  process.exitCode = 1;
}
