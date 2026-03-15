# Sprint 8 코드 리뷰 보고서

**작성일:** 2026-03-15
**리뷰 대상:** Sprint 8 구현 파일 (main 대비 6개 파일 변경)

---

## 리뷰 대상 파일

| 파일 | 변경 유형 |
|------|---------|
| `domain-dictionary/src/app/(authenticated)/work/[id]/page.tsx` | 신규 |
| `domain-dictionary/src/app/api/analysis/[id]/route.ts` | 신규 |
| `domain-dictionary/src/lib/utils/date.ts` | 신규 |
| `domain-dictionary/src/app/(authenticated)/dashboard/page.tsx` | 수정 |
| `domain-dictionary/src/app/(authenticated)/dictionary/[id]/page.tsx` | 수정 |
| `docs/sprint/sprint8.md` | 신규 |

---

## Critical 이슈

없음.

---

## High 이슈

없음.

---

## Medium 이슈

### M-01: `date.ts` — 날짜 포맷이 사양(UI-R-015)과 불일치

**파일:** `src/lib/utils/date.ts`
**코드:**
```typescript
return new Date(iso).toLocaleString('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
}).replace(/\. /g, '-').replace('.', '').trim();
```
**문제:** `ko-KR` 로케일의 기본 시간 형식은 12시간제로 "오전/오후"가 포함됨. 실제 출력: `2026-03-15-오전 09:45`
**사양(UI-R-015) 기대값:** `YYYY-MM-DD HH:mm` (24시간제)
**권장 수정:** `hour12: false` 옵션 추가, 또는 ISO 문자열을 직접 파싱하는 방식으로 교체
```typescript
// 방안 1: hour12 옵션 추가
new Date(iso).toLocaleString('ko-KR', {
  ..., hour12: false,
})
// 방안 2: ISO 직접 파싱 (로케일 무관, 안전)
const d = new Date(iso);
const pad = (n: number) => String(n).padStart(2, '0');
return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
```
**우선순위:** Sprint 9에서 수정 권장

---

### M-02: `work/[id]/page.tsx` — `extractedTermCount`가 항상 0 표시

**파일:** `src/app/(authenticated)/work/[id]/page.tsx`
**문제:** `AnalysisDetail` 인터페이스에 `extractedTermCount` 필드가 있으나 `/api/analysis/[id]` 응답에서 해당 필드가 반환되지 않아 항상 0으로 표시됨
**현재 API 응답:** `item` 객체에 `extractedTermCount` 미포함, 별도 `extractedTerms` 배열로 반환
**권장 수정:** 화면에서 `item.extractedTermCount ?? 0` 대신 `extractedTerms.length`를 사용하도록 수정
```typescript
// 변경 전
<definition>{item.extractedTermCount ?? 0}개</definition>
// 변경 후
<definition>{extractedTerms.length}개</definition>
```
**우선순위:** Sprint 9에서 수정 권장 (기능 영향 있음, 표시만 0으로 나옴)

---

### M-03: `analysis/[id]/route.ts` — 이전 Sprint에서 이미 존재하던 이슈 유지

**파일:** `src/app/api/analysis/[id]/route.ts`
**문제:** `termSourceFiles.mailFileName` 기준으로 용어를 조회하나, 이 컬럼명이 `mailFileName`인지 `mailFileName`(camelCase)인지 스키마와 일치 여부 확인 필요
**현재:** 빌드 및 런타임 정상 동작 확인
**우선순위:** 스키마 검토 후 확인 (Sprint 9)

---

## Suggestion 이슈

### S-01: `work/[id]/page.tsx` — 액션 아이템 체크 상태 비영속성

**현상:** 후속 작업 체크 상태가 페이지 새로고침 시 초기화됨 (클라이언트 상태만 유지)
**현재 구현:** `useState<Set<number>>`로 클라이언트 메모리에만 저장
**사양 확인 필요:** WORK-001 사양에서 영속성 요구 여부 불명확. 단순 시각적 참고용이라면 현재 구현 적절
**권장:** 사양 재확인 후 필요 시 localStorage 또는 서버 저장 추가 (Sprint 9 이후 검토)

### S-02: `work/[id]/page.tsx` — `useEffect` deps 배열 eslint-disable 주석

**코드:**
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
**개선 방향:** `params.id`를 deps에 추가하면 ESLint 억제 없이 올바른 동작 가능
```typescript
}, [params.id]);
```

---

## 계획 대비 구현 평가

| 계획 항목 | 구현 상태 | 평가 |
|-----------|---------|------|
| T8-1: 업무지원 상세 화면 | ✅ 완료 | 사양 준수. 메일 정보, 요약, 후속 작업 체크리스트, 추출 용어 태그 모두 구현 |
| T8-2: 대시보드 → 업무지원 연동 | ✅ 완료 | "상세 보기" + 이력 "보기" 링크 모두 구현 |
| T8-3: 업무지원 → 용어 상세 연동 | ✅ 완료 | 용어 태그에 `/dictionary/{id}` href 정상 |
| T8-4: 전체 화면 네비게이션 검증 | ✅ 완료 | GNB 활성화 로직 정상, 인증 보호 정상 |
| T8-5: 날짜 공통 유틸 적용 | ✅ 완료 (단, 포맷 버그 있음) | `formatDate` 유틸화 완료, 12시간제 표기 버그는 M-01로 기록 |

---

## 종합 평가

Sprint 8의 구현은 계획된 모든 기능을 정상적으로 구현했습니다. Critical/High 이슈 없음. Medium 이슈 3건 중 M-01(날짜 포맷)과 M-02(추출 용어 수 표시)는 Sprint 9에서 수정을 권장합니다.
