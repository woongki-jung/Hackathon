# 프로젝트 로드맵

## 개요
- **프로젝트 목표**: 수신 이메일의 업무 용어를 자동 분석하여 해설을 제공하는 Windows 데스크톱 업무 지원 도구 개발
- **전체 예상 기간**: 6주 (3 Phase, 각 Phase 2주 스프린트)
- **현재 진행 단계**: Phase 0 (프로젝트 초기 설정)
- **팀 규모**: 소규모 2-4명

## 진행 상태 범례
- ✅ 완료
- 🔄 진행 중
- 📋 예정
- ⏸️ 보류

---

## 프로젝트 현황 대시보드

| 항목 | 상태 |
|------|------|
| 전체 진행률 | 17% (Sprint 1 완료) |
| 현재 Phase | Phase 1 진행 중 |
| 다음 마일스톤 | Phase 1 완료 - 트레이 앱 + 환경설정 + 메일 수신 |
| 기술 스택 확정 | ✅ 완료 |

---

## 기술 아키텍처 결정 사항

| 결정 항목 | 선택 | 이유 |
|-----------|------|------|
| 런타임 | .NET 10 | PRD 요구사항 |
| UI 프레임워크 | WinUI 3 (Windows App SDK) | Windows 11 네이티브, 트레이 아이콘 지원, 최신 Windows 디자인 |
| 메일 연동 | Microsoft Graph API | CLAUDE.local.md에 Azure AD 기반 환경변수 정의됨, M365 공식 API |
| 용어 해설 엔진 | Anthropic Claude API | PRD에 "claude code를 활용해 해설을 추출" 명시 |
| 데이터 저장 | SQLite (EF Core) | 로컬 데스크톱 앱에 적합, 별도 DB 서버 불필요 |
| 설정 저장 | appsettings.json + 환경변수 | .NET 표준 패턴, 민감정보는 환경변수 |
| 프로젝트 구조 | Clean Architecture (간소화) | 레이어 분리로 테스트 용이, 단 과도한 추상화 지양 (karpathy-guidelines) |

---

## 의존성 맵

```
Phase 1: 기반 인프라
  [프로젝트 셋업] → [트레이 아이콘 + 빈 윈도우]
                   → [환경설정 화면 (UI)]
                   → [환경설정 저장/로드 (로직)]
                   → [메일 수신 서비스]
                   → [메일 내용 텍스트 저장]

Phase 2: 핵심 분석 기능
  [메일 수신 서비스] → [분석 요청 폴더 파일 감시]
                     → [용어 추출/분류 로직]
                     → [Claude API 연동 - 해설 생성]
                     → [용어사전 DB 적재]

Phase 3: 뷰어 + 통합
  [용어사전 DB] → [용어사전 뷰어 화면]
               → [검색 기능]
               → [빈도 기반 바로가기]
               → [전체 통합 테스트 + 안정화]
```

---

## Phase 1: 기반 인프라 - 트레이 앱, 환경설정, 메일 수신 (Sprint 1-2)

**기간**: 2주
**상태**: 🔄 진행 중

### 목표
Windows 트레이에 상주하며 설정된 M365 계정에서 메일을 수신하여 텍스트 파일로 저장하는 기본 동작 완성

### 작업 목록

#### Sprint 1: 프로젝트 셋업 + 트레이 앱 + 환경설정 UI (✅ 완료 - 2026-03-14)

- ✅ **프로젝트 초기 구조 생성** [Must Have] (복잡도: 낮)
  - WinUI 3 (Windows App SDK) 프로젝트 생성
  - 솔루션 구조: `src/MailTermAnalyzer.App` (WinUI), `src/MailTermAnalyzer.Core` (비즈니스 로직), `src/MailTermAnalyzer.Infrastructure` (외부 연동)
  - .gitignore, Directory.Build.props 설정
  - NuGet 패키지: `Microsoft.WindowsAppSDK`, `Microsoft.Identity.Client`, `Microsoft.Graph`, `Microsoft.EntityFrameworkCore.Sqlite`

- ✅ **윈도우 트레이 아이콘 기능** [Must Have] (복잡도: 중)
  - 앱 시작 시 시스템 트레이에 아이콘 표시
  - 트레이 아이콘 클릭 시 메인 윈도우 표시/숨김 토글
  - 트레이 우클릭 컨텍스트 메뉴: "열기", "설정", "종료"
  - 윈도우 닫기(X) 버튼 클릭 시 트레이로 최소화 (종료가 아님)

