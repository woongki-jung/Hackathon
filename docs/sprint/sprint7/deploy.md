# Sprint 7 배포 체크리스트

> Sprint 7: 용어사전 뷰어 + 검색 + 트렌드
> 작성일: 2026-03-15

---

## PR 생성 안내

gh CLI 인증이 없어 PR을 직접 생성할 수 없습니다. 아래 URL에서 직접 생성해주세요.

**PR URL:** https://github.com/woongki-jung/Hackathon/pull/new/sprint7

**PR 제목:** `feat: Sprint 7 완료 - 용어사전 뷰어 + 검색 + 트렌드`

**PR 본문 참고:**
- 용어 검색 API (FTS5 전문 검색, 카테고리 필터, 페이지네이션 20건)
- 빈도 트렌드 API (상위 10개)
- 용어 상세 API (용어 정보 + 출처 메일 최신순 10건)
- 용어사전 뷰어 화면 (`/dictionary`) — 300ms 디바운스, URL 동기화, 카테고리 필터, 트렌드 태그
- 용어 상세 화면 (`/dictionary/[id]`) — 해설 전문, 출처 목록, 뒤로가기, 404 처리
- 카테고리 유틸리티 (`src/lib/utils/category.ts`)
- 버그 수정: FTS5+카테고리 필터 조합 500 에러 (`deleted_at` 컬럼 미존재)

---

## 자동 검증 결과

| 항목 | 결과 |
|------|------|
| ✅ `npm run build` | 통과 (사전 완료) |
| ✅ `npm run lint` | 통과 (사전 완료) |
| ✅ GET /api/dictionary/search | 200 OK |
| ✅ GET /api/dictionary/search (FTS5+카테고리) | 200 OK (버그 수정 후) |
| ✅ GET /api/dictionary/trending | 200 OK |
| ✅ GET /api/dictionary/terms/:id (404) | 404 정상 |
| ✅ 용어사전 뷰어 화면 렌더링 | 정상 |
| ✅ 검색어 URL 동기화 | 정상 |
| ✅ 빈 상태 표시 (용어 없음) | 정상 |
| ✅ 빈 검색 결과 메시지 | 정상 |
| ✅ 용어 상세 404 화면 | 정상 |
| ✅ 콘솔 에러 | 0건 |

---

## 수동 검증 항목

아래 항목은 실제 용어 데이터가 DB에 존재하는 환경에서 직접 확인이 필요합니다.

### 준비 조건

용어 데이터가 없는 경우 Sprint 6의 배치 분석 파이프라인을 실행하거나, DB에 직접 테스트 용어를 삽입합니다.

```sql
-- 테스트 용어 삽입 예시 (data/app.db)
INSERT INTO terms (id, name, category, description, frequency, created_at, updated_at)
VALUES (
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6))),
  'EMR',
  'emr',
  '전자의무기록(Electronic Medical Record). 환자의 진료 기록을 전자적으로 관리하는 시스템으로, 병원 정보화의 핵심 인프라입니다.',
  15,
  datetime('now'),
  datetime('now')
);
```

> 참고: FTS5 인덱스(`terms_fts`)는 `src/db/index.ts`의 트리거로 자동 동기화됩니다. 직접 삽입 후 앱 재시작이 필요할 수 있습니다.

### 검증 항목

- ⬜ 용어 데이터가 있는 상태에서 `/dictionary` 접속 → 빈도 트렌드 태그 표시 확인
- ⬜ 검색어 입력 → 검색 결과 카드 목록 표시 (용어명, 카테고리 뱃지, 해설 미리보기 200자, 빈도, 최근 갱신일)
- ⬜ 카테고리 필터 버튼 클릭 → 해당 카테고리 결과만 표시
- ⬜ 트렌드 태그 클릭 → `/dictionary/{id}` 용어 상세 화면 이동 확인
- ⬜ 용어 상세 화면에서 해설 전문 표시 (줄임 없이 전체 표시)
- ⬜ 용어 상세 화면에서 출처 메일 목록 표시 (메일 제목, 수신 일시)
- ⬜ 뒤로가기 버튼 → 이전 화면 복귀
- ⬜ 20건 초과 데이터 환경에서 페이지네이션 동작 확인
- ⬜ 모바일(360px) 레이아웃 — 검색 입력, 카테고리 필터, 결과 카드 확인

---

## Sprint 8 이월 사항

Sprint 8(업무지원 상세 + 대시보드 연동)에서 처리 예정인 항목입니다.

- ⬜ `/work/[id]` 업무지원 상세 화면 구현 (T8-1)
- ⬜ 대시보드 → 업무지원 상세 연동 (T8-2)
- ⬜ 업무지원 상세 → 용어 상세 연동 (T8-3)
- ⬜ 전체 화면 네비게이션 검증 (T8-4)
- ⬜ 날짜/시간 표시 통일 "YYYY-MM-DD HH:mm" (T8-5) — `formatDate` 유틸리티 공통화 포함

### 코드 리뷰 이슈 이월 (Sprint 9 수정 권장)

- ⬜ M-01: `terms/[id]/route.ts` — `.orderBy()` + `.reverse()` 패턴을 `desc()` 로 수정
- ⬜ M-02: `search/route.ts` — 전체 쿼리에 `deleted_at IS NULL` 조건 필요 여부 스키마 재검토
- ⬜ M-03: `dictionary/page.tsx` — API 실패 시 사용자 toast 피드백 추가
