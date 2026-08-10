import { Button } from "../Button.tsx";

export function MainMenuScreen({
  hasSave,
  onNewGame,
  onContinue,
  onSettings,
  onGoToTitle,
}: {
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onGoToTitle: () => void;
}) {
  return (
    <div className="main-menu-screen">
      <div className="main-menu-screen__content">
        <h2 className="mb-2 text-lg font-bold text-[#f3dfaa]">메인 메뉴</h2>
        {hasSave ? (
          <Button className="main-menu-screen__button" size="sm" onClick={onContinue}>
            이어하기
          </Button>
        ) : (
          <Button className="main-menu-screen__button" size="sm" onClick={onNewGame}>
            새 게임
          </Button>
        )}
        <Button className="main-menu-screen__button" size="sm" variant="secondary" onClick={onSettings}>
          설정
        </Button>
        <Button className="main-menu-screen__button" size="sm" variant="secondary" onClick={onGoToTitle}>
          첫 화면
        </Button>
      </div>
    </div>
  );
}
