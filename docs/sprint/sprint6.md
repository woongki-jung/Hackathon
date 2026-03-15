# Sprint 6: 용어 분석 파이프라인 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 메일 텍스트에서 Gemini API를 사용하여 업무 용어를 자동으로 추출하고 해설을 생성하여 DB 및 파일로 저장하는 전체 분석 파이프라인을 구현한다.

**Architecture:** PII 필터링 → Gemini API 용어 추출 → 불용어 제거 → 해설 생성 → DB/파일 저장의 순차 파이프라인. 각 단계는 독립 모듈로 분리하고, batch-analyzer.ts가 전체를 오케스트레이션한다. mail-batch.ts Phase 2에 분석 단계를 연동한다.

**Tech Stack:** @google/generative-ai (Gemini API), better-sqlite3 + Drizzle ORM, Node.js fs (파일 저장), TypeScript

---

## 스프린트 개요

| 항목 | 내용 |
|------|------|
| 스프린트 번호 | Sprint 6 |
| 기간 | 2주 |
| Phase | Phase 3 (백엔드 핵심 로직) |
| 브랜치 | `sprint6` |
| 소스 루트 | `D:\Study\Hackathon\domain-dictionary` |

## 구현 범위

### 포함 항목
- T6-1: 개인정보 필터링 (TERM-PII-001)
- T6-2: Gemini API 호출 래퍼
- T6-3: 용어 추출 기능 (TERM-EXT-001) — 용어 분류(T6-5) 포함
- T6-4: 불용어 필터링 (TERM-EXT-002)
- T6-6: 해설 생성 기능 (TERM-GEN-001) — 메일 요약 + 후속 작업 + 용어별 해설
- T6-7: 용어 사전 저장소 (DATA-DICT-001)
- T6-8: 배치 분석 오케스트레이션 (TERM-BATCH-001) + mail-batch.ts Phase 2 연동

### 제외 항목
- 용어 검색 UI (Sprint 7)
- 용어 사전 뷰어 화면 (Sprint 7)
- 용어 사전 백업 기능 (Sprint 9)

## 기존 파일 참조 (수정 없이 재사용)

| 파일 | 재사용 내용 |
|------|------------|
| `src/lib/http/retry.ts` | `withRetry` — Gemini API 재시도 |
| `src/lib/logger/index.ts` | `logger` — 전 모듈 로깅 |
| `src/lib/fs/file-manager.ts` | `writeFile` — 용어 해설집 파일 저장 |
| `src/lib/config/settings-service.ts` | `getSetting('analysis.model')` — 모델명 조회 |
| `src/lib/mail/mail-batch.ts` | Phase 2 분석 단계 연동 |
| `src/db/index.ts` | `db` — DB 연결 |
| `src/db/schema.ts` | `terms`, `termSourceFiles`, `stopWords`, `analysisQueue` |

## 환경변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `GEMINI_API_KEY` | Gemini API 인증 키 | `AIzaSy...` |
| `GEMINI_MODEL` | 기본 모델명 (설정 DB 없을 때 폴백) | `gemini-3.1-pro-preview` |
| `GLOSSARY_STORAGE_PATH` | 용어 해설집 저장 경로 | `./data/terms` |

---

## Task 목록

### Task 1: T6-1 — 개인정보 필터링 (pii-filter.ts)

**Files:**
- Create: `src/lib/analysis/pii-filter.ts`

**개요:** 메일 텍스트에서 이메일 주소, 전화번호, 주민등록번호 패턴을 `[REDACTED]`로 마스킹한다.

**Step 1: 파일 생성**

```typescript
// src/lib/analysis/pii-filter.ts
// TERM-PII-001: 개인정보 필터링

/** 개인정보 패턴 목록 */
const PII_PATTERNS: { pattern: RegExp; label: string }[] = [
  // 이메일 주소
  {
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    label: 'email',
  },
  // 한국 전화번호 (010-0000-0000, 02-000-0000, 0X0-000-0000)
  {
    pattern: /0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
    label: 'phone',
  },
  // 주민등록번호 (6자리-7자리, 앞뒤 공백/하이픈 구분)
  {
    pattern: /\d{6}[-\s]?\d{7}/g,
    label: 'rrn',
  },
];

/**
 * 텍스트에서 개인정보 패턴을 마스킹합니다.
 * @param text 원본 텍스트
 * @returns 마스킹된 텍스트
 */
export function filterPii(text: string): string {
  let result = text;
  for (const { pattern } of PII_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}
```

**Step 2: 커밋**

```bash
git add src/lib/analysis/pii-filter.ts
git commit -m "feat: T6-1 개인정보 필터링 모듈 구현 (TERM-PII-001)"
```

---

### Task 2: T6-2 — Gemini API 호출 래퍼 (gemini-client.ts)

**Files:**
- Create: `src/lib/analysis/gemini-client.ts`
- Reference: `src/lib/http/retry.ts` (withRetry 재사용)
- Reference: `src/lib/config/settings-service.ts` (analysis.model 조회)

