import type { ReactNode } from "react";

// The game's own screens don't have a phone to display on when opened in
// an ordinary desktop browser tab - they just stretch edge to edge, which
// is *not* what a player on a phone actually sees, and makes it hard to
// judge a layout by eye (see docs/GAME_VISION.md: baseline resolution is
// 844x390 CSS px, landscape). Below that width this renders as a plain
// full-bleed passthrough - on an actual phone there's no frame, no
// border, just the game.
// Tailwind's max-[Npx]: compiles to `@media not (min-width: Npx)`, which
// excludes exactly N (it means "< N", not "<= N") - pairing it with
// min-[845px] (">= 845") instead of min-[844px] would leave a 1px gap at
// exactly the 844px target width where neither branch's sizing applies.
export function DeviceFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-black max-[845px]:gap-0">
      <div
        className="relative overflow-hidden bg-[#10272e]
          max-[845px]:h-dvh max-[845px]:w-full
          min-[845px]:aspect-[844/390] min-[845px]:w-[min(844px,calc((100dvh-4rem)*(844/390)))]
          min-[845px]:rounded-2xl min-[845px]:border-8 min-[845px]:border-[#1b1b1b]
          min-[845px]:shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
      >
        {children}
      </div>
      <p className="text-[10px] tracking-wide text-[#5a6a68] min-[845px]:block max-[845px]:hidden">
        모바일 가로 해상도 미리보기 · 844 × 390
      </p>
    </div>
  );
}
