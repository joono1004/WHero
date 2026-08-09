import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScreenShell>
      <section className="title-hero-screen">
        <div className="title-hero-screen__art" aria-hidden="true" />
        <div className="title-hero-screen__vignette" aria-hidden="true" />

        <div className="title-hero-screen__content">
          <h1 className="title-hero-screen__sr-only">영웅스토리</h1>
          <p className="title-hero-screen__sr-only">
            시대를 대표한 영웅을 이끌고, 절차적으로 생성되는 세계를 정복하세요.
          </p>

          <Button
            aria-label="시작하기"
            className="title-hero-screen__start-hitbox"
            onClick={onStart}
          >
            시작하기
          </Button>
        </div>
      </section>
    </ScreenShell>
  );
}