**개요:** @google/generative-ai SDK를 감싸는 래퍼. API 키 미설정 시 명시적 에러, 모델명은 DB 설정 우선, 재시도 자동 적용.

**Step 1: 파일 생성**

```typescript
// src/lib/analysis/gemini-client.ts
// Gemini API 호출 래퍼

import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from '@/lib/http/retry';
import { getSetting } from '@/lib/config/settings-service';
import { logger } from '@/lib/logger';

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly code: 'NO_API_KEY' | 'API_ERROR' | 'PARSE_ERROR'
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

/**
 * 모델명을 결정합니다. DB 설정 > GEMINI_MODEL 환경변수 > 기본값 순.
 */
async function resolveModelName(): Promise<string> {
  const dbModel = await getSetting('analysis.model');
  return dbModel || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
}

/**
 * Gemini API에 텍스트 프롬프트를 전송하고 텍스트 응답을 반환합니다.
 * API 키 미설정 시 GeminiApiError(NO_API_KEY)를 던집니다.
 * 네트워크/API 오류는 최대 3회 재시도합니다.
 */
export async function generateText(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiApiError('GEMINI_API_KEY가 설정되지 않았습니다.', 'NO_API_KEY');
  }

  const modelName = await resolveModelName();
  logger.debug('[gemini-client] API 호출', { modelName, promptLength: prompt.length });

  const response = await withRetry(async () => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    return result.response.text();
  });

  logger.debug('[gemini-client] 응답 수신', { responseLength: response.length });
  return response;
}
```

**Step 2: 커밋**

```bash
git add src/lib/analysis/gemini-client.ts
git commit -m "feat: T6-2 Gemini API 호출 래퍼 구현"
```

---

### Task 3: T6-4 — 불용어 필터링 (stopword-filter.ts)

**Files:**
- Create: `src/lib/analysis/stopword-filter.ts`
- Reference: `src/db/index.ts`, `src/db/schema.ts` (stopWords 테이블)

**개요:** stop_words 테이블에서 불용어 목록을 조회하여, 추출된 용어 배열에서 불용어를 제거한다. stop_words 테이블이 비어 있으면 필터링 없이 원본 반환.

**Step 1: 파일 생성**

```typescript
// src/lib/analysis/stopword-filter.ts
// TERM-EXT-002: 불용어 필터링

import { db } from '@/db';
import { stopWords } from '@/db/schema';
import { logger } from '@/lib/logger';

/**
 * stop_words 테이블에서 불용어 목록을 조회합니다.
 * 대소문자 구분 없이 비교하기 위해 소문자로 정규화합니다.
 */
function loadStopWords(): Set<string> {
  const rows = db.select({ word: stopWords.word }).from(stopWords).all();
  return new Set(rows.map((r) => r.word.toLowerCase()));
}

/**
 * 추출된 용어 목록에서 불용어를 제거합니다.
 * @param termNames 추출된 용어명 배열
 * @returns 불용어가 제거된 용어명 배열
 */
export function filterStopWords(termNames: string[]): string[] {
  const stopWordSet = loadStopWords();
  if (stopWordSet.size === 0) {
    return termNames;
  }

  const filtered = termNames.filter((name) => !stopWordSet.has(name.toLowerCase()));
  const removed = termNames.length - filtered.length;
  if (removed > 0) {
    logger.debug('[stopword-filter] 불용어 제거', { removed, total: termNames.length });
  }
  return filtered;
}
```

**Step 2: 커밋**

```bash
git add src/lib/analysis/stopword-filter.ts
git commit -m "feat: T6-4 불용어 필터링 모듈 구현 (TERM-EXT-002)"
```

---

### Task 4: T6-3/T6-5 — 용어 추출 + 분류 (term-extractor.ts)

**Files:**
- Create: `src/lib/analysis/term-extractor.ts`
- Reference: `src/lib/analysis/gemini-client.ts`
- Reference: `src/lib/analysis/stopword-filter.ts`

**개요:** 메일 본문에서 EMR/비즈니스/약어/일반 카테고리로 용어를 추출한다. Gemini에게 JSON 배열 형식으로 응답을 요청하고 파싱한다. 불용어 필터링을 거쳐 최종 용어 목록을 반환한다.

**Step 1: 파일 생성**

