import { ScreenShell } from "../ScreenShell.tsx";

export function WorldGeneratingScreen() {
  return (
    <ScreenShell>
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#43606a] border-t-[#d7b765]" />
        <p className="text-sm text-[#d9bd74]">세계를 생성하는 중입니다...</p>
      </div>
    </ScreenShell>
  );
}
