# 배포 구조 전환 기록

최종 갱신: 2026-08-04

## 결정

World in Hero의 웹 실행 환경을 Cloudflare/Vinext/Sites 조합에서 표준 Next.js와
Vercel 조합으로 변경한다. 게임 코드와 그래픽은 유지하고 실행·배포 계층만 교체한다.

## 변경 이유

- 2026-08-04 이후 Sites가 Cloudflare Worker를 게시하는 과정에서
  `nodejs_compat` 호환성 설정 충돌이 반복됐다.
- 로컬 빌드, 자동 검사, GitHub 전송, Sites 버전 저장은 성공했지만 실제 게시 단계만
  실패했다.
- 프로젝트는 이미 Next.js App Router 구조이므로 Cloudflare 전용 변환 계층 없이
  실행할 수 있다.

## 제거한 Cloudflare 전용 요소

- `.openai/hosting.json`
- `vite.config.ts`
- `build/sites-vite-plugin.ts`
- `worker/index.ts`
- `app/chatgpt-auth.ts`
- Cloudflare D1 예제와 비사용 Drizzle 초기 구성
- `vinext`, `vite`, `wrangler`, `@cloudflare/vite-plugin` 및 관련 개발 의존성

## 현재 실행 방식

- 개발: `pnpm dev`
- 배포 빌드: `pnpm build`
- 실행: `pnpm start`
- 검증: `pnpm test`
- 프레임워크: Next.js 16 App Router
- 배포 대상: Vercel
- 배포 기준 브랜치: GitHub `main`

## Claude 작업 시 주의사항

- Cloudflare Worker, Vinext, Wrangler, D1 또는 `.openai/hosting.json`을 다시 추가하지 않는다.
- `lib/game/**`과 `app/game/**`은 표준 Next.js 환경을 기준으로 작성한다.
- 영속 저장소가 필요해지기 전까지 현재의 브라우저 저장 방식과 순수 게임 규칙을 유지한다.
- 서버 기능이 필요해질 경우 구현 전에 저장소와 인증 방식을 별도로 결정한다.
- 배포 관련 변경은 Codex가 최종 통합하고 검증한다.

## 전환 과정에서 함께 수정한 잠재 오류

표준 Next.js 빌드는 Vinext 빌드보다 엄격한 TypeScript 검사를 수행했다. 이에 따라 기존
동작은 유지하면서 누락된 `WaterBody` 타입, Canvas 기반 텍스처 타입, 언덕 인스턴스의
높이 계산, 재질 배열 해제, 자원 생산 배율 반환 타입, 전술 패널의 공격 대상 상태를
명확히 고쳤다.

## 남은 작업

- Vercel 프로젝트 생성 및 GitHub 저장소 연결
- 첫 Production 배포 링크 확인
- 이후 `main` 갱신 시 자동 배포 여부 확인