```typescript
// src/lib/analysis/term-extractor.ts
// TERM-EXT-001: 용어 추출 + TERM-CLS-001: 용어 분류

import { generateText, GeminiApiError } from './gemini-client';
import { filterStopWords } from './stopword-filter';
import { logger } from '@/lib/logger';

export type TermCategory = 'emr' | 'business' | 'abbreviation' | 'general';

export interface ExtractedTerm {
  name: string;
  category: TermCategory;
  /** Gemini가 생성한 초기 해설 (term-extractor 단계에서 생성) */
  description: string;
}

const VALID_CATEGORIES: TermCategory[] = ['emr', 'business', 'abbreviation', 'general'];

function isValidCategory(value: string): value is TermCategory {
  return VALID_CATEGORIES.includes(value as TermCategory);
}

/**
 * JSON 응답 문자열에서 코드 블록 마커를 제거하고 파싱합니다.
 */
function parseJsonResponse(raw: string): unknown {
  // ```json ... ``` 또는 ``` ... ``` 블록 제거
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

function buildExtractionPrompt(mailText: string): string {
  return `당신은 의료 정보 시스템(EMR) 및 병원 업무 전문가입니다.
아래 메일 본문에서 업무 용어를 추출하고 분류하세요.

## 분류 기준
- emr: 전자의무기록, 의료 시스템, 진료 관련 용어 (예: CPOE, EMR, OCS, 처방전달)
- business: 병원 행정, 경영, 업무 프로세스 용어 (예: 원무, 수납, 청구, 보험심사)
- abbreviation: 약어 (예: ICU, EHR, ADT, NPO)
- general: 위 분류에 해당하지 않는 일반 전문 용어

## 출력 형식
반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요.
[
  {"name": "용어명", "category": "emr|business|abbreviation|general", "description": "한국어 해설 (2~3문장)"},
  ...
]

## 메일 본문
${mailText}

## 주의사항
- 일반적인 한국어 단어(예: "결과", "확인", "업무")는 제외하세요.
- 전문 용어, 시스템 명칭, 의료 용어, 약어만 포함하세요.
- 최대 20개까지만 추출하세요.
- 용어가 없으면 빈 배열 []을 반환하세요.`;
}

/**
 * 메일 본문에서 업무 용어를 추출하고 분류합니다.
 * 불용어 필터링을 포함합니다.
 * @throws GeminiApiError API 키 미설정 또는 API 오류 시
 */
export async function extractTerms(mailText: string): Promise<ExtractedTerm[]> {
  const prompt = buildExtractionPrompt(mailText);

  let raw: string;
  try {
    raw = await generateText(prompt);
  } catch (err) {
    if (err instanceof GeminiApiError && err.code === 'NO_API_KEY') {
      throw err; // API 키 미설정은 상위에서 처리
    }
    logger.error('[term-extractor] Gemini 호출 실패', { error: String(err) });
    throw err;
  }

  // JSON 파싱
  let parsed: unknown;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    logger.error('[term-extractor] JSON 파싱 실패', { raw: raw.slice(0, 200) });
    throw new GeminiApiError(`JSON 파싱 실패: ${raw.slice(0, 100)}`, 'PARSE_ERROR');
  }

  if (!Array.isArray(parsed)) {
    throw new GeminiApiError('응답이 배열 형식이 아닙니다.', 'PARSE_ERROR');
  }

  // 유효성 검증 및 카테고리 정규화
  const terms: ExtractedTerm[] = [];
  for (const item of parsed) {
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).description === 'string'
    ) {
      const rawCat = String((item as Record<string, unknown>).category ?? '');
      const category: TermCategory = isValidCategory(rawCat) ? rawCat : 'general';
      terms.push({
        name: String((item as Record<string, unknown>).name).trim(),
        category,
        description: String((item as Record<string, unknown>).description).trim(),
      });
    }
  }

  // 불용어 필터링
  const termNames = terms.map((t) => t.name);
  const filteredNames = new Set(filterStopWords(termNames));
  const filtered = terms.filter((t) => filteredNames.has(t.name));

  logger.info('[term-extractor] 용어 추출 완료', {
    total: terms.length,
    afterFilter: filtered.length,
  });

  return filtered;
}
```

**Step 2: 커밋**

```bash
git add src/lib/analysis/term-extractor.ts
git commit -m "feat: T6-3/T6-5 용어 추출 및 분류 모듈 구현 (TERM-EXT-001, TERM-CLS-001)"
```

---

### Task 5: T6-6 — 해설 생성 (description-generator.ts)

**Files:**
- Create: `src/lib/analysis/description-generator.ts`
- Reference: `src/lib/analysis/gemini-client.ts`

**개요:** 메일 텍스트를 입력받아 요약(500자 이내)과 후속 작업 제안(최대 5개)을 생성한다. 용어 추출 단계에서 이미 해설이 생성되므로, 이 모듈은 메일 단위 요약과 action_items에 집중한다.

**Step 1: 파일 생성**

```typescript
// src/lib/analysis/description-generator.ts
// TERM-GEN-001: 메일 요약 및 후속 작업 생성

import { generateText, GeminiApiError } from './gemini-client';
import { logger } from '@/lib/logger';

export interface MailSummaryResult {
  summary: string;
  actionItems: string[];
}

/**
 * JSON 응답 문자열에서 코드 블록 마커를 제거하고 파싱합니다.
 */
function parseJsonResponse(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(cleaned);
}

function buildSummaryPrompt(mailText: string): string {
  return `당신은 병원 업무 전문가입니다.
