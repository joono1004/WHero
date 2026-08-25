import type { HeroId } from "../../lib/game/ids.ts";

// Filled in as Codex delivers each hero's art (public/art/heroes/) - a
// hero with no entry here still gets a plain placeholder wherever this is
// used. Shared between HeroCard.tsx (select-screen card), HeroInfoPanel.tsx
// (roster-screen info panel), GameLobbyScreen (small hero-list avatar), and
// HeroRosterScreen (list-row avatar) - all need the same source image,
// just displayed at different frame sizes.
export const HERO_PORTRAIT: Partial<Record<HeroId, string>> = {
  "zhang-bao": "/art/heroes/zhang-bao-council-portrait-v1.png",
  "wei-yan": "/art/heroes/wei-yan-council-portrait-v1.png",
  "xu-shu": "/art/heroes/xu-shu-council-portrait-v1.png",
  "guan-yu": "/art/heroes/guan-yu-lobby-face-v1.png",
  "zhuge-liang": "/art/heroes/zhuge-liang-lobby-face-v1.png",
  "zhao-yun": "/art/heroes/zhao-yun-lobby-face-v1.png",
  "huang-zhong": "/art/heroes/huang-zhong-lobby-face-v2.png",
  "zhang-fei": "/art/heroes/zhang-fei-lobby-face-v2.png",
  "xiahou-yuan": "/art/heroes/xiahou-yuan-lobby-face-v1.png",
  "xiahou-dun": "/art/heroes/xiahou-dun-lobby-face-v1.png",
  "xu-chu": "/art/heroes/xu-chu-lobby-face-v1.png",
  "xu-huang": "/art/heroes/xu-huang-lobby-face-v2.png",
  "yi-sun-sin": "/art/heroes/yi-sun-sin-lobby-face-v2.png",
  "king-sejong": "/art/heroes/king-sejong-lobby-face-v2.png",
  "joan-of-arc": "/art/heroes/joan-of-arc-lobby-face-v2.png",
  "napoleon": "/art/heroes/napoleon-lobby-face-v2.png",
};

// 영웅 초상 아트 스펙 (2026-08-xx 작성, 2026-08-07 갱신 - Codex 참고용):
// object-fit: cover로 렌더링되므로 프레임보다 넓거나 좁은 원본은 중앙
// 기준으로 잘려서 채워집니다. 기존 위연 샘플
// (wei-yan-classic-portrait-v3.webp)은 512x512 정사각형 webp입니다.
// **프레임 모양이 화면마다 다릅니다** - `HeroCard.tsx`(새 게임 시작 시
// 영웅선택 화면)는 정사각형 고정(`HERO_PORTRAIT_FRAME_PX`, 아래)이고,
// `HeroInfoPanel.tsx`(영웅 화면의 정보 칸, 2026-08-07 신설)는 세로로 긴
// 직사각형(그 파일에 정의된 `PORTRAIT_WIDTH_PX`/`PORTRAIT_HEIGHT_PX`) -
// 정사각형 원본을 좌우로 더 바짝 크롭하게 되니, 인물의 얼굴/핵심 구도가
// 중앙에 있어야 잘림 손실이 적습니다. 그 외 `GameLobbyScreen`/
// `HeroRosterScreen`의 작은 원형 아바타는 각자 파일에서 h-*/w-* 동일
// 값으로 지정한 정사각형 프레임 + object-cover. 새 영웅 초상도 512x512
// 이상 정사각형 webp로 맞춰서 public/art/heroes/에 추가하고 위
// HERO_PORTRAIT 맵에 heroId -> 경로를 등록하면, 원본 하나로 모든 프레임
// 모양에 다 대응됩니다.
export const HERO_PORTRAIT_FRAME_PX = 96;
