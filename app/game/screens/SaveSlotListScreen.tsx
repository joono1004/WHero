import { Button } from "../Button.tsx";
import { ScreenShell } from "../ScreenShell.tsx";
import type { SaveSlotSummary } from "../../../lib/game/storage.ts";

export function SaveSlotListScreen({
  slots,
  onLoad,
  onDelete,
  onBack,
}: {
  slots: SaveSlotSummary[];
  onLoad: (slotId: string) => void;
  onDelete: (slotId: string) => void;
  onBack: () => void;
}) {
  return (
    <ScreenShell
      header={<h2 className="text-lg font-bold text-[#f3dfaa]">저장된 게임</h2>}
      footer={
        <div className="flex justify-center">
          <Button variant="link" onClick={onBack}>
            메인 메뉴로
          </Button>
        </div>
      }
    >
      {slots.length === 0 ? (
        <p className="text-center text-sm text-[#8fa6a8]">저장된 게임이 없습니다.</p>
      ) : (
        <ul className="mx-auto flex w-full max-w-md flex-col gap-2">
          {slots.map((slot) => (
            <li
              key={slot.slotId}
              className="flex items-center justify-between rounded-md border border-[#43606a] bg-[#17343e] px-3 py-2"
            >
              <div>
                <p className="text-sm font-bold text-[#f3dfaa]">{slot.factionName}</p>
                <p className="text-[10px] text-[#8fa6a8]">
                  {slot.worldIndex}번째 세계 · {slot.turn !== null ? `${slot.turn}턴` : "로비 대기중"} ·{" "}
                  {new Date(slot.updatedAt).toLocaleString("ko-KR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onLoad(slot.slotId)}>
                  불러오기
                </Button>
                <Button size="sm" variant="danger" onClick={() => onDelete(slot.slotId)}>
                  삭제
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ScreenShell>
  );
}
