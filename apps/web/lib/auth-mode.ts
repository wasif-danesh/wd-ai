// "jwt" (the default) means real sign-in; "stub" is for local work without OAuth credentials and
// for tests (ADR-0030). Read per call so tests and the server pick up the environment as it is.
export function authEnabled(): boolean {
  return (process.env.AUTH_MODE ?? "jwt") !== "stub";
}

/** Only same-site paths may be a post-sign-in destination (no open redirects). */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return "/";
  return value;
}
