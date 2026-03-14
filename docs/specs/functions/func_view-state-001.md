# 앱 상태 정보 조회 기능 정의

## 개요
- 백엔드 서비스의 실행 상태, 마지막 실행 시점, 처리 통계를 조회하는 기능을 정의한다.
- 적용 범위: 서비스 상태 조회 페이지

---

## VIEW-STATE-001 앱 상태 정보 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 기능명 | 앱 상태 정보 조회 |
| 분류 | 도메인 특화 로직 |
| 레이어 | lib/views |
| 트리거 | 서비스 상태 조회 페이지 로드 시 |
| 관련 정책 | POL-MAIL (MAIL-R-014, MAIL-R-015), POL-UI (UI-R-011, UI-R-015) |

### 입력 / 출력

#### getServiceStatus

##### 입력 (Input)
없음

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| mailReceive | ProcessStatus | 메일 수신 프로세스 상태 |
| termAnalysis | ProcessStatus | 용어 분석 프로세스 상태 |
| imapConfigured | boolean | IMAP 설정 완료 여부 |
| apiKeyConfigured | boolean | Claude API 키 설정 여부 |
| stats | AppStats | 전체 통계 |

```typescript
interface ProcessStatus {
  lastExecutedAt: string | null;   // 마지막 실행 시점 (YYYY-MM-DD HH:mm, UI-R-015)
  lastStatus: "success" | "failure" | "skipped" | "not_configured" | null;
  lastMailCount: number;           // 마지막 처리 건수
  lastErrorMessage: string | null; // 마지막 오류 메시지
}

interface AppStats {
  totalTerms: number;           // 전체 용어 수
  totalMailsProcessed: number;  // 누적 처리 메일 수
  pendingAnalysis: number;      // 분석 대기 건수
  failedAnalysis: number;       // 분석 실패 건수
}
```

### 처리 흐름

1. **메일 수신 상태**: mail_processing_logs에서 process_type='mail_receive'인 최신 레코드 조회
2. **분석 상태**: mail_processing_logs에서 process_type='term_analysis'인 최신 레코드 조회
3. **설정 상태**: CMN-CFG-001.getImapConfig()의 isConfigured 확인, ANTHROPIC_API_KEY 존재 확인
4. **통계 조회**: terms COUNT, analysis_queue 상태별 COUNT
5. **결과 조합**: 전체 상태 객체 반환

### 구현 가이드

- **패턴**: Service 함수 - lib/views/status-service.ts
- **성능**: 단순 조회이므로 캐싱 불필요
- **날짜 형식**: YYYY-MM-DD HH:mm (UI-R-015)
- **외부 의존성**: Drizzle ORM, CMN-CFG-001

### 관련 기능
- **이 기능을 호출하는 기능**: API Route Handler (GET /api/status)
- **이 기능이 호출하는 기능**: CMN-CFG-001

### 관련 데이터
- DATA-003 MailProcessingLog (최신 실행 상태)
- DATA-007 AnalysisQueue (대기열 통계)
- DATA-004 Term (용어 수 통계)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 정상 조회 | 실행 이력 존재 | 마지막 실행 시점, 상태, 통계 반환 |
| 최초 실행 전 | 이력 없음 | lastExecutedAt=null, lastStatus=null |
| IMAP 미설정 | 환경변수 미설정 | imapConfigured=false |
| API 키 미설정 | ANTHROPIC_API_KEY 없음 | apiKeyConfigured=false |
| 분석 대기 건수 | pending 5건 | pendingAnalysis=5 |
