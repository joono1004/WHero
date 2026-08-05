# System Layer — Claude Code 작업 기록

`lib/game/`(턴·이동·전투·도시·영웅·저장 등 게임 시스템)를 만들면서 결정한 것과
진행 상황을 기록합니다. Codex 세션이 그래픽/지형 쪽 작업을 이어가다가 이 영역과
맞닿는 지점이 생기면 이 문서를 먼저 확인해주세요.

## 경계 원칙

- `lib/game/`는 `app/world-prototype.tsx`를 import하지 않습니다. 그 파일은
  렌더링 인스턴스별로 `configureMapTier`/`configureMapType`이 바꾸는 모듈 전역
  상태(`HEX_COLS`, `MAP_WIDTH`, `ACTIVE_MAP_TYPE` 등)에 의존하므로, 시스템 로직이
  거기 얽히면 두 작업이 서로의 진행을 방해하게 됩니다.
- hex 좌표계는 렌더러와 같은 규칙(odd-r offset: 홀수 행이 반 칸 오른쪽으로 밀림,
  `hexCenterAt`/`neighborsOf`와 동일)을 따르되 독립적으로 재구현했습니다
  (`lib/game/hex.ts`). 맵 크기(rows/columns)는 전역 변수가 아니라 함수 인자로
  받습니다.
- 지형과 렌더링을 실제로 연결해야 하는 지점(예: hex별 지형 카테고리에 따른 이동
  비용, 선택된 이동 범위를 지도 위에 표시하는 것)은 작은 인터페이스로만 연결할
  계획이며, 합의되는 대로 "연동 계약" 절에 추가합니다.

## 데이터 모델 (작업 2번 결과)

- `lib/game/ids.ts` — Faction/Hero/Unit/City/Item id 타입 (순환 import 방지용)
- `lib/game/hero.ts` — `HeroDefinition`(고정 데이터), `HeroState`(레벨·경험치·아이템·배속 상태). ⚠️ **이 항목은 작업 2번 시점 기록이라 지금은 낡았습니다** — 당시엔 영웅이 네 모드(단독 이동/부대 동행/도시 배속/클리어맵 배치) 중 하나였지만, 이후 작업(9·10번)에서 `"recovering"`(전투 패배 후 회복 중)과 `"enlisted"`(맵 진입 전 출전 예약, 아직 미소환)가 추가되어 **현재는 총 6개 모드**입니다. 최신 모드 목록과 설명은 `lib/game/hero.ts`의 `HeroAssignment` 타입 주석이 항상 정확한 출처이니 그쪽을 먼저 확인하세요. 버프·생산력 공식은 여전히 미정 (작업 11에서 결정), 클리어맵 배치(영주) 보상은 `researchResource`로 확정됨 (아래 로그의 15번 작업 항목 참고).
- `lib/game/unit.ts` / `lib/game/city.ts` — 부대·도시 구조. 능력치·유닛 종류 구체값은 미정 (작업 9/10에서 결정)
- `lib/game/faction.ts` — 플레이어/AI 공용 세력 구조 (`isPlayerControlled`로 구분). 렌더러의 `MAP_TIERS[].factions` 값(맵 크기별 2~8개 세력)을 근거로, 세계 정복 대상이 되는 AI 세력이 있다고 가정하고 설계함
- `lib/game/world.ts` — 세계 생성 파라미터(시드/맵타입/맵크기) + 지형 생성 버전 태그 + 세계 진행 상태(턴, 정복 여부, 정찰 지역, 영웅 출전 한도) + `ClearedWorldRecord`(클리어한 세계를 가볍게 보관하는 기록, 유휴 영웅 배치 대상)
- `lib/game/save.ts` — 위 전부를 담는 `SaveGame`(`clearedWorlds` 포함), 그리고 저장 데이터의 참조 무결성 + 영웅 출전 한도 초과 여부를 검사하는 `findSaveGameIssues()` (작업 4번 로드 시 손상 데이터 감지에 재사용 예정)
- 세계 정복 → 다음 세계 진출 시 `world`/`factions`/`units`/`cities`는 새로 만들고, 방금 클리어한 세계는 `clearedWorlds`에 가볍게 보관하며, `heroes`는 그대로 유지하는 방식으로 "계승"을 표현 (별도 영구 프로필 타입 없이 `SaveGame` 하나로 처리)

## 연동 계약 (아직 없음 / TBD)

- 지형 카테고리 목록(예: 평원/숲/언덕/산/습지/해안 등)이 아직 시스템 쪽과
  공식적으로 합의되지 않았습니다. 현재 `world-prototype.tsx`에는
  `CoastKind`("land"/"beach"/"cliff"/"shallow"/"deep")와 지형 클러스터 타입
  (`"forest"/"mountain"/"hill"/"wetland"`)이 있는데, 이동 비용 로직(작업 8번)을
  만들 때 이 이름들을 그대로 가져다 쓸지, 시스템 쪽에서 별도 이름으로 매핑할지
  정해야 합니다.
- **영웅 초상화/그래픽**: `HeroDefinition`에 아직 이미지 필드가 없습니다.
  나중에 Codex와 함께 그래픽 작업할 때 (1) `portraitUrl` 같은 필드 추가,
  (2) `HeroSelectScreen`의 영웅 카드 레이아웃을 이미지 들어갈 공간까지
  고려해서 재설계 — 둘 다 같이 진행 예정 (사용자 결정, 2026-07-27).
  지금은 카드가 모바일 가로(390px) 기준으로 텍스트만 꽉 채워 압축돼 있어서,
  이미지를 그냥 끼워 넣으면 다시 레이아웃이 넘칠 수 있다는 점 참고.

## 결정 사항 로그

- **저장 방식**: 계정/서버 대신 브라우저 로컬 저장으로 시작 (2026-07-27 결정).
  세이브 데이터에는 생성된 맵 전체가 아니라 **시드 + 맵 타입 + 맵 크기**만
  저장하고, 불러올 때 절차적 생성으로 다시 만든다 (AGENTS.md의 "시드 재현성"
  원칙 활용).
- **지형 생성 버전 관리 필요**: 지형 생성 알고리즘이 Codex 쪽에서 계속
  바뀌므로, 세이브 데이터에 "어떤 지형 생성 로직 버전으로 만들어졌는지"를
  같이 저장해야 옛날 세이브가 나중에 어긋나지 않는다. → 저장 스키마 설계
  (작업 2/4번)에서 반영 예정.
- **화면 흐름**: 로딩 → (로컬 저장이므로 로그인 화면 생략) → 메인 메뉴(새
  게임/이어하기/설정/종료) → 저장 목록 or 세력명 입력 → 영웅 선택(3명 중 1명)
  → 세계 생성 대기 → 게임 메인 화면. 상세는 대화 기록 참고, 화면 구현(작업
  5/6번) 시 각 화면 요구사항을 이 문서에도 옮겨 적을 예정.
- **영웅 배속 모델 정정 (2026-07-27)**: 영웅은 부대/도시에 배속된 상태만
  유효한 게 아니라 **단독으로 지도를 이동**할 수도 있다. 부대와 함께 있으면
  버프, 도시에 있으면 생산력 증가. `HeroAssignment`를
  `"solo" | "unit" | "city"` 세 모드로 표현하도록 `lib/game/hero.ts`를
  수정하고, `save.ts`의 무결성 검사에 영웅↔부대/도시 양방향 일치 검사를
  추가함 (`unit.heroId`/`city.heroId`와 `hero.assignment`가 서로 어긋나지
  않는지).
- **유휴 영웅 활용 아이디어 추가 (2026-07-27)**: 영웅은 맵을 클리어할 때마다
  이벤트·뽑기로 계속 늘어나고, 한 맵에 출전 가능한 영웅 수는 제한된다 →
  출전 못 하는 유휴 영웅이 자연히 생김. 이 영웅들을 **이전에 클리어한
  맵(지역)에 배치**해서 그 지역에서 뭔가(자원? 버프? — 사용자가 아직 결정
  안 함)를 계속 얻게 한다. 그래서 `WorldState`에 `heroDeploymentLimit`을
  추가하고, 클리어한 세계를 버리지 않고 `ClearedWorldRecord`로 보관하도록
  `world.ts`/`save.ts`를 수정함. **13번 작업으로 등록** — 실제 보상 형태가
  정해지면 그때 구현.
  - ✅ **보상 형태 확정 (15번 연구 시스템에서)**: 영주가 생산하는 자원은
    `Faction.resources.researchResource`("유산")이고, 이걸 연구 레벨업에
    쓴다. 다만 "영주 임명 → 실제로 유산이 매턴 쌓이는" 생산 로직 자체는
    아직 구현 안 됨(턴 엔진이 없어서) — 자원의 **정체**와 **용도**는
    정해졌지만 **생산 로직**은 여전히 미구현.
- **영웅 스탯 시트 설계 (2026-07-27, 작업 3번 착수)**: 능력치를 숫자 대신
  SS/S/A/B/C/D 등급으로 표시하기로 함 (접근성). `lib/game/grade.ts`에 등급
  척도(점수 변환, 평균 계산)를 공용으로 분리하고, `lib/game/hero-definition.ts`에
  `HeroDefinition`(통솔력/무력/지력/매력 4대 능력치, 내정특기 3종, 전투특기
  5종 초안)을 새로 만듦. **유형(장군형/무력형/지략형/만능형)과 종합 등급은
  저장하지 않고 능력치에서 계산**(`heroArchetype`/`heroOverallGrade`) —
  유형 판정 규칙: 통솔력·무력·지력 중 최고값이 유형을 정하고(매력 제외),
  세 값이 1등급 이내로 가까우면 만능형. 이 규칙은 초안이라 플레이해보고
  바뀔 수 있음. **지역(클리어맵) 특기는 아직 타입에 없음** — 13번 작업
  보상 형태와 함께 정할 예정. 기존 `hero.ts`의 단순 `HeroSpecialty`/
  `HeroDefinition` 스텁은 제거하고 이 파일로 대체함.
- **전투특기를 지형/사거리 두 축으로 분리 (2026-07-27)**: "원거리"가 지형과
  다른 축이라는 지적에 따라, `combatSpecialties`를 없애고
  `terrainSpecialties`(수중/산악/평지/늪지 — 등급이 있으면 그 지형 이동거리
  +50%, 정확한 적용은 작업 8)와 `rangeSpecialty`(근접이면 null, 원거리면
  2/3/4 중 하나, 정확한 전투 계산은 작업 9)로 나눔.
- **기초 영웅 3명 확정 (2026-07-27, 작업 3번)**: 삼국지 인물로 선정,
  `lib/game/starting-heroes.ts`. 전부 종합 등급 A를 목표로 능력치 배분.
  - **관우** (장군형): 통솔 S·무력 A·지력 B·매력 A, 지형특기 수중 A
  - **조운** (무력형): 통솔 B·무력 S·지력 B·매력 A, 지형특기 평지 S
  - **제갈량** (지략형): 통솔 B·무력 C·지력 SS·매력 A, 지형특기 산악 A,
    내정특기 식량생산 S
  - 세 명 다 근접형이라 `rangeSpecialty`는 null. 세 종합 등급이 실제로
    "A"로 계산되는지, 유형이 의도대로 나오는지 테스트로 확인함.
  - **시작 영웅 교체 확정 (2026-07-27)**: "시작 영웅이 너무 강하다"는 문제
    제기에 따라, 관우/조운/제갈량은 `lib/game/legendary-heroes.ts`로
    옮겨 **나중에 뽑기/이벤트로 얻는 상위 등급(A) 영웅 풀**로 남기고,
    `lib/game/starting-heroes.ts`(실제 시작 영웅 3명)는 **평균 B등급 +
    대표 능력치만 S**인 **감녕(무력형)/위연(장군형)/서서(지략형)**로
    교체함. 셋 다 삼국지에서 알려져 있지만 "아직 다 여물지 않은 인물"
    서사(해적 출신 성장형 / 반골로 불신받는 장수 / 재능을 다 펼치지 못한
    책사)라 성장 여지가 자연스럽게 느껴지도록 골랐음.
- **레벨업 방식 설계 (2026-07-27, 코드 미반영 — 결정 사항만 기록)**:
  등급(문자)은 레벨업으로 직접 안 바뀜. 대신 레벨업마다 **고정 4칸**을 얻어
  플레이어가 원하는 능력치에 배분 → 그 능력치의 "다음 등급까지 진행 눈금"이
  채워짐. 등급 전환에 필요한 칸 수는 갈수록 증가:
  D→C 5칸 / C→B 8칸 / B→A 12칸 / A→S 17칸 / S→SS 23칸 (능력치 1개 만렙 65칸).
  **A→S, S→SS는 칸을 다 채워도 부족하고 별도의 희귀 아이템(각성석 등)을
  추가로 소모해야 승급** — 이 아이템은 13번 작업(유휴 영웅 지역 배치) 또는
  14번 작업(반란 토벌) 보상으로 얻게 하는 안을 검토 중. 최고 레벨은 **60**을
  추천(4칸×60=240칸 — 능력치 4개를 전부 SS로 채우기엔 20칸 부족하게 만들어
  "한두 개만 SS로 특화" 하도록 유도, 확정 아님).
