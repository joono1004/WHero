# Claude branch handoff rules

> 2026-08-04 배포 구조가 표준 Next.js + Vercel로 변경되었습니다. 작업 전
> `DEPLOYMENT_MIGRATION.md`를 반드시 확인하고 Cloudflare/Vinext 구성을 다시 추가하지
> 마세요.

Claude should reorganize only its game-rule and game-screen code after this
document and `WORLD_ENGINE_ARCHITECTURE.md` are available on its branch.

## Claude owns

- `lib/game/**`
- `app/game/**`
- Tests for game rules and game screens
- Game-rule documentation

## Codex owns

- `lib/world/**`
- `components/world/**`
- `rendering/world/**`
- `app/world-prototype.tsx` until the renderer migration is complete
- World art assets and rendering rules
- Final integration, build, deployment and merge review

## Claude must not

- Introduce another hex-coordinate implementation.
- Define a second terrain ID list.
- Import `app/world-prototype.tsx` from `lib/game`.
- Import React or Three.js into game-rule files.
- Move or rewrite world renderer files.
- Merge directly into `main`.

## Required preparation on the Claude branch

1. Replace the branch-local hex math with imports or adapters based on
   `lib/world/hex/hex-grid.ts`.
2. Keep game rules in `lib/game`; screen components may call rules but must not
   reimplement them.
3. Add an adapter boundary under `lib/integration`, rather than coupling game
   state directly to Three.js objects.
4. Preserve existing tests and add tests for every changed rule.
5. Report moved files, changed imports, tests, and unresolved integration
   questions.

No Claude branch merge should occur until the shared terrain IDs,
`WorldMapSnapshot`, movement-cost contract, and generator version policy are
finalized.

---

# Claude → Codex 인수인계 (2026-07-30, `claude/chatgpt-codex-analysis-8kgydd` 브랜치)

앞으로 World in Hero의 주 작업이 Codex로 이관됨에 따라 작성. 아래는 이
브랜치(`claude/chatgpt-codex-analysis-8kgydd`)의 현재 상태 기록이며,
**`main`에는 병합하지 않았음** (위 "No Claude branch merge..." 규칙이 아직
유효하다고 판단 - 아래 "가장 중요한 알려진 이슈" 참고).

## 완료한 기능

- **데이터 모델**: 영웅(`hero.ts`/`hero-definition.ts`)·부대(`unit.ts`)·
  도시(`city.ts`)·세력(`faction.ts`)·세이브(`save.ts`) 전체 타입, 로컬
  저장/불러오기 + 참조 무결성 검사(`storage.ts`).
- **화면 흐름**: 시작 → 메인메뉴 → 세력명/영웅선택 → 로비(영웅 목록 + 맵
  후보 + 클리어맵 레일) → 실제 게임 화면(턴 종료). 모바일 가로
  (844×390, 780×360) 기준 검증 완료.
- **턴/이동/전투**: `turn.ts`(턴 카운터, 이동력 회복, 배속 보너스, 회복
  틱), `movement.ts`(hex 기반 Dijkstra 경로탐색, 지형 비용은 콜백으로
  위임), `combat.ts`(공격-방어-반격 규칙, 사거리 비교).
- **도시/생산**: 4단계 성장, 시설 4종, 연구 기반 병사 생산
  (`unit-production.ts`), 영웅 출전 예약(최대 5명)·도시 수에 따른 순차
  소환.
- **영웅 배속**: 단독 이동, 도시 배속(특기 6종: 훈련/상업/농업/채굴/회복/
  방어), 패배 시 회복(주둔지 복귀) 메커니즘.
- **세계 진행**: 정복 조건(수도 점령/항복 → 세력 패배, 전멸 시 클리어),
  계승(영웅/자원/연구 유지, 도시/유닛 초기화), 최소 스캐폴딩 AI 세력 생성.
- **연구 시스템**: 내정(금/식량) + 병과(보병/궁병/기병/공성) 6개 카테고리.
- **(이번 세션) 영웅-부대 동행 기능 제거 + 고정 병과 도입**: 사용자가
  Codex와 맵 생성·캐릭터 배치를 논의하며 "영웅과 부대는 완전히 독립적으로
  이동"으로 방향을 정정. `HeroAssignment`의 `"unit"` 모드와 관련 버프/
  병과 시너지를 전부 제거하고, 영웅도 병사처럼 고정 병과(`unitType`) 하나를
  갖도록 변경(이동력/사거리를 `UNIT_TYPE_CATALOG`에서 병사와 공유). 노출된
  영웅 6명 병과 확정: 감녕 보병·위연 보병·서서 궁병·관우 기병·조운 기병
  (제갈량은 "책사" - 아래 미완성 항목 참고).
