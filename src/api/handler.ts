import type { Db } from "../infrastructure/db/pool.js";
import { handleCoreRequest, type CoreActor } from "./core-routes.js";
import { handleIssueRequest } from "./issue-routes.js";

export interface ApiDependencies {
  db: Db;
  allowedOrigins: ReadonlySet<string>;
  resolveSession(request: Request): Promise<CoreActor | null>;
  verifyCsrf(request: Request, actor: CoreActor): Promise<boolean>;
}

/** Fetch-compatible route entrypoint; session/CSRF adapters are supplied by the host runtime. */
export function handleApiRequest(request: Request, dependencies: ApiDependencies): Promise<Response> {
  // Contract công bố base /api/v1 (docs/contracts/README.md) nhưng host có thể mount
  // dispatcher ở bare path (đã strip) hoặc full path. Chấp nhận đúng một prefix
  // /api/v1 tùy chọn; không đoán prefix khác. Host rewrite qua mạng vẫn cần proof riêng.
  const url = new URL(request.url);
  const stripped = stripApiV1Prefix(url.pathname);
  if (stripped === url.pathname) return dispatchByPath(url.pathname, request, dependencies);
  const routed = new Request(`${url.origin}${stripped}${url.search}`, request);
  return dispatchByPath(stripped, routed, dependencies);
}

/** Tách đúng một prefix /api/v1 ở đầu; các dạng khác giữ nguyên để routing trả 404. */
export function stripApiV1Prefix(path: string): string {
  if (path === "/api/v1") return "/";
  if (path.startsWith("/api/v1/")) return path.slice("/api/v1".length);
  return path;
}

function dispatchByPath(path: string, request: Request, dependencies: ApiDependencies): Promise<Response> {
  if (path === "/issues" || path === "/issues/me" || path.startsWith("/admin/issues")) {
    return handleIssueRequest(request, dependencies);
  }
  return handleCoreRequest(request, dependencies);
}
