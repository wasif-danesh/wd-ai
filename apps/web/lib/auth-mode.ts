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

/** Pages anyone may open without signing in: the home page, the sign-in page and the "coming soon" product pages. */
const PUBLIC_PATHS = new Set([
  "/",
  "/signin",
  // pages for products that are not built yet (ADR-0042 to ADR-0044): public until they are real
  "/speech-to-text",
  "/lip-sync",
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);
}

/** Why the sign-in page is showing, in words, from where the visitor was headed. */
export function signInReason(next: string): string {
  if (next === "/music" || next.startsWith("/music/")) {
    return "Sign in to create music and keep your songs.";
  }
  if (next === "/image" || next.startsWith("/image/")) {
    return "Sign in to create images and keep them.";
  }
  if (next === "/text-to-speech" || next.startsWith("/text-to-speech/")) {
    return "Sign in to create speech and keep it.";
  }
  if (next === "/video" || next.startsWith("/video/")) {
    return "Sign in to create videos and keep them.";
  }
  return "Sign in to continue.";
}