- ✅ **환경설정 화면 (UI 우선)** [Must Have] (복잡도: 중)
  - 설정 페이지 UI 레이아웃 구성
  - Azure AD 인증 정보 입력 폼: Tenant ID, Client ID, Client Secret
  - 메일 계정 정보 입력 폼: 이메일 주소, 메일함 이름
  - 메일 수신 설정 폼: 확인 주기(초), 읽지 않은 메일만 여부, 최대 가져오기 수
  - 분석 요청 폴더 경로 설정 (폴더 선택 다이얼로그)
  - 저장/취소 버튼

- ✅ **환경설정 저장/로드 로직** [Must Have] (복잡도: 낮)
  - 설정값 모델 클래스 정의 (`AppSettings`)
  - 환경변수 우선, appsettings.json fallback 방식으로 설정 로드
  - 민감 정보(Client Secret)는 Windows Credential Manager 또는 DPAPI로 암호화 저장
  - 설정 변경 시 실행 중인 서비스에 반영 (IOptionsMonitor 패턴)

#### Sprint 2: 메일 수신 서비스 + 텍스트 저장

- ⬜ **Microsoft Graph API 메일 수신 서비스** [Must Have] (복잡도: 높)
  - Azure AD OAuth2 Client Credentials 인증 구현
  - Graph API를 통한 메일함 조회 (GET /users/{email}/mailFolders/{folder}/messages)
  - 설정된 주기(`MAIL_POLL_INTERVAL_SECONDS`)에 따른 타이머 기반 폴링
  - 읽지 않은 메일 필터링 옵션 적용
  - 조회 완료된 메일을 읽음 처리 (PATCH isRead=true)
  - BackgroundService로 구현하여 앱 시작 시 자동 실행

- ⬜ **메일 내용 텍스트 파일 저장** [Must Have] (복잡도: 낮)
  - 메일 제목 + 본문(HTML -> Plain Text 변환)을 텍스트 파일로 저장
  - 저장 경로: `OUTPUT_ANALYSIS_DIR` 환경변수 또는 설정값
  - 파일명 규칙: `{yyyyMMdd_HHmmss}_{subject_sanitized}.txt`
  - 저장 완료 시 트레이 알림(Toast Notification) 표시

- ⬜ **메일 수신 상태 표시** [Should Have] (복잡도: 낮)
  - 메인 윈도우에 최근 수신 메일 목록 표시 (최근 20건)
  - 마지막 확인 시각, 수신 건수 표시
  - 수신 오류 시 트레이 아이콘 상태 변경 + 오류 메시지

### 완료 기준 (Definition of Done)
- ✅ 앱 실행 시 트레이 아이콘이 표시되고, 클릭 시 메인 윈도우가 열린다
- ✅ 환경설정 화면에서 M365 인증 정보와 메일 설정을 저장/로드할 수 있다
- ✅ 설정된 계정의 메일함에서 신규 메일을 주기적으로 가져온다
- ✅ 가져온 메일 내용이 지정 폴더에 텍스트 파일로 저장된다
- ✅ `dotnet build --configuration Release` 성공
- ✅ 단위 테스트 통과 (설정 로드, 메일 파싱 로직)

### 검증 시나리오 (uiautomation-mcp)

> `dotnet run` 또는 빌드된 exe 실행 후 아래 순서로 검증

**트레이 아이콘 검증:**
1. 앱 실행 후 `app_snapshot` -> 시스템 트레이 영역에 앱 아이콘 존재 확인
2. `app_click` -> 트레이 아이콘 클릭
3. `app_snapshot` -> 메인 윈도우가 화면에 표시됨 확인
4. 윈도우 닫기 버튼 클릭 -> `app_snapshot` -> 트레이로 최소화 확인

**환경설정 검증:**
1. `app_click` -> "설정" 메뉴 또는 버튼 클릭
2. `app_snapshot` -> 설정 화면 렌더링 확인 (입력 폼 존재)
3. `app_fill_form` -> 테스트 설정값 입력
4. `app_click` -> "저장" 버튼 클릭
5. 앱 재시작 후 `app_snapshot` -> 저장된 설정값이 유지되는지 확인

**메일 수신 검증 (수동):**
- 실제 M365 계정 설정 후 메일 수신 동작 확인 (환경변수 필요)
- 분석 요청 폴더에 텍스트 파일 생성 확인

