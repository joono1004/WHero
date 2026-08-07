"use client";

import { useState } from "react";
import { heroArchetype, heroOverallGrade } from "../../../lib/game/hero-definition.ts";
import type { HeroListEntry } from "../../../lib/game/hero-roster.ts";
import { compareByArchetype, compareByGrade, compareByLevel } from "../../../lib/game/hero-roster.ts";
import { Button } from "../Button.tsx";
import { GRADE_COLOR } from "../gradeColors.ts";
import { HeroInfoPanel } from "../HeroInfoPanel.tsx";
import { ARCHETYPE_LABEL } from "../heroLabels.ts";
import { HERO_PORTRAIT } from "../heroPortraits.ts";
import { ScreenShell } from "../ScreenShell.tsx";

type SortMode = "grade" | "archetype" | "level";

const SORT_COMPARATORS: Record<SortMode, (a: HeroListEntry, b: HeroListEntry) => number> = {
  grade: compareByGrade,
  archetype: compareByArchetype,
  level: compareByLevel,
};

const SORT_LABEL: Record<SortMode, string> = {
  grade: "등급",
  archetype: "유형",
  level: "레벨",
};

// 영웅 한 명한테 장착 가능한 보물 슬롯 수 (2026-08-07, 사용자 확정: "보물은
// 최대 4개까지 영웅한테 장착 가능"). 기존 hero.ts의 범용 Item/
// MAX_ITEMS_PER_HERO(2개)와는 별개의 새 시스템 - 사용자가 "나중에 자세히"
// 정하겠다고 했으므로 lib/game 쪽 데이터 모델은 아직 없음. 지금은 화면에
// 자리만 잡아두는 UI placeholder(전부 잠김 슬롯)이고, 장착 로직이 생기면
// 그때 실제 hero 상태와 연결.
const MAX_TREASURE_SLOTS = 4;

// 가방 그리드 한 줄에 보여줄 아이템 칸 수 (2026-08-07, 사용자 확정: "가로로
// 4칸 공간 잡아서"). 세력 소유 아이템을 정사각형 칸에 늘어놓고, 칸이
// 넘치면 세로 스크롤 - 실제 아이템 재고 데이터가 아직 없어서(Faction에
// 아이템 필드 자체가 없음) 지금은 항상 빈 상태만 보여주는 placeholder.
// 칸 크기 자체는 이 상수가 아니라 가방 패널의 폭(아래 JSX의 `w-60`)으로
// 정해짐 - 같은 날 후속 라운드에서 사용자가 "가방의 칸을 보물 칸 만큼
// 늘려달라"고 해서, 4열 그리드가 채우는 폭 자체를 보물 슬롯(`w-16`
// 컬럼)과 비슷한 한 칸 크기가 나오도록 패널을 `w-40`→`w-60`으로 넓힘.
const BAG_GRID_COLUMNS = 4;

// 빈 가방을 몇 칸(행×열)까지 미리 그려둘지 (2026-08-07, "바둑판 같은
// 그리드로... 비어 있는것은 비어 있는채로") - "+"/"준비 중" 문구 없이
// 그냥 빈 정사각형이 바둑판처럼 늘어선 모양만 보여주는 게 목적이라 몇
// 칸인지 자체는 중요하지 않음. 3줄(12칸) 정도면 스크롤 없이도 그리드
// 모양이 드러나면서 화면을 과하게 채우지 않는 선.
const BAG_EMPTY_PREVIEW_ROWS = 3;