아래 메일을 분석하여 요약과 후속 작업을 추출하세요.

## 출력 형식
반드시 아래 JSON 형식으로만 응답하세요. 다른 설명 없이 JSON만 출력하세요.
{
  "summary": "메일 핵심 내용 요약 (500자 이내, 한국어)",
  "actionItems": [
    "후속 작업 1",
    "후속 작업 2"
  ]
}

## 주의사항
- summary는 500자를 초과하지 않아야 합니다.
- actionItems는 최대 5개까지만 포함하세요.
- 후속 작업이 없으면 actionItems를 빈 배열로 반환하세요.
- 반드시 한국어로 작성하세요.

## 메일 본문
${mailText}`;
}

/**
 * 메일 텍스트에서 요약과 후속 작업을 생성합니다.
 * @throws GeminiApiError API 키 미설정 또는 파싱 오류 시
 */
export async function generateMailSummary(mailText: string): Promise<MailSummaryResult> {
  const prompt = buildSummaryPrompt(mailText);
  const raw = await generateText(prompt);

  let parsed: unknown;
  try {
    parsed = parseJsonResponse(raw);
  } catch {
    logger.error('[description-generator] JSON 파싱 실패', { raw: raw.slice(0, 200) });
    throw new GeminiApiError(`요약 JSON 파싱 실패: ${raw.slice(0, 100)}`, 'PARSE_ERROR');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).summary !== 'string'
  ) {
    throw new GeminiApiError('요약 응답 형식이 올바르지 않습니다.', 'PARSE_ERROR');
  }

  const obj = parsed as Record<string, unknown>;
  const summary = String(obj.summary).slice(0, 500);
  const rawItems = Array.isArray(obj.actionItems) ? obj.actionItems : [];
  const actionItems = rawItems
    .filter((item) => typeof item === 'string')
    .map((item) => String(item).trim())
    .slice(0, 5);

  logger.info('[description-generator] 요약 생성 완료', {
    summaryLength: summary.length,
    actionItemCount: actionItems.length,
  });

  return { summary, actionItems };
}
```

**Step 2: 커밋**

```bash
git add src/lib/analysis/description-generator.ts
git commit -m "feat: T6-6 메일 요약 및 후속 작업 생성 모듈 구현 (TERM-GEN-001)"
```

---

### Task 6: T6-7 — 용어 사전 저장소 (dictionary-store.ts)

**Files:**
- Create: `src/lib/dictionary/dictionary-store.ts`
- Reference: `src/db/index.ts`, `src/db/schema.ts`
- Reference: `src/lib/fs/file-manager.ts` (writeFile)
- Reference: `src/lib/analysis/term-extractor.ts` (ExtractedTerm 타입)

**개요:** 추출된 용어를 terms 테이블에 저장 또는 갱신하고, `./data/terms/{용어}.md` 파일을 생성한다. 기존 용어는 frequency를 증가시키고 해설을 갱신한다. term_source_files에 출처 메일을 기록한다. FTS5 트리거는 DB가 자동으로 처리하므로 별도 조작 불필요.

**Step 1: 파일 생성**

```typescript
// src/lib/dictionary/dictionary-store.ts
// DATA-DICT-001: 용어 사전 저장소

import path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { terms, termSourceFiles } from '@/db/schema';
import { writeFile } from '@/lib/fs/file-manager';
import { logger } from '@/lib/logger';
import type { ExtractedTerm } from '@/lib/analysis/term-extractor';

const GLOSSARY_DIR = process.env.GLOSSARY_STORAGE_PATH ?? './data/terms';

export interface TermSourceInfo {
  mailFileName: string;
  mailSubject: string | null;
  mailReceivedAt: string | null;
}

/**
 * 용어 해설집 마크다운 파일 내용을 생성합니다.
 */
function buildGlossaryMarkdown(term: ExtractedTerm): string {
  const now = new Date().toISOString().slice(0, 10);
  return `# ${term.name}

**카테고리:** ${term.category}

## 해설

${term.description}

