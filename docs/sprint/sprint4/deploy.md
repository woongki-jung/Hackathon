# Sprint 4 배포 체크리스트

- **작성일**: 2026-03-15
- **브랜치**: sprint4

---

## 자동 검증 완료 항목

- ✅ `npm run build` — 빌드 성공 (사용자 보고 완료)
- ✅ `npm run lint` — 코드 스타일 검증 통과 (사용자 보고 완료)
- ✅ `GET /api/mail/status` — 200 응답, 서비스 상태 JSON 정상 반환
- ✅ `GET /api/analysis/latest` — 200 응답, 빈 상태(data: null) 정상 반환
- ✅ `GET /api/analysis/history` — 200 응답, 빈 이력(total: 0) 정상 반환
- ✅ 대시보드 서비스 상태 카드 렌더링 — 스케줄러/IMAP/API 키/마지막 실행 표시 확인
- ✅ 설정 미완료 경고 배너 표시 — IMAP 미설정 + API 키 미설정 문구 + 링크 확인
- ✅ 최신 분석 결과 빈 상태 — "아직 분석된 메일이 없습니다." 표시 확인
- ✅ 분석 이력 빈 상태 — "분석 이력이 없습니다." 표시 확인
- ✅ `POST /api/mail/check` — 200 응답, `{ success: true, message: "메일 확인이 시작되었습니다." }` 확인
- ✅ 모바일 반응형 (360px) — 카드 레이아웃 및 햄버거 메뉴 정상
- ✅ 콘솔 오류 없음 — 브라우저 콘솔 에러 0건

---

## 수동 검증 필요 항목

아래 항목은 자동 검증이 불가하여 사용자가 직접 확인해야 합니다.

### 기본 동작 확인

- ⬜ `npm run dev` 실행 후 http://localhost:3000 접속 → `/login`으로 리다이렉트 확인
- ⬜ 관리자 계정(`.env.local`의 `ADMIN_USERNAME` / `ADMIN_PASSWORD`)으로 로그인 후 `/dashboard` 진입 확인
- ⬜ 대시보드 로딩 시 스켈레톤 UI가 잠깐 표시된 후 실제 데이터로 전환되는 것 확인

### 수동 메일 확인 버튼 흐름

- ⬜ "메일 확인 실행" 버튼 클릭 → `window.confirm` 다이얼로그 표시 확인
- ⬜ 확인 클릭 → "메일 확인이 시작되었습니다." 토스트 표시 확인
- ⬜ 취소 클릭 → API 호출 없이 아무 일도 일어나지 않음 확인
- ⬜ 연속 2회 빠르게 클릭 → 두 번째 요청에서 409 응답 + "이미 메일 확인이 진행 중입니다." 토스트 확인 (2초 이내)

### user role 권한 검증

- ⬜ user role 계정으로 로그인 후 `/dashboard` 접근
- ⬜ "메일 확인 실행" 버튼이 표시되지 않음 확인
- ⬜ 경고 배너에 "관리자에게 문의하세요." 문구 표시 확인 (admin일 때는 링크 표시)

### 환경설정 연동 확인

- ⬜ 경고 배너의 "환경설정으로 이동" 링크 클릭 → `/settings` 이동 확인
- ⬜ `/settings`에서 IMAP 호스트, 포트 설정 저장 후 대시보드로 복귀
- ⬜ 메일 서버 상태가 "설정됨"으로 변경되는 것 확인 (MAIL_PASSWORD 환경변수도 설정 필요)

---

## Sprint 5 연동 필요 항목

다음 항목은 Sprint 4에서 플레이스홀더로 구현되었으며, Sprint 5에서 실제 로직으로 교체됩니다.

- ⬜ **T4-5 실제 배치 연동**: `POST /api/mail/check`가 현재 2초 후 완료되는 플레이스홀더
  - Sprint 5에서 `batchAnalyzer.run()` 실제 배치 로직으로 교체 예정
  - 교체 위치: `domain-dictionary/src/app/api/mail/check/route.ts` 26~29번 줄 `setTimeout` 블록
- ⬜ **스케줄러 상태 반영**: `GET /api/mail/status`의 `scheduler.status`가 현재 항상 `'stopped'`
  - Sprint 5 스케줄러 구현 후 실제 상태를 반영하도록 업데이트 필요
  - 교체 위치: `domain-dictionary/src/app/api/mail/status/route.ts` 38번 줄

---

## DB 마이그레이션

Sprint 4는 기존 스키마를 그대로 사용하므로 별도 DB 마이그레이션이 없습니다.

---

## 코드 리뷰 이슈 후속 조치

코드 리뷰에서 발견된 Medium 이슈 중 Sprint 5 전에 처리 권장 항목:

- ⬜ **M-01 카운트 쿼리 최적화** (`analysis/history/route.ts` 46번 줄)
  - 현재: 전체 행을 메모리에 로드 후 `.length`
  - 개선: `count()` 집계 함수 사용
  - Sprint 5 배치 파이프라인 구현 전에 수정 권장 (이력 건수 급증 예상)