### 기술 고려사항
- WinUI 3의 트레이 아이콘은 `H.NotifyIcon.WinUI` 등 서드파티 패키지 활용 검토
- Graph API 인증 토큰 갱신 로직 (토큰 만료 전 자동 갱신)
- HTML -> Plain Text 변환에 HtmlAgilityPack 또는 내장 정규식 사용
- BackgroundService의 예외 처리: 네트워크 오류 시 재시도 로직 (exponential backoff)

---

## Phase 2: 용어 분석 엔진 (Sprint 3-4)

**기간**: 2주
**상태**: 📋 예정

### 목표
분석 요청 폴더의 텍스트 파일을 감시하여 EMR/비즈니스 용어를 자동 추출하고, Claude API로 해설을 생성하여 용어사전 DB에 적재

### 작업 목록

#### Sprint 3: 파일 감시 + 용어 추출/분류

- ⬜ **분석 요청 폴더 파일 감시** [Must Have] (복잡도: 중)
  - FileSystemWatcher를 사용하여 분석 요청 폴더의 신규 .txt 파일 감지
  - 파일 생성 이벤트 발생 시 분석 큐에 추가
  - 중복 파일 처리 방지 (이미 분석 완료된 파일 추적)
  - 앱 시작 시 기존 미분석 파일도 큐에 추가

- ⬜ **용어 추출 및 분류 로직** [Must Have] (복잡도: 높)
  - 텍스트 파일 로드 후 전처리 (불필요한 공백, 특수문자 정리)
  - EMR(전자의무기록) 시스템 관련 용어 식별 패턴 정의
  - 비즈니스 용어/약어 식별 패턴 정의
  - 용어 분류: EMR 용어 / 비즈니스 용어 / 약어
  - 이미 사전에 존재하는 용어는 건너뛰기 (중복 방지)
  - Claude API를 활용하여 텍스트에서 전문 용어를 추출하도록 구현

- ⬜ **SQLite 용어사전 DB 스키마 및 EF Core 설정** [Must Have] (복잡도: 중)
  - 테이블 설계: `Terms` (Id, Term, Category, Description, Source, Frequency, CreatedAt, UpdatedAt)
  - EF Core DbContext, Migration 설정
  - 용어 CRUD 리포지토리 구현

#### Sprint 4: Claude API 해설 생성 + DB 적재

- ⬜ **Claude API 연동 - 용어 해설 생성** [Must Have] (복잡도: 높)
  - Anthropic Claude API 클라이언트 구현 (HttpClient 기반)
  - 프롬프트 설계: 용어 + 원문 컨텍스트를 입력하여 해설 생성
  - 프롬프트 예시: "다음 용어는 EMR/의료정보 또는 비즈니스 맥락에서 사용됩니다. 용어: {term}, 원문 맥락: {context}. 이 용어의 뜻과 업무에서의 활용을 간결하게 설명해주세요."
  - API 호출 rate limit 처리 (요청 간 딜레이)
  - API 오류 시 재시도 로직

- ⬜ **용어사전 DB 적재 파이프라인** [Must Have] (복잡도: 중)
  - 추출된 용어 + 해설을 DB에 저장
  - 동일 용어 재등장 시 빈도(Frequency) 카운트 증가
  - 기존 해설이 있는 용어는 업데이트하지 않음 (수동 편집 보호)
  - 분석 완료된 파일을 완료 폴더로 이동 또는 완료 마킹

- ⬜ **분석 진행 상태 표시** [Should Have] (복잡도: 낮)
  - 메인 윈도우에 분석 큐 상태 표시 (대기 중, 분석 중, 완료)
  - 최근 분석된 용어 목록 표시
  - 분석 오류 발생 시 알림

### 완료 기준 (Definition of Done)
- ✅ 분석 요청 폴더에 텍스트 파일을 넣으면 자동으로 용어가 추출된다
- ✅ 추출된 용어가 EMR 용어 / 비즈니스 용어 / 약어로 분류된다
- ✅ Claude API를 통해 각 용어의 해설이 생성된다
- ✅ 용어-해설 쌍이 SQLite DB에 저장된다
- ✅ 동일 용어 재등장 시 빈도 카운트가 증가한다
- ✅ `dotnet test` 통과 (용어 추출 로직, DB 적재 로직)

### 검증 시나리오 (uiautomation-mcp)

> `dotnet run` 실행 후 아래 순서로 검증

