import type { Db } from "../infrastructure/db/pool.ts";
import { handleCoreRequest, type CoreActor, type CoreApiDependencies } from "./core-routes.ts";

export interface ApiDependencies {
  db: Db;
  allowedOrigins: ReadonlySet<string>;
  resolveSession(request: Request): Promise<CoreActor | null>;
  verifyCsrf(request: Request, actor: CoreActor): Promise<boolean>;
  jevService?: CoreApiDependencies["jevService"];
}

/** Fetch-based test adapter for the core contract; production uses src/routes/api.ts. */
export function handleApiRequest(request: Request, dependencies: ApiDependencies): Promise<Response> {
  // Contract công bố base /api/v1 (docs/contracts/README.md) nhưng host có thể mount
  // dispatcher ở bare path (đã strip) hoặc full path. Chấp nhận đúng một prefix
  // /api/v1 tùy chọn; không đoán prefix khác. Host rewrite qua mạng vẫn cần proof riêng.
  const url = new URL(request.url);
  const stripped = stripApiV1Prefix(url.pathname);
  const routed = stripped === url.pathname ? request : new Request(`${url.origin}${stripped}${url.search}`, request);
  return handleCoreRequest(routed, {
    db: dependencies.db,
    allowedOrigins: dependencies.allowedOrigins,
    resolveSession: dependencies.resolveSession,
    verifyCsrf: dependencies.verifyCsrf,
    ...(dependencies.jevService === undefined ? {} : { jevService: dependencies.jevService }),
  });
}

/** Tách đúng một prefix /api/v1 ở đầu; các dạng khác giữ nguyên để routing trả 404. */
export function stripApiV1Prefix(path: string): string {
  if (path === "/api/v1") return "/";
  if (path.startsWith("/api/v1/")) return path.slice("/api/v1".length);
  return path;
}
