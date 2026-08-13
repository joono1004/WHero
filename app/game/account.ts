"use client";

import { supabase } from "./supabaseClient.ts";
import { reportClientError } from "./reportError.ts";
import { parseSaveGame } from "../../lib/game/save.ts";
import type { SaveGame } from "../../lib/game/save.ts";

// Every player gets an anonymous Supabase auth session the first time the
// game loads, invisible to them (no login screen, no prompt). That gives
// every save a stable user_id from turn one. Cloud backup/restore only
// becomes available once the player *chooses* to link a real email/password
// to that same user_id (see linkAccountWithEmail) - the anonymous session
// itself is never surfaced as an "account".
export async function ensureGuestSession(): Promise<void> {
  if (!supabase) return;
  try {
    // getSession() only reads the locally stored JWT, with no server
    // round-trip - it happily returns a "session" for a user that was since
    // deleted (e.g. from the Supabase dashboard), which then makes every
    // later auth call fail with "User from sub claim in JWT does not
    // exist". getUser() actually asks the server, so a stale/orphaned
    // session is caught here instead of at some unrelated call site.
    const { data, error: getUserError } = await supabase.auth.getUser();
    if (data.user && !getUserError) return;
    if (getUserError) await supabase.auth.signOut();
    const { error } = await supabase.auth.signInAnonymously();
    if (error) reportClientError(error, { screen: "account", action: "signInAnonymously" });
  } catch (error) {
    reportClientError(error, { screen: "account", action: "ensureGuestSession" });
  }
}

// Supabase's auth/postgrest errors come back in English - this maps the
// handful players will actually hit to Korean, falling back to the raw
// message (still useful in Vercel logs/screenshots for us) for anything
// unrecognized rather than hiding it.
const KNOWN_ERROR_PATTERNS: [RegExp, string][] = [
  [/already been registered|already registered|already exists/i, "이미 등록된 이메일입니다. 로그인해 주세요."],
  [/invalid login credentials/i, "이메일 또는 비밀번호가 올바르지 않습니다."],
  [/email rate limit exceeded/i, "이메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요."],
  [/password should be at least/i, "비밀번호가 너무 짧습니다. 6자 이상 입력해주세요."],
  [/unable to validate email address/i, "올바른 이메일 주소를 입력해주세요."],
  [/email not confirmed/i, "이메일 인증이 필요합니다."],
  [/auth session missing/i, "로그인 세션을 찾을 수 없습니다. 페이지를 새로고침한 뒤 다시 시도해주세요."],
  [/user from sub claim in jwt does not exist/i, "로그인 세션이 만료되었습니다. 페이지를 새로고침한 뒤 다시 시도해주세요."],
  // During a guest-to-account upgrade Supabase reports this when the email
  // is already occupied. It is not a password-change flow in this screen.
  [/new password should be different/i, "이미 등록된 이메일입니다. 로그인해 주세요."],
];

function translateAuthError(message: string): string {
  for (const [pattern, translated] of KNOWN_ERROR_PATTERNS) {
    if (pattern.test(message)) return translated;
  }
  // The provider's detail is logged separately; it must not become an
  // English player-facing message when a new provider error is introduced.
  return "계정 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

export type AccountStatus = { linked: false } | { linked: true; email: string };

// Whether the current session belongs to a guest (anonymous) user or one
// that has linked a real email - drives what SettingsScreen shows/allows.
export async function getAccountStatus(): Promise<AccountStatus> {
  if (!supabase) return { linked: false };
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous || !user.email) return { linked: false };
  return { linked: true, email: user.email };
}

export type AccountActionResult = { ok: true } | { ok: false; error: string };

// Upgrades the current anonymous session to a permanent account in place -
// same user_id, so any saves already backed up under it stay attached.
export async function linkAccountWithEmail(email: string, password: string): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { error } = await supabase.auth.updateUser({ email, password });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return { ok: true };
}