- **`lib/integration/` 어댑터 경계 신설**: `WORLD_ENGINE_ARCHITECTURE.md`/
  이 문서의 요구사항에 맞춰 `movement.ts`의 `MovementCost` 타입을
  `lib/integration/movement-cost.ts`로 이동, 아직 연동 안 된 지형 계약
  항목들을 `lib/integration/README.md`에 인덱스로 정리.

## 변경한 파일 (이 브랜치가 `main` 대비 갖고 있는 Claude 쪽 변경)

- `lib/game/**` 전체 (신규 다수 + 오늘 수정한 `hero.ts`, `hero-definition.ts`,
  `hero-assignment.ts`, `combat.ts`, `unit.ts`, `save.ts`, `movement.ts`,
  `starting-heroes.ts`, `legendary-heroes.ts`, `turn.ts`, `new-game.ts`,
  `unit-production.ts` 등)
- `app/game/**` 전체 (화면 컴포넌트), `app/game/heroLabels.ts`
- `lib/integration/movement-cost.ts`, `lib/integration/README.md` (신규)
- `docs/SYSTEM_LAYER.md` (작업 로그, 결정 사항 전부 기록됨 - 가장 상세한
  참고 자료), `docs/GAME_VISION.md`(오늘 정정 반영), `docs/MVP_SCOPE.md`
  (Codex 작성, 미변경)
- `.github/workflows/deploy.yml` — **주의: 아래 "가장 중요한 알려진
  이슈" 참고, 현재 시점 기준 이미 낡은 배포 방식임**

## 핵심 설계 결정과 이유

1. **`lib/game`은 React/Three.js/`app/world-prototype.tsx`를 import하지
   않음** - `WORLD_ENGINE_ARCHITECTURE.md`의 경계 원칙을 그대로 따름.
   화면(`app/game/screens/*`)은 `lib/game` 함수만 호출하고 로직을
   재구현하지 않음.
2. **hex 좌표계는 렌더러와 동일한 odd-r offset 컨벤션으로 독립 재구현**
   (`lib/game/hex.ts`) - `lib/world/hex/hex-grid.ts`를 직접 import하지
   않는 이유는 그 파일이 `three`를 import하기 때문. 두 구현의 이웃/거리
   공식은 동일하므로 병합 시 값 충돌은 없을 것으로 예상 - 병합 시점에
   `lib/game/hex.ts`를 `lib/world/hex`로 교체할지는 열린 판단.
3. **영웅의 `unitType`이 병사와 같은 `UNIT_TYPE_CATALOG`(이동력/사거리)를
   공유** - 영웅과 병사를 완전히 분리된 두 시스템으로 만들지 않기 위한
   선택. 전투 스탯(공격/방어/체력)은 여전히 영웅 고유 등급 공식에서 나옴 -
   `UNIT_TYPE_CATALOG`는 이동력/사거리만 공유.
4. **지형 관련 계약(이동 비용, 스폰 위치, 자원 타일)은 전부 콜백/미구현
   상태로 남김** - 실제 지형 데이터 없이 임의로 만들면 나중에 또 뜯어고쳐야
   하므로, `lib/integration/README.md`에 열린 질문으로만 기록.
5. **AI 세력은 이름+수도만 있는 최소 스캐폴딩** - AI 능력치/행동/항복
   판단 기준이 전부 "추후 논의"로 미뤄진 상태라, 정복 흐름 자체는 테스트
   버튼으로 시연 가능하게만 해둠.

## 가장 중요한 알려진 이슈 - 배포 스택 충돌

