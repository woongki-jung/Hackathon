# Sprint 6 코드 리뷰 보고서

**리뷰 일자:** 2026-03-15
**리뷰 대상 브랜치:** sprint6
**커밋:** 47a27b9 feat: Sprint 6 - 용어 분석 파이프라인 (Gemini API 연동)

## 리뷰 대상 파일

| 파일 | 설명 |
|------|------|
| `src/lib/analysis/pii-filter.ts` | 개인정보 마스킹 |
| `src/lib/analysis/gemini-client.ts` | Gemini API 래퍼 |
| `src/lib/analysis/stopword-filter.ts` | 불용어 필터링 |
| `src/lib/analysis/term-extractor.ts` | 용어 추출 + 분류 |
| `src/lib/analysis/description-generator.ts` | 메일 요약 + 후속 작업 |
| `src/lib/analysis/batch-analyzer.ts` | 배치 오케스트레이터 |
| `src/lib/dictionary/dictionary-store.ts` | 용어 사전 저장소 |
| `src/lib/mail/mail-batch.ts` | Phase 2 분석 연동 (수정) |

---

## Critical 이슈

없음.

---

## High 이슈

없음.

---

## Medium 이슈

### M-01: `mail-batch.ts` — JSDoc 주석 미업데이트

**위치:** `src/lib/mail/mail-batch.ts` 17–20행 (함수 설명 주석)

**내용:**
```
// Phase 2: SEEN 플래그 설정 (Sprint 6 분석 파이프라인 연동 예정)
```
JSDoc 주석이 Sprint 5 기준 내용으로 남아 있고, 실제 구현(Phase 2에서 `runBatchAnalysis()` 호출)이 반영되지 않았습니다. 코드 동작에는 영향이 없으나, 주석과 구현 간의 불일치가 유지보수 시 혼란을 야기할 수 있습니다.

**권장 조치:** Sprint 7 시작 전 JSDoc 주석을 실제 구현 내용에 맞게 업데이트.

---

### M-02: `batch-analyzer.ts` — 병렬 Gemini API 호출 Rate Limit 위험

**위치:** `src/lib/analysis/batch-analyzer.ts` 61–63행

**내용:**
```typescript
const [terms, mailAnalysis] = await Promise.all([
  extractTerms(cleanText),
  generateMailAnalysis(cleanText),
]);
```
단일 파일에 대해 `extractTerms`와 `generateMailAnalysis`를 병렬로 호출합니다. 개별 파일 처리 속도는 빠르지만, 여러 파일을 순차 처리하는 배치 환경에서 파일당 2개의 동시 Gemini 호출이 발생합니다. 메일 수가 많아지면 Rate Limit 초과 위험이 증가합니다.

**권장 조치:** 현재는 허용 범위이나, 처리 파일 수가 증가하면 순차 호출로 전환하거나 호출 간 딜레이를 추가 검토.

---

### M-03: `dictionary-store.ts` — SELECT-then-UPDATE 비원자성

**위치:** `src/lib/dictionary/dictionary-store.ts` 65–107행

**내용:**
`saveTerm`에서 `existing` 조회 후 UPDATE/INSERT를 별도 문으로 실행합니다. better-sqlite3는 동기식이므로 단일 프로세스에서는 동시성 문제가 없지만, 트랜잭션으로 묶지 않으면 프로세스 비정상 종료 시 partial write 가능성이 있습니다.

**권장 조치:** `db.transaction()` 블록으로 SELECT~INSERT/UPDATE~SourceFile INSERT를 묶는 것을 Sprint 9에서 검토.

---

### M-04: `dictionary-store.ts` — 파일 저장 후 DB 재조회 (불필요한 쿼리)

**위치:** `src/lib/dictionary/dictionary-store.ts` 124–126행

**내용:**
```typescript
const latest = db.select().from(terms).where(eq(terms.id, termId)).get();
```
마크다운 파일 생성을 위해 방금 INSERT/UPDATE한 데이터를 다시 SELECT합니다. `frequency` 값을 로컬 변수(`newFrequency` 또는 `1`)로 관리하면 불필요한 쿼리를 제거할 수 있습니다.

**권장 조치:** Sprint 9 기술 부채 정리 시 최적화 검토.

---

### M-05: `pii-filter.ts` — 주민등록번호 공백 구분자 미처리

**위치:** `src/lib/analysis/pii-filter.ts` 11행

**내용:**
```typescript
{ pattern: /\d{6}[.\-]\d{7}/g, replacement: '[ID_NUM]' },
```
주민등록번호 구분자로 `.`와 `-`만 허용합니다. 계획서에는 공백(`\s`)도 포함하도록 설계되었으나 구현에서 누락되었습니다. 공백 구분 주민번호(`123456 1234567`)는 마스킹되지 않습니다.

**권장 조치:** Sprint 9 접근성/에러처리 스프린트에서 패턴 보완.

---

## Suggestion (낮음)

### S-01: `gemini-client.ts` — `generateContent` 함수명 중복 가능성

`@google/generative-ai` SDK 내부 메서드명(`generateContent`)과 동일한 이름을 export 함수명으로 사용하고 있어, 같은 파일에서 SDK를 직접 import할 경우 네이밍 충돌 가능성이 있습니다. 현재 구현에서는 문제없으나, `callGemini` 또는 `askGemini`처럼 고유한 이름이 더 명확합니다.

### S-02: `stopword-filter.ts` — 불용어 매번 DB 조회

`getStopWords()`가 호출될 때마다 DB 쿼리를 실행합니다. 불용어는 서버 실행 중 거의 변경되지 않으므로, 모듈 레벨 캐싱(또는 TTL 캐싱)을 적용하면 배치 처리 성능이 개선됩니다.

### S-03: `term-extractor.ts` — 프롬프트 상수 인라인 선언

`EXTRACTION_PROMPT`가 모듈 상단에 화살표 함수로 선언되어 있어 재사용성은 높지만, 여러 파일에서 유사 프롬프트가 등장할 경우 `src/lib/analysis/prompts.ts`로 프롬프트를 집중 관리하는 구조가 유지보수에 유리합니다.

---

## 종합 평가

Sprint 6 구현은 전반적으로 계획서의 요구사항을 충실히 반영하였습니다. 모듈 분리가 명확하고 에러 처리(GeminiError 계층, API 키 미설정 시 graceful skip)가 잘 구현되었습니다. Critical/High 이슈는 없으며, 발견된 Medium 이슈 5건은 모두 기능적 결함이 아닌 견고성 및 유지보수성 관련 사항입니다. Sprint 9 기술 부채 정리 시 순차적으로 해결 권장합니다.

| 등급 | 건수 |
|------|------|
| Critical | 0 |
| High | 0 |
| Medium | 5 |
| Suggestion | 3 |
