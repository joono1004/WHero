"use client";

import { useState } from "react";
import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";
import type {
  AccountActionResult,
  AccountStatus,
  CloudBackupSummary,
  CloudBackupType,
  RestoreCloudBackupResult,
} from "../account.ts";

const BACKUP_TYPE_LABEL: Record<CloudBackupType, string> = {
  auto: "자동저장",
  manual: "수동백업",
};

function formatBackup(backup: CloudBackupSummary): string {
  return `(${BACKUP_TYPE_LABEL[backup.backupType]}) ${new Date(backup.updatedAt).toLocaleString("ko-KR")}`;
}

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
              계정 등록이 완료되었습니다. 다른 기기에서는 등록하신 이메일과 비밀번호로 로그인하시면 됩니다.
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

type RestoreStep = "confirm-start" | "pick" | "confirm-pick" | "done";

function RestoreDataModal({
  onFetchCloudBackups,
  onRestoreBackup,
  onClose,
}: {
  onFetchCloudBackups: () => Promise<CloudBackupSummary[]>;
  onRestoreBackup: (backupType: CloudBackupType) => Promise<RestoreCloudBackupResult>;
  onClose: () => void;
}) {
  const [step, setStep] = useState<RestoreStep>("confirm-start");
  const [backups, setBackups] = useState<CloudBackupSummary[]>([]);
  const [selected, setSelected] = useState<CloudBackupSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleConfirmStart() {
    setPending(true);
    setError(null);
    const list = await onFetchCloudBackups();
    setPending(false);
    if (list.length === 0) {
      setError("클라우드에 백업된 데이터가 없습니다.");
      return;
    }
    setBackups(list);
    setStep("pick");
  }

  async function handleConfirmRestore() {
    if (!selected) return;
    setPending(true);
    setError(null);
    const result = await onRestoreBackup(selected.backupType);
    setPending(false);
    if (result.ok) {
      setStep("done");
    } else {
      setError(result.error);
      setStep("pick");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-md border border-[#43606a] bg-[#17343e] p-4">
        {step === "confirm-start" && (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#f3dfaa]">저장 데이터 복원</h3>
            <p className="mb-3 text-xs text-[#d9b6b6]">
              ※ 주의 진행 중인 게임이 이전으로 복원됩니다. 그래도 진행하시겠습니까?
            </p>
            {error && <p className="mb-2 text-xs text-[#d9b6b6]">{error}</p>}
            <div className="flex gap-2">
              <Button className="flex-1" size="sm" disabled={pending} onClick={handleConfirmStart}>
                예
              </Button>
              <Button className="flex-1" size="sm" variant="secondary" disabled={pending} onClick={onClose}>
                아니오
              </Button>
            </div>
          </>
        )}

        {step === "pick" && (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#f3dfaa]">복원할 데이터 선택</h3>
            <ul className="mb-3 flex flex-col gap-2">
              {backups.map((backup) => (
                <li key={backup.backupType}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(backup);
                      setStep("confirm-pick");
                    }}
                    className="w-full rounded border border-[#43606a] bg-[#0b2028] px-2 py-1.5 text-left text-xs text-[#d6ded9]"
                  >
                    {formatBackup(backup)}
                  </button>
                </li>
              ))}
            </ul>
            {error && <p className="mb-2 text-xs text-[#d9b6b6]">{error}</p>}
            <Button className="w-full" size="sm" variant="secondary" onClick={onClose}>
              취소
            </Button>
          </>
        )}

        {step === "confirm-pick" && selected && (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#f3dfaa]">복원 확인</h3>
            <p className="mb-3 text-xs text-[#c0cbc7]">{formatBackup(selected)} 데이터로 복원하시겠습니까?</p>
            <div className="flex gap-2">
              <Button className="flex-1" size="sm" disabled={pending} onClick={handleConfirmRestore}>
                예
              </Button>
              <Button
                className="flex-1"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => setStep("pick")}
              >
                아니오
              </Button>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <h3 className="mb-3 text-sm font-bold text-[#f3dfaa]">복원 완료</h3>
            <p className="mb-3 text-xs text-[#c0cbc7]">복원이 완료되었습니다.</p>
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
  backLabel,
  autoBackupEnabled,
  onToggleAutoBackup,
  accountStatus,
  onLinkAccount,
  onSignIn,
  onSignOut,
  hasLocalSave,
  onBackupNow,
  onFetchCloudBackups,
  onRestoreBackup,
}: {
  onBack: () => void;
  backLabel: string;
  autoBackupEnabled: boolean;
  onToggleAutoBackup: (enabled: boolean) => void;
  accountStatus: AccountStatus | null;
  onLinkAccount: (email: string, password: string) => Promise<AccountActionResult>;
  onSignIn: (email: string, password: string) => Promise<AccountActionResult>;
  onSignOut: () => Promise<AccountActionResult>;
  hasLocalSave: boolean;
  onBackupNow: () => Promise<AccountActionResult>;
  onFetchCloudBackups: () => Promise<CloudBackupSummary[]>;
  onRestoreBackup: (backupType: CloudBackupType) => Promise<RestoreCloudBackupResult>;
}) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinMessage, setSigninMessage] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const linked = accountStatus?.linked === true;

  async function handleSignIn() {
    setPending(true);
    setSigninMessage(null);
    const result = await onSignIn(signinEmail, signinPassword);
    setPending(false);
    setSigninMessage(result.ok ? "로그인되었습니다." : result.error);
  }

  async function handleSignOut() {
    setPending(true);
    setMessage(null);
    const result = await onSignOut();
    setPending(false);
    setMessage(result.ok ? null : result.error);
    if (result.ok) {
      // Signing out swaps the account section back to the sign-in form -
      // clear its leftover "로그인되었습니다." so it doesn't look like the
      // logout button somehow logged the player back in.
      setSigninMessage(null);
      setSigninEmail("");
      setSigninPassword("");
    }
  }

  async function handleBackupNow() {
    setPending(true);
    setBackupMessage(null);
    const result = await onBackupNow();
    setPending(false);
    setBackupMessage(result.ok ? "백업이 완료되었습니다." : result.error);
  }

  return (
    <ScreenShell header={<h2 className="text-lg font-bold text-[#f3dfaa]">설정</h2>}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 pb-3">
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
                {signinMessage && <p className="text-center text-xs text-[#d7b765]">{signinMessage}</p>}
                <Button size="sm" disabled={!signinEmail || !signinPassword || pending} onClick={handleSignIn}>
                  로그인
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">데이터 관리</h3>
          {!linked && <p className="mb-2 text-[10px] text-[#8fa6a8]">계정을 등록하면 사용할 수 있습니다.</p>}

          <label className="flex items-center gap-2 text-xs text-[#c0cbc7]">
            <input
              type="checkbox"
              checked={autoBackupEnabled}
              disabled={!linked}
              onChange={(event) => onToggleAutoBackup(event.target.checked)}
            />
            자동 데이터 저장 (스테이지 클리어 시 자동 저장 후 클라우드에 백업)
          </label>

          <div className="my-3 border-t border-[#2c4048]" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#c0cbc7]">저장 데이터 백업</span>
            <Button size="sm" variant="secondary" disabled={!linked || !hasLocalSave || pending} onClick={handleBackupNow}>
              지금 백업
            </Button>
          </div>
          {backupMessage && <p className="mt-1 text-xs text-[#d7b765]">{backupMessage}</p>}

          <div className="my-3 border-t border-[#2c4048]" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#c0cbc7]">저장 데이터 복원</span>
            <Button size="sm" variant="secondary" disabled={!linked || pending} onClick={() => setShowRestoreModal(true)}>
              복원
            </Button>
          </div>
          <p className="mt-1 text-[10px] text-[#d9b6b6]">※ 주의 복원을 하면 진행중인 게임이 이전으로 복원 됩니다.</p>
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">게임 진행</h3>
          <p className="mb-2 text-[10px] text-[#8fa6a8]">추후 지원 예정입니다.</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#c0cbc7]">
              <span>그래픽 성능 조절</span>
              <select disabled className="rounded border border-[#43606a] bg-[#0b2028] px-2 py-1 text-xs text-[#8fa6a8]">
                <option>보통</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#c0cbc7]">
              <input type="checkbox" disabled />
              전투 애니메이션 생략
            </label>
            <label className="flex items-center gap-2 text-xs text-[#c0cbc7]">
              <input type="checkbox" disabled />
              유닛 빠른이동
            </label>
          </div>
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">사운드</h3>
          <p className="mb-2 text-[10px] text-[#8fa6a8]">추후 지원 예정입니다.</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-[#c0cbc7]">
              <span>BGM 음량조절</span>
              <input type="range" disabled className="w-28" />
            </div>
            <div className="flex items-center justify-between text-xs text-[#c0cbc7]">
              <span>효과음 음량조절</span>
              <input type="range" disabled className="w-28" />
            </div>
          </div>
        </section>

        <section className="rounded-md border border-[#43606a] bg-[#17343e] p-3">
          <h3 className="mb-2 text-sm font-bold text-[#f3dfaa]">앱 버전 정보</h3>
          <div className="flex items-center justify-between text-xs text-[#c0cbc7]">
            <span>v0.01</span>
            <Button size="sm" variant="secondary" disabled>
              문의하기
            </Button>
          </div>
        </section>

        {message && <p className="text-center text-xs text-[#d7b765]">{message}</p>}

        <Button variant="secondary" onClick={onBack}>
          {backLabel}
        </Button>
      </div>

      {showRegisterModal && (
        <RegisterAccountModal onLinkAccount={onLinkAccount} onClose={() => setShowRegisterModal(false)} />
      )}

      {showRestoreModal && (
        <RestoreDataModal
          onFetchCloudBackups={onFetchCloudBackups}
          onRestoreBackup={onRestoreBackup}
          onClose={() => setShowRestoreModal(false)}
        />
      )}
    </ScreenShell>
  );
}