**파일 감시 + 분석 검증:**
1. 테스트용 텍스트 파일을 분석 요청 폴더에 복사
2. `app_snapshot` -> 분석 큐에 파일이 추가됨 확인
3. `app_wait_for` -> "분석 완료" 또는 분석 상태 변경 대기
4. `app_snapshot` -> 분석 결과(추출된 용어 목록) 표시 확인

**DB 적재 검증:**
- SQLite DB 파일을 직접 조회하여 용어-해설 레코드 존재 확인 (CLI 또는 테스트)

### 기술 고려사항
- FileSystemWatcher의 이벤트 중복 발생 이슈 대응 (debounce 처리)
- Claude API 키 관리: 환경변수 `ANTHROPIC_API_KEY`로 관리
- 대량 용어 일괄 분석 시 API 비용 고려: 배치 처리 + 요약 프롬프트 활용
- 용어 추출 정확도는 초기에 낮을 수 있음 -> 프롬프트 튜닝으로 점진 개선

---

## Phase 3: 용어사전 뷰어 + 통합 안정화 (Sprint 5-6)

**기간**: 2주
**상태**: 📋 예정

### 목표
사용자가 적재된 용어를 검색하고 탐색할 수 있는 뷰어 완성, 전체 기능 통합 테스트 및 안정화

### 작업 목록

#### Sprint 5: 용어사전 뷰어 UI

- ⬜ **용어사전 시작 화면 (검색 중심)** [Must Have] (복잡도: 중)
  - 화면 중앙에 검색 입력창 배치 (Google 검색창 스타일)
  - 검색어 입력 시 실시간 자동완성(autocomplete) 제공
  - 검색 실행 시 일치하는 용어 목록 표시
  - 검색 대상: 용어명, 해설 내용 (Full-text search)

- ⬜ **최근 빈도 높은 용어 바로가기** [Must Have] (복잡도: 낮)
  - 검색창 하단에 최근 발견 빈도가 높은 용어 상위 10개를 태그/카드 형태로 표시
  - 클릭 시 해당 용어 상세 화면으로 이동
  - 빈도 기준: DB의 Frequency 필드 기준 내림차순

- ⬜ **용어 목록 뷰 (사전 형태)** [Must Have] (복잡도: 중)
  - 전체 용어를 가나다/알파벳 순으로 정렬된 목록 표시
  - 카테고리별 필터: EMR 용어 / 비즈니스 용어 / 약어
  - 목록 항목: 용어명, 카테고리 뱃지, 해설 미리보기 (1줄)
  - 무한 스크롤 또는 페이지네이션

- ⬜ **용어 상세 화면** [Must Have] (복잡도: 낮)
  - 용어명, 카테고리, 전체 해설 표시
  - 최초 발견일, 최근 발견일, 발견 빈도 표시
  - 원문 출처(메일 제목) 표시

#### Sprint 6: 통합 테스트 + 안정화

- ⬜ **네비게이션 통합** [Must Have] (복잡도: 중)
  - NavigationView 기반 페이지 전환: 홈(검색) / 용어 목록 / 설정
  - 트레이 메뉴에서 각 페이지 바로가기
  - 뒤로가기 지원

- ⬜ **전체 통합 테스트** [Must Have] (복잡도: 중)
  - 메일 수신 -> 파일 저장 -> 용어 추출 -> 해설 생성 -> DB 적재 -> 뷰어 조회 E2E 흐름 검증
  - 설정 변경 후 서비스 재시작 검증
  - 예외 상황 테스트: 네트워크 끊김, 잘못된 인증 정보, 빈 메일

- ⬜ **안정화 및 기술 부채 정리** [Should Have] (복잡도: 중)
  - 앱 시작/종료 안정성 검증
  - 메모리 누수 점검 (장시간 실행 시)
  - 로깅 정리 (Serilog 등으로 파일 로깅)
  - 에러 핸들링 일관성 검토

### 완료 기준 (Definition of Done)
- ✅ 검색창에 용어를 입력하면 실시간으로 결과가 표시된다
- ✅ 빈도 높은 용어가 시작 화면에 바로가기로 노출된다
- ✅ 전체 용어 목록을 사전 형태로 탐색할 수 있다
- ✅ 카테고리 필터가 동작한다
- ✅ 메일 수신부터 뷰어 조회까지 E2E 흐름이 정상 동작한다
- ✅ `dotnet build --configuration Release` 및 `dotnet test` 모두 통과
- ✅ 콘솔/로그에 unhandled exception 없음