- **경험치 획득 방식 확정 (2026-07-27)**: 실시간 지급 없이 **세계(맵) 클리어
  시에만** 경험치 지급. 클리어 시 클리어 시간·처치 병사 수·정복한 세력 수를
  기준으로 **평가등급**을 매겨(SS~D 등급 척도 재사용 추천) 전체 경험치 풀
  크기를 정하고, 그 풀을 세계에 배치돼 있던 각 영웅의 **기여도**(처치 수,
  내정 생산량 — 병력 생산 포함)에 비례해 분배. 기여도는 영웅의 영구 데이터가
  아니라 **진행 중인 세계 한정 데이터**라서 `HeroState`가 아니라 `WorldState`
  쪽에 누적하는 방향으로 설계 예정 (코드 미반영).
- **영주 시스템 확정 + 반란 토벌(14번 작업 신설) (2026-07-27)**: 클리어한
  맵에 영웅을 상주시키는 것은 그 지역을 다스리는 **영주 임명**을 뜻함 →
  `ClearedWorldRecord.assignedHeroIds: HeroId[]`(복수)는 잘못된 설계였고
  `governorHeroId: HeroId | null`(단수, 지역당 영주 1명)로 수정함.
  `HeroAssignment`의 `"region"` 모드도 `"governor"`로 개명
  (`assignHeroToRegion`→`appointHeroAsGovernor`, `isHeroInRegion`→
  `isHeroGoverning`). **반란 토벌은 영주 상주와 완전히 별개의 새 메커니즘** —
  영주가 있는 지역이라도 (전 지역은 아니고 조건부로) 반란 이벤트가 발생할 수
  있고, 그 지역 영주가 아닌 다른 영웅들을 파견해 토벌하면 경험치를 얻음
  (강한 신규 맵을 못 깨서 성장이 막힌 플레이어를 위한 구제 수단). **14번
  작업으로 등록, 코드 미반영.** 리셋 주기는 **실제 달력 기준 24시간**으로
  확정 (인게임 턴 기준이 아님 — 로컬 저장뿐이라 클라이언트 시계 조작 여지가
  있다는 점을 언급했으나, 사용자가 달력 기준으로 확정함). 24시간이 지나면
  (1) 그동안 토벌했던 지역의 "토벌 완료" 상태가 초기화되고, (2) **반란이
  발생하는 지역 자체도 다른 곳으로 바뀜** — 즉 "지금 어느 클리어맵에
  반란이 떠 있는지"를 실제 시각 기준으로 주기적으로 다시 뽑는 로직이
  필요함. 실제 저장 데이터 구조(마지막 로테이션 시각, 현재 반란 지역
  목록, 지역별 오늘 토벌 여부)는 아직 코드로 안 옮김 — 다음 스텝.
- **로컬 저장/불러오기 구현 (2026-07-27, 작업 4번)**: `lib/game/save.ts`에
  `checkSaveGameShape()`(파싱된 JSON이 실제로 `SaveGame` 모양인지 필드
  단위로 검사 — 손상되거나 손으로 수정된 데이터가 뒤에서 크래시 내는 걸
  방지)와 `parseSaveGame()`(JSON 파싱 → 모양 검사 → 스키마 버전 검사 →
  `findSaveGameIssues` 참조 무결성 검사 순으로 실행, 절대 throw 안 하고
  `{ok:false, errors}`로 실패를 알림) 추가. `lib/game/storage.ts`는
  `window.localStorage`와 동일한 모양의 `KeyValueStorage` 인터페이스를
  받아서 저장/불러오기/삭제/슬롯 목록을 제공 — 브라우저 없이 테스트하려고
  실제 localStorage 대신 인터페이스로 추상화함 (테스트는 인메모리 가짜
  구현 사용). 손상된 슬롯 하나가 있어도 `listSaveSlots`는 그 슬롯만
  건너뛰고 나머지는 정상적으로 보여줌.
- **시작~영웅선택 화면 구현 (2026-07-27, 작업 5번)**: `app/game/` 아래
  Codex의 `app/world-prototype.tsx`와 완전히 분리된 새 라우트(`/game`)로
  만듦. `app/page.tsx`(`/`)는 건드리지 않아서, 기존 렌더링 스모크 테스트와
  Codex의 실시간 프리뷰 흐름에 영향 없음. 화면 순서: 시작 → 메인 메뉴(새
  게임/이어하기/설정/종료) → (이어하기: 저장 목록) or (새 게임: 세력명 입력
  → 영웅 선택 → 세계 생성 대기 → 완료). `lib/game/new-game.ts`의
  `createNewSaveGame()`(순수 함수, seed/now를 인자로 받아 결정론적)이 실제
  세이브를 만들고 `storage.ts`로 저장. 실제 브라우저(Playwright)로 전체
  흐름을 클릭해보고 localStorage에 저장된 값·새로고침 후 생존까지 확인함.
  게임 메인 화면(실제 지도 연동)은 6번 작업 몫이라 "완료" 화면에서 멈춤.
  - ⚠️ **CSS 함정 발견, Codex도 참고**: `app/globals.css`에 레이어 밖에
    있는 `button { background: linear-gradient(...); ... }`, `h1 { ... }`
    같은 순수 엘리먼트 셀렉터가 있는데, Tailwind v4는 유틸리티 클래스를
    `@layer utilities`(레이어 안)에 넣습니다. CSS Cascade Layers 규칙상
    **레이어 밖 스타일은 명시도와 무관하게 레이어 안 스타일을 항상 이깁니다**
    — 그래서 `<button>`이나 `<h1>`에 Tailwind 클래스를 아무리 구체적으로
    줘도 저 두 규칙을 못 이깁니다. `app/game/Button.tsx`에서는 이 두
    태그에 한해 Tailwind 대신 **인라인 style**로 우회했습니다(인라인
    style은 캐스케이드 레이어보다 항상 우선). Codex가 나중에 Tailwind로
    새 버튼/제목을 추가한다면 같은 함정에 걸릴 수 있음 — `globals.css`의
    `button`/`h1` 규칙에 클래스를 붙이거나(`.button`, 예: 지금처럼 bare
    selector 대신), 인라인 style로 우회하는 걸 권장.
- **모바일 가로 전용 확정 (2026-07-27)**: 이 게임은 웹으로 만들지만 최종
  목표는 **모바일 앱, 가로 방향**. 기준 해상도는 iPhone 가로
  (844×390, CSS px)로 잡음. 5번 작업에서 만든 화면 5개를 이 기준으로
  다시 다듬음:
  - `app/game/ScreenShell.tsx` 신설 — 헤더/스크롤 가능한 본문/하단
    버튼 3단 레이아웃(`h-dvh` + `flex`)으로, **하단 버튼이 항상
    화면 안에 고정**되도록 함. 세로 공간이 390px밖에 안 되는
    가로 모드 폰에서는 가운데 정렬 스택형 레이아웃(기존 방식)이
    쉽게 화면 밖으로 넘쳐서(특히 영웅 선택 화면), 스크롤해야만
    확인 버튼이 보이는 문제가 실제로 있었음 — Playwright로 실측 확인.
  - 영웅 선택 카드도 텍스트·패딩을 압축해서 3장이 한 화면(390px 높이)에
    버튼까지 전부 들어가게 함.
  - 780×360(더 작은 기기 가정)에서도 확인 버튼이 화면 안에 들어오는지
    추가로 실측 확인함.
  - 이후 화면(6번 작업부터)도 `ScreenShell` 패턴과 이 기준 해상도를
    기본으로 설계할 것.
- **게임 메인 화면 뼈대 구현 (2026-07-27, 작업 6번)**: 5번 작업의 "완료"
  화면(`ReadyScreen`, 삭제됨)을 대체하는 실제 목적지.
  `app/game/screens/GameMainScreen.tsx`, `ScreenShell` 사용.
  레이아웃: 상단바(세력명·Lv, 게임 타이틀, 설정·종료 아이콘) / 좌측
  사이드바(선택된 영웅 아바타 자리·이름·등급·유형·레벨) / 중앙
  (**세계 지도 자리 — 점선 테두리로 명확히 "연동 예정"이라고 표시,
  아직 `world-prototype.tsx`와 연결 안 됨**) / 하단바(부대·도시 진입
  버튼, 자원 표시 자리, 턴 종료 버튼). 부대/도시/턴 종료/설정 버튼은
  전부 눌리지만 "다음 작업(7/9/10번)에서 구현됩니다" 안내만 뜨는
  스텁 상태 — 5번 작업의 설정/종료 스텁과 같은 패턴.
  `lib/game/hero-roster.ts`(`findHeroDefinition`)를 새로 만들어
  시작 영웅 풀과 레전더리 풀을 함께 검색하도록 함 (세이브에 저장된
  영웅이 어느 풀 출신이든 이름·등급을 찾을 수 있게). 844×390, 780×360
  둘 다 Playwright로 확인, 새 게임 생성 → 메인 화면, 저장 불러오기 →
  메인 화면 두 경로 모두 실제 클릭으로 검증함.
- **영웅 목록·상세 화면 확장 (2026-07-27, 작업 6번 연장)**: 좌측 패널을
  단일 영웅 표시에서 **여러 영웅 리스트**로 교체. `HeroState`에 필드 2개
  추가 — `attributeProgress`(능력치별 다음 등급까지 채운 칸 수, 현재는
  아무것도 칸을 안 채우니 전부 0), `deploymentPriority`(출전 우선 표시
  "별", 토글만 되고 실제 세계 진입 시 우선 배치 로직은 아직 없음 — 12번
  작업에서 연결 예정). `lib/game/grade.ts`에 등급 전환 필요 칸 수 표
  (`pipsRequiredForNextGrade`, D→C 5 / C→B 8 / B→A 12 / A→S 17 / S→SS 23 —
  기존 대화에서 나온 초안 수치, 미확정) 추가. `lib/game/hero.ts`에
  아이템 장착(`equipItem`/`unequipItem`, 영웅당 최대 2개 `MAX_ITEMS_PER_HERO`
  강제, 초과 시 throw) 및 영주 여부 조회(`governedWorldId`) 추가.
  `lib/game/hero-roster.ts`에 정렬 비교 함수(`compareByGrade`/
  `compareByArchetype`/`compareByLevel`) 추가 — 등급을 문자열로 그냥
  비교하면 "SS"가 "A"보다 알파벳상 앞이라 순서가 뒤집히는 버그가 생겨서,
  반드시 `gradeToScore`를 거치도록 테스트로 고정해둠.
  화면: `app/game/screens/HeroDetailScreen.tsx` 신설(능력치 4개 + 진행
  게이지, 특기, 경험치/레벨, 아이템 슬롯 2칸, 출전 우선 토글), 목록
  카드 클릭 시 진입. `GameMainScreen`에 정렬 탭(등급/유형/레벨순) 추가.
  영웅 데이터 변경(별 토글, 아이템 해제)은 `GameMainScreen`이
  `onUpdateSave` 콜백으로 `GameEntry`까지 올려서 실제 localStorage에
  반영 — 이걸 위해 `GameEntry`의 "main" 화면 상태에 `slotId`를 같이
  들고 있도록 수정함(이전엔 세이브만 들고 있어서 어느 슬롯에 다시
  저장해야 할지 알 방법이 없었음). 목록↔상세 화면 양쪽에서 토글이
  일관되게 반영되는지, 새로고침 후에도 남아있는지까지 Playwright로
  실측 확인. 아이템은 장착 슬롯 UI만 있고 실제 장착 가능한 아이템은
  아직 없음(카탈로그 미정, 사용자가 나중에 결정하기로 함).
- **연구 시스템 신설 (2026-07-27, 작업 15번)**: 내정(금생산/식량생산) +
  병과(보병/궁병/기병/공성병기) 6개 카테고리, 세력(Faction) 단위로 레벨
  보유. `Faction`에 `resources`(금/식량/`researchResource`)와
  `research`(카테고리별 레벨) 필드 추가 — `createFaction()` 헬퍼로
  생성하도록 정리.
  - **`researchResource`("유산")는 13번 작업(영주 상주)이 정확히 뭘
    생산하는지 미정이었던 걸 사실상 이번에 확정한 것** — "클리어한
    지역에서 생성되는 자원"이 바로 이 값. 13번 작업 문서도 이 결정을
    반영해 갱신함.
  - 레벨업 비용/최대 레벨(`lib/game/research.ts`: D→...은 아니고 그냥
    레벨 1~10, 비용은 `금 100×다음레벨`, `유산 50×다음레벨`)은 **초안
    수치, 미확정** — 등급 칸 시스템처럼 나중에 조정 가능.
    각 레벨이 실제로 뭘 향상시키는지(생산량 %, 유닛 스탯 등)는 아직
    안 정함 — 도시 생산(10번)·전투(9번) 시스템과 연결될 때 결정.
  - `upgradeResearch()`는 감당 못 하거나 이미 최대 레벨이면 throw —
    UI가 미리 `researchUpgradeCost`/`canAffordResearch`로 버튼을
    비활성화해서 막음.
  - 화면: `app/game/screens/ResearchScreen.tsx` (내정/병과 2열, 카테고리별
    현재 레벨·다음 레벨 비용·연구 버튼), `GameMainScreen` 하단바에 "연구"
    버튼 추가. 하단바의 "금·식량" 표시도 이번에 하드코딩 0에서 실제
    `Faction.resources` 값으로 교체함.
  - Playwright로 자원 0일 때 전부 비활성화, 자원 주입 후 연구 성공 →
    레벨 상승 + 자원 정확히 차감 + 메인 화면 하단바에도 실제 값 반영되는
    것까지 확인.