**`main`이 2026-08-04 커밋(`0a5efb2`, "Migrate deployment from Cloudflare
to Next.js")에서 Cloudflare/Vinext/Wrangler를 전부 제거하고 표준 Next.js +
Vercel로 이전했습니다** (`docs/DEPLOYMENT_MIGRATION.md` 참고). 이 브랜치
(`claude/chatgpt-codex-analysis-8kgydd`)는 그 이전 시점에서 갈라져 나온
채로 **아직 예전 Cloudflare/Vinext 스택을 그대로 갖고 있고**, 여기에 더해
Claude가 이번 세션 중 **Cloudflare Workers용 GitHub Actions 자동배포
워크플로(`.github/workflows/deploy.yml`)까지 새로 추가**했습니다(사용자
요청으로, 당시엔 화면을 확인할 방법이 이것뿐이었음).

- 이 브랜치에는 여전히 있음: `vite.config.ts`, `worker/index.ts`,
  `build/sites-vite-plugin.ts`, `db/index.ts`, `drizzle.config.ts`,
  `.openai/hosting.json`, `app/chatgpt-auth.ts`, `examples/d1/**`,
  `package.json`의 `vinext`/`vite`/`wrangler`/`@cloudflare/vite-plugin`
  의존성과 `dev`/`build`/`start` 스크립트, `.github/workflows/deploy.yml`.
- `main`에는 이미 없음(전부 제거됨) - 대신 표준 `next dev`/`build`/`start`.
- **Claude는 이 충돌을 임의로 해결하지 않았습니다** - 배포 관련 변경은
  `DEPLOYMENT_MIGRATION.md`에 명시된 대로 "Codex가 최종 통합하고 검증"하는
  영역이라고 판단해서, 위 파일들을 지우거나 `main`의 새 구조를 이 브랜치로
  가져오지 않고 그대로 뒀습니다. **병합 시 Codex가 이 브랜치 쪽의
  Cloudflare 관련 파일·설정·워크플로를 `main`의 Next.js/Vercel 구조로
  교체(폐기)해야 합니다.**
- `.github/workflows/deploy.yml`이 살아있는 한 이 브랜치에 push할 때마다
  Cloudflare Workers(`world-in-hero.ljhs1004.workers.dev`)에 계속
  배포됩니다 - **Vercel production과는 별개 대상**이라 서로 덮어쓰지는
  않지만, 더 이상 필요 없는 배포 경로이니 병합 시 함께 정리 권장.

## 아직 미완성인 부분

- **"책사" 병과 미설계**: 제갈량의 실제 병과로 사용자가 "책사"(판타지
  마법사 계열 - 근접 공격 없음, 마법형 공격/회복)를 지정했으나 상세
  수치(이동력/사거리/발동 조건)가 없음. `UNIT_TYPE_CATALOG`에 대응 항목이
  없어서 지금 반영하면 `heroCombatStats`/`heroBaseMovement`가 런타임
  에러를 냄 - `legendary-heroes.ts`에 TODO 주석과 함께 임시로 `archer`
  값을 남겨둠. **실제 값 아님, 설계 후 교체 필요.**
- **레벨업/경험치**: 방향은 확정(레벨당 능력치 4칸 배분, 클리어 시
  평가등급→기여도 분배)했으나 코드 미반영.
- **영주 자원 생산**: 자원 종류("유산")는 확정, 배율 공식과 매턴 생산
  로직 미구현 (task 13).
- **반란 토벌**: task 14 통째로 미착수.
- **아이템 카탈로그**: 슬롯 UI만 있고 실제 아이템 없음.
- **영웅 초상화**: `HeroDefinition`에 이미지 필드 자체가 없음.
- **지형 연동 전체**: 이동 비용, 스폰 위치, 도시 밖 자원 타일, 지형 특화
  병과 승급 - 전부 `lib/integration/README.md`에 열린 질문으로 정리됨,
  `lib/world`가 준비되면 그때 채울 예정.
- **`main`과의 병합 자체**: 위 "가장 중요한 알려진 이슈" 참고. 지형
  ID/`WorldMapSnapshot`/이동비용 계약/생성기 버전 정책 + 배포 스택 정리가
  선행돼야 함.

## 알려진 오류·주의사항

- `npx tsc --noEmit` 실행 시 아래는 **Claude 소유 범위 밖의 기존 에러**이며
  이번 세션에서 건드리지 않음(Codex 파일이거나 Cloudflare 전용 타입 문제):
  `app/world-prototype.tsx`(1643번 줄 근처, `terrain` 변수 사용 순서
  문제), `db/index.ts`(`cloudflare:workers` 모듈 못 찾음),
  `worker/index.ts`(`Fetcher`/`D1Database` 타입 못 찾음) - 이 셋은
  Cloudflare 스택 자체가 `main`에서 이미 제거됐으므로 병합 후에는 자동
  해소될 가능성이 높음.
- `eslint`도 `app/world-prototype.tsx`에 미사용 변수 경고 2개 - Claude
  범위 밖, 미조치.
- `lib/game`/`app/game`/`lib/integration` 범위 안에서는 tsc/eslint 전부
  클린.

## Codex가 다음으로 할 추천 작업

1. **배포 스택 정리**: 이 브랜치의 Cloudflare/Vinext 관련 파일과
   `.github/workflows/deploy.yml`을 `main`의 Next.js/Vercel 구조로
   교체(위 "가장 중요한 알려진 이슈" 참고).
2. **지형 계약 확정 후 병합**: `lib/integration/README.md`의 열린 질문
   (지형 카테고리, 스폰 위치, `WorldMapSnapshot`)을 채우고 나서 `main`
   병합 진행.
3. **"책사" 병과 설계**: 제갈량 전용 - 이동력 유무, 사거리, 마법 공격/
   회복 수치, 발동 조건.
4. 그 외 우선순위는 사용자와 직접 논의해서 결정 (레벨업 구현 / 영주 자원
   생산 / 아이템 카탈로그 등 - 전부 방향은 어느 정도 있음, `SYSTEM_LAYER.md`
   참고).

## 실행·빌드·테스트 방법 (이 브랜치 기준, 위 배포 이슈로 인해 한시적)

이 브랜치는 아직 예전 vinext 스크립트를 씁니다 (병합 후에는 `main`의
`next dev`/`build`/`start`로 교체될 예정):

```
pnpm install
pnpm run build          # vinext build - 이번 세션에서 매번 통과 확인
pnpm run test:game      # lib/game/**/*.test.ts, 311개 전부 통과
node --test tests/rendered-html.test.mjs   # 렌더링 스모크 테스트, 통과
npx tsc --noEmit        # 위 "알려진 오류" 3건 제외 클린
pnpm run lint           # world-prototype.tsx 경고 2건 제외 클린
```

## 마지막 커밋 해시

이 문서를 추가하기 직전 코드 상태 기준: `2244d8a76a7c2e887538494ca0ad1f382213dd4c`
("Apply user-specified unitType per hero; flag 제갈량's \"책사\" as undesigned")

이 문서(및 `docs/GAME_VISION.md` 정정)를 추가하는 커밋이 이 브랜치의
최종 커밋입니다 - 정확한 해시는 커밋 로그(`git log -1`) 참고.

### 병합 후속 메모 (2026-07-30)

Codex의 토큰이 소진돼 최종 통합을 직접 진행할 수 없는 상황이라, 사용자
확인 후 Claude가 위 브랜치를 `main`에 직접 병합했습니다 (원래 "Claude
must not... Merge directly into main" 규칙의 예외 - 담당자 부재로 인한
사용자의 명시적 승인). 배포 스택 충돌은 `main`(Next.js + Vercel) 기준으로
정리 - 이 브랜치에 남아있던 Cloudflare/Vinext 관련 파일과
`.github/workflows/deploy.yml`은 병합 과정에서 제거됐습니다. 지형 연동
계약(위 "아직 미완성인 부분" 참고)은 여전히 미해결 상태로 남아있으니,
Codex가 복귀하면 그 부분부터 이어가면 됩니다.

### 라우트 재배치 메모 (2026-07-30, 병합 직후)

**Codex의 지형 생성 프로토타입 개발 주소가 `/`에서 `/world-lab`으로
바뀌었습니다.** 사용자가 모바일 앱(안드로이드 우선) 전환을 준비하면서
"앱의 기본 화면은 실제 게임이어야 한다"고 판단해 요청함 - 루트는 이제
`GameEntry`(실제 게임)를 렌더링합니다. `app/world-prototype.tsx` 파일
자체와 그 안의 로직·`lib/world`/`components/world`/`rendering/world`는
전혀 건드리지 않았습니다 - `app/page.tsx`가 어느 컴포넌트를 렌더링하는지,
그리고 새 라우트 파일(`app/world-lab/page.tsx`) 위치만 바뀐 순수 라우팅
변경입니다. 로컬에서 작업하실 때 `pnpm dev` 후 `/`가 아니라 `/world-lab`로
들어가시면 됩니다. 자세한 내용은 `docs/SYSTEM_LAYER.md`의 "라우트 재배치"
항목 참고.

### Vercel 배포 연결 확인 (2026-07-30)

Vercel 프로젝트(`whero` 팀 / `world-in-hero` 프로젝트)는 만들어져 있었지만
**GitHub 저장소 연결(Settings → Git)이 안 돼 있어서**, `main`에 push해도
자동 배포가 전혀 안 되고 있었음 (배포 이력이 어제 첫 배포
`0a5efb2` 하나뿐이었고, 그 뒤 병합·라우팅 변경 커밋들이 반영 안 됨).
사용자가 직접 Settings → Git에서 `joono1004/WHero` 저장소를 연결함.
연결 직후 "Redeploy"를 눌렀더니 새 커밋을 가져오는 게 아니라 기존 배포를
그대로 재배포하는 동작이라 여전히 예전 화면이 떴는데, Claude가 빈 커밋
(`6e77d57`, "Trigger Vercel deploy now that GitHub integration is
connected")을 push해서 정상적으로 최신 상태가 자동 배포됨을 확인.

**현재 상태**: `https://world-in-hero.vercel.app`가 `main`의 최신 커밋을
서빙 중이며(루트 = 게임, `/world-lab` = 프로토타입), 앞으로 `main`에
push할 때마다 자동으로 재배포됩니다. Codex가 작업 후 push하면 별도 조치
없이 그대로 반영됩니다.

### 게임 이름 확정: "영웅스토리" (Hero Story) (2026-08-05)

사용자가 화면 하나씩 검토하는 과정에서 게임 이름을 **"영웅스토리" (영어:
Hero Story, 약어: 영스)**로 확정했습니다. 기존 "World in Hero"는 임시
프로젝트명이었습니다. 아래에 실제로 바뀐 곳을 정리합니다 - Codex 소유
파일도 이름 표기 부분만 최소한으로 바꿨습니다(로직/렌더링은 안 건드림):

- `app/game/screens/TitleScreen.tsx`, `GameLobbyScreen.tsx` (Claude 소유) -
  화면에 보이는 게임 이름
- `app/layout.tsx` (공용) - 공통 페이지 `<title>`
- `app/world-lab/page.tsx` (Claude가 만든 라우트 파일) - 프로토타입 페이지
  제목
- **`app/world-prototype.tsx`의 `<h1>World in Hero</h1>` 한 줄만
  `영웅스토리`로 교체** (Codex 소유 파일 - 이 한 줄 텍스트 외에는 전혀
  건드리지 않음)
- `README.md`, `docs/GAME_VISION.md` 제목
- `docs/PLAYER_MANUAL_DRAFT.md`, `docs/PROJECT_PROGRESS.md` 제목(Codex
  작성 문서 - 제목 텍스트만 교체, 본문은 안 건드림)
- `tests/rendered-html.test.mjs`의 타이틀 검증 문자열

**의도적으로 안 바꾼 것**: `package.json`의 내부 패키지명(`"name":
"world-in-hero"`)은 플레이어에게 안 보이는 내부 식별자라 그대로 뒀습니다.
이력 기록용 문서(`docs/DEPLOYMENT_MIGRATION.md`, 이 문서 위쪽의 병합 후속
메모 등)에 있는 옛 이름은 "그 시점엔 그렇게 불렸다"는 역사 기록이라 의도적으로
안 고쳤습니다.

검증: `pnpm run build` 성공, `tests/rendered-html.test.mjs` 2/2 통과,
`pnpm run test:game` 311/311 통과.

### 클라이언트 오류 로깅 신설 (2026-08-05)

`app/game/**`에 클라이언트 오류를 Vercel Runtime Logs로 보내는 경량 로깅을
추가했습니다 (`app/api/log-error/route.ts` + `app/game/reportError.ts` +
`app/game/GameErrorBoundary.tsx`). 사용자에게는 안 보이고, Vercel 대시보드
Observability/Logs 탭에서 `client-error`로 검색하면 실제 플레이 중 난
오류를 볼 수 있습니다. 자세한 내용은 `docs/SYSTEM_LAYER.md`의 "클라이언트
오류 로깅 시스템 신설" 항목 참고.

**Codex 참고**: `/world-lab` 프로토타입에는 아직 안 붙였습니다 - 지형
생성/렌더링 쪽에서도 같은 방식으로 오류를 잡고 싶으면
`app/game/reportError.ts`의 `reportClientError(error, {screen, action})`을
그대로 가져다 쓰시면 됩니다 (Claude 소유 파일이지만 순수 유틸 함수라
import해서 쓰는 건 문제없음 - 굳이 이 함수를 별도 공용 위치로 옮기고
싶으면 그것도 괜찮습니다).

### 영웅 특기/스킬 시스템 신설 + 영웅 카드 초상 아트 스펙 (2026-08-06)

**Codex가 영웅 초상 아트를 만들 때 필요한 스펙만 요약** (자세한 배경/결정
과정은 `docs/SYSTEM_LAYER.md`의 "내정 표시 → 특기(패시브) 시스템, 스킬
(액티브) 시스템 신설" / "영웅 카드 레이아웃 재작업" 항목 참고):

- 영웅 카드(`app/game/screens/HeroSelectScreen.tsx`)의 초상 프레임은
  **고정 96×96px 정사각형**(`HERO_PORTRAIT_FRAME_PX` 상수), `object-fit:
  cover`로 렌더링됩니다. 정사각형이 아닌 원본도 동작하지만 중앙 기준으로
  잘리니, 얼굴/핵심 구도는 중앙 근처에 두는 걸 권장합니다.
- 기존 위연 샘플(`public/art/heroes/wei-yan-classic-portrait-v3.webp`,
  512×512 webp)이 이 스펙의 기준입니다. 새 영웅 초상도 **정사각형 ·
  512×512 이상 · webp**로 맞춰서 `public/art/heroes/`에 추가하고,
  `HeroSelectScreen.tsx`의 `HERO_PORTRAIT: Partial<Record<HeroId, string>>`
  맵에 `heroId -> 경로`만 등록하면 카드에 바로 반영됩니다(등록 안 된
  영웅은 🧑 이모지 placeholder). `HeroDefinition`에 이미지 필드를 따로
  추가하진 않았습니다 - 지금은 이 하드코딩 맵 하나로 충분한 규모.
- 같은 세션에서 "내정"(도메스틱 스페셜티) 등급 표시를 없애고 이름 있는
  고정효과 패시브 "특기"(`lib/game/hero-trait.ts`, 최대 5개)로 교체했고,
  이어서 전투 중 쓰는 액티브 "스킬"(`lib/game/hero-skill.ts`, 최대 2개)도
  분리 신설했습니다. `HeroDefinition`에 `traits`/`skills` 필드가 새로
  생겼습니다 - 둘 다 아직 데이터+화면 표시만 있고 `combat.ts`에는
  연결 안 됨. 특기/스킬 아이콘이나 관련 아트를 나중에 만들게 되면
  `lib/game/hero-trait.ts`/`hero-skill.ts`의 카탈로그(각 id → 이름/효과
  설명)가 전체 목록의 출처입니다.

### 스킬 정보 팝업 + 전투 애니메이션 자리 예약 (2026-08-06, 위 항목 바로 다음
  라운드)

**Codex가 나중에 전투 스킬 애니메이션을 만들 때 참고할 부분만 요약**
(배경/결정 과정 전체는 `docs/SYSTEM_LAYER.md`의 "영웅 카드에 스킬 정보
팝업 신설" 항목 참고):

- 영웅 카드에서 "특기" 라벨 옆 **[스킬] 버튼**을 누르면
  `HeroSelectScreen.tsx`의 `SkillModal` 컴포넌트가 카드가 아니라 **게임
  화면 전체를 덮는 팝업**으로 뜹니다(현재 화면 위 오버레이, 화면 전환
  아님). 영웅당 스킬 슬롯은 `MAX_HERO_SKILLS`(2)개 고정으로 항상 다
  보여줍니다 - 실제 스킬이 있는 슬롯도, 아직 없는("미확인") 슬롯도 존재.
- **각 스킬 슬롯 왼쪽에 정사각형에 가까운 120×100px 박스가 있는데, 이게
  바로 Codex가 나중에 채울 "전투 중 스킬 사용 애니메이션" 자리입니다.**
  지금은 완전히 빈 placeholder - "애니메이션 (준비 중)" 텍스트만 있고
  실제 연출/이펙트는 전혀 없습니다(스킬이 없는 슬롯은 같은 자리에 🔒
  아이콘). 정확한 크기/스타일은 `HeroSelectScreen.tsx`의 `SkillModal`
  함수 안, 애니메이션 박스 `<div>`의 `style={{ width: 120, minHeight:
  100, ... }}`가 최신 출처입니다 - 사용자가 여러 차례 크기를 조정했으니
  숫자가 또 바뀔 수 있습니다.
- 스킬 텍스트 데이터는 `lib/game/hero-skill.ts`의 `HERO_SKILL_CATALOG`에
  `name`/`summary`(짧은 수치 요약)/`description`(긴 서술형 설명) 세
  필드로 있습니다 - 애니메이션을 스킬별로 다르게 만들 때 이 설명 텍스트가
  참고 자료가 될 수 있습니다. 돌격(charge)만 사용자가 확정한 실제 수치가
  있고, 철벽/난사는 아직 가밸런스(임시 수치)입니다.
