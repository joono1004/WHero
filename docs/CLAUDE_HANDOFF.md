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
