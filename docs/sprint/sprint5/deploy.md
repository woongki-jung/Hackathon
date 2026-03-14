# Sprint 5 배포 체크리스트

> **Sprint 5:** 메일 수신 + 파일 저장 + 스케줄러
> **작성일:** 2026-03-15
> **브랜치:** sprint5
> **PR URL:** https://github.com/woongki-jung/Hackathon/pull/new/sprint5
>
> gh CLI 인증이 없어 PR을 자동으로 생성할 수 없습니다.
> 위 URL로 접속하여 sprint5 → main PR을 직접 생성해 주세요.

---

## Sprint 6 연동 사전 안내

Sprint 6(용어 분석 파이프라인)에서 `mail-batch.ts`의 **Phase 2(AI 분석)**가 연동됩니다.
현재 Sprint 5는 메일 수신 → 파일 저장 → `analysis_queue` 등록까지만 처리하며,
용어 추출 및 Gemini API 해설 생성은 Sprint 6의 `batch-analyzer.ts`에서 수행합니다.

Sprint 6 시작 전 아래 M-03 이슈(cleanup 상태 확인 미적용)를 반드시 수정해야 합니다.

---

## 자동 검증 완료 항목

- ✅ `npm run build` — 빌드 성공
- ✅ `npm run lint` — ESLint 에러 없음
- ✅ `GET /api/mail/status` — 200 OK, 스케줄러/메일/AI 상태 반환
- ✅ `GET /api/analysis/latest` — 200 OK
- ✅ `GET /api/analysis/history` — 200 OK
- ✅ `POST /api/mail/check` — 200 OK, "메일 확인이 시작되었습니다." 반환
- ✅ `POST /api/auth/login` — 200 OK, 세션 쿠키 정상 발급
- ✅ 대시보드 렌더링 — 서비스 상태 카드, 빈 상태 메시지, 설정 필요 배너 확인
- ✅ 환경설정 화면 렌더링 — IMAP/AI 설정 폼, 민감정보 마스킹 뱃지 확인
- ✅ 미인증 접근 → /login 리다이렉트 정상
- ✅ 콘솔 에러 0건
- ✅ `runMailBatch()` 실행 이력 DB 기록 확인 (lastRunStatus: "success")

---

## 수동 검증 필요 항목

### 앱 실행 및 스케줄러 확인

- ⬜ `npm run dev` 실행 후 서버 콘솔에서 아래 로그 확인:
  ```
  [scheduler] 스케줄러 시작 { cronExpr: '*/60 * * * *', intervalMin: 60 }
  [scheduler] 최초 1회 즉시 실행
  [mail-batch] 배치 시작
  ```
- ⬜ `GET /api/mail/status` 응답에서 `scheduler.status === "running"` 확인
  - 참고: Fast Refresh(HMR) 발생 시 일시적으로 "stopped"로 표시될 수 있음

### IMAP 실제 연결 테스트

- ⬜ `.env.local`에 IMAP 설정 완료 후 환경설정 화면에서 "연결 테스트" 버튼 클릭
  - 필요 환경변수:
    ```
    MAIL_IMAP_HOST=<IMAP 서버 주소>
    MAIL_IMAP_PORT=993
    MAIL_USERNAME=<메일 계정>
    MAIL_PASSWORD=<메일 비밀번호>
    MAIL_USE_SSL=true
    ```
- ⬜ IMAP 설정 완료 후 대시보드에서 "메일 확인 실행" 버튼 클릭
  - 서버 콘솔에서 `[imap-receiver] IMAP 연결 성공` 로그 확인
  - 서버 콘솔에서 `[imap-receiver] UNSEEN 메일 수 { count: N }` 로그 확인

### 파일 시스템 및 DB 확인 (IMAP 수신 후)

- ⬜ `./data/mails/` 디렉터리에 `{timestamp}_{uid}.txt` 파일 생성 확인
  - 파일 내용 형식:
    ```
    제목: {subject}
    수신일시: {receivedAt}
    ---
    {bodyText}
    ```
- ⬜ SQLite DB(`./data/app.db`)에서 `analysis_queue` 테이블에 `status='pending'` 레코드 확인:
  ```sql
  SELECT * FROM analysis_queue ORDER BY created_at DESC LIMIT 5;
  ```
- ⬜ `mail_processing_logs` 테이블에 수신 이력 기록 확인:
  ```sql
  SELECT * FROM mail_processing_logs ORDER BY executed_at DESC LIMIT 5;
  ```

### DB 마이그레이션 (스키마 변경 없음)

- ✅ Sprint 5는 DB 스키마 변경 없음 — 마이그레이션 불필요

---

## Sprint 6 준비 사항 (코드 리뷰 이슈 반영)

- ⬜ **M-03 수정 필요 (Sprint 6 전):** `src/lib/data/cleanup.ts`에서 파일 삭제 시 `analysis_queue`의 `status`가 `completed` 또는 `failed`인 경우만 삭제하도록 수정
  - 현재: mtime 기준 30일 경과 파일 무조건 삭제
  - 문제: `pending`/`processing` 상태 파일 삭제 시 Sprint 6 분석 파이프라인에서 파일 not found 오류 발생 가능

- ⬜ **M-01 검토 (Sprint 6 전):** `imap-receiver.ts`의 파싱 로직과 `mail-parser.ts` 역할 분리 명확화

---

## 환경변수 체크리스트

| 변수 | 필수 | 설명 | 상태 |
|------|------|------|------|
| `MAIL_IMAP_HOST` | 선택 | IMAP 서버 주소 | ⬜ 미설정 |
| `MAIL_IMAP_PORT` | 선택 | IMAP 포트 (993) | ⬜ 미설정 |
| `MAIL_USERNAME` | 선택 | 메일 계정 | ⬜ 미설정 |
| `MAIL_PASSWORD` | 선택 | 메일 비밀번호 | ⬜ 미설정 |
| `MAIL_USE_SSL` | 선택 | SSL 사용 여부 (true) | ⬜ 미설정 |
| `MAIL_CHECK_INTERVAL` | 선택 | 확인 주기 ms (기본 3600000) | ✅ 기본값 사용 |
| `MAIL_STORAGE_PATH` | 선택 | 메일 저장 경로 (기본 ./data/mails) | ✅ 기본값 사용 |
| `GEMINI_API_KEY` | Sprint 6 필요 | Gemini API 키 | ⬜ 미설정 |

> IMAP 설정이 없으면 스케줄러는 실행되지만 메일 수신을 건너뜁니다 (에러 없음).
> Sprint 6 AI 분석 기능은 `GEMINI_API_KEY` 설정 후 동작합니다.