// 통합 화면: [영웅리스트] [영웅정보+보물] [가방] 3패널 (2026-08-07, 이전
// 라운드의 좌우 2분할 -> 4열 재배치를 거쳐, 사용자가 "세 영역이 구분되어
// 보였으면 좋겠다"고 요청한 라운드에서 각 영역을 테두리+배경이 있는
// 패널로 감쌈 - 영웅정보와 보물은 같은 패널 안에 나란히 묶임(보물이
// "지금 선택된 영웅"에게 장착하는 개념이라 자연스럽게 묶임). 영웅정보
// 칸은 `HeroInfoPanel.tsx`(2026-08-07 신설) - 처음엔 HeroSelectScreen과
// `HeroCard.tsx`를 그대로 같이 썼는데, 사용자가 목업대로 재설계해달라고
// 한 뒤 "영웅 정보창에서만 바뀌어야 했는데, 새게임에서 영웅 선택창은
// 이전꺼 그대로 유지해야해"라고 정정 - 그래서 재설계된 버전을 별도
// 파일로 분리(HeroCard.tsx는 원래 모습으로 복원). </> 이전/다음 동작은
// 이전 라운드 그대로. `initialHeroId`는 어떤 영웅으로 열지 시드값(형식
// 슬롯 클릭은 해당 영웅, [영웅] 메뉴는 null -> 정렬 순서상 첫 항목).
export function HeroRosterScreen({
  entries,
  initialHeroId,
  onBack,
  onToggleDeploymentPriority,
  governorLabelFor,
}: {
  entries: HeroListEntry[];
  initialHeroId: string | null;
  onBack: () => void;
  onToggleDeploymentPriority: (heroId: string) => void;
  governorLabelFor: (state: HeroListEntry["state"]) => string | null;
}) {
  const [sortMode, setSortMode] = useState<SortMode>("grade");
  const [selectedId, setSelectedId] = useState<string | null>(initialHeroId);
  const sorted = [...entries].sort(SORT_COMPARATORS[sortMode]);

  const selectedIndex = sorted.findIndex((entry) => entry.state.heroId === selectedId);
  const selected = selectedIndex >= 0 ? sorted[selectedIndex] : (sorted[0] ?? null);
  const activeIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const goPrev = () => {
    if (activeIndex > 0) setSelectedId(sorted[activeIndex - 1].state.heroId);
  };
  const goNext = () => {
    if (activeIndex < sorted.length - 1) setSelectedId(sorted[activeIndex + 1].state.heroId);
  };

  return (
    <ScreenShell
      header={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onBack}>
            뒤로
          </Button>
          <h2 className="text-base font-bold text-[#f3dfaa]">영웅</h2>
        </div>
      }
    >
      <div className="flex h-full gap-2 py-1">
        {/* 1. 영웅리스트 패널: 정렬 버튼 + 목록 - 항목을 누르면 영웅정보 칸이
            바뀜. 2026-08-07: 세 영역(리스트 / 정보+보물 / 가방)이 서로
            구분되어 보이도록 각각 테두리+배경이 있는 패널로 감쌈. */}
        <div
          className="flex w-48 shrink-0 flex-col gap-1.5 overflow-hidden rounded-lg p-1.5"
          style={{ border: "1px solid #25454f", backgroundColor: "#132a32" }}
        >
          <div className="flex shrink-0 gap-1">
            {(Object.keys(SORT_LABEL) as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className="flex-1 text-center"
                style={{
                  borderRadius: 4,
                  border: `1px solid ${sortMode === mode ? "#d7b765" : "#43606a"}`,
                  backgroundColor: sortMode === mode ? "#1c3b44" : "transparent",
                  backgroundImage: "none",
                  color: sortMode === mode ? "#d7b765" : "#8fa6a8",
                  fontWeight: 400,
                  padding: "3px 0",
                  fontSize: "10px",
                }}
              >
                {SORT_LABEL[mode]}순
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {sorted.length === 0 && <p className="p-2 text-center text-[10px] text-[#8fa6a8]">영웅이 없습니다.</p>}
            {sorted.map(({ state, definition }) => {
              const grade = heroOverallGrade(definition.attributes);
              const archetype = heroArchetype(definition.attributes);
              const governorLabel = governorLabelFor(state);
              const portraitUrl = HERO_PORTRAIT[definition.id];
              const isSelected = state.heroId === (selected?.state.heroId ?? null);
              return (
                <div
                  key={state.heroId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(state.heroId)}
                  onKeyDown={(event) => event.key === "Enter" && setSelectedId(state.heroId)}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1.5"
                  style={{ border: `1px solid ${isSelected ? "#d7b765" : "#274049"}`, backgroundColor: "#17343e" }}
                >
                  {/* 초상 확대 (2026-08-07, 텍스트가 2줄->3줄로 늘어난 만큼
                      비례해서 h-8/w-8(32px) -> h-12/w-12(48px)). */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
                    style={{
                      border: `2px solid ${GRADE_COLOR[grade]}`,
                      backgroundColor: "#0b2028",
                      boxShadow: `0 0 6px ${GRADE_COLOR[grade]}77`,
                    }}
                  >
                    {portraitUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local /public asset, same convention as HeroSelectScreen.tsx
                      <img src={portraitUrl} alt={`${definition.name} 초상`} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl text-[#43606a]">🧑</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* 1줄: 이름 + 출전 배지 (2026-08-07, 별표 토글 버튼을
                        대체 - 같은 onToggleDeploymentPriority를 그대로
                        쓰되, 항상 네모 배지로 표시하고 켜진 상태만 금색으로
                        강조. 꺼진 상태도 계속 눌러서 켤 수 있도록 배지
                        자체를 항상 렌더링. */}
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-bold text-[#f3dfaa]">{definition.name}</p>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleDeploymentPriority(state.heroId);
                        }}
                        title="출전 우선 표시"
                        className="shrink-0 rounded text-[9px] font-bold"
                        style={{
                          border: `1px solid ${state.deploymentPriority ? "#d7b765" : "#3a4f52"}`,
                          backgroundColor: state.deploymentPriority ? "rgba(215,183,101,0.15)" : "transparent",
                          backgroundImage: "none",
                          color: state.deploymentPriority ? "#d7b765" : "#5c7276",
                          padding: "1px 4px",
                          cursor: "pointer",
                        }}
                      >
                        출전
                      </button>
                    </div>
                    {/* 2줄: 등급 네모박스(등급색 배경) + 레벨 */}
                    <div className="mt-0.5 flex items-center gap-1">
                      <span
                        className="rounded text-[9px] font-bold"
                        style={{ backgroundColor: GRADE_COLOR[grade], color: "#0b2028", padding: "1px 4px" }}
                      >
                        {grade}급
                      </span>
                      <span className="text-[10px] text-[#8fa6a8]">Lv.{state.level}</span>
                    </div>
                    {/* 3줄: 유형 + 영주 라벨(있을 때만) */}
                    <div className="mt-0.5 flex items-center justify-between gap-1">
                      <span className="truncate text-[10px] text-[#8fa6a8]">{ARCHETYPE_LABEL[archetype]}</span>
                      {governorLabel && <span className="truncate text-[10px] text-[#d9bd74]">{governorLabel}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 영웅정보+보물 패널: 사용자 요청대로 두 영역을 한 그룹으로 묶음 -
            보물은 지금의 선택된 영웅에게 장착하는 개념이라 정보 카드
            바로 옆에 있는 게 자연스러움. */}
        <div
          className="flex flex-1 gap-2 overflow-hidden rounded-lg p-1.5"
          style={{ border: "1px solid #25454f", backgroundColor: "#132a32" }}
        >
          {/* 2a. 영웅정보: HeroInfoPanel(이 화면 전용 재설계) + </> 이전/다음 */}
          <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
            {selected ? (
              <>
                <div className="flex-1 overflow-y-auto">
                  <HeroInfoPanel hero={selected.definition} selected />
                </div>
                <div className="flex shrink-0 items-center justify-center gap-3">
                  <NavButton direction="prev" onClick={goPrev} disabled={activeIndex <= 0} />
                  <span className="text-[10px] text-[#8fa6a8]">
                    {activeIndex + 1} / {sorted.length}
                  </span>
                  <NavButton direction="next" onClick={goNext} disabled={activeIndex >= sorted.length - 1} />
                </div>
              </>
            ) : (
              <p className="p-2 text-center text-[10px] text-[#8fa6a8]">표시할 영웅이 없습니다.</p>
            )}
          </div>

          {/* 2b. 보물: 선택된 영웅에게 장착할 보물 슬롯 4개 - 특기처럼 고정
              효과를 주는 신규 장비 시스템이지만 아직 데이터/장착 로직이
              없어서 지금은 자리만 예약(전부 잠김 표시). */}
          <div
            className="flex w-16 shrink-0 flex-col gap-1.5 overflow-hidden border-l pl-2"
            style={{ borderColor: "#25454f" }}
          >
            <p className="shrink-0 text-center text-[10px] text-[#8fa6a8]">보물</p>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {Array.from({ length: MAX_TREASURE_SLOTS }, (_, index) => (
                <div
                  key={index}
                  className="flex aspect-square shrink-0 items-center justify-center rounded-md text-lg"
                  style={{ border: "1px dashed #3a4f52", color: "#5c7276" }}
                >
                  🔒
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 가방 패널: 세력이 보유한 아이템(보물 포함) 재고 - 정사각형 칸을
            4열 그리드로 배치하고, 칸이 넘치면 세로 스크롤. 세력 단위
            아이템 재고 데이터가 아직 없어서(Faction에 필드 없음) 지금은
            항상 빈 상태 - 재고 시스템이 생기면 이 그리드에 실제 아이템을
            채움. */}
        <div
          className="flex w-60 shrink-0 flex-col gap-1.5 overflow-hidden rounded-lg p-1.5"
          style={{ border: "1px solid #25454f", backgroundColor: "#132a32" }}
        >
          <p className="shrink-0 text-center text-[10px] text-[#8fa6a8]">가방</p>
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${BAG_GRID_COLUMNS}, minmax(0, 1fr))` }}>
              {/* 바둑판 그리드 (2026-08-07): "+"나 안내 문구 없이 빈 칸끼리
                  명암만 번갈아 보여줘서 실제 아이템이 채워질 슬롯 모양
                  자체를 표현 - 비어 있는 칸은 그냥 비어 있는 채로 둠. */}
              {Array.from({ length: BAG_GRID_COLUMNS * BAG_EMPTY_PREVIEW_ROWS }, (_, index) => {
                const row = Math.floor(index / BAG_GRID_COLUMNS);
                const col = index % BAG_GRID_COLUMNS;
                const isDark = (row + col) % 2 === 0;
                return (
                  <div
                    key={index}
                    className="aspect-square"
                    style={{
                      border: "1px solid #23414c",
                      backgroundColor: isDark ? "#152f37" : "#1a3941",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

function NavButton({ direction, onClick, disabled }: { direction: "prev" | "next"; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "이전 영웅" : "다음 영웅"}
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: "1px solid #43606a",
        backgroundColor: disabled ? "transparent" : "#17343e",
        backgroundImage: "none",
        color: disabled ? "#3a4f52" : "#8fa6a8",
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
