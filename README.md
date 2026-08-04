# World in Hero

모바일 우선 브라우저 기반 턴제 전략 게임 프로토타입입니다. 게임 규칙과 진행 상황은
[개발 기록](docs/PROJECT_PROGRESS.md), 실제 조작 방법은
[사용자 매뉴얼 초안](docs/PLAYER_MANUAL_DRAFT.md)을 기준으로 관리합니다.

## 실행 환경

- Node.js `>=22.13.0`
- pnpm
- Next.js 16 App Router

## 주요 명령

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
```

## 프로젝트 구조

- `app/`: 화면 진입점과 세계 지도 프로토타입
- `components/world/`: 지도 UI
- `lib/world/`: Hex, 월드 생성, 시야, 렌더링용 규칙
- `lib/game/`: 순수 게임 규칙과 데이터
- `docs/`: 기획, 진행 기록, 작업 인수인계
- `public/art/`: 영웅, 병사, 지형 이미지

## 배포

Cloudflare/Vinext 변환 계층은 2026-08-04에 제거했습니다. 프로젝트는 표준 Next.js로
빌드하며 Vercel과 GitHub `main`을 연결해 배포하는 구조를 사용합니다. 자세한 내용은
[배포 전환 기록](docs/DEPLOYMENT_MIGRATION.md)을 확인하세요.

## 개발 원칙

- 월드 생성은 시드로 재현 가능해야 합니다.
- 게임 규칙은 React와 Three.js에 의존하지 않아야 합니다.
- Hex 경계는 표시하되 지형 그래픽은 셀 사이에서 자연스럽게 이어져야 합니다.
- 일반 전투는 세계 지도에서 처리합니다.
- 핵심 게임 루프 검증 전에는 계정, 과금, 소셜 기능을 추가하지 않습니다.
