"use client";

import { useState } from "react";
import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";
import type { SaveSlotSummary } from "../../../lib/game/storage.ts";
import type {
  AccountActionResult,
  AccountStatus,
  CloudBackupSummary,
  RestoreCloudBackupResult,
} from "../account.ts";

export function SettingsScreen({
  onBack,
  autoBackupEnabled,
  onToggleAutoBackup,
  accountStatus,
  onLinkAccount,
  onSignIn,
  slots,
  onBackupSlot,
  cloudBackups,
  onRestoreBackup,
}: {
  onBack: () => void;
  autoBackupEnabled: boolean;
  onToggleAutoBackup: (enabled: boolean) => void;
  accountStatus: AccountStatus | null;
  onLinkAccount: (email: string, password: string) => Promise<AccountActionResult>;
  onSignIn: (email: string, password: string) => Promise<AccountActionResult>;
  slots: SaveSlotSummary[];
  onBackupSlot: (slotId: string) => Promise<AccountActionResult>;
  cloudBackups: CloudBackupSummary[] | null;
  onRestoreBackup: (slotId: string) => Promise<RestoreCloudBackupResult>;
}) {
  const [mode, setMode] = useState<"link" | "signin">("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const linked = accountStatus?.linked === true;

  async function handleSubmit() {
    if (!email || !password) {
      setMessage("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setPending(true);
    setMessage(null);
    const result = mode === "link" ? await onLinkAccount(email, password) : await onSignIn(email, password);
    setPending(false);
    setMessage(
      result.ok
        ? mode === "link"
          ? "계정이 연결되었습니다."
          : "로그인되었습니다."
        : result.error,
    );
  }

  async function handleBackup(slotId: string) {
    setPending(true);
    const result = await onBackupSlot(slotId);
    setPending(false);
    setMessage(result.ok ? "백업이 완료되었습니다." : result.error);
  }

  async function handleRestore(slotId: string) {
    setPending(true);
    const result = await onRestoreBackup(slotId);
    setPending(false);
    setMessage(result.ok ? "복원이 완료되었습니다. 이어하기에서 확인하세요." : result.error);
  }

  return (
    <ScreenShell
      header={<h2 className="text-lg font-bold text-[#f3dfaa]">설정</h2>}
      footer={
        <div className="flex justify-center">
          <Button variant="link" onClick={onBack}>
            메인 메뉴로
          </Button>
        </div>
      }
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">계정</h3>
          {linked ? (
            <p className="text-xs text-[#c0cbc7]">연결된 계정: {accountStatus.email}</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-[#8fa6a8]">
                계정을 연결하면 저장 데이터를 클라우드에 백업하고 다른 기기에서 복원할 수 있습니다.
              </p>
              <div className="mb-2 flex gap-2">
                <Button size="sm" variant={mode === "link" ? "primary" : "secondary"} onClick={() => setMode("link")}>
                  계정 연결
                </Button>
                <Button size="sm" variant={mode === "signin" ? "primary" : "secondary"} onClick={() => setMode("signin")}>
                  기존 계정 로그인
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-xs text-[#d6ded9]"
                />
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-xs text-[#d6ded9]"
                />
                <Button size="sm" disabled={pending} onClick={handleSubmit}>
                  {mode === "link" ? "계정 연결" : "로그인"}
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <label className="flex items-center gap-2 text-xs text-[#c0cbc7]">
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              disabled={!linked}
              onChange={(event) => onToggleAutoBackup(event.target.checked)}
            />
            저장 데이터 백업 (스테이지 클리어시 자동백업)
          </label>
          {!linked && <p className="mt-1 text-[10px] text-[#8fa6a8]">계정을 연결하면 사용할 수 있습니다.</p>}
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">저장 데이터 백업</h3>
          {slots.length === 0 ? (
            <p className="text-xs text-[#8fa6a8]">저장된 게임이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {slots.map((slot) => (
                <li key={slot.slotId} className="flex items-center justify-between text-xs">
                  <span className="text-[#c0cbc7]">{slot.factionName}</span>
                  <Button size="sm" variant="secondary" disabled={!linked || pending} onClick={() => handleBackup(slot.slotId)}>
                    지금 백업
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">저장 데이터 복원</h3>
          {!linked ? (
            <p className="text-xs text-[#8fa6a8]">계정을 연결하면 사용할 수 있습니다.</p>
          ) : !cloudBackups || cloudBackups.length === 0 ? (
            <p className="text-xs text-[#8fa6a8]">클라우드에 백업된 데이터가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {cloudBackups.map((backup) => (
                <li key={backup.slotId} className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[#c0cbc7]">{backup.factionName}</p>
                    <p className="text-[10px] text-[#8fa6a8]">{new Date(backup.updatedAt).toLocaleString("ko-KR")}</p>
                  </div>
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => handleRestore(backup.slotId)}>
                    복원
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {message && <p className="text-center text-xs text-[#d7b765]">{message}</p>}
      </div>
    </ScreenShell>
  );
}
