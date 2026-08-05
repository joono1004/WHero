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
    const { data } = await supabase.auth.getSession();
    if (data.session) return;
    const { error } = await supabase.auth.signInAnonymously();
    if (error) reportClientError(error, { screen: "account", action: "signInAnonymously" });
  } catch (error) {
    reportClientError(error, { screen: "account", action: "ensureGuestSession" });
  }
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
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Signs into an existing linked account on this device (e.g. after
// reinstalling, or on a second device) - replaces the local guest session.
export async function signInWithEmail(email: string, password: string): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Ends the linked session and immediately starts a fresh anonymous one, so
// the app always has *some* session to attach local saves' identity to
// (see ensureGuestSession) - the player just loses cloud backup/restore
// until they register or sign in again.
export async function signOutAccount(): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  await ensureGuestSession();
  return { ok: true };
}

type SaveRow = { slot_id: string; save_data: SaveGame; updated_at: string };

export async function backupSaveSlot(slotId: string, save: SaveGame): Promise<AccountActionResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: "로그인 상태가 아닙니다." };
  const { error } = await supabase
    .from("saves")
    .upsert({ user_id: userData.user.id, slot_id: slotId, save_data: save, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type CloudBackupSummary = { slotId: string; factionName: string; updatedAt: string };

export async function listCloudBackups(): Promise<CloudBackupSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("saves").select("slot_id, save_data, updated_at");
  if (error || !data) {
    if (error) reportClientError(error, { screen: "account", action: "listCloudBackups" });
    return [];
  }
  return (data as SaveRow[])
    .map((row) => ({
      slotId: row.slot_id,
      factionName: row.save_data.factionName,
      updatedAt: row.updated_at,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export type RestoreCloudBackupResult =
  | { ok: true; save: SaveGame }
  | { ok: false; error: string };

// Cloud data is untrusted the same way hand-edited localStorage is - it's
// round-tripped through parseSaveGame's JSON + shape + integrity checks
// before anything in the app is allowed to touch it (see save.ts).
export async function restoreCloudBackup(slotId: string): Promise<RestoreCloudBackupResult> {
  if (!supabase) return { ok: false, error: "클라우드 백업을 사용할 수 없습니다." };
  const { data, error } = await supabase
    .from("saves")
    .select("save_data")
    .eq("slot_id", slotId)
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "백업을 찾을 수 없습니다." };
  const result = parseSaveGame(JSON.stringify((data as SaveRow).save_data));
  if (!result.ok) return { ok: false, error: "백업 데이터가 손상되었습니다." };
  return { ok: true, save: result.save };
}