---
*최종 갱신: ${now}*
`;
}

/**
 * 단일 용어를 DB에 저장하거나 기존 용어를 갱신합니다.
 * 동시에 용어 해설집 파일을 생성/갱신합니다.
 * @returns 저장된 용어의 DB id
 */
export function upsertTerm(
  term: ExtractedTerm,
  source: TermSourceInfo
): string {
  const now = new Date().toISOString();
  const safeFileName = term.name.replace(/[/\\?%*:|"<>]/g, '_');
  const filePath = path.join(GLOSSARY_DIR, `${safeFileName}.md`);

  // 기존 용어 조회
  const existing = db
    .select()
    .from(terms)
    .where(eq(terms.name, term.name))
    .get();

  let termId: string;

  if (existing) {
    // 기존 용어 갱신: frequency 증가, 해설 갱신, 출처 갱신
    db.update(terms)
      .set({
        description: term.description,
        category: term.category,
        filePath,
        frequency: (existing.frequency ?? 1) + 1,
        lastSourceMailSubject: source.mailSubject,
        lastSourceMailDate: source.mailReceivedAt,
        updatedAt: now,
      })
      .where(eq(terms.id, existing.id))
      .run();

    termId = existing.id;
    logger.debug('[dictionary-store] 용어 갱신', { name: term.name, frequency: (existing.frequency ?? 1) + 1 });
  } else {
    // 신규 용어 등록
    const inserted = db
      .insert(terms)
      .values({
        name: term.name,
        category: term.category,
        description: term.description,
        filePath,
        frequency: 1,
        lastSourceMailSubject: source.mailSubject,
        lastSourceMailDate: source.mailReceivedAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: terms.id })
      .get();

    termId = inserted.id;
    logger.info('[dictionary-store] 신규 용어 등록', { name: term.name, category: term.category });
  }

  // 출처 파일 기록 (중복 시 무시 — uniqueIndex로 보장)
  try {
    db.insert(termSourceFiles)
      .values({
        termId,
        mailFileName: source.mailFileName,
        mailSubject: source.mailSubject,
        mailReceivedAt: source.mailReceivedAt,
        createdAt: now,
      })
      .run();
  } catch {
    // 이미 기록된 출처 — 무시
  }

  // 용어 해설집 파일 저장
  writeFile(filePath, buildGlossaryMarkdown(term));

  return termId;
}

/**
 * 여러 용어를 일괄 저장합니다.
 * @returns 저장된 용어 수
 */
export function upsertTerms(
  extractedTerms: ExtractedTerm[],
  source: TermSourceInfo
): number {
  let savedCount = 0;
  for (const term of extractedTerms) {
    try {
      upsertTerm(term, source);
      savedCount++;
    } catch (err) {
      logger.warn('[dictionary-store] 용어 저장 실패', { name: term.name, error: String(err) });
    }
  }
  logger.info('[dictionary-store] 일괄 저장 완료', { savedCount, total: extractedTerms.length });
  return savedCount;
}
```

**Step 2: 커밋**

```bash
git add src/lib/dictionary/dictionary-store.ts
git commit -m "feat: T6-7 용어 사전 저장소 구현 (DATA-DICT-001)"
```

---

### Task 7: T6-8 — 배치 분석 오케스트레이터 (batch-analyzer.ts)

**Files:**
- Create: `src/lib/analysis/batch-analyzer.ts`
- Reference: `src/lib/analysis/pii-filter.ts`
- Reference: `src/lib/analysis/term-extractor.ts`
- Reference: `src/lib/analysis/description-generator.ts`
- Reference: `src/lib/dictionary/dictionary-store.ts`
- Reference: `src/lib/fs/file-manager.ts` (readFile)
- Reference: `src/db/index.ts`, `src/db/schema.ts`

**개요:** `analysis_queue`에서 pending 항목을 읽어 PII 필터 → 용어 추출 → 해설 생성 → 사전 저장의 전체 파이프라인을 실행한다. 개별 파일 실패가 전체 배치를 중단하지 않으며, 3회 초과 실패 항목은 skipped 처리한다.

**Step 1: 파일 생성**

