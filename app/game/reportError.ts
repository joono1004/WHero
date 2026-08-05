// Best-effort client error reporter (2026-08-05): fires a beacon to
// /api/log-error so unhandled errors during actual play show up in Vercel's
// Runtime Logs instead of only in a player's own browser console, which
// nobody but the player would ever see. Never throws itself - a broken
// error reporter must not become a second error.
export type ErrorReportContext = {
  screen?: string;
  action?: string;
};

export function reportClientError(error: unknown, context: ErrorReportContext = {}): void {
  if (typeof window === "undefined") return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const payload = {
    message,
    stack,
    screen: context.screen,
    action: context.action,
    url: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  try {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fetch itself can throw synchronously in rare environments; swallow it.
  }
}
