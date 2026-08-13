"use client";

import { useEffect, useState } from "react";
import type { AccountActionResult, AccountStatus } from "../account.ts";

export function MainMenuScreen({ onGoToTitle, onSignIn, onRegister, hasSave: _hasSave, onNewGame: _onNewGame, onContinue: _onContinue }: {
  onGoToTitle: () => void;
  accountStatus: AccountStatus | null;
  onSignIn: (email: string, password: string) => Promise<AccountActionResult>;
  onRegister: (email: string, password: string) => Promise<AccountActionResult>;
  hasSave?: boolean;
  onNewGame?: () => void;
  onContinue?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const remembered = window.localStorage.getItem("whero:remembered-email");
    if (remembered) { setEmail(remembered); setRememberEmail(true); }
  }, []);

  async function signIn() {
    if (!email || !password || pending) return;
    setPending(true); setMessage(null);
    const result = await onSignIn(email, password);
    setPending(false);
    if (result.ok) {
      if (rememberEmail) window.localStorage.setItem("whero:remembered-email", email);
      else window.localStorage.removeItem("whero:remembered-email");
    } else setMessage(result.error);
  }

  async function register() {
    if (!registerEmail || !registerPassword || pending) return;
    setPending(true); setRegisterMessage(null);
    const result = await onRegister(registerEmail, registerPassword);
    setPending(false);
    if (!result.ok) setRegisterMessage(result.error);
  }

  function openRegister() {
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterMessage(null);
    setRegisterOpen(true);
  }

  return <div className="main-menu-screen"><div className="main-menu-screen__content">
    <h2>메인 메뉴</h2>
    <div className="main-menu-login">
      <div className="main-menu-login__row"><label>ID</label><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일을 입력하세요" /></div>
      <div className="main-menu-login__row"><label>PW</label><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력하세요" /></div>
      <label className="main-menu-login__remember"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} />ID 기억</label>
      {message ? <p className="main-menu-login__message">{message}</p> : null}
      <button type="button" className="main-menu-login__submit" disabled={!email || !password || pending} onClick={signIn}>{pending ? "처리 중..." : "로그인"}</button>
      <button type="button" className="main-menu-login__register" disabled={pending} onClick={openRegister}>신규 등록</button>
    </div>
    <button type="button" className="main-menu-login__title" onClick={onGoToTitle}>첫 화면</button>
  </div>
  {registerOpen ? <div className="account-register-modal" role="dialog" aria-modal="true" aria-labelledby="account-register-title">
    <div className="account-register-modal__backdrop" onClick={() => !pending && setRegisterOpen(false)} />
    <div className="account-register-modal__panel">
      <h3 id="account-register-title">신규 등록</h3>
      <p>영웅 스토리에 사용할 계정을 만드세요.</p>
      <label>이메일 주소<input type="email" autoComplete="email" value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} placeholder="이메일을 입력하세요" /></label>
      <label>비밀번호<input type="password" autoComplete="new-password" value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} placeholder="6자 이상 입력하세요" /></label>
      {registerMessage ? <p className="account-register-modal__message">{registerMessage}</p> : null}
      <div className="account-register-modal__actions">
        <button type="button" onClick={() => setRegisterOpen(false)} disabled={pending}>취소</button>
        <button type="button" className="account-register-modal__confirm" onClick={register} disabled={!registerEmail || !registerPassword || pending}>{pending ? "등록 중..." : "등록하기"}</button>
      </div>
    </div>
  </div> : null}
  </div>;
}
