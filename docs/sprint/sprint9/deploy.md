# Sprint 9 배포 체크리스트

## 자동 검증 결과

### 빌드 검증
- ✅ `npm run build` — 성공 (에러 없음, 25개 라우트 정상 컴파일)
- ✅ `npm run lint` — 성공 (에러 없음)

## 수동 검증 항목

### 앱 실행 확인
- ⬜ `npm run dev` 실행 후 변경사항 반영 확인 (앱 재시작 타이밍은 직접 결정)

### 에러 처리 검증
- ⬜ `http://localhost:3000/nonexistent-page` 접속 → "페이지를 찾을 수 없습니다" 404 페이지 표시 확인
- ⬜ `http://localhost:3000/work/nonexistent-id` 접속 → 404 처리 확인

### 접근성 검증
- ⬜ 대시보드(`/dashboard`)에서 GNB 활성 링크에 `aria-current="page"` 속성 확인 (브라우저 개발자 도구)
- ⬜ 햄버거 메뉴 버튼에 `aria-expanded` 속성이 상태에 따라 변경되는지 확인
- ⬜ Tab 키로 GNB 링크, 검색 입력, 버튼 순서대로 포커스 이동 확인
- ⬜ 토스트 컨테이너에 `aria-live="polite"` 적용 확인 (개발자 도구)

### FTS5 하이라이팅 검증
- ⬜ `/dictionary` 접속 → 검색어 입력 → 검색 결과 카드에서 검색어 부분 볼드(`<strong>`) 처리 확인
- ⬜ 검색어 없을 때 일반 description 표시 확인 (하이라이트 없음)

### 모바일 반응형 검증 (브라우저 DevTools)
- ⬜ 360px 너비 → 대시보드 분석 이력 테이블 가로 스크롤 가능 여부 확인
- ⬜ 360px 너비 → GNB 햄버거 메뉴 동작 확인
- ⬜ 768px 너비 → 태블릿 레이아웃 확인
- ⬜ 1280px 너비 → 데스크톱 레이아웃 확인

### 용어 파일 동기화 API
- ⬜ `curl -X POST http://localhost:3000/api/admin/sync-terms` (관리자 로그인 쿠키 필요) → 동기화 결과 확인

### DB 관련 (마이그레이션 없음)
- ✅ Sprint 9는 별도 DB 마이그레이션 없음 — 수동 실행 불필요

## 배포 절차 요약

Sprint 9는 UI 개선 및 API 추가 작업으로 DB 스키마 변경이 없습니다.

1. 최신 코드 pull
2. `npm install` (의존성 변경 없음, 선택 사항)
3. `npm run build`
4. 앱 재시작 (`npm run dev` 또는 PM2 reload)
5. 위 수동 검증 항목 확인
