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

function RegisterAccountModal({
  onLinkAccount,
  onClose,
}: {
  onLinkAccount: (email: string, password: string) => Promise<AccountActionResult>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleRegister() {
    setPending(true);
    setError(null);
    const result = await onLinkAccount(email, password);
    setPending(false);
    if (result.ok) {
      setStep("success");
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-md border border-[#43606a] bg-[#17343e] p-4">
        {step === "form" ? (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#f3dfaa]">계정 등록</h3>
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1 text-xs text-[#c0cbc7]">
                  영웅 스토리에서 사용할 계정 정보 (이메일 주소)를 입력해주세요.
                </p>
                <input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-xs text-[#d6ded9]"
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-[#c0cbc7]">비밀번호를 입력해주세요.</p>
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-xs text-[#d6ded9]"
                />
              </div>
              {error && <p className="text-xs text-[#d9b6b6]">{error}</p>}
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  size="sm"
                  disabled={!email || !password || pending}
                  onClick={handleRegister}
                >
                  계정 등록
                </Button>
                <Button className="flex-1" size="sm" variant="secondary" disabled={pending} onClick={onClose}>
                  취소
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#f3dfaa]">계정 등록 완료</h3>
            <p className="mb-3 text-xs text-[#c0cbc7]">
              계정 등록이 완료되었습니다. 등록하신 이메일에서 이메일 인증(Confirm email)을 하셔야 로그인이
              가능합니다.
            </p>
            <Button className="w-full" size="sm" onClick={onClose}>
              확인
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function SettingsScreen({
  onBack,
  autoBackupEnabled,
  onToggleAutoBackup,
  accountStatus,
  onLinkAccount,
  onSignIn,
  onSignOut,
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
  onSignOut: () => Promise<AccountActionResult>;
  slots: SaveSlotSummary[];
  onBackupSlot: (slotId: string) => Promise<AccountActionResult>;
  cloudBackups: CloudBackupSummary[] | null;
  onRestoreBackup: (slotId: string) => Promise<RestoreCloudBackupResult>;
}) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const linked = accountStatus?.linked === true;

  async function handleSignIn() {
    setPending(true);
    setMessage(null);
    const result = await onSignIn(signinEmail, signinPassword);
    setPending(false);
    setMessage(result.ok ? "로그인되었습니다." : result.error);
  }

  async function handleSignOut() {
    setPending(true);
    setMessage(null);
    const result = await onSignOut();
    setPending(false);
    setMessage(result.ok ? null : result.error);
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
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#c0cbc7]">연결된 계정: {accountStatus.email}</p>
              <Button size="sm" variant="secondary" disabled={pending} onClick={handleSignOut}>
                로그아웃
              </Button>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-[#8fa6a8]">
                계정을 등록하면 저장 데이터를 클라우드에 백업하고 다른 기기에서 복원할 수 있습니다.
              </p>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-[#c0cbc7]">계정 로그인</span>
                <Button size="sm" onClick={() => setShowRegisterModal(true)}>
                  계정 등록
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="email"
                  placeholder="이메일"
                  value={signinEmail}
                  onChange={(event) => setSigninEmail(event.target.value)}
                  className="rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-xs text-[#d6ded9]"
                />
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={signinPassword}
                  onChange={(event) => setSigninPassword(event.target.value)}
                  className="rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-xs text-[#d6ded9]"
                />
                <Button size="sm" disabled={!signinEmail || !signinPassword || pending} onClick={handleSignIn}>
                  로그인
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
          {!linked && <p className="mt-1 text-[10px] text-[#8fa6a8]">계정을 등록하면 사용할 수 있습니다.</p>}
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
            <p className="text-xs text-[#8fa6a8]">계정을 등록하면 사용할 수 있습니다.</p>
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

      {showRegisterModal && (
        <RegisterAccountModal onLinkAccount={onLinkAccount} onClose={() => setShowRegisterModal(false)} />
      )}
    </ScreenShell>
  );
}