```typescript
// src/lib/analysis/batch-analyzer.ts
// TERM-BATCH-001: 배치 분석 오케스트레이션

import path from 'path';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { analysisQueue } from '@/db/schema';
import { readFile } from '@/lib/fs/file-manager';
import { filterPii } from './pii-filter';
import { extractTerms } from './term-extractor';
import { generateMailSummary } from './description-generator';
import { upsertTerms } from '@/lib/dictionary/dictionary-store';
import { GeminiApiError } from './gemini-client';
import { logger } from '@/lib/logger';

const MAILS_DIR = process.env.MAIL_STORAGE_PATH ?? './data/mails';
const MAX_RETRY_COUNT = 3;

export interface BatchAnalysisResult {
  processedCount: number;
  failedCount: number;
  skippedCount: number;
}

/**
 * analysis_queue에서 처리 대상 항목을 조회합니다.
 * - status = 'pending'
 * - retry_count < MAX_RETRY_COUNT
 */
function fetchPendingItems() {
  return db
    .select()
    .from(analysisQueue)
    .where(
      and(
        eq(analysisQueue.status, 'pending'),
        lt(analysisQueue.retryCount, MAX_RETRY_COUNT)
      )
    )
    .all();
}

/**
 * 단일 분석 항목을 처리합니다.
 * PII 필터 → 용어 추출 → 해설 생성 → 사전 저장 → 상태 갱신
 */
async function processItem(item: typeof analysisQueue.$inferSelect): Promise<void> {
  const now = new Date().toISOString();
  const filePath = path.join(MAILS_DIR, item.fileName);

  // processing 상태로 전이
  db.update(analysisQueue)
    .set({ status: 'processing', updatedAt: now })
    .where(eq(analysisQueue.id, item.id))
    .run();

  try {
    // 파일 읽기
    const rawText = readFile(filePath);
    if (!rawText) {
      throw new Error(`파일을 읽을 수 없습니다: ${filePath}`);
    }

    // PII 필터링
    const filteredText = filterPii(rawText);

    // 용어 추출 + 분류 (Gemini API)
    const extractedTerms = await extractTerms(filteredText);

    // 메일 요약 + 후속 작업 생성 (Gemini API)
    const { summary, actionItems } = await generateMailSummary(filteredText);

    // 용어 사전 저장
    const source = {
      mailFileName: item.fileName,
      mailSubject: item.mailSubject ?? null,
      mailReceivedAt: item.mailReceivedAt ?? null,
    };
    const savedCount = upsertTerms(extractedTerms, source);

    // completed 상태로 전이
    db.update(analysisQueue)
      .set({
        status: 'completed',
        summary,
        actionItems: JSON.stringify(actionItems),
        extractedTermCount: savedCount,
        analyzedAt: new Date().toISOString(),
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(analysisQueue.id, item.id))
      .run();

    logger.info('[batch-analyzer] 분석 완료', {
      fileName: item.fileName,
      termCount: savedCount,
      summaryLength: summary.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const newRetryCount = (item.retryCount ?? 0) + 1;
    const isApiKeyError = err instanceof GeminiApiError && err.code === 'NO_API_KEY';

    // API 키 미설정이면 pending 유지 (재시도 카운트 증가 없음)
    if (isApiKeyError) {
      db.update(analysisQueue)
        .set({ status: 'pending', updatedAt: new Date().toISOString() })
        .where(eq(analysisQueue.id, item.id))
        .run();
      logger.warn('[batch-analyzer] API 키 미설정 — 분석 건너뜀', { fileName: item.fileName });
      throw err; // 상위에서 API 키 없음 감지
    }

    // 재시도 가능 여부 판단
    const nextStatus = newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
    db.update(analysisQueue)
      .set({
        status: nextStatus,
        retryCount: newRetryCount,
        errorMessage: errorMessage.slice(0, 1000),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(analysisQueue.id, item.id))
      .run();

    logger.warn('[batch-analyzer] 분석 실패', {
      fileName: item.fileName,
      retryCount: newRetryCount,
      nextStatus,
      error: errorMessage,
    });
  }
}

/**
 * pending 상태의 분석 대기열을 순차 처리합니다.
 * API 키 미설정 시 분석을 건너뜁니다.
 * @returns 처리 결과 통계
 */
export async function runBatchAnalysis(): Promise<BatchAnalysisResult> {
  const pendingItems = fetchPendingItems();

  if (pendingItems.length === 0) {
    logger.info('[batch-analyzer] 처리할 항목 없음');
    return { processedCount: 0, failedCount: 0, skippedCount: 0 };
  }

  logger.info('[batch-analyzer] 배치 분석 시작', { count: pendingItems.length });

  let processedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const item of pendingItems) {
    try {
      await processItem(item);
      processedCount++;
    } catch (err) {
      if (err instanceof GeminiApiError && err.code === 'NO_API_KEY') {
        // API 키 미설정 — 나머지 항목도 건너뜀
        skippedCount = pendingItems.length - processedCount - 1;
        logger.warn('[batch-analyzer] API 키 미설정으로 배치 중단', { skippedCount });
        break;
      }
      failedCount++;
    }
  }

  logger.info('[batch-analyzer] 배치 분석 완료', { processedCount, failedCount, skippedCount });
  return { processedCount, failedCount, skippedCount };
}
```

**Step 2: 커밋**

```bash
git add src/lib/analysis/batch-analyzer.ts
git commit -m "feat: T6-8 배치 분석 오케스트레이터 구현 (TERM-BATCH-001)"
```

---

### Task 8: T6-8 — mail-batch.ts Phase 2 연동

**Files:**
- Modify: `src/lib/mail/mail-batch.ts`

**개요:** 기존 mail-batch.ts의 Phase 2 주석 부분에 batch-analyzer 호출을 추가한다. 메일 수신 Phase 1 완료 후 바로 Phase 2 분석을 실행하도록 연동한다. isRunning 잠금은 기존 것을 그대로 사용한다.

**Step 1: 변경 내용 확인**

현재 `mail-batch.ts`의 Phase 2 주석: `// Phase 2: SEEN 플래그 설정 (Sprint 6 분석 파이프라인 연동 예정)`

**Step 2: 파일 수정**

`src/lib/mail/mail-batch.ts` 상단 import에 추가:
```typescript
import { runBatchAnalysis } from '@/lib/analysis/batch-analyzer';
```

