import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Internal-only error beacon (2026-08-05): the client posts unhandled
// errors here so they land in Vercel's Runtime Logs (Observability tab) -
// visible to whoever has dashboard access, never rendered to players.
// No storage of our own; this route only exists to get client-side errors
// into a log a human can grep, which server-side logging alone can't catch
// since almost all game logic runs in the browser (see
// docs/DEPLOYMENT_MIGRATION.md - no backend/persistent storage by design).

const MAX_FIELD_LENGTH = 4000;

function truncate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.length > MAX_FIELD_LENGTH ? `${value.slice(0, MAX_FIELD_LENGTH)}…(truncated)` : value;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const report = body as Record<string, unknown>;

  // Single-line JSON so it's easy to grep/filter in the Vercel log viewer.
  console.error(
    "[client-error]",
    JSON.stringify({
      message: truncate(report.message) ?? "(no message)",
      stack: truncate(report.stack),
      screen: truncate(report.screen),
      action: truncate(report.action),
      url: truncate(report.url),
      userAgent: truncate(report.userAgent),
      timestamp: truncate(report.timestamp) ?? new Date().toISOString(),
    }),
  );

  return NextResponse.json({ ok: true });
}
