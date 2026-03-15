# Sprint 6 배포 및 검증 체크리스트

**작성일:** 2026-03-15
**브랜치:** sprint6
**PR:** https://github.com/woongki-jung/Hackathon/pull/new/sprint6

---

## 자동 검증 완료 항목

- ✅ `npm run lint` — 에러 없음
- ✅ `npm run build` — 에러 없음 (타입 체크 통과)
- ✅ POST /api/auth/login — 200 OK
- ✅ GET /api/mail/status — 200 OK (scheduler, mail, analysis 상태 반환)
- ✅ GET /api/analysis/latest — 200 OK
- ✅ GET /api/analysis/history — 200 OK
- ✅ POST /api/mail/check — 200 OK ("메일 확인이 시작되었습니다.")
- ✅ 배치 실행 후 lastRunAt 갱신 확인
- ✅ GEMINI_API_KEY 미설정 시 에러 없이 분석 건너뜀
- ✅ 콘솔 에러 0건
- ✅ 미인증 접근 시 /login 리다이렉트

---

## 수동 검증 필요 항목

### 1. GEMINI_API_KEY 환경변수 설정

`domain-dictionary/.env.local` 파일에 아래 항목을 추가하세요.

```env
GEMINI_API_KEY=<실제 Gemini API 키>
GEMINI_MODEL=gemini-2.0-flash
GLOSSARY_STORAGE_PATH=./data/terms
```

> Gemini API 키 발급: https://aistudio.google.com/app/apikey

---

### 2. 앱 재시작

환경변수 설정 후 앱을 재시작해야 새 설정이 반영됩니다.

```bash
cd domain-dictionary

# 개발 환경
npm run dev

# 프로덕션 환경
npm run build && npm start
```

---

### 3. 실제 분석 파이프라인 End-to-End 검증

IMAP 설정이 완료된 환경에서 아래 절차로 검증하세요.

#### 3-1. IMAP 설정 (미설정 시)

`domain-dictionary/.env.local`에 메일 서버 정보 추가:

```env
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_USERNAME=<메일 계정>
MAIL_PASSWORD=<앱 비밀번호>
MAIL_USE_SSL=true
MAIL_STORAGE_PATH=./data/mails
```

#### 3-2. 검증 절차

1. 브라우저에서 `http://localhost:3000` 접속
2. `admin / Admin123!`으로 로그인
3. 대시보드에서 "메일 확인 실행" 버튼 클릭 → 확인 다이얼로그에서 확인
4. 잠시 후(30초~2분) 페이지 새로고침
5. 아래 항목을 확인합니다.

#### 3-3. 검증 체크리스트

- ⬜ 대시보드 최신 분석 결과 영역에 메일 제목, 요약, 추출 용어 수 표시
- ⬜ 대시보드 분석 이력 목록에 `completed` 상태 항목 표시
- ⬜ `./data/terms/` 디렉터리에 `{용어}.md` 파일 생성 확인
  ```bash
  ls domain-dictionary/data/terms/
  ```
- ⬜ terms 테이블에 용어 저장 확인 (SQLite 클라이언트로 직접 확인)
  ```sql
  SELECT name, category, frequency FROM terms ORDER BY frequency DESC;
  ```
- ⬜ analysis_queue 상태 전이 확인 (`pending` → `processing` → `completed`)
  ```sql
  SELECT fileName, status, extractedTermCount, analyzedAt FROM analysis_queue;
  ```
- ⬜ 분석 실패 시나리오: GEMINI_API_KEY를 잘못된 값으로 설정 후 배치 실행
  - `failed` 상태 기록 및 `retryCount` 증가 확인

---

### 4. 환경설정 화면 검증

- ⬜ `http://localhost:3000/settings` 접속
- ⬜ Gemini API 설정 영역에서 "API 키 설정됨" 뱃지 표시 확인 (키 설정 후)
- ⬜ IMAP 연결 테스트 버튼 클릭 → 성공/실패 토스트 확인

---

## 주요 구현 파일

| 파일 | 역할 |
|------|------|
| `src/lib/analysis/pii-filter.ts` | 이메일/전화번호/주민번호 마스킹 |
| `src/lib/analysis/gemini-client.ts` | Gemini API 래퍼 (재시도, JSON 파싱) |
| `src/lib/analysis/stopword-filter.ts` | stop_words 테이블 기반 불용어 필터 |
| `src/lib/analysis/term-extractor.ts` | 용어 추출 + 분류 (emr/business/abbreviation/general) |
| `src/lib/analysis/description-generator.ts` | 메일 요약(500자) + 후속 작업(최대 5개) 생성 |
| `src/lib/analysis/batch-analyzer.ts` | pending → processing → completed/failed 파이프라인 |
| `src/lib/dictionary/dictionary-store.ts` | terms 테이블 upsert + ./data/terms/*.md 저장 |
| `src/lib/mail/mail-batch.ts` | Phase 2 분석 파이프라인 연동 |

---

## Sprint 7 예정 작업 (용어사전 뷰어)

Sprint 6에서 구축된 `terms` 테이블과 `./data/terms/` 파일을 기반으로 Sprint 7에서 `/dictionary` 화면을 구현합니다.

- T7-1: `GET /api/dictionary/search` — FTS5 전문 검색 API
- T7-2: `GET /api/dictionary/trending` — 빈도 상위 10개 용어 API
- T7-3: `GET /api/dictionary/terms/:id` — 용어 상세 API
- T7-4: `/dictionary` 화면 — 검색 + 카테고리 필터 + 빈도 트렌드
- T7-5: `/dictionary/[id]` 화면 — 용어 상세 + 출처 메일 목록

---

## 코드 리뷰 이슈 (Medium — Sprint 9 해결 예정)

| 번호 | 파일 | 내용 |
|------|------|------|
| M-01 | mail-batch.ts | JSDoc 주석 미업데이트 (Sprint 5 내용 잔존) |
| M-02 | batch-analyzer.ts | 단일 파일당 Gemini API 병렬 2회 호출 — 메일 수 증가 시 Rate Limit 위험 |
| M-03 | dictionary-store.ts | SELECT-then-UPDATE 비원자성 (트랜잭션 미적용) |
| M-04 | dictionary-store.ts | 파일 저장을 위한 불필요한 DB 재조회 |
| M-05 | pii-filter.ts | 주민등록번호 공백 구분자 미처리 |