Phase 2 주석 블록을 아래로 교체:
```typescript
    // Phase 2: 용어 분석 파이프라인 실행
    const analysisResult = await runBatchAnalysis();
    logger.info('[mail-batch] 분석 파이프라인 완료', analysisResult);
```

`recordProcessingLog` 호출에서 `analyzedCount` 값을 실제 결과로 교체:
```typescript
    recordProcessingLog({
      processType: 'mail_receive',
      status: errorMessage ? 'failed' : 'success',
      mailCount,
      analyzedCount: analysisResult?.processedCount ?? 0,
      errorMessage,
    });
```

`analyzedCount` 변수를 try 블록 외부에 선언:
```typescript
  let analyzedCount = 0;
```

최종 수정된 `mail-batch.ts` 전체:

```typescript
// 메일 수신 배치 오케스트레이션 (T5-3~T5-8 통합)
import { receiveMails } from './imap-receiver';
import { saveAnalysisFile } from '@/lib/data/analysis-file';
import { markMailsAsSeen, recordProcessingLog } from './mail-status';
import { cleanupExpiredMailFiles, cleanupExpiredLogs } from '@/lib/data/cleanup';
import { runBatchAnalysis } from '@/lib/analysis/batch-analyzer';
import { logger } from '@/lib/logger';

// 중복 실행 방지 잠금 (모듈 레벨 — API route와 스케줄러 공유)
let isRunning = false;

export function isMailBatchRunning(): boolean {
  return isRunning;
}

/**
 * 메일 수신 배치를 실행합니다.
 * Phase 1: 메일 수신 → 파일 저장 → 큐 등록
 * Phase 2: 용어 분석 파이프라인 실행
 * Phase 3: 만료 파일/로그 정리
 */
export async function runMailBatch(): Promise<void> {
  if (isRunning) {
    logger.warn('[mail-batch] 이미 실행 중 — 건너뜀');
    return;
  }

  isRunning = true;
  const startedAt = new Date().toISOString();
  logger.info('[mail-batch] 배치 시작');

  let mailCount = 0;
  let analyzedCount = 0;
  let errorMessage: string | undefined;

  try {
    // Phase 1: 메일 수신 및 큐 등록
    const mails = await receiveMails();
    mailCount = mails.length;

    const processedUids: number[] = [];
    for (const mail of mails) {
      try {
        saveAnalysisFile(mail.fileName, mail.textBody, mail.subject, mail.receivedAt);
        processedUids.push(mail.uid);
      } catch (err) {
        logger.warn('[mail-batch] 메일 파일 저장 실패', { uid: mail.uid, error: String(err) });
      }
    }

    // Phase 2: SEEN 플래그 설정 + 용어 분석 파이프라인 실행
    if (processedUids.length > 0) {
      await markMailsAsSeen(processedUids);
    }
    const analysisResult = await runBatchAnalysis();
    analyzedCount = analysisResult.processedCount;
    logger.info('[mail-batch] 분석 파이프라인 완료', analysisResult);

    // Phase 3: 정리
    cleanupExpiredMailFiles();
    cleanupExpiredLogs();

    logger.info('[mail-batch] 배치 완료', { mailCount, analyzedCount });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    logger.error('[mail-batch] 배치 오류', { error: errorMessage });
  } finally {
    // 처리 이력 기록
    recordProcessingLog({
      processType: 'mail_receive',
      status: errorMessage ? 'failed' : 'success',
      mailCount,
      analyzedCount,
      errorMessage,
    });

    isRunning = false;
    logger.info('[mail-batch] 배치 종료', { startedAt, endedAt: new Date().toISOString() });
  }
}
```

**Step 3: 커밋**

```bash
git add src/lib/mail/mail-batch.ts
git commit -m "feat: T6-8 mail-batch Phase 2 분석 파이프라인 연동"
```

---

### Task 9: 빌드 및 린트 검증

**Files:**
- 수정 없음 (검증 단계)

**Step 1: 린트 실행**

```bash
cd D:/Study/Hackathon/domain-dictionary
npm run lint
```

기대 결과: 에러 없음. 경고가 있으면 내용 확인 후 수정.

**Step 2: 빌드 실행**

```bash
npm run build
```

기대 결과: `✓ Compiled successfully`. 타입 에러 없음.

**Step 3: 빌드 에러 수정 (발생 시)**

타입 에러 발생 시 오류 메시지 기준으로 개별 파일 수정 후 재빌드.

**Step 4: 최종 커밋**

```bash
git add .
git commit -m "fix: Sprint 6 빌드/린트 오류 수정"
```

---

## 의존성 및 구현 순서

```
T6-1 (pii-filter)
  └── T6-2 (gemini-client) ← withRetry, getSetting
        └── T6-4 (stopword-filter) ← DB
        └── T6-3/T6-5 (term-extractor) ← gemini-client, stopword-filter
        └── T6-6 (description-generator) ← gemini-client
              └── T6-7 (dictionary-store) ← term-extractor 타입, writeFile, DB
                    └── T6-8 (batch-analyzer) ← 모든 분석 모듈
                          └── mail-batch.ts 연동
```

