import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";

export function MainMenuScreen({
  onNewGame,
  onContinue,
  onSettings,
  onExit,
}: {
  onNewGame: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onExit: () => void;
}) {
  return (
    <ScreenShell>
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <h2 className="mb-2 text-lg font-bold text-[#f3dfaa]">메인 메뉴</h2>
        <Button className="w-52" size="sm" onClick={onNewGame}>
          새 게임
        </Button>
        <Button className="w-52" size="sm" onClick={onContinue}>
          이어하기
        </Button>
        <Button className="w-52" size="sm" variant="secondary" onClick={onSettings}>
          설정
        </Button>
        <Button className="w-52" size="sm" variant="secondary" onClick={onExit}>
          종료
        </Button>
      </div>
    </ScreenShell>
  );
}