- **로비 · 맵 후보 선택 시스템 (2026-07-27)**: 사용자가 "영웅 선택 후 곧바로
  생성된 맵에 입장하는 게 아니다"라고 정정함 (`docs/GAME_VISION.md`의 동명
  절 참고). 영웅 선택 → **로비**(영웅 목록/세력정보 그대로, 중앙에 "공략할
  세계" 후보 카드) → 후보 진입 시에만 별도의 "실제 게임 화면"(턴 종료, hex
  맵)으로 이동. 처음 로비는 후보 1개, 클리어 후에는 지형만 다른 후보 2개
  (사이즈 단계는 항상 자동 상승, 선택 대상 아님).
  - `SaveGame.world`를 `WorldState | null`로 변경 (로비 중엔 null), 새
    필드 `nextMapCandidates: MapCandidate[]` 추가. `findSaveGameIssues`에
    "activeWorld와 nextMapCandidates 중 정확히 하나만 존재해야 한다"는
    불변식 추가 (`lib/game/save.ts`).
  - `lib/game/map-candidates.ts` (신규): `generateInitialMapCandidates(seed)`
    (후보 1개, worldIndex 1), `generateNextMapCandidates(seed,
    clearedWorldIndex)` (후보 2개, 서로 다른 지형, 다음 단계 사이즈).
    지형/사이즈 롤은 로컬 결정적 해시(`pick()`)로 고르며, 지형 생성
    알고리즘(Codex 쪽)과는 별개의 해시임 — 재현성만 보장하면 됨.
  - `mapTierForWorldIndex(worldIndex)`가 `MAP_TIER_ORDER`를 worldIndex-1
    인덱스로 읽어 "몇 번째 세계인가"를 자동으로 사이즈 단계에 매핑함
    (mini→small→...→world, 마지막에서 고정).
  - `lib/game/world.ts`에 `MAP_TYPE_INFO`/`MAP_TIER_INFO` 추가 —
    `world-prototype.tsx`의 `MAP_TYPES`/`MAP_TIERS`를 그대로 미러링한
    한글 라벨·설명·세력수·columns/rows (기존 "손으로 동기화" 원칙 유지).
  - `lib/game/world-entry.ts` (신규): `enterMapCandidate(save,
    candidateIndex, now)`가 후보를 실제 `WorldState`로 바꾸고
    `nextMapCandidates`를 비움. `completeActiveWorld(save, now)`는 현재
    세계를 `clearedWorlds`에 기록하고 `generateNextMapCandidates`로 다음
    후보 2개를 채운 뒤 로비로 돌려보냄 — **정복 조건(턴 엔진/전투, 7·9번
    작업)이 아직 없어서 실제 클리어 판정 없이 호출부(현재는 UI의 "정복
    완료 (테스트)" 버튼)가 알아서 부르는 임시 땜빵**. 세계가 끝나면 유닛/
    부대 배속(unit/city 모드) 영웅은 solo로 되돌리고(그 유닛/도시가
    사라지므로), 영주(governor) 배속은 그대로 둠.
  - **세력(Faction) 영속성 정리**: `Faction.resources`/`research`가
    (영웅 레벨처럼) 장기 누적 값이 되면서, 예전 "세계마다 세력을 새로
    만든다"는 가정이 깨졌음을 이번에 확정 정리함 — 플레이어 세력은
    `lib/game/faction.ts`의 `PLAYER_FACTION_ID` 상수로 **세계 전환에도
    동일한 id를 유지**하고, `cityIds`/`unitIds`만 세계마다 `[]`로
    초기화됨 (`completeActiveWorld`에서 처리). AI 세력은 세계 범위라서
    `completeActiveWorld` 시 통째로 버려짐 — 다음 세계 진입
    (`enterMapCandidate`) 시 아직 AI 세력을 만들지 않으므로 이 부분은
    작업 9/12에서 추가로 채워야 함 (현재 `world.factionIds`에는
    플레이어 세력만 들어감, 초안).
  - UI: `app/game/screens/GameMainScreen.tsx`를
    `app/game/screens/GameLobbyScreen.tsx`로 재구성 (영웅 목록·정렬·연구
    화면 진입은 그대로, 중앙 "세계 지도 영역" 플레이스홀더와 턴종료
    버튼을 제거하고 클리어맵 레일 + 맵 후보 카드로 교체). 새 화면
    `app/game/screens/MapPlayScreen.tsx`가 턴종료(스텁)와 "정복 완료
    (테스트)" 버튼, 지도 플레이스홀더를 담당. `GameEntry.tsx`의 "main"
    상태는 이제 `save.world`가 있으면 `MapPlayScreen`, 없으면
    `GameLobbyScreen`을 렌더링 — 화면 자체를 분기하지 않고 하나의
    상태에서 데이터로 분기함 (별도 screen.name 없이 `save.world` null
    여부로 라우팅).
  - 클리어맵 레일은 "클리어할수록 왼쪽으로 늘어난다"는 요구사항에 맞춰
    오래된 순 → 최신 순으로 왼쪽에서 오른쪽 배치, 후보 카드는 그 오른쪽
    끝(현재 위치 고정)에 붙임 — `overflow-x-auto`로 가로 스크롤, 별도
    자동 스크롤은 아직 없음 (초반엔 다 보이므로 우선순위 낮음, 클리어
    수가 많아지면 재검토).
  - Playwright로 844×390/780×360 둘 다 확인: 로비 첫 진입(후보 1개) →
    맵 진입 → 실제 게임 화면(턴종료/정복완료 보임) → 정복 완료 → 로비
    복귀(후보 2개, 지형 다름, 클리어맵 칩 표시) → 새로고침 후 저장
    목록에서 다시 불러와도 로비 상태(후보 2개 + 클리어맵)가 그대로
    유지되는 것까지 확인.
  - 테스트: `lib/game/map-candidates.test.ts`(신규),
    `lib/game/world-entry.test.ts`(신규), `save.test.ts`/`storage.test.ts`/
    `new-game.test.ts`를 nullable world + `nextMapCandidates` 픽스처로
    갱신. 전체 150개 통과, tsc/eslint 클린, 프로덕션 빌드 성공.
- **턴 엔진 (2026-07-27, 작업 7번)**: `lib/game/turn.ts`의
  `endTurn(save, now)` — 순수 함수, `save.world`가 없으면 throw.
  - 지금 시점에 규칙이 이미 정해진 두 가지만 담당: **턴 카운터
    증가**(`world.turn += 1`)와 **모든 부대의 이동력 회복**
    (`Unit.movementRemaining`을 `stats.movement`로 리셋).
  - 의도적으로 최소 범위: 도시 생산 큐 진행(작업 10), 영웅 배속 버프/
    영주 자원 생산(작업 11/13), 반란 로테이션(작업 14), AI 세력 행동 —
    전부 아직 규칙이 정해지지 않았으므로 이번 턴 엔진에 넣지 않고,
    각자 작업에서 `endTurn`에 훅을 추가하는 방식으로 나중에 얹는다.
    파일 상단 주석에 이 경계를 명시해둠.
  - AI 세력별 턴 순서도 아직 없음 — AI 의사결정 로직 자체가 없으므로,
    지금은 플레이어가 "턴 종료"를 누르면 즉시 다음 턴으로 넘어간다.
    나중에 전투(9번)나 AI 시스템이 필요해지면 진짜 세력별 턴 순서로
    바뀔 수 있음.
  - `app/game/screens/MapPlayScreen.tsx`의 "턴 종료" 버튼을 스텁 alert
    대신 실제 `endTurn` 호출로 교체 (`GameEntry.tsx`에서 연결).
  - 테스트(`lib/game/turn.test.ts`, 7개): 턴 증가, world 없을 때 throw,
    부대 이동력 리셋, 순수 함수(원본 미변경), `updatedAt` 갱신, 연속
    턴 종료 확인. Playwright로 844×390에서 턴 종료 3회 클릭 → 1→4턴
    반영, 새로고침 후 불러오기해도 턴 수 유지되는 것까지 확인.

- **이동 규칙 (2026-07-27, 작업 8번)**: `lib/game/movement.ts` —
  `hex.ts`의 이웃/범위 계산 위에 순수 경로탐색을 얹음.
  - `MovementCost = (hex) => number | null` (null = 진입 불가)를 콜백으로
    받는 구조 — 실제 지형 종류는 아직 시스템 쪽과 공식 합의된 계약이
    없어서(SYSTEM_LAYER.md "연동 계약" 절), 이 엔진은 지형을 전혀 모른다.
    나중에 지도를 연동할 때 호출자가 "이 hex의 진입 비용"을 알려주는
    함수를 넘기면 되고, 지금은 테스트에서 flat cost-1 함수를 씀.
  - `reachableHexes(origin, movementBudget, bounds, cost)` — Dijkstra(가변
    비용 지원, 예산 내 도달 가능한 모든 hex + 최소 비용). 예산으로 조기
    가지치기하기 때문에 맵 전체 크기와 무관하게 실제 탐색 범위는 이동력
    반경만큼만 커짐.
  - `shortestPath(origin, destination, bounds, cost)` — 목적지까지 최단
    경로(하나의 이동 예산에 얽매이지 않음, 도달 불가 시 null).
  - `moveUnit(unit, path, bounds, cost)` — 실제로 `Unit.position`/
    `movementRemaining`을 갱신하는 유일한 상태 변경 함수. 경로가 유닛
    현재 위치에서 시작하지 않거나, 인접하지 않은 칸으로 건너뛰거나,
    진입 불가 칸을 지나거나, 남은 이동력을 초과하면 throw — UI가
    `reachableHexes`/`shortestPath` 결과로만 경로를 만든다고 가정.
  - **영웅 단독 이동의 이동력 수치는 여기서 다루지 않음** —
    `HeroDefinition`에 아직 "이동력" 스탯 필드가 없어서(지형 특기 +50%
    보너스만 정의됨), 얼마를 줄지는 미정. 엔진 자체는 범용이라 그 수치가
    정해지면 그대로 재사용 가능.
  - 아직 지도 화면이 없어서(작업 6번 로비/실제 게임 화면에는 hex 그리드
    렌더링이 없음) UI 연결은 없음 — 순수 로직만 우선 구현, 지도 연동 시
    사용 예정.
  - 테스트(`lib/game/movement.test.ts`, 19개): 예산 내 도달 범위가
    hex 거리와 일치하는지, 비용 오름차순 정확성, 예산 초과 제외, 막힌
    칸 우회, 완전히 막힌 목적지에서 null, 유닛 이동 시 위치/이동력 갱신
    및 각종 유효성 검사(시작점 불일치/비인접 칸/진입 불가/이동력 부족)
    throw 확인.

- **전투 규칙 (2026-07-27, 작업 9번)**: 사용자가 규칙을 직접 지정함
  (`docs/GAME_VISION.md`의 동명 절 참고) - 공격자 선공 → 방어자 생존 시
  반격, 단 공격자 사거리가 방어자보다 길면 반격 없음. 근접을 "사거리 1"로
  보고 비교하면 이 하나의 규칙으로 근접:근접/근접:원거리/원거리:원거리
  모든 조합이 자연스럽게 설명됨 (문서에 각 조합별 도출 과정 기록).
  하나만 추가로 확인함 — **영웅이 전투에서 죽으면 어떻게 되는지**
  (완전 사망 / 일정 턴 기절 / 페널티 없는 후퇴, 3지선다로 질문) → 답변:
  "주둔지로 후퇴 개념, 전투 중엔 사라지지만 몇 턴 대기 후 재배치 가능.
  단, 병사는 바로 소멸" — 옵션 2(일정 턴 기절)와 사실상 같은 구조.
  - **데이터 모델 변경**: `HeroState`에 `health: number` 필드 추가(이전엔
    영웅에 체력 개념 자체가 없었음). `HeroAssignment`에 `"recovering"`
    모드 추가 `{mode:"recovering", turnsRemaining}` — 이전 배속이 무엇이든
    덮어씀. `UnitStats`에 `range: number | null` 추가(근접=null).
  - `lib/game/hero-definition.ts`: `heroCombatStats(attributes,
    rangeSpecialty)` — 등급을 실제 전투 수치로 바꾸는 초안 공식
    (`gradeToScore`(1~6) 기준, 무력→공격력×5, 통솔력→방어력×4,
    (무력+통솔력)→최대체력×10, 지력/매력은 전투력에 관여 안 함, 레벨도
    아직 관여 안 함 — 전부 플레이테스트 전 초안, 조정 가능). 현재
    시작/전설 영웅 3+3명 전부 근접(사거리 null)이라 원거리 케이스는
    테스트 전용 픽스처로만 검증됨.
  - `lib/game/hero.ts`: `GARRISON_RETURN_POSITION`(주둔지 개념이 아직
    없어 임시로 origin hex 사용, 도시/주둔지 시스템(10/13번)이 생기면
    교체 예정), `isHeroRecovering`, `isHeroDeployed`가 recovering도
    배치 인원수에서 제외하도록 갱신, `beginHeroRecovery(hero,
    turnsRemaining)`, `tickHeroRecovery(hero, maxHealth)` (매턴 1씩
    감소, 0 되면 solo·풀피로 복귀).
  - `lib/game/combat.ts` (신규): `Combatant`(attack/defense/health/
    maxHealth/range) 공통 인터페이스 + `unitCombatant`/`heroCombatant`
    어댑터 + `resolveAttack(attacker, defender)` (순수, 데미지 공식은
    `max(공격력-방어력, 1)` 초안) + `applyCombatHealthToUnit`(패배 시
    null 반환 → 호출부가 save.units/faction.unitIds에서 제거해야 함,
    아직 그 orchestration은 미구현) + `applyCombatHealthToHero`(패배 시
    `beginHeroRecovery` 호출).
  - `lib/game/turn.ts`의 `endTurn`을 확장 — 매턴 recovering 영웅을
    `tickHeroRecovery`로 한 칸씩 진행시킴 (필요한 `maxHealth`는
    `findHeroDefinition` + `heroCombatStats`로 그때그때 계산). 이건
    "규칙이 이미 정해진 것만 turn.ts가 담당한다"는 기존 원칙에 정확히
    부합하는 확장.
  - **의도적으로 범위 밖에 둔 것**: 8번(이동 규칙)과 동일한 이유로,
    실제 공격 트리거 UI(지도에서 대상 선택 등)가 아직 없어서
    `resolveAttack`을 `SaveGame` 레벨에서 호출해 유닛 제거·소속
    faction.unitIds 정리·유닛에 타던 영웅 재배치까지 처리하는
    "orchestrator" 함수는 만들지 않음 — `world-entry.ts`의
    `completeActiveWorld`가 비슷한 정리를 이미 하고 있으므로 패턴은
    있지만, 실제 지도가 붙을 때 그 정리 로직을 여기 얹을 예정.
    사거리와 실제 hex 거리(인접 여부 등)를 대조하는 것도 지도 연동
    시점으로 미룸(8번과 동일).
  - 테스트: `hero-definition.test.ts`(`heroCombatStats` 3개 추가),
    `hero.test.ts`(recovering 관련 5개 추가), `combat.test.ts`(신규,
    23개 — 데미지 공식, 반격 규칙의 모든 사거리 조합, 패배 처리,
    어댑터), `turn.test.ts`(회복 틱 3개 추가). 스키마 변경으로
    `save.test.ts`/`hero.test.ts`/`hero-roster.test.ts`의 기존
    HeroState/Unit 픽스처에 `health`/`range` 필드 보강. 전체 205개
    통과, tsc/eslint 클린, 프로덕션 빌드 성공, Playwright로 기존
    로비→맵 진입→턴 종료 흐름이 스키마 변경 후에도 그대로 동작하는 것
    확인.

- **영웅 능력치 확장: 체력 추가 (2026-07-27)**: 사용자 요청으로 통솔력/
  무력/지력/매력 4개였던 `HeroAttributes`에 `vitality`(체력)를 추가해
  5개로 확장 (`docs/GAME_VISION.md`의 동명 절 참고). 9번 작업에서 만든
  `HeroState.health`(현재 체력, 숫자)와는 다른 개념 — 이건 그 등급
  스탯의 이름이 겹치지 않도록 타입 필드명은 `vitality`로 뒀고, 화면
  표시만 "체력"으로 함.
  - `hero-definition.ts`: `HeroAttributes.vitality: CoreGrade` 추가.
    `heroOverallGrade`가 이제 5개 평균. `heroArchetype`은 매력과
    마찬가지로 체력도 판정에서 제외(전투 "역할"이 아니라 순수 생존력
    지표로 보는 게 맞다고 판단, 문서화된 해석 — 필요하면 재검토 가능).
  - `heroCombatStats` 재정비: 이전엔 `maxHealth`가 무력+통솔력 합산의
    임시값이었는데, 이제 전용 `vitality` 스탯이 생겼으니 `maxHealth =
    체력 등급 점수 × 20`으로 교체(공격력/방어력 공식은 그대로 무력/
    통솔력 기반 유지). 상수는 여전히 플레이테스트 전 초안.
  - 기존 영웅 6명(시작 3 + 전설 3) 전부 `vitality` 값 추가 — 각 영웅의
    기존 "목표 등급 평균"(시작=B, 전설=A)이 5개 스탯 평균으로도
    그대로 유지되도록 역산해서 값을 골랐고(감녕 A/위연 B/서서 C,
    관우 S/조운 A/제갈량 B), 인물 설정에도 대략 맞게 배치(예:
    해적 출신 감녕은 체력 A, 병약한 책사로 유명한 제갈량은 상대적으로
    낮은 B).
  - `hero.ts`의 `ZERO_ATTRIBUTE_PROGRESS`, `save.ts`의
    `checkHeroShape` attributeProgress 키 목록에 `vitality` 추가.
  - UI: `HeroSelectScreen.tsx`/`HeroDetailScreen.tsx`에 체력 항목 표시
    추가, Playwright로 두 화면 모두 확인.
  - 테스트: `hero-definition.test.ts`(체력 관련 신규 케이스 + 기존
    케이스에 vitality 필드 보강, maxHealth 공식 변경 반영),
    `combat.test.ts`/`new-game.test.ts` 등 기존 픽스처에 `vitality`
    필드 보강. 전체 209개 통과, tsc/eslint 클린, 프로덕션 빌드 성공.
- **도시 성장 · 부대 생산 · 영웅 출전/소환 (2026-07-27, 작업 10번)**:
  사용자가 13개 항목으로 직접 지정한 설계 + 후속 확인 3가지
  (`docs/GAME_VISION.md`의 동명 절 참고). 이번 작업의 가장 큰 구조
  변화는 **로비에서 맵 진입 전 최대 5명까지 영웅을 "출전 예약"하고,
  도시를 세울 때마다 그중 다음 순번이 자동으로 소환되는** 흐름이 새로
  생긴 것 — 기존에는 진입 시 이미 배속된 영웅이 곧바로 맵에 나타났음.
  - **새 자원 `iron`(철)**: `faction.ts`의 `FactionResources`에 추가,
    `save.ts`의 `checkFactionShape`도 갱신.
  - `lib/game/city.ts` 전면 확장 — 이전엔 타입만 있던 파일에 실제
    로직을 얹음(research.ts와 같은 패턴: 타입 + 순수 검증/verb 함수를
    한 파일에):
    - `CityTier`(outpost/small/medium/large = 주둔지/소도시/중도시/
      대도시), `CITY_TIER_INFO`(라벨, 시설 슬롯 수 1/2/3/4, 성벽
      방어 보너스 0/5/10/20 — 전부 초안), `CITY_UPGRADE_COST`(레벨별
      골드+식량, 초안).
    - `FacilityType`(훈련소/농장/시장/광산). **주의: 이건 도시 "안에"
      짓는 시설(사용자 스펙 5·6번)이고, 4번에서 말한 "영역 밖 자원
      타일 점령"과는 별개 개념** — 후자는 실제 지형이 있어야 하므로
      이번엔 다루지 않음 (사용자 확인: "그 이후에 고민해도 돼"). 이름이
      같은 4종(훈련소/농장/시장/광산)을 두 맥락에 다 쓸 수 있게 설계
      의도만 남겨둠.
    - `buildFacility`(슬롯 상한 체크 + 골드 차감), `cityFacilityYieldPerTurn`
      (훈련소는 자원 없음 - 생산 큐만 열어줌 / 농장→식량 / 시장→금 /
      광산→철, 전부 초안 수치).
    - `canFoundCityAt`(기존 도시들과 3hex 이상 — `MIN_CITY_FOUNDING_DISTANCE`),
      `canFoundAdditionalCity`(2번째 이후 도시는 기존 도시 중 하나가
      소도시 이상이어야 함, 사용자 스펙 7번).
    - `upgradeCity`/`canUpgradeCity`(research.ts의 upgradeResearch와
      동일한 "throw, UI가 미리 체크" 컨벤션).
    - `queueUnitProduction`/`canQueueUnitProduction`: 훈련소 필요 +
      해당 병과가 연구로 잠금 해제됐어야 함. **자원 비용은 없음** —
      제작 턴 수(`UNIT_PRODUCTION_TURNS`, 초안 3턴)만 소모, 사용자가
      별도 자원 비용을 언급하지 않아 발명하지 않음.
  - `lib/game/unit-production.ts` (신규): 연구 레벨 → 실제 생산되는
    병사 스탯 변환.
    - `UNIT_TYPE_CATALOG`: 보병/궁병/기병/공성병기 4종의 기본
      이동력·사거리(초안). 지형 특화 연구로 인한 병과 개명(보병→산악병,
      사용자 스펙 13번)은 지형 계약이 없어 이번엔 미구현 — 나중에 이
      카탈로그를 확장하는 방식으로 얹을 예정.
    - `isUnitTypeUnlocked`: 보병은 연구 레벨 0에서도 생산 가능, 나머지는
      레벨 1 이상 필요 (사용자 스펙 10번).
    - `researchLevelToUnitGrade`: 연구 레벨(0~10) → 등급(D~A, **S/SS는
      영웅 전용이라 배제** — 사용자 스펙 12번) 변환 초안 구간표.
    - `unitCombatStatsFromGrade`: 병사는 무력/체력만 등급화(사용자
      스펙 13번) → 무력이 공격력, 체력이 방어력+최대체력을 동시에
      결정(통솔력 스탯이 없는 병사에게 "방어" 역할을 줄 다른 축이
      없어서 체력이 겸함 — 이 부분은 해석/설계 판단이라 문서화해둠).
      영웅용 상수(hero-definition.ts)보다 작은 배율을 써서 병사 1명이
      영웅보다 약하게 함.
    - `createProducedUnit`: 위 전부를 조합해 실제 `Unit`을 생성 —
      `queueUnitProduction`이 만든 주문을 턴 종료 시 완성품으로 바꾸는
      쪽에서 사용 (아래 turn.ts 참고).
  - **영웅 출전 예약·소환 (사용자 스펙 8번, 확인 후 확정)**: 맵 진입 전
    최대 5명(`world-entry.ts`의 `MAX_ENLISTED_HEROES`) 선택, 순서가
    소환 우선순위. 첫 번째만 즉시 solo로 배치, 나머지는 새 배속 모드
    `HeroAssignment`의 `"enlisted"`(`{mode:"enlisted", worldId}`)로
    대기. 도시를 세울 때마다(`city-actions.ts`의 `checkHeroSummons`)
    `min(예약 인원, max(1, 도시 수))`명이 solo로 전환됨 — 도시가 0개인
    시점도 "1개"로 취급(이미 solo인 첫 영웅이 그 몫이므로).
    - `world.ts`의 `WorldState`에 `enlistedHeroIds`/`researchSnapshot`
      추가. `researchSnapshot`은 "맵 시작 전 연구가 그대로 유지된 채
      생산된다"(사용자 스펙 11번)를 위해 진입 시점 연구 레벨을 얼려둔
      것 — 지금은 맵 중 연구 화면 자체가 없어서(로비에만 "연구"
      버튼이 있음) 사실상 실시간 연구값과 같지만, 의도를 명시적으로
      고정해둠.
    - `heroDeploymentLimit`은 이제 고정 5가 아니라
      `enlistedHeroIds.length`로 설정 — 필드 자체는 유지(기존
      `findSaveGameIssues`의 "배치 인원 ≤ 한도" 검사를 그대로 재사용).
    - `isHeroDeployed`가 `"enlisted"`도 제외하도록 갱신(아직 맵에
      실존하지 않으므로), `isHeroEnlistable`(영주/회복중이 아니고
      아직 미출전인 영웅만 예약 가능) 추가.
    - `world-entry.ts`의 `enterMapCandidate`가 이제 `enlistedHeroIds`
      인자를 받음(1~5명, 미검증 id/자격 없는 영웅이면 throw).
      `completeActiveWorld`는 끝까지 소환 안 된 `"enlisted"` 영웅도
      unit/city 배속 영웅처럼 solo로 되돌림(그 캠페인 자체가 끝났으므로).
  - `lib/game/city-actions.ts` (신규, world-entry.ts와 같은 성격 —
    SaveGame 레벨 오케스트레이터):
    - `foundCity(save, heroId, position, name, now)`: 영웅이 solo
      상태여야 함, 기존 도시들과 3hex 이상, 2번째 이후 도시는 소도시
      이상 조건 — 위반 시 throw. **설계 변경 한 번 있었음**: 처음엔
      건설한 영웅을 도시에 자동 배속(`"city"` 모드)시켰는데, 그러면
      영웅 1명뿐인 초반에 도시 1개 세운 순간 아무도 solo가 아니게
      되어 2번째 도시를 영원히 못 세우는 교착 상태가 생김(2번째 도시
      조건도 충족 못하고, 2번째 영웅 소환도 도시 2개가 있어야 하니
      둘 다 막힘). 그래서 **건설한 영웅은 건설 후에도 solo로 남고**,
      도시에 영웅을 배속하는 건 완전히 별개의 나중 행동(task 11)으로
      분리함 — `city.heroId`는 건설 직후 `null`.
    - `checkHeroSummons(save, spawnPosition, now)`: 위 소환 수식을
      계산해 적용, world가 없으면 no-op.
  - `lib/game/turn.ts`의 `endTurn`을 다시 확장 — 매턴 모든 도시를 돌며
    (1) 시설 산출량을 소속 세력 자원에 합산, (2) 생산 큐를
    `turnsRemaining -1`, 0이 되면 `createProducedUnit`으로 실제
    유닛을 만들어 `save.units`/`faction.unitIds`에 추가. 이것도
    "이미 규칙이 정해진 것만 turn.ts가 담당한다" 원칙에 맞는 확장.
  - **UI**: `HeroEnlistScreen.tsx`(신규) — 맵 후보 카드를 누르면 바로
    입장하지 않고 이 화면에서 최대 5명을 순서대로 선택(선택 시 번호
    배지 표시) 후 "이 영웅들로 진출". `GameLobbyScreen.tsx`가 후보
    클릭 시 이 화면을 거치도록 갱신. `MapPlayScreen.tsx`는 이제
    `world` 대신 `save` 전체를 받아 좌측에 "내 도시" 패널(도시별
    등급·시설 슬롯)과 "출전 영웅 N/M명 소환됨" 표시를 추가하고,
    "주둔지 건설 (테스트)" 버튼(현재 solo인 영웅으로 고정 오프셋
    위치에 건설 — 8번 항목의 실제 스폰/이동 알고리즘처럼 지도 연동
    전까지의 임시 트리거)을 footer에 추가. `foundCity`가 조건 위반으로
    throw할 수 있어 `GameEntry.tsx`의 onFoundCity는 try/catch로 감싸고
    실패 메시지를 alert로 보여줌.
  - **범위 밖으로 명시적으로 미룬 것**: (a) 외부 영역 자원 타일
    점령(사용자 스펙 4번) — Codex 지형 규칙 이후, (b) 지형 특화 연구로
    인한 병과 이동력/사거리 강화 및 개명(스펙 13번) — 지형 계약 이후,
    (c) 성 방어력(`cityWallDefenseBonus`)을 실제 전투(`combat.ts`)에
    연결하는 것 — 아직 지도에서 "도시를 공격"할 방법이 없음(8·9번과
    동일한 사유).
  - 테스트: `city.test.ts`(신규 24개), `unit-production.test.ts`
    (신규 10개), `city-actions.test.ts`(신규 10개 — 건설 교착 상태
    회귀 방지 포함), `hero.test.ts`/`turn.test.ts`에 enlisted·시설
    산출·생산 완료 케이스 추가. 전체 263개 통과, tsc/eslint 클린,
    프로덕션 빌드 성공. Playwright로 844×390에서: 후보 선택 → 영웅
    출전 화면(1명 선택, 번호 배지) → 진출 → 맵 화면(출전 1/1 소환됨,
    내 도시 0) → 주둔지 건설 테스트 버튼 → 도시 1개 표시(주둔지·시설
    0/1) → 턴 종료(2턴차로 진행, 크래시 없음) → 2번째 건설 시도 시
    조건 미충족으로 alert만 뜨고 도시 수 그대로 유지되는 것까지 확인.
- **영웅 배속 버프 공식 (2026-07-27, 작업 11번)**: GAME_VISION.md의
  "영웅이 부대와 함께 이동하면 버프, 도시에 배속되면 생산력 증가"
  원칙을 실제 수식으로 구현. 사용자가 이번엔 세부 스펙을 안 줘서
  (10번처럼 번호 목록 없이 "다음 단계 진행하자"), 기존 데이터에서
  자연스럽게 도출되는 설계로 초안 작성 — 전부 플레이테스트 전 수치,
  조정 가능.
  - `lib/game/hero-assignment.ts` (신규): 이 파일은 순수 "보너스 계산"만
    담당하고, 그 보너스를 실제로 적용하는 건 호출부(`combat.ts`,
    `turn.ts`) 몫 — 어떤 영웅이 어떤 부대/도시에 배속됐는지는
    `HeroAssignment`/`City.heroId`가 이미 알고 있으므로 이 파일은
    그 연결을 모른 채로 순수하게 유지됨.
    - `heroUnitBuff(definition)`: 부대와 동행하는 영웅은 **자기 전투
      스탯(공격력/방어력/최대체력)의 20%**를 그 부대에 더해줌
      (`heroCombatStats` 재사용, `UNIT_BUFF_FRACTION` 초안).
    - `cityYieldWithHeroBonus(baseYield, definition)`: 도시에 배속된
      영웅의 **내정특기**(`domesticSpecialties`)가 등급 1점당 시설
      산출량 +10%를 매칭되는 자원에만 적용 — 금 특기는 시장(금) 산출만,
      식량 특기는 농장(식량) 산출만 올림 ("없음"이면 배율 1, 즉 무효과).
    - `productionTurnsBonus(definition)`: 병사생산(troops) 내정특기가
      있으면(등급 무관, 있고 없고만 봄 — 초안) 매턴 생산 큐가 1턴 더
      빨리 줄어듦.
  - `combat.ts`의 `unitCombatant(unit, rider?)`가 선택적 2번째 인자로
    동행 영웅의 `HeroDefinition`을 받아 버프를 얹음 — 호출부가 실제로
    그 영웅이 이 부대에 배속돼 있는지(hero.assignment.mode==="unit" &&
    unitId 일치) 미리 확인했다고 가정 (지도/전투 트리거 UI가 아직 없어서
    SaveGame 레벨 오케스트레이터는 여전히 없음, 8·9번과 동일한 이유).
  - `turn.ts`의 `endTurn`이 매턴 각 도시의 `heroId`로 배속된 영웅을 찾아
    (`findHeroDefinition`) 시설 산출량과 생산 큐 감소량에 위 보너스를
    반영하도록 확장 — 이건 이미 살아있는 턴 훅이라 (10번 때처럼) 바로
    적용 가능했음.
  - **UI**: 도시에 영웅을 배속할 방법이 전혀 없어서(맵 클릭 UI 없음),
    `MapPlayScreen.tsx`의 도시 카드에 "영웅 배속 (테스트)" 버튼을
    임시로 추가 — 현재 solo인 영웅을 그 도시에 배속시킴(테스트 전용,
    실제 배속 UI는 지도 연동 후). 배속되면 카드에 "배속: OO" 표시.
    `GameEntry.tsx`가 `assignHeroToCity` + `city.heroId` 양쪽을 함께
    갱신(단방향으로만 하면 참조 무결성 검사에 걸림).
  - 테스트: `hero-assignment.test.ts`(신규 9개), `combat.test.ts`에
    라이더 버프 1개, `turn.test.ts`에 배속 영웅 관련 3개(생산 가속,
    안 맞는 특기는 무효과, 맞는 특기는 산출량 증가) 추가. 전체 276개
    통과, tsc/eslint 클린, 프로덕션 빌드 성공. Playwright로 844×390에서
    도시 건설 → "영웅 배속 (테스트)" 클릭 → 카드에 "배속: 감녕" 표시
    확인.
- **영웅 배속 시스템 확장 (2026-07-28, 작업 11번 후속)**: 사용자가
  이번엔 구체적 스펙을 줌 — 도시 배속 내정특기를 3종(금/식량/병사)에서
  6종으로 늘리고, 부대 동행 버프에 "병과 시너지"(궁사+사거리영웅→사거리
  공유, 기병+기병영웅→이동력 공유)를 추가하라는 요청.
  - `hero-definition.ts`의 `DomesticSpecialtyKind`가 `"gold" | "food" |
    "troops"` → `"gold" | "food" | "troops" | "iron" | "recovery" |
    "defense"`로 확장(훈련/상업/농업/채굴/회복/방어). "내정특기"라는
    필드/타입 이름은 그대로 뒀음(회복·방어는 엄밀히 "내정"은 아니지만,
    이미 쓰는 곳이 많아 이름을 다 바꾸느니 주석으로 "도시 배속 특기"로
    느슨하게 읽어달라고 남김). `app/game/heroLabels.ts`의
    `DOMESTIC_LABEL`도 6종 갱신. 기존 영웅 6명(스타팅 3 + 레전더리 3) 전부
    새 3개 필드 백필 — 스타팅은 전부 "없음", 레전더리는 서사에 맞는 값
    부여(관우→방어, 조운→회복, 제갈량→채굴 — `legendary-heroes.ts` 헤더
    주석에 근거 설명).
  - `hero-assignment.ts`에 4개 함수 신규 추가:
    - `cityDefenseBonusFromHero(definition)`: 방어 특기 등급 1점당 도시
      방어력 +5 (아직 `combat.ts`에 미연결 — "도시를 공격" UI 트리거가
      없는 건 8·9·10번과 동일한 이유. 함수는 존재·테스트만 되고 미사용).
    - `heroRegenPerTurn(definition)`: 회복 특기 등급 1점당 매턴 체력 +3.
    - `recoveryTurnsBonus(definition)`: 회복 특기가 있으면(등급 무관)
      기절한 영웅의 복귀까지 남은 턴이 매턴 1턴씩 더 빨리 줆(세력
      전체에 적용되는 flat 보너스 — 기절한 영웅은 위치가 없어서
      "회복 특기 도시 근처" 판정이 불가능하므로 이렇게 단순화).
    - `cityYieldWithHeroBonus`가 이제 금/식량뿐 아니라 철(iron)도
      매칭 — 채굴 특기 → 광산(iron) 산출.
  - **병과 시너지** — `heroUnitAssignmentBonus(definition, unitType)`
    (신규): 기존 `heroUnitBuff`(20% 고정 버프)는 그대로 두고, 그 위에
    병과별 추가 효과를 얹음. 궁사(`unitType === "archer"`)가 사거리
    특기(`rangeSpecialty !== null`)를 가진 영웅과 동행하면 그 영웅의
    사거리를 부대 사거리의 "바닥값"으로 공유(`rangeFloor`, 원래 부대
    사거리와 max 비교). 기병(`unitType === "cavalry"`)이 "기병 능력"을
    가진 영웅과 동행하면 이동력을 공유 — 단, `HeroDefinition`에
    "기병 능력"이라는 전용 필드가 없어서 이번 세션은
    `terrainSpecialties.plains`(평지 특화)를 대리 지표로 재사용(평지가
    기병의 전통적 활동 지형이고, 이미 조운이 평지 S로 설계돼 있어 서사적
    으로도 맞음 — `hero-assignment.ts` 주석에 근거 남김). 보병/공성 등
    나머지 병과는 시너지 없이 기존 20% 버프만 받음. `combat.ts`의
    `unitCombatant`가 `heroUnitBuff` 대신 `heroUnitAssignmentBonus`를
    호출하도록 교체 — `unit.unitType`을 넘겨서 시너지 여부 판정.
  - `turn.ts`가 방어/회복 보너스를 실제로 반영하도록 확장:
    - 매턴 도시별 배속 영웅의 `heroRegenPerTurn`을 계산해 "회복 스팟"
      목록을 만들고, 그 도시 위치에 정확히 겹쳐 있는 부대(faction 일치
      + hex 좌표 일치)와, 그 도시에 배속된(city 모드) 영웅 본인의 체력을
      회복시킴 — "영역 내"라는 표현을 실제 영역(반경) 시스템이 없어서
      "도시 좌표와 정확히 일치"로 단순화한 이번 세션의 근사치(주석에
      명시, 나중에 진짜 영역 시스템이 생기면 교체 대상).
    - 회복 특기가 하나라도 있는 세력은 그중 최대 `recoveryTurnsBonus`
      값을 그 세력의 기절한 모든 영웅에게 매턴 추가 적용
      (`tickHeroRecovery`가 `extraTurns` 파라미터를 새로 받도록 확장).
    - 방어 보너스는 여전히 미연결(위 참고).
  - **UI**: 6개 특기 모두 `Object.entries(domesticSpecialties)`를
    "없음" 필터링하며 순회하는 기존 방식(`HeroSelectScreen.tsx`,
    `HeroDetailScreen.tsx`)이라 코드 변경 없이 자동으로 새 특기까지
    표시됨 — Playwright로 844×390 영웅 선택 화면에서 확인("내정: 훈련
    B", "내정: 상업 B · 농업 B" 등 정상 표시, 레이아웃 깨짐 없음).
  - 테스트: `hero-assignment.test.ts`에 병과 시너지 6개 + 방어/회복
    관련 6개 신규(총 22개), `turn.test.ts`에 회복 특기 통합 테스트
    4개 신규(도시 위치의 부대 회복 / 다른 위치는 무효과 / 배속된 영웅
    본인 회복 / 세력 내 기절 영웅 복귀 가속). 전체 292개 통과,
    tsc/eslint 클린, 프로덕션 빌드 성공.
- **영웅 데이터 모델 정리 (2026-07-28)**: 사용자가 "영웅 정보 정리가
  필요해보이네"로 5가지 방향 제시. 능력치(통솔/무력/지력/체력/매력)와
  내정특기(6종)는 "그대로 좋아"로 확인만 하고 코드 변경 없음. 실제
  변경은 아래 두 가지 필드 교체 + 영주효과 방향 확정(문서만, 코드는
  task 13에서).
  - **지형특기 → 병과특기**: `hero-definition.ts`의 `terrainSpecialties`
    (수중/산악/평지/늪지, +50% 이동 보너스 개념)를 완전히 폐기하고
    `unitTypeSpecialties: Record<HeroUnitTypeKind, SpecialtyGrade>`로
    교체. `HeroUnitTypeKind`는 `research.ts`의 `TroopResearchKind`
    (보병/궁병/기병/공성) 별칭 — 사용자 방향("병사의 병과와 공통성을
    주는게 좋을것 같음")대로 병사 병과와 이름을 공유. 사용자가 예시로
    든 수군/산악병은 그런 병사 병과 자체가 아직 없어서(research.ts에
    없음) 이번 범위 밖 — 나중에 그 병과가 실제 Unit 타입으로 생기면
    `TroopResearchKind`에 추가하는 순간 여기도 자동으로 따라옴.
    부수 효과: task 11 후속에서 "기병 능력" 전용 필드가 없어
    `terrainSpecialties.plains`를 대리 지표로 썼던 것(주석에 "대리
    지표"라고 명시했던 그 부분)이, 이제 `unitTypeSpecialties.cavalry`를
    직접 읽는 것으로 정리됨 — `hero-assignment.ts`의 기병 시너지 로직이
    더 이상 대리 지표를 쓰지 않음.
  - **사거리 → 특기(traits)**: `rangeSpecialty: 2 | 3 | 4 | null`(고정값)를
    폐기하고 `traits: Record<TraitKind, SpecialtyGrade>`로 교체.
    `TraitKind = "ranged" | "charge" | "magic"` (원사/돌격/요술 — 사용자
    예시 그대로, "등"이 더 있을 수 있음을 시사하지만 이번엔 이 3개만).
    `traitRange(traits)`가 `ranged` 등급에서 사거리 숫자를 산출
    (`없음`→근접/null, 등급 1점당 사거리 +1 — 등급→숫자 매핑은 플레이
    테스트 전 초안). `heroCombatStats`가 이제 `rangeSpecialty` 대신
    `traits` 전체를 받아 내부에서 `traitRange` 호출. 돌격/요술은 아직
    아무 효과도 없음(자리만 마련) — 모든 영웅이 "없음". 원사도 기존
    6명 전부 이전 rangeSpecialty가 null(근접)이었으므로 그대로 "없음"
    유지, 임의로 원거리 영웅을 새로 만들지 않음.
  - 레전더리 3명에 새 `unitTypeSpecialties` 실값 부여(스타팅 3명은
    task 11 패턴 그대로 전부 "없음"): 관우 → 보병(총사령관 이미지),
    조운 → 기병(이전 terrainSpecialties.plains S였던 자리를 그대로
    승계 — hero-assignment.ts 기병 시너지의 데모 영웅), 제갈량 → 궁병
    (연노 개량과 가장 가까운 병과). 근거는 `legendary-heroes.ts` 헤더
    주석 참고.
  - **영주효과 방향 확정 (문서만, task 13 코드는 아직)**: 사용자 확인 -
    영주 효과는 "맵상에서의 능력이 아닌" 것 - 즉 heroCombatStats 같은
    전투/이동 수치가 아니라, 클리어한 맵이 매턴 생산하는 자원의 "양"을
    영웅 등급에 따라 늘려주는 효과여야 함. `hero.ts`의 governor 배속
    모드 주석에 이 방향을 명시적으로 기록 — 어떤 자원인지·정확한
    공식은 여전히 미정, task 13 착수 시 참고.
  - 영향받은 다른 파일들(전부 필드명만 갈아끼움, 로직 변화 없음):
    `combat.ts`(`heroCombatant`), `turn.ts`(회복 관련 두 곳),
    `new-game.ts`(초기 체력 계산), `movement.ts`(스테일해진 지형특기
    주석 정리 — 이동 보너스는 이제 hero-assignment.ts의 기병 시너지가
    맡는다고 갱신), `heroLabels.ts`(`TERRAIN_LABEL` → `UNIT_TYPE_LABEL`
    + `TRAIT_LABEL`), `HeroSelectScreen.tsx`/`HeroDetailScreen.tsx`
    ("지형"/"사거리" 표시 줄 → "병과"/"특기" 표시 줄, 기존
    "없음"-필터링 후 join하는 패턴 그대로 재사용).
  - 테스트: `hero-definition.test.ts`에 `traitRange`용 신규 테스트 +
    기존 range 테스트 전부 traits 기반으로 갱신, `legendary-heroes.test.ts`
    에 3명 병과 확인 테스트 신규, `hero-assignment.test.ts`의 시너지
    테스트 전부 unitTypeSpecialties/traits 기반으로 갱신. 전체 294개
    통과, tsc/eslint 클린, 프로덕션 빌드 성공. Playwright로 844×390 +
    780×360에서 영웅 선택 화면 확인 — 스타팅 3명은 병과/특기 전부
    "없음"이라 그 줄 자체가 안 보이는 게 정상(내정 특기 줄만 표시),
    레이아웃 깨짐 없음.
- **세계 진행: 정복/계승 (2026-07-28, 작업 12번)**: 사용자가 3가지 방향
  확정 - (1) 적세력 수도(첫 도시) 점령 시 그 세력 패배, 맵의 모든 적세력
  패배 시 클리어, 항복도 패배로 침(그로기 상태인 적을 억지로 정복할
  필요 없이 항복 이벤트로 스트레스 감소), (2) AI 세력 능력치는 맵
  유형/크기에 따라 추후 결정, (3) AI 세력도 턴제로 순서대로 움직이되
  구체적 행동은 추후 논의. (2)/(3)은 명시적으로 미룬 사안이라 이번엔
  손대지 않음 - 대신 (1)을 실제로 검증 가능하게 만드는 데 필요한 최소한의
  "AI 세력 존재"만 채움(수도 하나뿐, 스탯·유닛·행동 전혀 없음).
  - `faction.ts`의 `Faction`에 `capitalCityId`(첫 도시, null이면 아직
    없음)와 `eliminationReason: "captured" | "surrendered" | null` 추가.
    `isFactionEliminated(faction)` 헬퍼. `city-actions.ts`의 `foundCity`가
    플레이어 세력의 첫 도시 건설 시 `capitalCityId`를 자동으로 채움(그
    이후엔 안 바뀜 - 테스트로 확인).
  - `city.ts`에 `captureCity(city, capturingFactionId)` 추가 - 순수 소유권
    이전(+배속 영웅 해제, 그 영웅은 더 이상 이 도시 주인 세력 소속이
    아니므로). `world-progress.ts`(신규)의 `captureEnemyCity(save, cityId,
    capturingFactionId, now)`가 SaveGame 레벨에서 실제로 도시를
    양쪽 `cityIds`에서 옮기고, 점령당한 도시가 그 세력의 수도였다면
    `eliminationReason: "captured"`로 표시하고, 배속돼 있던 영웅은 solo로
    복귀시킴. `isWorldConquered(world, factions)`는 플레이어를 제외한
    `world.factionIds`의 모든 세력이 격파(어떤 사유든)됐는지 확인.
    `turn.ts`의 `endTurn`이 매턴 이 값을 재계산해서 `world.conquered`에
    반영(그동안 스키마엔 있었지만 실제로 아무도 채우지 않던 필드).
  - **항복 메커니즘은 상태 전이 함수만 존재**: `surrenderFaction(faction)`
    이 `eliminationReason: "surrendered"`로 표시하는 순수 함수로 존재하고
    테스트도 있지만, 어디서도 호출하지 않음 - "언제 AI가 항복을
    결정하는가"는 AI 세력 능력치(방향 2번, 추후 논의) 없이는 판단할 수
    없는 값 비교이기 때문. `cityDefenseBonusFromHero`가 전투 트리거가
    없어서 미연결로 남았던 것과 같은 패턴의 공백.
  - **AI 세력 최소 스캐폴딩**: `world-entry.ts`의 `enterMapCandidate`가
    이제 맵 진입 시 `MAP_TIER_INFO[mapTier].factions - 1`개의 "적 세력"을
    실제로 생성 - 이름과 수도 도시 하나만 있고, 유닛도 스탯도 행동도
    없음. 오직 위 (1)번 정복 판정을 실제로 눌러볼 수 있게 하려는
    최소한의 존재 - 사용자가 명시적으로 미룬 "맵 유형/크기별 AI 능력치"
    (방향 2번)나 "AI 턴 행동"(방향 3번) 시스템이 아님, 그 두 가지가
    확정되면 이 자리를 실제 AI 생성 로직으로 교체하면 됨. 수도 위치는
    `DEFAULT_SPAWN_POSITION`과 같은 이유로 flat한 placeholder 오프셋
    (지형 데이터 연동 전까지). `completeActiveWorld`는 기존 로직 그대로
    (플레이어 세력만 남기고 나머지 전부 폐기)라 별도 수정 없이 적 세력도
    같이 정리됨.
  - **UI**: `MapPlayScreen.tsx`에 "적 세력" 패널(내 도시 패널과 나란히) -
    격파 안 된 세력마다 "적 수도 점령 (테스트)" 버튼(실제 지도에서
    "도시를 공격"할 방법이 없는 것과 같은 이유로 임시 - 8·9·10·11번과
    동일한 공백), 격파된 세력은 "격파됨"(항복이면 "격파됨 (항복)")만
    표시. 헤더에 "적 세력 N/M 격파" 카운트 추가. 기존 "정복 완료
    (테스트)" 버튼은 이제 진짜 `world.conquered`로 게이트됨(더 이상
    무조건 클릭 가능한 테스트 버튼이 아님) - 라벨에서 "(테스트)" 제거.
  - 테스트: `faction.test.ts`(신규), `city.test.ts`에 `captureCity` 3개,
    `world-progress.test.ts`(신규, `isWorldConquered`/`surrenderFaction`/
    `captureEnemyCity` 전부), `world-entry.test.ts`에 AI 세력 생성/정리
    검증 3개, `city-actions.test.ts`에 `capitalCityId` 검증 1개,
    `turn.test.ts`에 `world.conquered` 재계산 검증 2개. 전체 318개 통과,
    tsc/eslint 클린, 프로덕션 빌드 성공. Playwright로 844×390 + 780×360
    모두 확인: 맵 진입(적 세력 1개 생성, 미니 등급) → "적 수도 점령
    (테스트)" 클릭 → 내 도시로 편입 + 적 세력 패널에서 "격파됨" 표시 +
    헤더 "적 세력 1/1 격파" → "정복 완료" 버튼이 활성화되어 클릭 가능 →
    로비로 복귀(클리어맵 레일에 "정복 완료" 표시, 새 후보 2개 모두
    "적 세력 3개"로 다음 단계 크기 반영) 확인. 가로 스크롤 없음.
- **적 세력 항복 테스트 버튼 추가 (2026-07-28, 작업 12번 후속)**: 사용자
  요청 - Codex의 맵 생성 엔진이 아직 완성되지 않아 지형/전투를 통해 실제로
  적 수도를 무력 점령하는 흐름을 눈으로 확인할 방법이 없으니, 항복 경로
  (12번 방향 1번의 두 번째 패배 조건)도 "적 세력 항복 (테스트)" 버튼으로
  바로 눌러볼 수 있게 해달라는 것.
  - `world-progress.ts`에 `surrenderRivalFaction(save, factionId, now)`
    추가 - 기존 `surrenderFaction`(순수 함수, 이미 있었음)의 SaveGame
    레벨 래퍼. 해당 세력의 `eliminationReason`을 "surrendered"로 표시하고
    `world.conquered`를 재계산만 함 - 점령과 달리 도시를 아무것도 옮기지
    않음(항복은 힘으로 빼앗는 게 아니라 그냥 포기하는 것이므로). 세계가
    없거나, 대상 세력이 없거나, 플레이어 자기 자신을 항복시키려 하면
    throw.
  - **여전히 "진짜 AI 판단"은 아님**: 이 버튼은 클릭하면 무조건 성공 -
    "언제 AI가 항복해야 하는가"를 결정할 AI 전력 비교 시스템(12번 방향
    2번, 추후 논의)이 없다는 공백은 그대로이고, 이번엔 거기에 더해
    "맵이 없어서 무력 점령 자체를 시연할 방법이 없다"는 공백까지 겹쳐서
    임시 버튼으로 둘 다 우회한 것. `world-progress.ts` 모듈 주석에 이
    맥락을 남겨둠 - Codex의 지형 엔진과 AI 전력 시스템이 모두 준비되면
    이 버튼은 실제 판정 로직으로 교체되어야 함.
  - `MapPlayScreen.tsx`: 격파 안 된 적 세력 카드마다 "적 수도 점령
    (테스트)" 아래에 "적 세력 항복 (테스트)" 버튼 추가(세로로 쌓임).
    `GameEntry.tsx`에 `onSurrenderFaction` 핸들러 연결(실패 시 alert,
    기존 `onCaptureCity`와 동일 패턴).
  - 테스트: `world-progress.test.ts`에 `surrenderRivalFaction` 8개 신규
    (항복 표시, 도시 안 건드림, 마지막 세력 항복 시 `world.conquered`
    true, 다른 세력 남아있으면 false, 세계 없음/세력 없음/플레이어 자신
    대상 throw 3개, 순수함수 확인). 전체 326개 통과, tsc/eslint 클린,
    프로덕션 빌드 성공. Playwright로 844×390 + 780×360 확인 - "적 세력
    항복 (테스트)" 클릭 → "격파됨 (항복)" 표시 + 헤더 카운트 갱신 +
    "정복 완료" 활성화, 내 도시 목록은 그대로(0개, 도시를 뺏지 않으므로)
    까지 확인. 가로 스크롤 없음.

- **`lib/game`/`app/game` 정리 + `lib/integration` 신설 (2026-07-28, Codex
  핸드오프 대응)**: Codex가 `main`에 `lib/world/**`(지형 생성 엔진 기반)를
  분리하고 `docs/WORLD_ENGINE_ARCHITECTURE.md`/`docs/CLAUDE_HANDOFF.md`로
  경계를 문서화함에 따라, 그 문서의 요구사항에 맞춰 Claude 브랜치를
  점검·정리함. **`main`은 아직 이 브랜치에 병합하지 않음** (사용자 지시,
  지형 ID/`WorldMapSnapshot`/이동비용 계약/생성기 버전 정책이 확정될
  때까지 보류).
  - 점검 결과: `lib/game`는 이미 React/Three.js/`app/world-prototype.tsx`를
    import하지 않고 있었고(주석에서만 언급), 자체 지형 ID 목록도 없었으며
    (`movement.ts`가 이미 지형을 모르는 콜백 구조), hex 좌표계도 처음부터
    렌더러와 동일한 odd-r 컨벤션으로 독립 구현돼 있어 — 규칙 위반은
    없었음. 화면(`app/game/screens/*`)도 게임 로직을 재구현하지 않고
    `lib/game` 함수만 호출하는 구조 그대로였음.
  - 유일하게 빠져 있던 것: `docs/CLAUDE_HANDOFF.md` 3번 항목("lib/integration
    아래 어댑터 경계 추가")에 해당하는 실제 디렉터리. `lib/integration/`을
    신설하고, `movement.ts`에 인라인으로 있던 `MovementCost` 타입을
    `lib/integration/movement-cost.ts`로 옮김(movement.ts는 재수출만 함,
    기존 사용처는 이 파일 하나뿐이라 import 변경 영향 없음). 아직 연결되지
    않은 지형 계약(지형 카테고리, 영웅/부대 스폰 위치, 외부 자원 타일,
    `MapTypeId`/`MapTierId` 손동기화)은 코드 곳곳에 흩어져 있던 주석을
    `lib/integration/README.md` 하나로 모아 인덱스화함 — 인터페이스를
    미리 만들지는 않음(규칙이 아직 없는 상태에서 만들면 그것 자체가
    "확정 안 된 계약"이 되므로).
  - 이동/변경 파일: 신규 `lib/integration/movement-cost.ts`,
    `lib/integration/README.md`; 수정 `lib/game/movement.ts`(타입 import로
    교체, 로직 변경 없음). `lib/game`/`app/game`의 다른 파일은 변경 없음.
  - 테스트: 기존 326개 그대로 통과(로직 변경이 없으므로 신규 테스트는
    추가하지 않음), `pnpm run build`/`tsc --noEmit`/`eslint` 모두 클린
    (`app/world-prototype.tsx`/`db/index.ts`/`worker/index.ts`의 기존
    경고·에러는 Claude 소유 범위 밖이라 그대로 둠).
  - **남은 연동 질문** (`lib/integration/README.md`에도 기록): (1) 지형
    카테고리 이름을 `lib/world`의 `CoastKind`/클러스터 타입을 그대로 쓸지
    별도 매핑할지, (2) 영웅/부대 스폰 위치 산정에 필요한 실제 지형+세력
    좌표 데이터, (3) 도시 밖 자원 타일 점령 매커니즘, (4) `MapTypeId`/
    `MapTierId`를 `lib/world/config`에서 직접 import하도록 바꿀 시점 —
    전부 `main` 병합 시점 또는 그 직전에 결정 필요.

- **영웅 "부대 편승" 기능 제외 + 고정 병과 도입 (2026-07-28)**: 사용자가
  Codex와 맵 생성·캐릭터 배치 작업을 진행하며 방향을 정정함 - 영웅을
  부대(Unit)에 태워 함께 이동시키는 기존 기능(task 11의 `HeroAssignment`
  `"unit"` 모드 + 그 버프/시너지)을 제외하고, **영웅도 병사처럼 고정
  병과(보병/궁병/기병/공성) 하나를 가지며 부대와 완전히 독립적으로
  이동**하는 방식으로 변경. 세부 결정(사용자 확인): 병과는 병사처럼
  고정 1개, `Unit.heroId`는 완전히 제거, 원거리 여부는 병과가 궁병(및
  공성)이면 자동으로 정해짐(기존 `traits.ranged` 특기를 대체).
  - `hero.ts`: `HeroAssignment`에서 `{mode:"unit", unitId}` 제거,
    `isHeroWithUnit`/`assignHeroToUnit` 삭제. 남은 모드는 5개(solo/city/
    governor/recovering/enlisted).
  - `hero-definition.ts`: `unitTypeSpecialties`(4개 병과 각각 등급) ->
    `unitType: HeroUnitTypeKind`(고정 1개)로 교체. `TraitKind`에서
    `"ranged"` 제거(`"charge"`/`"magic"`만 남음, 여전히 미사용
    placeholder). `heroCombatStats`가 이제 `traits` 대신 `unitType`을
    받아 `range`를 `unit-production.ts`의 `UNIT_TYPE_CATALOG`에서 직접
    읽음(병사와 동일 기준) - `traitRange` 함수는 삭제. 새 함수
    `heroBaseMovement(unitType)`도 같은 카탈로그에서 이동력을 읽어
    영웅 단독 이동 시 그대로 쓸 수 있게 함(task 8 로그의 "영웅 이동력
    미정" 공백을 이걸로 해소 - 실제 지도 연동 시 movement.ts에 그대로
    투입 가능).
  - `unit.ts`: `Unit.heroId` 필드 삭제(더 이상 영웅이 탈 수 없으므로).
  - `combat.ts`: `unitCombatant`가 `rider` 인자를 받지 않게 됨(단순히
    유닛 자기 스탯만 반환). `heroCombatant`는 `heroCombatStats`에
    `definition.unitType`을 넘기도록 갱신.
  - `hero-assignment.ts`: unit rider 버프/시너지 관련 전부 삭제
    (`heroUnitBuff`, `heroUnitAssignmentBonus`, `UnitBuff`,
    `UnitAssignmentBonus`, `ZERO_UNIT_BUFF`) - 도시 배속 보너스
    함수들(`cityYieldWithHeroBonus` 등, task 11)은 그대로 유지.
  - `save.ts`: `"unit"` 모드 관련 무결성 검사 전부 삭제, `Unit`/`City`
    shape 검사를 `checkUnitShape`/`checkCityShape`로 분리(City만
    `heroId` 필드를 가지므로).
  - `starting-heroes.ts`/`legendary-heroes.ts`: 기존에 이미 골라뒀던
    "주 병과"(관우 infantry/조운 cavalry/제갈량 archer)를 그대로
    `unitType`으로 승격. 시작 영웅 3명도 같은 아키타입-병과 대응 규칙으로
    신규 배정(위연 general→infantry, 감녕 warrior→cavalry, 서서
    strategist→archer).
  - UI: `HeroSelectScreen`/`HeroDetailScreen`의 "병과" 표시를 등급 목록
    나열에서 고정 병과 1개 표시로 단순화.
  - 테스트: 관련 유닛 테스트 16개 삭제(unit rider 버프/시너지 전용),
    `heroCombatStats`의 range-by-unitType과 신규 `heroBaseMovement`에
    테스트 추가. 전체 311개 통과, tsc/eslint/프로덕션 빌드 클린.

- **능력치 표시 순서 확정 + 노출된 6명 병과 사용자 직접 지정 (2026-07-28)**:
  - 능력치 표시 순서를 통솔력→무력→지력→체력→매력으로 고정
    (`HeroDetailScreen.tsx`는 데이터 객체의 필드 순서에 우연히 의존하고
    있었어서, 명시적 `ATTRIBUTE_ORDER` 배열로 교체 - `HeroSelectScreen.tsx`도
    같은 순서로 정정).
  - 사용자가 노출된 영웅 6명의 실제 병과를 직접 지정: 감녕 보병(기존
    cavalry에서 정정), 위연 보병, 서서 궁병(둘 다 기존값과 일치), 관우
    기병(기존 infantry에서 정정), 조운 기병(기존값과 일치).
  - **제갈량은 "책사"로 지정됨 - 기존 4개 병과(보병/궁병/기병/공성) 밖의
    완전히 새로운 병과** (판타지 마법사 계열: 근접 공격 없음, 마법형
    공격/회복). 사용자가 "추후 상세 논의 필요"라고 명시 - 지금
    `UNIT_TYPE_CATALOG`에 대응 항목이 없어서 바로 반영하면
    `heroCombatStats`/`heroBaseMovement`가 값을 못 찾아 런타임 에러가 나므로,
    설계가 나올 때까지 `legendary-heroes.ts`에 archer를 임시값으로 남기고
    TODO 주석으로 표시함. **"책사" 병과 설계는 여전히 열린 항목** - 이동력
    (있는지 없는지), 사거리, 마법 공격/회복의 실제 수치·발동 조건 전부 미정.
  - 테스트: `legendary-heroes.test.ts`의 unitType 검증을 관우/조운만
    확인하도록 수정(제갈량은 확정값이 아니므로 제외). 전체 311개 통과,
    tsc/eslint/프로덕션 빌드 클린.

- **라우트 재배치: 게임을 루트로, Codex 프로토타입을 `/world-lab`으로
  (2026-07-30, main 병합 직후)**: 사용자가 향후 모바일 앱(안드로이드 우선)
  전환을 준비하면서, 앱의 기본 화면(루트)이 실제 게임이어야 한다고 판단함
  - 지금까지는 반대로 루트가 Codex의 지형 생성 프로토타입이고 게임은
  `/game`에 숨어있었음.
  - `lib/game`/`app/game`의 실제 파일 위치는 건드리지 않음(소유권 경계 유지,
    화면 파일들의 상대경로 import도 그대로) - `app/page.tsx`가 이제
    `./game/GameEntry.tsx`를 렌더링하도록 바꾸고, `app/game/page.tsx`(라우트
    파일)는 삭제, 대신 새 `app/world-lab/page.tsx`가 `WorldPrototype`을
    렌더링함.
  - `app/layout.tsx`의 공용 `<title>`/설명이 "세계 생성 실험실"(프로토타입
    문구)이었던 걸 게임 자체를 설명하는 문구로 교체 - `/world-lab`은 페이지
    자체 `metadata`로 예전 제목을 유지하도록 별도 지정.
  - `tests/rendered-html.test.mjs`를 루트(이제 게임)/`/world-lab`(이제
    프로토타입) 두 라우트 각각 검증하도록 재작성.
  - **Codex 참고**: 프로토타입 개발 중이던 주소가 `/`에서 `/world-lab`으로
    바뀌었습니다. `world-prototype.tsx` 파일 자체나 그 안의 로직은 전혀
    건드리지 않았습니다 - 순수 라우팅 변경입니다.
  - 검증: `pnpm run build`(Next.js, 엄격한 tsc 포함) 성공,
    `tests/rendered-html.test.mjs` 2/2 통과, `pnpm run test:game` 311/311
    통과, lint는 기존과 동일하게 `app/world-prototype.tsx`/
    `components/world/TestHeroPanel.tsx`의 사전 존재 문제만 남음.

- **Vercel 자동배포 연결 확인 (2026-07-30)**: `main`에 커밋이 여러 개
  쌓였는데도 배포 사이트(`world-in-hero.vercel.app`)가 계속 예전 화면을
  보여줘서 확인해보니, Vercel 프로젝트에 **GitHub 저장소 연결 자체가
  안 돼 있었음** (Settings → Git이 비어있는 상태 - 배포 이력도 최초 1건
  뿐이었음). 사용자가 저장소 연결 후 "Redeploy"를 눌렀지만 그건 최신
  커밋을 새로 가져오는 게 아니라 기존 배포를 그대로 재실행하는
  기능이라 여전히 예전 화면이 떴고, 빈 커밋(`6e77d57`)을 push하니
  정상적으로 최신 상태가 자동 배포됨을 확인. 이제부터는 `main`에 push할
  때마다 자동 반영됨 - 향후 세션(Claude·Codex 누구든)은 이 절차를
  다시 밟을 필요 없음.

- **게임 이름 확정: "영웅스토리" (2026-08-05)**: 사용자가 화면을 하나씩
  검토하는 과정에서 임시명 "World in Hero"를 "영웅스토리"(Hero Story,
  약어 영스)로 교체. 이름 후보를 여럿 검토하면서 실제 검색으로 기존
  게임과 겹치는지 확인함 - "영웅전"은 넥슨의 "마비노기 영웅전", "백영웅전",
  "영웅전설" 시리즈와 겹쳐서 제외, "영웅스토리"는 겹치는 게임 없음을 확인
  후 확정. 화면 텍스트(`TitleScreen.tsx`/`GameLobbyScreen.tsx`), 공용
  페이지 제목(`app/layout.tsx`), `/world-lab` 페이지 제목, `README.md`/
  `docs/GAME_VISION.md` 제목, 렌더링 테스트 문자열을 전부 교체. Codex
  소유 파일(`app/world-prototype.tsx`)의 헤더 텍스트 한 줄과 Codex 문서
  2개(`PLAYER_MANUAL_DRAFT.md`/`PROJECT_PROGRESS.md`)의 제목도 이름
  표기만 맞춰 바꿈(그 외 내용은 전혀 안 건드림 - 자세한 내용은
  `docs/CLAUDE_HANDOFF.md`의 "게임 이름 확정" 항목 참고). `package.json`
  내부 패키지명과 이력 문서의 옛 이름 언급은 의도적으로 유지.
  검증: 전체 311개 테스트 통과, 렌더링 테스트 2/2 통과, 빌드 성공.

- **클라이언트 오류 로깅 시스템 신설 (2026-08-05)**: 사용자가 플레이/테스트
  중 발생하는 오류를 사용자에게는 안 보이면서 개발자(사용자+Claude+Codex)만
  나중에 확인할 수 있게 해달라고 요청. 게임 로직이 거의 전부 브라우저에서
  돌아가는 구조(서버/DB 없음, `docs/DEPLOYMENT_MIGRATION.md` 참고)라 서버
  로그만으로는 클라이언트 오류를 못 잡는다는 문제를 해결하기 위해, 클라이언트
  오류를 서버로 보내서 Vercel Runtime Logs(대시보드의 Observability 탭)에
  찍히게 하는 방식을 택함 - 새 외부 서비스 계정 없이 이미 연결된 Vercel만
  사용.
  - `app/api/log-error/route.ts` (신규): 클라이언트가 POST하는 오류를
    받아서 `console.error`로 한 줄 JSON을 찍기만 하는 라우트. 자체 저장소
    없음 - Vercel이 이미 로그를 보관/조회해줌.
  - `app/game/reportError.ts` (신규): `reportClientError(error, {screen,
    action})` - 위 라우트로 best-effort beacon 전송(`keepalive: true`,
    실패해도 절대 다시 throw 안 함).
  - `app/game/GameErrorBoundary.tsx` (신규): 렌더링 중 에러를 잡는 React
    Error Boundary. 잡히면 오류를 보고하고, 흰 화면 대신 "문제가
    발생했습니다 + 새로고침" 버튼을 보여줌 - 베타 테스트 중 UX도 같이
    개선.
  - `GameEntry.tsx`: `window.onerror`/`unhandledrejection` 전역 리스너 추가
    (렌더링 밖에서 나는 에러까지 커버), 전체 화면을 `GameErrorBoundary`로
    감쌈, 기존에 `catch`해서 `window.alert`만 띄우던 3곳(도시 건설/점령/
    항복)에도 `reportClientError` 호출 추가 - 사용자에게 안내는 그대로
    뜨되 이제 로그에도 남음.
  - **주의**: `useEffect` 밖(렌더 중)에서 `ref.current`를 직접 수정하는
    코드를 처음에 짰다가 `react-hooks/refs` 린트 에러가 나서(정확히
    `app/world-prototype.tsx`에 있던 것과 같은 문제) - ref 없이 매
    화면전환마다 리스너를 다시 등록하는 방식으로 교체함(리스너 2개
    추가/제거뿐이라 비용 거의 없음).
  - 검증: `curl`로 `/api/log-error`에 직접 POST해서 로컬 dev 서버 터미널에
    `[client-error] {...}` 한 줄로 찍히는 것까지 실제 확인. 전체 311개
    테스트, 렌더링 테스트 2/2, 빌드/린트(기존 사전 존재 문제 10개 제외)
    전부 통과.
  - **사용자 확인 방법**: Vercel 대시보드 → 프로젝트 → **Observability**
    (또는 Logs) 탭에서 `client-error`로 검색하면 실제 플레이 중 난 오류를
    볼 수 있음.

- **게스트/계정 연결 + 클라우드 백업 (Supabase)**: 설정 화면(`app/game/
  screens/SettingsScreen.tsx`)에 사용자가 지정한 그대로 두 메뉴 —
  "저장 데이터 백업"(체크박스, 스테이지 클리어시 자동백업) / "저장 데이터
  복원". 계정 구조는 사용자 확정안대로 **모든 플레이어가 처음부터 익명
  guest 세션**을 갖고(로그인 화면 없이, `GameEntry`가 마운트 시
  `ensureGuestSession()` 호출), **이메일/비밀번호를 연결(link)한 뒤에만**
  백업/자동백업이 활성화됨.
  - `app/game/supabaseClient.ts` — `NEXT_PUBLIC_SUPABASE_URL`/
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` 환경변수가 없으면 `supabase`가
    `null` (로컬에서 설정 안 해도 앱이 죽지 않음, 백업/복원만 비활성화).
  - `app/game/account.ts` — `ensureGuestSession`(익명 로그인),
    `getAccountStatus`(guest vs 연결된 이메일), `linkAccountWithEmail`
    (익명 세션을 그대로 승격 — `auth.updateUser`라 user_id 유지, 기존
    백업이 끊기지 않음), `signInWithEmail`(다른 기기에서 이미 연결된
    계정으로 로그인), `backupSaveSlot`/`listCloudBackups`/
    `restoreCloudBackup`. 복원된 데이터는 로컬 저장과 동일하게
    `parseSaveGame`(JSON+모양+무결성 검증)을 통과해야만 신뢰함 — 클라우드
    JSON도 손상된 localStorage와 마찬가지로 신뢰하지 않는 외부 데이터로
    취급.
  - Supabase 테이블/RLS: `supabase/schema.sql`에 실제 실행한 SQL 보관
    (`saves` 테이블, `user_id = auth.uid()` 정책 — 보안 경계는 anon key가
    아니라 RLS).
  - `GameEntry.tsx`: `"settings"` 화면 추가, 메인 메뉴의 설정 버튼과
    로비 화면(`GameLobbyScreen`)의 ⚙ 버튼 모두 여기로 연결(둘 다 기존엔
    "아직 만들어지지 않았습니다" alert였음). 자동백업 켜짐 + 계정
    연결됨 상태에서 `onCompleteWorld`(세계 정복 완료) 시점에
    `backupSaveSlot` 자동 호출.
  - **주의**: 이 샌드박스 환경의 아웃바운드 프록시가 `*.supabase.co`도
    차단해서(Vercel/Cloudflare와 동일한 제약) 실제 Supabase 호출을 여기서
    라이브로 테스트할 수 없었음 — 빌드/린트/전체 테스트(311개)는 통과,
    Playwright로 설정 화면 진입까지는 콘솔 에러 없이 확인. **사용자가
    실제 배포(Vercel)에서 계정 연결/백업/복원을 한 번씩 확인해줘야 함.**
  - Vercel에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    환경변수 등록 필요(프로젝트 설정 → Environment Variables) — 값은
    사용자가 Supabase 대시보드에서 이미 확보해둔 URL/anon key.
  - **실사용 중 반복 수정된 부분** (실제 배포에서 사용자가 계정 등록/
    로그인/백업/복원을 직접 테스트하며 발견): 설정 화면을 "계정" /
    "데이터 관리"(체크박스+백업+복원을 한 박스에) 두 그룹으로 재구성,
    "계정 연결"→"계정 등록"(이메일→비밀번호→완료 안내를 팝업 모달로
    단계별 진행), 로그인은 별도 버튼 없이 폼이 바로 노출되고 입력 전엔
    로그인 버튼 비활성, 로그인 성공 시 계정 이메일 + 로그아웃 버튼만
    표시. Supabase 에러 메시지를 한글로 매핑(`translateAuthError`).
    `ensureGuestSession`이 `getSession()`(로컬만 확인) 대신
    `getUser()`(서버 검증)를 써서, 대시보드에서 유저를 수동 삭제해도
    다음 로드 때 자동으로 새 게스트 세션을 만들어 자체 복구.
  - **클라우드 백업 모델을 슬롯별 → 타입별로 변경**: 처음엔
    `(user_id, slot_id)`별로 백업 행을 저장했으나, 실사용 흐름상 계정당
    "최신 자동백업 1개 + 최신 수동백업 1개"만 있으면 충분하다고 판단해
    `saves` 테이블 PK를 `(user_id, backup_type)`(`'auto' | 'manual'`)로
    변경(`supabase/schema.sql`도 갱신 — 기존에 슬롯별 스키마를 이미
    적용했다면 `drop table if exists public.saves;` 후 재실행 필요).
    복원 화면은 상시 노출되는 목록이 아니라, [복원] 클릭 → 경고 확인
    팝업(예/아니오) → 백업 목록("(자동저장)"/"(수동백업)" + 타임스탬프)
    → 항목 선택 후 재확인 팝업 → 복원 실행 → "복원이 완료되었습니다"
    순서의 모달 흐름으로 구현(`SettingsScreen.tsx`의
    `RestoreDataModal`). 백업 완료/실패 메시지는 화면 하단이 아니라 각
    버튼 바로 아래에 표시.

## 진행 상황

- [x] 1. 시스템 코드 폴더 구조 및 기본 타입 스캐폴딩 — `lib/game/hex.ts` +
      테스트, `npm run test:game` 스크립트 추가
- [x] 2. 핵심 데이터 모델 설계 (영웅/부대/도시/세력/세이브)
- [x] 3. 기본 제공 영웅 3명 데이터 작성 — `lib/game/starting-heroes.ts` (감녕/위연/서서, 평균 B등급), 관우/조운/제갈량은 `lib/game/legendary-heroes.ts`(상위 등급 풀)로 이동
- [x] 4. 로컬 저장/불러오기 시스템 구현 — `lib/game/save.ts`(모양·무결성 검증) + `lib/game/storage.ts`(KeyValueStorage 추상화, 저장/불러오기/삭제/슬롯 목록)
- [x] 5. 시작~영웅선택 화면 흐름 구현 — `app/game/` (`/game` 라우트), `lib/game/new-game.ts`
- [x] 6. 게임 메인(로비) 화면 뼈대 구현 — `app/game/screens/GameLobbyScreen.tsx`(로비: 영웅목록+맵후보+클리어맵 레일) + `app/game/screens/MapPlayScreen.tsx`(실제 게임 화면: 턴종료 스텁), `lib/game/hero-roster.ts`, `lib/game/map-candidates.ts`, `lib/game/world-entry.ts`
- [x] 7. 턴 엔진 구현 — `lib/game/turn.ts` (`endTurn`: 턴 카운터 증가 + 부대 이동력 회복만 담당, 생산/버프/반란/AI는 각 작업에서 훅으로 얹을 예정), `MapPlayScreen.tsx`의 턴 종료 버튼과 연결
- [x] 8. 이동 규칙 구현 (hex 좌표 기반) — `lib/game/movement.ts` (`reachableHexes`/`shortestPath`/`moveUnit`, 지형 비용은 콜백으로 위임해 아직 지형 계약이 없어도 동작). 지도 화면이 없어 UI 연결은 없음, 영웅 이동력 수치도 미정
- [x] 9. 전투 규칙 구현 — `lib/game/combat.ts` (`resolveAttack`: 선공+사거리 기반 반격 규칙, `unitCombatant`/`heroCombatant` 어댑터), `hero-definition.ts`의 `heroCombatStats`(등급→전투수치 초안 공식), `hero.ts`의 "recovering" 배속 모드(영웅은 기절 후 재배치, 병사는 즉시 소멸), `turn.ts`가 매턴 회복 틱 처리. SaveGame 레벨 orchestrator(유닛 제거 등)는 지도 UI 붙을 때까지 보류
- [x] 10. 도시 성장 및 부대 생산 시스템 구현 — `lib/game/city.ts`(타입/시설/업그레이드), `unit-production.ts`(연구→병사 등급/스탯), `city-actions.ts`(건설+영웅 소환), `turn.ts`(시설 산출+생산 큐 틱), `HeroEnlistScreen.tsx`(맵 진입 전 최대 5명 출전 예약). 외부 자원 타일 점령·지형 특화 연구·성 방어력의 실제 전투 연동은 지형 계약 이후로 보류
- [x] 11. 영웅 배속 시스템 구현 — `lib/game/hero-assignment.ts`(부대 동행 버프 20% + 병과 시너지(궁사 사거리 공유/기병 이동력 공유), 도시 배속 내정특기 6종(훈련/상업/농업/채굴/회복/방어)별 산출량·생산속도·방어력·회복 보너스, 전부 초안 수치), `combat.ts`의 `unitCombatant`가 라이더+병과 인자 지원, `turn.ts`가 매턴 배속 영웅 보너스(산출·생산·회복) 반영 — 방어 보너스만 아직 미연결(전투 트리거 없음). 도시 배속 UI는 지도가 없어 `MapPlayScreen.tsx`에 테스트 버튼으로만 존재
- [x] 12. 세계 진행(정복→계승→다음 세계) 시스템 구현 — `lib/game/world-progress.ts`(신규: `isWorldConquered`/`captureEnemyCity`/`surrenderFaction`/`surrenderRivalFaction`), `faction.ts`(`capitalCityId`/`eliminationReason`), `city.ts`(`captureCity`), `world-entry.ts`(맵 진입 시 최소 스캐폴딩 AI 세력 생성 - 수도만 있고 스탯·행동 없음). AI 세력 능력치(맵 유형/크기별)와 AI 턴 행동, 항복 판단 조건은 사용자가 명시적으로 "추후 논의"로 미룸 - `MapPlayScreen.tsx`에 Codex 맵 엔진 완성 전까지 쓸 "적 수도 점령 (테스트)"/"적 세력 항복 (테스트)" 임시 버튼으로 정복 흐름 전체를 시연 가능
- [ ] 13. 유휴 영웅의 클리어 맵 배치(영주 임명) 시스템 구현 — 보상은 `researchResource`(유산)로 확정, 매턴 생산 로직은 아직 미구현
- [ ] 14. 반란 세력 토벌 시스템 구현 — 24시간(달력 기준) 주기로 반란 지역 로테이션, 영주 제외 영웅 파견 시 경험치
- [x] 15. 연구(내정/병과) 시스템 구현 — `lib/game/research.ts`, `Faction.resources`/`Faction.research`, `app/game/screens/ResearchScreen.tsx`
- [x] 16. 로비 화면 + 맵 후보 선택 시스템 재구성 (사용자 정정, 번호 없는 원래 계획 밖 작업) — `app/game/screens/GameLobbyScreen.tsx`(로비: 영웅목록+맵후보+클리어맵 레일) + `MapPlayScreen.tsx`(실제 게임 화면), `lib/game/map-candidates.ts`, `lib/game/world-entry.ts`. `SaveGame.world`가 `WorldState | null`이 된 것도 이 작업 결과 — 자세한 내용은 위 로그의 "로비 · 맵 후보 선택 시스템" 항목 참고

## 실행 방법

- `npm run test:game` — `lib/game/`의 순수 로직 테스트만 빠르게 실행 (빌드 불필요)
- `npm test` — 기존 렌더링 스모크 테스트 + `test:game` 전체 실행
