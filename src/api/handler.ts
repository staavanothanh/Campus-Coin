import type { Db } from "../infrastructure/db/pool.ts";
import { handleCoreRequest, type CoreActor } from "./core-routes.ts";
import { handleIssueRequest } from "./issue-routes.ts";

export interface ApiDependencies {
  db: Db;
  allowedOrigins: ReadonlySet<string>;
  resolveSession(request: Request): Promise<CoreActor | null>;
  verifyCsrf(request: Request, actor: CoreActor): Promise<boolean>;
}

/** Fetch-compatible route entrypoint; session/CSRF adapters are supplied by the host runtime. */
export function handleApiRequest(request: Request, dependencies: ApiDependencies): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/issues" || path === "/issues/me" || path.startsWith("/admin/issues")) {
    return handleIssueRequest(request, dependencies);
  }
  return handleCoreRequest(request, dependencies);
}
