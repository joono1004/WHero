import type { HeroId } from "../../lib/game/ids.ts";

// Filled in as Codex delivers each hero's art (public/art/heroes/) - a
// hero with no entry here still gets a plain placeholder wherever this is
// used. Shared between HeroCard.tsx (large card portrait), GameLobbyScreen
// (small hero-list avatar), and HeroRosterScreen (list-row avatar) - all
// need the same source image, just displayed at different frame sizes.
export const HERO_PORTRAIT: Partial<Record<HeroId, string>> = {
  "wei-yan": "/art/heroes/wei-yan-classic-portrait-v3.webp",
};

// 영웅 초상 아트 스펙 (2026-08-xx 작성, 2026-08-07 프레임 모양 갱신 -
// Codex 참고용): object-fit: cover로 렌더링되므로 프레임보다 넓거나 좁은
// 원본은 중앙 기준으로 잘려서 채워집니다. 기존 위연 샘플
// (wei-yan-classic-portrait-v3.webp)은 512x512 정사각형 webp입니다.
// **프레임 모양이 화면마다 다릅니다** - `HeroCard.tsx`(영웅선택/영웅
// 화면의 큰 정보 카드)는 2026-08-07부터 정사각형이 아니라 세로로 긴
// 직사각형 프레임(`PORTRAIT_WIDTH_PX`/`PORTRAIT_HEIGHT_PX`, 그 파일에
// 정의)을 씀 - 정사각형 원본을 좌우로 더 바짝 크롭하게 되니, 인물의
// 얼굴/핵심 구도가 중앙에 있어야 잘림 손실이 적습니다. 그 외
// `GameLobbyScreen`/`HeroRosterScreen`의 작은 원형 아바타는 여전히
// 정사각형 프레임(각자 파일에서 h-*/w-* 동일 값으로 지정) + object-cover.
// 새 영웅 초상도 512x512 이상 정사각형 webp로 맞춰서 public/art/heroes/에
// 추가하고 위 HERO_PORTRAIT 맵에 heroId -> 경로를 등록하면, 원본 하나로
// 모든 프레임 모양에 다 대응됩니다.
