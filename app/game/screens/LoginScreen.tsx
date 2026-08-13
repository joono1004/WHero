"use client";

import { useState } from "react";
import { Button } from "../Button.tsx";
import type { AccountActionResult } from "../account.ts";

export function LoginScreen({
  onSignIn,
  onRegister,
  onSettings,
  onGoToTitle,
}: {
  onSignIn: (email: string, password: string) => Promise<AccountActionResult>;
  onRegister: (email: string, password: string) => Promise<AccountActionResult>;
  onSettings: () => void;
  onGoToTitle: () => void;
}) {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isRegistering = mode === "register";
  const submitLabel = isRegistering ? "신규 등록" : "로그인";

  async function handleSubmit() {
    if (!email || !password || pending) return;
    setPending(true);
    setMessage(null);
    const result = isRegistering
      ? await onRegister(email, password)
      : await onSignIn(email, password);
    setPending(false);
    if (!result.ok) setMessage(result.error);
  }

  return (
    <div className="login-screen">
      <div className="login-screen__panel">
        <p className="login-screen__eyebrow">HERO STORY</p>
        <h2>{isRegistering ? "새 계정 등록" : "계정 로그인"}</h2>
        <p className="login-screen__guide">
          {isRegistering
            ? "새로운 여정을 시작할 계정을 등록하세요."
            : "계정으로 접속해 지난 여정을 이어가세요."}
        </p>
        <label>
          <span>ID (이메일)</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="이메일을 입력하세요"
          />
        </label>
        <label>
          <span>PW</span>
          <input
            type="password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="비밀번호를 입력하세요"
          />
        </label>
        {message ? <p className="login-screen__message">{message}</p> : null}
        <Button className="login-screen__submit" size="sm" disabled={!email || !password || pending} onClick={handleSubmit}>
          {pending ? "처리 중..." : submitLabel}
        </Button>
        <button
          type="button"
          className="login-screen__register"
          disabled={pending}
          onClick={() => {
            setMode(isRegistering ? "sign-in" : "register");
            setMessage(null);
          }}
        >
          {isRegistering ? "로그인으로 돌아가기" : "신규 등록"}
        </button>
        <div className="login-screen__footer">
          <button type="button" onClick={onSettings}>설정</button>
          <span />
          <button type="button" onClick={onGoToTitle}>첫 화면</button>
        </div>
      </div>
    </div>
  );
}
