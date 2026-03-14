# Sprint 4 코드 리뷰 보고서

- **리뷰 일자**: 2026-03-15
- **리뷰 대상 브랜치**: sprint4
- **리뷰 범위**: main...sprint4 변경사항 (6개 파일)

---

## 리뷰 대상 파일

| 파일 | 변경 유형 |
|------|-----------|
| `src/lib/logger/index.ts` | 신규 |
| `src/app/api/mail/status/route.ts` | 신규 |
| `src/app/api/analysis/latest/route.ts` | 신규 |
| `src/app/api/analysis/history/route.ts` | 신규 |
| `src/app/api/mail/check/route.ts` | 신규 |
| `src/app/(authenticated)/dashboard/page.tsx` | 전면 교체 |

---

## Critical 이슈

없음.

---

## High 이슈

없음.

---

## Medium 이슈

### M-01: `analysis/history` — 전체 건수 조회 비효율

**파일**: `src/app/api/analysis/history/route.ts` (46번 줄)

```ts
const total = (db.select({ id: analysisQueue.id }).from(analysisQueue).all()).length;
```

**문제**: 전체 행을 메모리에 로드한 뒤 `.length`로 카운트합니다. 데이터가 수천 건 이상으로 늘어나면 불필요한 메모리 사용이 발생합니다.

**권장**: `count()` 집계 함수 사용으로 교체.

```ts
import { count } from 'drizzle-orm';
const [{ total }] = db.select({ total: count() }).from(analysisQueue).all();
```

**Sprint 5 이전에 수정 권장** — 배치 파이프라인 구현 후 이력 건수가 급증할 수 있습니다.

---

### M-02: `logger/index.ts` — `info` 레벨이 프로덕션에서도 출력

**파일**: `src/lib/logger/index.ts` (26번 줄)

```ts
} else if (process.env.NODE_ENV !== 'production' || level !== 'debug') {
```

**문제**: 조건 논리상 `info`/`warn` 레벨은 프로덕션에서도 `console.log`로 출력됩니다. 이는 스프린트 계획 요구사항("프로덕션에서는 error/warn만 출력")과 불일치합니다.

**권장**:
```ts
if (process.env.NODE_ENV === 'production' && (level === 'debug' || level === 'info')) return;
```

**판단**: 현재 개발 단계에서 info 로그가 출력되어도 서비스 영향은 없습니다. Sprint 9(안정화) 시점에 정책에 맞게 조정하면 충분합니다.

---

### M-03: `dashboard/page.tsx` — `fetchMe()`와 `loadAll()`이 병렬이지만 별도 호출

**파일**: `src/app/(authenticated)/dashboard/page.tsx` (81~85번 줄)

```ts
useEffect(() => {
  loadAll(1);
  fetchMe();
}, []);
```

**문제**: `loadAll`은 3개 API를 `Promise.all`로 병렬 호출하지만, `fetchMe`(`/api/auth/me`)는 별도 함수로 분리되어 있어 코드 흐름 추적이 다소 어렵습니다. `loadAll` 내부의 `Promise.all`에 포함시키면 더 일관성 있습니다.

**판단**: 기능적 문제는 없습니다. Sprint 8 대시보드 연동 완성 시 리팩토링 검토.

---

## Low 이슈 (Suggestion)

### S-01: `dashboard/page.tsx` — 날짜 포맷 함수 인라인 정의

**파일**: `src/app/(authenticated)/dashboard/page.tsx`

`formatDate` 함수가 페이지 컴포넌트 파일 내에 정의되어 있습니다. Sprint 8 계획(공통 유틸리티 분리)에 이미 반영되어 있으므로 현재는 허용.

---

### S-02: `mail/check/route.ts` — `setTimeout` 대신 `Promise.resolve().then()` 사용

**파일**: `src/app/api/mail/check/route.ts` (26~29번 줄)

스프린트 계획서에는 `Promise.resolve().then(async () => {...})` 패턴을 명시했으나 구현은 `setTimeout`을 사용했습니다. 두 방식 모두 비동기 플레이스홀더 역할에는 동등하며, Sprint 5에서 실제 배치 로직으로 교체될 예정이므로 현재는 문제없습니다.

---

## 종합 평가

| 항목 | 평가 |
|------|------|
| 인증/인가 처리 | 양호 — 세션 검증 패턴이 일관적으로 적용됨 |
| API 응답 구조 | 양호 — `{ success, data, message }` 형식 통일 |
| 에러 처리 | 양호 — try/catch + 500 응답 패턴 일관적 |
| 타입 안전성 | 양호 — TypeScript 인터페이스가 명확히 정의됨 |
| 스프린트 계획 준수 | 양호 — T4-5 플레이스홀더 명시 및 TODO 주석 포함 |
| 성능 | 개선 필요 — M-01 이슈 (카운트 쿼리 최적화) |

**결론**: Critical/High 이슈 없음. M-01(카운트 쿼리)은 Sprint 5 배치 파이프라인 구현 전 수정 권장.
