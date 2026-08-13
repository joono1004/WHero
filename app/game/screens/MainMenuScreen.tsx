"use client";

import { useEffect, useState } from "react";
import { Button } from "../Button.tsx";
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
  const [registerMode, setRegisterMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const remembered = window.localStorage.getItem("whero:remembered-email");
    if (remembered) { setEmail(remembered); setRememberEmail(true); }
  }, []);

  async function submit() {
    if (!email || !password || pending) return;
    setPending(true); setMessage(null);
    const result = registerMode ? await onRegister(email, password) : await onSignIn(email, password);
    setPending(false);
    if (result.ok) {
      if (rememberEmail) window.localStorage.setItem("whero:remembered-email", email);
      else window.localStorage.removeItem("whero:remembered-email");
    } else setMessage(result.error);
  }

  return <div className="main-menu-screen"><div className="main-menu-screen__content">
    <h2>메인 메뉴</h2>
    <div className="main-menu-login">
      <div className="main-menu-login__row"><label>ID</label><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일을 입력하세요" /></div>
      <div className="main-menu-login__row"><label>PW</label><input type="password" autoComplete={registerMode ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력하세요" /></div>
      <label className="main-menu-login__remember"><input type="checkbox" checked={rememberEmail} onChange={(event) => setRememberEmail(event.target.checked)} />ID 기억</label>
      {message ? <p className="main-menu-login__message">{message}</p> : null}
      <button type="button" className="main-menu-login__submit" disabled={!email || !password || pending} onClick={submit}>{pending ? "처리 중..." : registerMode ? "신규 등록" : "로그인"}</button>
      <button type="button" className="main-menu-login__register" disabled={pending} onClick={() => { setRegisterMode((value) => !value); setMessage(null); }}>{registerMode ? "로그인으로 돌아가기" : "신규 등록"}</button>
    </div>
    <button type="button" className="main-menu-login__title" onClick={onGoToTitle}>첫 화면</button>
  </div></div>;
}
