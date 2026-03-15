# Sprint 7 Playwright 검증 보고서

> 검증 일자: 2026-03-15
> 앱 URL: http://localhost:3000
> 검증 계정: admin / Admin123!
> 검증 환경: npm run dev (개발 서버)

---

## 검증 요약

| 항목 | 결과 |
|------|------|
| 용어사전 뷰어 화면 렌더링 | ✅ 통과 |
| 빈 상태(용어 없음) 표시 | ✅ 통과 |
| 검색어 입력 + URL 동기화 | ✅ 통과 |
| 빈 검색 결과 메시지 | ✅ 통과 |
| 카테고리 필터 표시 | ✅ 통과 |
| GET /api/dictionary/search | ✅ 200 통과 |
| GET /api/dictionary/search (FTS5+카테고리) | ✅ 수정 후 200 통과 |
| GET /api/dictionary/trending | ✅ 200 통과 |
| GET /api/dictionary/terms/:id (404) | ✅ 404 통과 |
| 용어 상세 화면 404 처리 | ✅ 통과 |
| 콘솔 에러 | ✅ 0건 |

---

## 버그 발견 및 수정

### BUG-01: FTS5+카테고리 필터 조합 시 500 에러 (수정 완료)

**증상:** `GET /api/dictionary/search?q=EMR&category=emr` 요청 시 500 Internal Server Error 반환

**원인:** `search/route.ts` 50행에 `AND t.deleted_at IS NULL` 조건이 포함되어 있었으나, `terms` 테이블에 `deleted_at` 컬럼이 존재하지 않음

**수정:** 해당 조건 제거 (커밋: `fix: 검색 API FTS5+카테고리 쿼리에서 존재하지 않는 deleted_at 컬럼 제거`)

**수정 후 결과:** 200 OK, 정상 응답

---

## 상세 검증 결과

### 1. 용어사전 뷰어 기본 화면

- `/dictionary` 접속 시 검색 입력 필드, 카테고리 필터(전체/EMR/비즈니스/약어/일반), "빈도 트렌드 TOP 10" 섹션 정상 렌더링
- 용어 데이터 없는 상태에서 "아직 등록된 용어가 없습니다." 빈 상태 메시지 정상 표시
- 스크린샷: [screenshot-dictionary-empty.png](screenshot-dictionary-empty.png)

### 2. 검색어 입력 + URL 동기화

- 검색어 입력 시 URL이 `/dictionary?q=...` 형태로 자동 동기화됨
- URL 직접 접속(`?q=EMR&category=emr&page=1`) 시 검색어가 입력 필드에 복원됨
- 300ms 디바운스 후 API 호출 확인

### 3. 빈 검색 결과

- 존재하지 않는 용어 검색 시 "검색 결과가 없습니다." 메시지 정상 표시
- 스크린샷: [screenshot-dictionary-empty-search.png](screenshot-dictionary-empty-search.png)

### 4. API 엔드포인트 검증

| API | 파라미터 | 상태 코드 | 결과 |
|-----|---------|----------|------|
| GET /api/dictionary/search | q=test&page=1 | 200 | 빈 배열 정상 |
| GET /api/dictionary/search | q=EMR&category=emr&page=1 | 200 (수정 후) | 빈 배열 정상 |
| GET /api/dictionary/trending | - | 200 | 빈 배열 정상 |
| GET /api/dictionary/terms/:id | nonexistent-id | 404 | "용어를 찾을 수 없습니다." |

### 5. 용어 상세 404 화면

- 존재하지 않는 용어 ID 접근 시 "요청하신 용어를 찾을 수 없습니다." 메시지 표시
- "용어사전으로 돌아가기" 링크 정상 표시
- 스크린샷: [screenshot-term-detail-404.png](screenshot-term-detail-404.png)

---

## 수동 검증 필요 항목

아래 항목은 실제 용어 데이터가 DB에 존재하는 환경에서 검증이 필요합니다.

- ⬜ FTS5 검색 결과 카드 목록 표시 (용어명, 카테고리 뱃지, 해설 미리보기, 빈도)
- ⬜ 카테고리 필터 클릭 시 결과 재필터링
- ⬜ 트렌드 태그 표시 및 클릭 → 용어 상세 이동
- ⬜ 용어 상세 화면 정상 데이터 표시 (해설 전문, 출처 메일 목록)
- ⬜ 20건 초과 시 페이지네이션 동작
- ⬜ 모바일(360px) 레이아웃 확인
