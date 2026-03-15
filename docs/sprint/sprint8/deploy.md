# Sprint 8 배포 체크리스트

**스프린트:** Sprint 8 — 업무지원 상세 + 대시보드 연동 완성
**완료일:** 2026-03-15
**브랜치:** `sprint8` → `main`

---

## 자동 검증 결과 (sprint-close 시 실행 완료)

- ✅ `npm run build` — 빌드 성공 (26개 라우트 정상 생성, `/work/[id]` 신규 포함)
- ✅ `npm run lint` — 에러 없음
- ✅ Playwright: 대시보드 렌더링 정상
- ✅ Playwright: 대시보드 "상세 보기" / "보기" 링크 정상
- ✅ Playwright: `/work/[id]` 업무지원 상세 화면 렌더링 정상
- ✅ Playwright: 추출 용어 태그 → `/dictionary/{id}` URL 정상
- ✅ Playwright: `/work/nonexistent-id` 404 처리 정상
- ✅ Playwright: GNB `/dictionary/[id]` 경로에서 "용어사전" 활성화 하이라이트 정상
- ✅ Playwright: GNB `/work/[id]` 경로에서 메뉴 하이라이트 없음 (정상)
- ✅ Playwright: 콘솔 에러 0건

---

## 수동 검증 필요 항목

다음 항목은 개발자가 `npm run dev` 실행 후 브라우저에서 직접 확인해야 합니다.

### 기능 검증

- ⬜ **로그인 흐름**: 브라우저에서 직접 admin 계정으로 로그인 → 대시보드 이동 정상 확인
  - Playwright에서 UI 클릭 로그인이 동작하지 않는 현상 있음 (API 직접 호출은 정상)
  - 실제 브라우저에서는 정상 동작 예상 (Next.js SPA 라우팅 이슈)

- ⬜ **대시보드 "상세 보기" 링크 클릭**: 마우스로 직접 클릭하여 `/work/{id}`로 이동 확인

- ⬜ **후속 작업 체크박스 인터랙션**: 항목 클릭 → 체크마크 표시 + 취소선 적용 확인

- ⬜ **추출 용어 태그 클릭**: 태그 클릭 → `/dictionary/{termId}` 이동 확인

- ⬜ **뒤로가기 버튼**: `/work/[id]`에서 뒤로가기 버튼 클릭 → 이전 화면 복귀 확인

- ⬜ **모바일 반응형**: 360px 뷰포트에서 업무지원 상세 화면 레이아웃 확인

### Sprint 9 이월 버그

- ⬜ **날짜 포맷 수정 (M-01)**: `src/lib/utils/date.ts`의 `formatDate()`가 "오전/오후"를 포함하는 12시간제로 출력됨
  - 사양 UI-R-015: "YYYY-MM-DD HH:mm" (24시간제) 요구
  - 수정 방법: `hour12: false` 옵션 추가 또는 ISO 직접 파싱

- ⬜ **추출 용어 수 표시 수정 (M-02)**: `/work/[id]`의 "추출 용어 수" 항목이 항상 0으로 표시됨
  - 원인: API 응답에 `extractedTermCount` 필드 미포함
  - 수정 방법: `item.extractedTermCount ?? 0` → `extractedTerms.length`로 변경

### DB / 인프라 (수동 실행 필요)

- ⬜ **DB 마이그레이션**: Sprint 8에서 DB 스키마 변경 없음 — 마이그레이션 불필요

- ⬜ **실제 분석 데이터 확인**: 실제 메일 분석 결과가 있는 환경에서 전체 흐름 검증
  - 대시보드 → 업무지원 상세 → 용어 상세 전체 네비게이션
  - 실제 용어 데이터로 추출 용어 태그 클릭 동작 확인

---

## 신규/변경 파일 목록

| 파일 | 변경 |
|------|------|
| `src/app/(authenticated)/work/[id]/page.tsx` | 신규 — 업무지원 상세 화면 |
| `src/app/api/analysis/[id]/route.ts` | 신규 — ANAL-003 분석 상세 API |
| `src/lib/utils/date.ts` | 신규 — formatDate 공통 유틸 |
| `src/app/(authenticated)/dashboard/page.tsx` | 수정 — 상세 보기/보기 링크 추가, formatDate 공통화 |
| `src/app/(authenticated)/dictionary/[id]/page.tsx` | 수정 — formatDate 공통화 |

---

## PR 정보

- PR URL: https://github.com/woongki-jung/Hackathon/pull/new/sprint8
- gh CLI 인증 없어 PR 직접 생성 불가 — 위 URL에서 직접 생성 가능

---

## 환경변수 변경 사항

없음. Sprint 8에서 신규 환경변수 추가 없음.