// Registration is intentionally different from linking a guest account.
// `updateUser` changes the email/password of whichever anonymous session is
// currently open, which made an existing email and a reused password look
// like contradictory registration results. The main-menu registration flow
// must always create a separate email/password account instead.
export async function registerAccountWithEmail(email: string, password: string): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  // With email confirmation enabled, Supabase deliberately avoids exposing
  // whether an address exists through an error. An empty identities list is
  // its documented signal for that case, so keep the game message clear.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "이미 등록된 이메일입니다. 로그인해 주세요." };
  }
  return { ok: true };
}

// Signs into an existing linked account on this device (e.g. after
// reinstalling, or on a second device) - replaces the local guest session.
export async function signInWithEmail(email: string, password: string): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return { ok: true };
}

// Ends the linked session and immediately starts a fresh anonymous one, so
// the app always has *some* session to attach local saves' identity to
// (see ensureGuestSession) - the player just loses cloud backup/restore
// until they register or sign in again.
export async function signOutAccount(): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: translateAuthError(error.message) };
  await ensureGuestSession();
  return { ok: true };
}

// Each account has at most two cloud backups, not one per local save slot:
// the latest auto-backup (from clearing a world) and the latest manual one
// ("지금 백업"), each overwriting its own prior copy. slot_id is stored
// alongside so restoring a backup writes back to the local slot it came
// from, but it's not part of the key - the player thinks of this as "my
// save", not "slot 3's save".
export type CloudBackupType = "auto" | "manual";

type SaveRow = { backup_type: CloudBackupType; slot_id: string; save_data: SaveGame; updated_at: string };

export async function backupSaveSlot(
  slotId: string,
  save: SaveGame,
  backupType: CloudBackupType,
): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "로그인 상태가 아닙니다." };
  const { error } = await supabase.from("saves").upsert({
    user_id: userData.user.id,
    backup_type: backupType,
    slot_id: slotId,
    save_data: save,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return { ok: true };
}

export type CloudBackupSummary = { backupType: CloudBackupType; updatedAt: string };

const BACKUP_TYPE_ORDER: CloudBackupType[] = ["auto", "manual"];

export async function listCloudBackups(): Promise<CloudBackupSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("saves").select("backup_type, updated_at");
  if (error || !data) {
    if (error) reportClientError(error, { screen: "account", action: "listCloudBackups" });
    return [];
  }
  return (data as Pick<SaveRow, "backup_type" | "updated_at">[])
    .map((row) => ({ backupType: row.backup_type, updatedAt: row.updated_at }))
    .sort((a, b) => BACKUP_TYPE_ORDER.indexOf(a.backupType) - BACKUP_TYPE_ORDER.indexOf(b.backupType));
}

export type RestoreCloudBackupResult =
  | { ok: true; save: SaveGame; slotId: string }
  | { ok: false; error: string };

// Cloud data is untrusted the same way hand-edited localStorage is - it's
// round-tripped through parseSaveGame's JSON + shape + integrity checks
// before anything in the app is allowed to touch it (see save.ts).
export async function restoreCloudBackup(backupType: CloudBackupType): Promise<RestoreCloudBackupResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { data, error } = await supabase
    .from("saves")
    .select("slot_id, save_data")
    .eq("backup_type", backupType)
    .single();
  if (error || !data) return { ok: false, error: error ? translateAuthError(error.message) : "백업을 찾을 수 없습니다." };
  const row = data as Pick<SaveRow, "slot_id" | "save_data">;
  const result = parseSaveGame(JSON.stringify(row.save_data));
  if (!result.ok) return { ok: false, error: "백업 데이터가 손상되었습니다." };
  return { ok: true, save: result.save, slotId: row.slot_id };
}

// Wipes every cloud backup (auto and manual) for the current account.
// Doesn't touch the account's email/password or the player's local save -
// "계정 데이터 삭제" means the cloud copies, not the login itself (deleting
// the actual auth user needs the service-role key, which the client never
// has - RLS is what lets a player delete only their own rows here).
export async function deleteAllCloudBackups(): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "로그인 상태가 아닙니다." };
  const { error } = await supabase.from("saves").delete().eq("user_id", userData.user.id);
  if (error) return { ok: false, error: translateAuthError(error.message) };
  return { ok: true };
}
