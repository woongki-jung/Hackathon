# Sprint 5 코드 리뷰 보고서

> **리뷰 대상:** Sprint 5 구현 커밋 (f1c392f)
> **리뷰 일자:** 2026-03-15
> **리뷰어:** code-reviewer subagent

---

## 리뷰 요약

| 심각도 | 건수 |
|--------|------|
| Critical | 0 |
| High | 0 |
| Medium | 3 |
| Low / Suggestion | 4 |

전반적으로 코드 구조가 명확하고, IMAP 미설정 시 graceful 처리, HMR 중복 방지, 중복 실행 잠금 등 스프린트 계획의 핵심 요구사항을 모두 충족합니다.

---

## Medium 이슈

### M-01: `imap-receiver.ts` — `parseMail` 이중 호출 구조
**파일:** `src/lib/mail/imap-receiver.ts` (69~94번 줄)

`mail-parser.ts`의 `parseMail()`을 호출한 뒤 `parsed.textBody`를 `msg.source`에서 직접 추출한 결과로 덮어씁니다. 즉, `mail-parser.ts`의 `parseMail`이 텍스트/HTML 변환 로직을 가지고 있음에도 실질적으로 `imap-receiver.ts` 내부의 정규식 파싱이 본문 결정권을 갖습니다. 두 파일 간 책임 경계가 모호하여 향후 유지보수 시 혼란이 발생할 수 있습니다.

**권장 조치:** Sprint 6 전 `parseMail()`이 `source` 버퍼를 직접 받아 처리하도록 통합하거나, `imap-receiver.ts`에서 `mail-parser.ts` 호출을 제거하고 직접 파싱만 사용하도록 명확히 분리합니다.

---

### M-02: `imap-receiver.ts` — `withRetry` 옵션이 스프린트 계획과 불일치
**파일:** `src/lib/mail/imap-receiver.ts` (114번 줄)

스프린트 계획서(MAIL-RECV-001)에는 최대 3회 재시도(1s/2s/4s)로 명세되어 있으나, 실제 구현은 `{ maxAttempts: 2, baseDelayMs: 2000 }`으로 최대 2회(2s/4s)입니다. 동작 자체에는 문제없으나 사양 불일치로 향후 검토 시 혼동 가능성이 있습니다.

**권장 조치:** `maxAttempts: 3, baseDelayMs: 1000`으로 수정하거나, 낮은 재시도 횟수를 의도한 것이라면 스프린트 계획서에 근거를 명시합니다.

---

### M-03: `cleanup.ts` — `cleanupExpiredMailFiles`에서 `analysis_queue` 상태 확인 미적용
**파일:** `src/lib/data/cleanup.ts` (20~27번 줄)

스프린트 계획서(DATA-FILE-002)에는 "analysis_queue 테이블에서 해당 fileName 행의 status가 completed 또는 failed인 경우만 삭제"라고 명세되어 있으나, 현재 구현은 단순히 mtime 기준으로 30일 경과 파일을 모두 삭제합니다. `pending` 또는 `processing` 상태인 파일이 삭제되면 Sprint 6 분석 파이프라인에서 파일 not found 오류가 발생할 수 있습니다.

**권장 조치:** Sprint 6 시작 전, 파일 삭제 시 `analysis_queue`에서 해당 `fileName`의 status가 `completed` 또는 `failed`인지 확인하는 조건 추가가 필요합니다.

---

## Low / Suggestion

### S-01: `file-manager.ts` — 경로 탈출(path traversal) 방지 로직 미구현
**파일:** `src/lib/fs/file-manager.ts` (20~25번 줄)

스프린트 계획서(CMN-FS-001)에는 `writeFile`에 경로 탈출 방지 검증이 요구되었으나, 현재 `writeFile(filePath, content)`은 단순히 `path.resolve(filePath)`를 사용합니다. `basePath` 외부로의 탈출을 차단하는 로직이 없습니다.

현재 코드에서 `writeFile`의 호출처(`analysis-file.ts`)가 `path.join(MAILS_DIR, fileName)` 결과를 전달하므로 실질적인 보안 위협은 낮습니다만, `fileName`이 외부 입력(IMAP 메일 UID)에서 비롯됨을 고려할 때 방어적 코딩이 권장됩니다.

**권장 조치:** `safeWriteFile(baseDir, filename)` 형태로 베이스 디렉터리를 강제하거나 `assert(absPath.startsWith(baseDir))` 체크 추가를 Sprint 9 시점에 검토합니다.

---

### S-02: `mail-batch.ts` — IMAP 미설정 시 `skipped` 상태로 로그 기록 누락
**파일:** `src/lib/mail/mail-batch.ts` (36번 줄)

`receiveMails()`가 IMAP 설정 미완료로 빈 배열 `[]`을 반환하는 경우와 실제 메일 0건인 경우가 처리 이력에서 구분되지 않습니다. 두 경우 모두 `status: 'success', mailCount: 0`으로 기록됩니다. 스프린트 계획서에는 미설정 시 `status: 'skipped'`로 기록하도록 명세되어 있습니다.

**권장 조치:** `receiveMails()`가 설정 미완료를 나타내는 별도 신호(예: `null` 반환 또는 플래그)를 반환하게 하여 `status: 'skipped'`로 기록하도록 개선합니다.

---

### S-03: `cron-scheduler.ts` — HMR 재기동 시 기존 스케줄러 재생성
**파일:** `src/lib/scheduler/cron-scheduler.ts` (19~24번 줄)

HMR 발생 시 `global.__scheduler`가 존재하면 stop 후 재생성합니다. 이로 인해 HMR 직후 최초 1회 즉시 실행이 다시 트리거됩니다. 개발 환경에서 잦은 HMR 발생 시 메일을 반복 수신할 수 있습니다. 프로덕션 환경(`NODE_ENV=production`)에서는 HMR이 없으므로 영향은 없습니다.

**권장 조치:** `if (global.__scheduler) return;`으로 완전 멱등하게 처리하거나, 개발 환경에서 즉시 실행을 skip하는 조건을 추가합니다.

---

### S-04: `instrumentation.ts` — `SIGTERM` 핸들러 등록 위치
**파일:** `src/lib/instrumentation.ts` (21~24번 줄)

`process.once('SIGTERM', ...)` 내에서 `import('@/lib/scheduler/cron-scheduler')`를 동적 import합니다. SIGTERM 수신 시점에는 모듈 캐시가 이미 정리 중일 수 있어 import가 실패할 수 있습니다. `stopScheduler`를 미리 import하거나 `global.__scheduler`를 직접 참조하는 방식이 더 안전합니다.

**권장 조치:** Sprint 9 에러 처리 강화 단계에서 수정합니다.

---

## Sprint 6 연동 주의사항

- `mail-batch.ts`의 Phase 2는 현재 SEEN 플래그 설정만 수행하며, AI 분석 호출은 Sprint 6(`batch-analyzer.ts`)에서 연동 예정입니다.
- `cleanup.ts`의 M-03 이슈는 Sprint 6에서 `analysis_queue` 상태가 실제로 활용되기 전에 수정이 필요합니다.
