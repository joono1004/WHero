import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <ScreenShell>
      <div className="flex h-full flex-col items-center justify-center gap-5">
        <div className="text-center">
          <p className="text-xs tracking-[0.3em] text-[#8fa6a8]">WORLD HERO CONQUEST</p>
          {/* app/globals.css has an unlayered `h1 { font-size: 28px; ... }`
              rule that beats Tailwind's layered utilities regardless of
              specificity (see Button.tsx) - style inline instead. */}
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "2rem",
              fontWeight: 500,
              color: "#f3dfaa",
              margin: "0.5rem 0 0",
            }}
          >
            세계 영웅 정복
          </h1>
        </div>
        <Button onClick={onStart}>시작하기</Button>
      </div>
    </ScreenShell>
  );
}