구현 순서: Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

---

## 리스크 및 대응 방안

| 리스크 | 가능성 | 대응 방안 |
|--------|--------|-----------|
| Gemini API JSON 응답 파싱 실패 | 중 | 코드 블록 제거 후 파싱, PARSE_ERROR 예외 처리 |
| GEMINI_API_KEY 미설정 | 높음 | NO_API_KEY 에러 → pending 유지, 배치 건너뜀 |
| Gemini Rate Limit | 중 | withRetry 지수 백오프 (1s/2s/4s), 순차 처리 |
| 용어명에 파일 시스템 특수문자 포함 | 중 | safeFileName 치환 (/ \ ? % * : | " < > → _) |
| 동시 배치 실행 | 중 | mail-batch.ts isRunning 잠금으로 방지 |
| 메일 파일 없음 | 낮음 | readFile null 반환 → 에러 처리 → failed 상태 |

---

## 완료 기준 (Definition of Done)

- ✅ `npm run build` 에러 없이 완료됨
- ✅ `npm run lint` 에러 없음
- ✅ pii-filter.ts: 이메일/전화번호/주민번호 마스킹 동작
- ✅ gemini-client.ts: API 키 미설정 시 NO_API_KEY 에러
- ✅ term-extractor.ts: Gemini 응답 JSON 파싱, 불용어 필터링 적용
- ✅ description-generator.ts: 요약 500자 이내, actionItems 최대 5개
- ✅ dictionary-store.ts: terms 테이블 upsert, `./data/terms/{용어}.md` 파일 생성
- ✅ batch-analyzer.ts: pending → processing → completed/failed 상태 전이
- ✅ batch-analyzer.ts: retry_count 3회 초과 시 failed 상태 고정
- ✅ batch-analyzer.ts: API 키 미설정 시 에러 없이 건너뜀
- ✅ mail-batch.ts: Phase 2에서 runBatchAnalysis() 호출됨

## 검증 결과

- [코드 리뷰 보고서](sprint6/code-review.md)
- [Playwright 검증 보고서](sprint6/test-report.md)

---

## 배포 전략

### 자동 실행 항목 (sprint-close 시)
- ✅ `npm run lint` — 코드 스타일 검증
- ✅ `npm run build` — 타입 체크 및 빌드 성공 확인

### 수동 실행 필요 항목

사용자가 직접 수행해야 하는 작업은 `docs/sprint/sprint6/deploy.md`를 참고하세요.

1. **환경변수 설정** (.env.local)
   ```env
   GEMINI_API_KEY=<실제 API 키>
   GEMINI_MODEL=gemini-1.5-pro
   GLOSSARY_STORAGE_PATH=./data/terms
   ```

2. **앱 재시작** (새 분석 모듈 반영)
   ```bash
   npm run dev   # 개발 환경
   # 또는
   npm run build && npm start   # 프로덕션
   ```

3. **End-to-End 검증** (Playwright MCP)
   - 관리자 로그인 → 대시보드 → "메일 확인 실행" 버튼 클릭
   - 충분히 대기 후 대시보드 새로고침
   - 최신 분석 결과 영역에 요약/용어 수 표시 확인
   - `./data/terms/` 디렉터리에 `.md` 파일 생성 확인

---

## 예상 산출물

| 파일 | 설명 |
|------|------|
| `src/lib/analysis/pii-filter.ts` | 개인정보 마스킹 |
| `src/lib/analysis/gemini-client.ts` | Gemini API 래퍼 |
| `src/lib/analysis/term-extractor.ts` | 용어 추출 + 분류 |
| `src/lib/analysis/stopword-filter.ts` | 불용어 필터링 |
| `src/lib/analysis/description-generator.ts` | 메일 요약 + 후속 작업 |
| `src/lib/analysis/batch-analyzer.ts` | 배치 오케스트레이터 |
| `src/lib/dictionary/dictionary-store.ts` | 용어 사전 저장소 |
| `src/lib/mail/mail-batch.ts` (수정) | Phase 2 분석 연동 |
| `./data/terms/{용어}.md` (런타임 생성) | 용어 해설집 파일 |

---

## 품질 검증 체크리스트

- ✅ ROADMAP.md의 Sprint 6 목표(Phase 3 완성, M3 달성)와 일치하는가?
- ✅ writing-plans 스킬 형식(Task 구조, 파일 경로, 커밋 단위)을 준수했는가?
- ✅ 모든 태스크가 구체적이고 실행 가능한 코드 수준으로 작성되었는가?
- ✅ 완료 기준이 명확하게 정의되었는가?
- ✅ 파일이 `docs/sprint/sprint6.md`에 저장되었는가?
- ✅ 기존 파일(retry.ts, logger, file-manager.ts 등)을 재사용하고 중복을 피했는가?
