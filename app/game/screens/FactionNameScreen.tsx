import { useState } from "react";
import { Button } from "../Button.tsx";

const MIN_LENGTH = 2;
const MAX_LENGTH = 12;

// Candidates for the 🎲 button - all within MIN_LENGTH..MAX_LENGTH so a
// roll is always a valid name with no further checking needed.
const RANDOM_FACTION_NAMES = [
  "청룡단", "백호단", "주작단", "현무단", "황룡회", "적룡군", "천마군", "비룡단",
  "은하검문", "태산파", "광풍대", "폭풍군단", "철혈단", "용린회", "백랑단", "흑표단",
  "창천군", "붉은매", "벽력단", "뇌전군", "창룡회", "자소단", "금강문", "만월회",
  "적화단", "흑풍회", "은월군", "청화단", "대호군", "비호단",
];

function randomFactionName(): string {
  return RANDOM_FACTION_NAMES[Math.floor(Math.random() * RANDOM_FACTION_NAMES.length)];
}

export function FactionNameScreen({
  onSubmit,
  onBack,
}: {
  onSubmit: (factionName: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState("");
  // Each roll adds a full turn so the dice always spins forward from
  // wherever it last stopped - a CSS transition on the accumulating angle
  // gives the spin effect without any @keyframes/animation setup.
  const [diceSpin, setDiceSpin] = useState(0);
  const trimmed = name.trim();
  const isValid = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;

  return (
    <div className="faction-charter-screen">
      <div className="faction-charter-screen__content">
        <div className="faction-charter-screen__welcome" aria-label="게임 환영 문구">
          <p>당신의 깃발 아래, 시대를 초월한 영웅들이 한자리에 모입니다. 그들의 힘과 지혜를 이끌어, 당신만의 위대한 역사를 시작하세요.</p>
        </div>
        <h2 className="faction-charter-screen__heading">새로운 역사를 이끌 세력의 이름을 정해주세요</h2>
        <div className="relative w-64">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && isValid) onSubmit(trimmed);
            }}
            maxLength={MAX_LENGTH}
            placeholder={`${MIN_LENGTH}~${MAX_LENGTH}자`}
            className="w-full rounded-md border border-[#43606a] bg-[#0b2028] py-2 pr-10 pl-4 text-center text-lg text-[#f3ead4] outline-none focus:border-[#d7b765]"
          />
          <button
            type="button"
            aria-label="세력명 무작위 생성"
            onClick={() => {
              setName(randomFactionName());
              setDiceSpin((degrees) => degrees + 360);
            }}
            className="absolute top-1/2 right-0 flex items-center justify-center text-lg leading-none"
            style={{
              // The glyph itself stays small, but the whole reserved icon
              // strip (matches the input's pr-10) is clickable - a near
              // miss next to the dice still rolls it instead of focusing
              // the input underneath.
              width: 40,
              height: 40,
              border: "none",
              borderRadius: 0,
              padding: 0,
              background: "none",
              backgroundImage: "none",
              color: "inherit",
              fontWeight: "normal",
              cursor: "pointer",
              transform: `translateY(-50%) rotate(${diceSpin}deg)`,
              transition: "transform 500ms ease-out",
            }}
          >
            🎲
          </button>
        </div>
        <p className="h-4 text-xs text-[#c98f8f]">
          {name.length > 0 && !isValid ? `${MIN_LENGTH}~${MAX_LENGTH}자로 입력해주세요` : ""}
        </p>
      </div>
      <div className="faction-charter-screen__actions">
        <Button
          className="faction-charter-screen__button faction-charter-screen__button--back"
          variant="secondary"
          onClick={onBack}
        >
          이전
        </Button>
        <Button
          className="faction-charter-screen__button faction-charter-screen__button--create"
          onClick={() => isValid && onSubmit(trimmed)}
          disabled={!isValid}
        >
          세력 생성
        </Button>
      </div>
    </div>
  );
}
