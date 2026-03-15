# Sprint 9 배포 체크리스트

## 자동 검증 결과

### 빌드/린트 검증
- ✅ `npm run build` — 성공 (에러 없음, 25개 라우트 정상 컴파일)
- ✅ `npm run lint` — 성공 (에러 없음)

### Playwright 자동 검증
- ✅ 전역 404 페이지 렌더링 — "페이지를 찾을 수 없습니다" + 대시보드 링크
- ✅ GNB `aria-current="page"` — 활성 링크에 정상 적용
- ✅ GNB 햄버거 버튼 `aria-expanded` 상태 전환 — 클릭 전 `false` → 클릭 후 `true`
- ✅ GNB `aria-controls="mobile-menu"` + `id="mobile-menu"` 연결
- ✅ ToastContainer `aria-live="polite"`, `aria-atomic="false"` 적용
- ✅ FTS5 검색 하이라이팅 — `[[...]]` 마커 → `<strong>` 볼드 처리
- ✅ 대시보드 이력 테이블 모바일(360px) `overflow-x-auto` 적용
- ✅ 콘솔 에러 없음

## 수동 검증 항목

### 앱 실행 확인
- ⬜ `npm run dev` 실행 후 변경사항 반영 확인 (앱 재시작 타이밍은 직접 결정)

### 에러 처리 수동 확인
- ⬜ `http://localhost:3000/work/nonexistent-id` 접속 → 404 처리 확인 (업무지원 상세)
- ⬜ `http://localhost:3000/dictionary/nonexistent-id` 접속 → 404 처리 확인 (용어 상세)

### 접근성 추가 확인
- ⬜ Tab 키만으로 로그인 → 대시보드 → 용어사전 검색 흐름 완전 통과 확인
- ⬜ 색상 대비 WCAG 2.1 AA 기준 확인 (브라우저 DevTools Accessibility 패널)

### 반응형 레이아웃 최종 확인
- ⬜ 768px 태블릿 — 전체 화면 레이아웃 확인
- ⬜ 1280px 데스크톱 — 전체 화면 레이아웃 확인

### 용어 파일 동기화 API
- ⬜ 관리자 로그인 후 `POST /api/admin/sync-terms` 호출 → `{ synced, skipped, total }` 응답 확인

### DB 관련 (마이그레이션 없음)
- ✅ Sprint 9는 별도 DB 마이그레이션 없음 — 수동 실행 불필요

## 배포 절차 요약

Sprint 9는 UI 개선 및 API 추가 작업으로 DB 스키마 변경이 없습니다.

1. 최신 코드 pull
2. `npm install` (의존성 변경 없음, 선택 사항)
3. `npm run build` (이미 검증 완료)
4. 앱 재시작 (`npm run dev` 또는 PM2 reload)
5. 위 수동 검증 항목 확인
