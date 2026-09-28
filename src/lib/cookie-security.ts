export function isSecureCookieEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  const explicit = env.SESSION_SECURE;
  if (explicit !== undefined && explicit !== "true" && explicit !== "false") {
    throw new Error("SESSION_SECURE must be true or false");
  }
  return explicit === "true" || env.NODE_ENV === "production";
}
