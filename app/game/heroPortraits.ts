import type { HeroId } from "../../lib/game/ids.ts";

// Filled in as Codex delivers each hero's art (public/art/heroes/) - a
// hero with no entry here still gets a plain placeholder wherever this is
// used. Shared between HeroSelectScreen (96x96 card portrait) and
// GameLobbyScreen (smaller hero-list avatar) - both screens need the same
// source image, just displayed at different frame sizes.
export const HERO_PORTRAIT: Partial<Record<HeroId, string>> = {
  "wei-yan": "/art/heroes/wei-yan-classic-portrait-v3.webp",
};

// 영웅 초상 아트 스펙 (2026-08-xx, Codex 참고용): 카드/리스트의 초상 프레임은
// 정사각형 고정 크기이고, object-fit: cover로 렌더링됩니다 - 즉 프레임보다
// 넓거나 좁은 원본은 중앙 기준으로 잘려서 채워집니다. 기존 위연 샘플
// (wei-yan-classic-portrait-v3.webp)이 512x512 정사각형 webp라 이 프레임에
// 딱 맞게 나옵니다 - 새 영웅 초상도 같은 스펙(정사각형, 512x512 이상 권장,
// webp)으로 맞춰서 public/art/heroes/에 추가하고, 위 HERO_PORTRAIT 맵에
// heroId -> 경로를 등록하면 됩니다. 정사각형이 아닌 원본을 줘도 동작은
// 하지만(가운데 크롭) 인물의 얼굴/핵심 구도가 중앙 근처에 있어야
// 잘림으로 인한 손실이 적습니다. 화면마다 프레임 표시 크기는 다를 수
// 있음(카드 96x96, 로비 리스트는 더 작음) - 원본 이미지 스펙은 공용.
export const HERO_PORTRAIT_FRAME_PX = 96;