### 검증 시나리오 (uiautomation-mcp)

> 빌드 후 앱 실행 상태에서 검증

**검색 기능 검증:**
1. `app_snapshot` -> 시작 화면에 검색창 존재 확인
2. `app_snapshot` -> 빈도 높은 용어 바로가기 표시 확인
3. `app_type` -> 검색창에 테스트 용어 입력
4. `app_wait_for` -> 검색 결과 표시 대기
5. `app_snapshot` -> 검색 결과 목록 확인
6. `app_click` -> 결과 항목 클릭
7. `app_snapshot` -> 용어 상세 화면 표시 확인

**용어 목록 검증:**
1. `app_click` -> "용어 목록" 네비게이션 클릭
2. `app_snapshot` -> 가나다순 용어 목록 표시 확인
3. `app_click` -> 카테고리 필터("EMR 용어") 클릭
4. `app_snapshot` -> 필터링된 목록 확인

**통합 검증:**
1. 전체 E2E 흐름 수동 실행 후 각 단계별 `app_snapshot`으로 상태 확인
2. `app_console_messages` -> 에러 메시지 없음 확인

### 기술 고려사항
- WinUI 3의 SearchBox 또는 AutoSuggestBox 컨트롤 활용
- SQLite FTS5(Full-Text Search)로 검색 성능 확보
- 용어 목록 가상화(Virtualization)로 대량 데이터 렌더링 성능 보장
- MVVM 패턴으로 ViewModel/View 분리하여 테스트 용이성 확보

---

## 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 가능성 | 완화 전략 |
|--------|--------|------------|-----------|
| Azure AD 인증 설정 복잡도 | 높 | 중 | Phase 1 초기에 인증 PoC 수행, 문서화 |
| Graph API 권한 부족/거부 | 높 | 중 | 필요 권한(Mail.Read) 사전 확인, 관리자 승인 프로세스 조기 시작 |
| Claude API 용어 추출 정확도 낮음 | 중 | 높 | 프롬프트 반복 튜닝, 사용자 피드백 루프 (향후 Backlog) |
| WinUI 3 트레이 아이콘 지원 제한 | 중 | 중 | 서드파티 패키지(H.NotifyIcon) 사전 검증 |
| .NET 10 프리뷰 불안정성 | 중 | 낮 | .NET 9 LTS fallback 준비 |

---

## 마일스톤

| 마일스톤 | Phase | 예상 완료일 | 핵심 산출물 |
|----------|-------|-----------|------------|
| M1: 메일 수신 동작 확인 | Phase 1 | Sprint 2 종료 | 트레이 앱 + 설정 + 메일 수신/저장 |
| M2: 용어 분석 파이프라인 완성 | Phase 2 | Sprint 4 종료 | 파일 감시 + 용어 추출 + 해설 생성 + DB 적재 |
| M3: MVP 릴리스 | Phase 3 | Sprint 6 종료 | 용어사전 뷰어 + 전체 E2E 통합 |

---

## 기술 부채 추적

| 항목 | 발생 예상 Phase | 해소 예정 Phase | 설명 |
|------|----------------|----------------|------|
| 용어 추출 정확도 개선 | Phase 2 | Phase 3 (안정화) | 초기 프롬프트 기반 추출 -> 피드백 기반 개선 |
| 에러 핸들링 일관성 | Phase 1-2 | Phase 3 (안정화) | 각 Phase에서 최소한으로 처리 후 Phase 3에서 일관성 정리 |
| 로깅 체계 | Phase 1 | Phase 3 | 초기 Console.Write -> Serilog 파일 로깅 전환 |

---

## 향후 계획 (Backlog) - MVP 이후

아래 항목은 PRD에 명시되지 않았으나 자연스러운 확장으로 고려할 수 있는 기능입니다. 사용자 요청 시에만 진행합니다.

- ⬜ 용어 해설 수동 편집 기능 (사용자가 해설을 직접 수정)
- ⬜ 용어 즐겨찾기/북마크 기능
- ⬜ 용어사전 내보내기 (Excel/CSV)
- ⬜ 메일 수신 알림 커스터마이징 (소리, 팝업 등)
- ⬜ 다중 메일 계정 지원
- ⬜ 용어 추출 정확도 피드백 루프 (사용자가 잘못 추출된 용어를 삭제/수정 -> 프롬프트 개선 데이터로 활용)
- ⬜ 앱 자동 업데이트 기능 (MSIX 패키징)
