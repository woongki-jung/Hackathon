# Sprint 9 Playwright 검증 보고서

**검증일:** 2026-03-15
**브랜치:** sprint9
**검증 도구:** Playwright MCP
**앱 URL:** http://localhost:3000

---

## 검증 결과 요약

| 항목 | 결과 |
|------|------|
| 전역 404 페이지 | ✅ 통과 |
| GNB aria-current | ✅ 통과 |
| GNB aria-expanded (햄버거) | ✅ 통과 |
| ToastContainer aria-live | ✅ 통과 |
| FTS5 검색 하이라이팅 | ✅ 통과 |
| 대시보드 테이블 모바일 대응 | ✅ 통과 |
| 모바일 GNB 드롭다운 | ✅ 통과 |
| 콘솔 에러 | ✅ 없음 |

---

## 상세 검증 내역

### 1. 전역 404 페이지 (T9-1)

- **시나리오:** `http://localhost:3000/nonexistent-page` 접속
- **결과:** ✅ "페이지를 찾을 수 없습니다" 404 페이지 렌더링 확인
- **확인 항목:**
  - "404" 텍스트 표시
  - "페이지를 찾을 수 없습니다" h1 표시
  - "대시보드로 이동" 링크(`/dashboard`) 정상 표시
- **스크린샷:** [02-404-page.png](02-404-page.png)

### 2. GNB 접근성 — aria-current (T9-2)

- **시나리오:** `/dashboard` 접속 후 GNB 링크 속성 검사
- **결과:** ✅ 활성 링크에 `aria-current="page"` 정상 적용
- **확인 항목 (JavaScript DOM 검사):**
  - "대시보드" 링크: `aria-current="page"` ✅
  - "용어사전" 링크: `aria-current` 없음 ✅
  - "환경설정" 링크: `aria-current` 없음 ✅
  - "사용자 관리" 링크: `aria-current` 없음 ✅
- **스크린샷:** [01-dashboard.png](01-dashboard.png)

### 3. GNB 접근성 — 햄버거 메뉴 aria-expanded (T9-2)

- **시나리오:** 360px 모바일에서 햄버거 버튼 클릭 전/후 속성 확인
- **결과:** ✅ `aria-expanded` 상태 전환 정상 동작
- **확인 항목:**
  - 클릭 전: `aria-expanded="false"`, `aria-label="메뉴 열기"` ✅
  - 클릭 후: `aria-expanded="true"`, `aria-label="메뉴 닫기"`, `id="mobile-menu"` 존재 ✅
  - `aria-controls="mobile-menu"` 연결 ✅
- **스크린샷:** [05-mobile-gnb-closed.png](05-mobile-gnb-closed.png), [06-mobile-gnb-open.png](06-mobile-gnb-open.png)

### 4. ToastContainer aria-live (T9-2)

- **시나리오:** DOM에서 `aria-live` 속성 확인
- **결과:** ✅ `aria-live="polite"`, `aria-atomic="false"` 정상 적용
- **확인 항목:**
  - `aria-live="polite"` ✅
  - `aria-atomic="false"` ✅
  - 컨테이너 위치: `fixed top-4 right-4 z-50` ✅

### 5. FTS5 검색 하이라이팅 (T9-3)

- **시나리오:** 용어사전에서 "전자의무기록" 검색
- **결과:** ✅ `<strong>` 태그로 검색어 볼드+인디고 색상 하이라이팅 확인
- **확인 항목:**
  - API 응답: `snippet` 필드에 `[[전자의무기록]]` 마커 포함 ✅
  - UI: `<strong class="font-semibold text-indigo-700">전자의무기록</strong>` 렌더링 ✅
  - GNB "용어사전" 링크 `aria-current="page"` 활성화 ✅
- **스크린샷:** [04-fts5-highlight.png](04-fts5-highlight.png)

### 6. 모바일 대시보드 테이블 (T9-5)

- **시나리오:** 360px 너비에서 대시보드 분석 이력 테이블 확인
- **결과:** ✅ `overflow-x-auto` 래퍼 적용, 테이블 모바일 대응 정상
- **확인 항목:**
  - 360px에서 테이블 컬럼 표시 (메일 제목, 상태 열 표시) ✅
  - `min-w-[480px]` 테이블에 가로 스크롤 적용 ✅
- **스크린샷:** [03-dashboard-mobile-360.png](03-dashboard-mobile-360.png)

### 7. 콘솔 에러

- **결과:** ✅ 에러 없음 (404 페이지의 HTTP 404 응답은 정상 동작)

---

## 코드 리뷰 요약

**Critical/High 이슈:** 없음

**Medium 이슈 (추후 개선 참고):**
1. `sync-terms/route.ts`에서 `toSafeFileName`, `buildGlossaryMarkdown` 함수가 `dictionary-store.ts`와 중복 정의됨 — 기능 문제 없음, Sprint 10에서 리팩토링 고려
2. `sync-terms/route.ts`에서 `fs.existsSync` 직접 사용 — `file-manager.ts` 추상화 계층 우회. 기능 문제 없음
3. GNB의 `<div role="list">` + `role="listitem"` 패턴 — 이미 `<nav>` 내에 있으므로 불필요한 중복이나 접근성 오류 없음

---

## 자동 검증 결과 (빌드/린트)

- ✅ `npm run build` — 성공 (25개 라우트, 에러 없음)
- ✅ `npm run lint` — 성공 (에러 없음)

---

## 수동 검증 필요 항목

`docs/sprint/sprint9/deploy.md` 참조:
- 용어 파일 동기화 API (`POST /api/admin/sync-terms`) 실제 데이터로 검증
- 768px, 1280px 태블릿/데스크톱 레이아웃 최종 확인
