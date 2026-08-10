import { Button } from "../Button.tsx";

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="title-hero-screen">
        <div className="title-hero-screen__art" aria-hidden="true" />
        <div className="title-hero-screen__vignette" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--zhuge" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--guan" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--zhang" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--liu" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--cao" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--yi" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--sejong" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--genghis" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--napoleon" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--joan" aria-hidden="true" />
        <div className="title-hero-screen__hero-layer title-hero-screen__hero-layer--alexander" aria-hidden="true" />
        <div className="title-hero-screen__nameplates" aria-hidden="true" />
        <div className="title-hero-screen__mist title-hero-screen__mist--left" aria-hidden="true" />
        <div className="title-hero-screen__mist title-hero-screen__mist--right" aria-hidden="true" />
        <div className="title-hero-screen__feather-gust" aria-hidden="true" />
        <div className="title-hero-screen__blink title-hero-screen__blink--zhuge" aria-hidden="true" />
        <div className="title-hero-screen__blink title-hero-screen__blink--genghis" aria-hidden="true" />
        <div className="title-hero-screen__dust" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </div>

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
    </div>
  );
}
