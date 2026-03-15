# Mail/Analysis 서비스 API 정의

## 개요
- 분석 서비스의 상태 조회 및 수동 재처리 트리거 API를 정의한다.
- 웹훅 수신 방식으로 전환되어 스케줄러/IMAP은 사용하지 않는다.
- 관련 도메인 객체: MailProcessingLog (DATA-003)
- 관련 기능: VIEW-STATE-001 (앱 상태 정보 조회)

---

## MAIL-001 서비스 상태 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/mail/status |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 웹훅 수신 및 분석 서비스의 현재 상태를 조회한다 |

### 요청

파라미터 없음.

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "webhook": {
      "count": 3
    },
    "lastRunAt": "2026-03-15T10:00:00Z",
    "lastRunStatus": "success",
    "lastRunAnalyzedCount": 5,
    "analysis": {
      "apiKeyConfigured": true,
      "model": "gemini-3.1-pro-preview"
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| webhook.count | number | 등록된 웹훅 수신기 수 |
| lastRunAt | string / null | 마지막 배치 실행 시각 (ISO 8601) |
| lastRunStatus | string / null | 마지막 실행 결과 (`success` / `failed`) |
| lastRunAnalyzedCount | number / null | 마지막 실행 시 분석 완료 건수 |
| analysis.apiKeyConfigured | boolean | Gemini API 키 설정 여부 |
| analysis.model | string / null | 사용 중인 AI 모델명 |

#### 에러 응답
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 세션 없음 또는 만료 |

### 비즈니스 규칙
- `mail_processing_logs` 테이블에서 최신 레코드를 조회한다.
- 관리자와 일반 사용자 모두 조회할 수 있다.

---

## MAIL-002 미완료 항목 재분석 트리거

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | POST |
| 경로 | /api/mail/check |
| 인증 | 필요 |
| 권한 | admin |
| 설명 | pending/failed 상태의 미완료 분석 항목을 수동으로 재처리한다 (관리자 전용) |

### 요청

Request Body 없음.

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "message": "미완료 항목 재분석이 시작되었습니다."
}
```

#### 에러 응답
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 세션 없음 또는 만료 |
| 403 | 관리자 권한 필요 |

### 비즈니스 규칙
- 비동기 실행: API 호출 즉시 응답하고 분석은 백그라운드에서 수행한다.
- 실행 시 5분 이상 `processing` 상태인 stuck 항목을 `pending`으로 자동 복구한다.
- `pending` 또는 `failed`(`retry_count < 3`) 항목을 순차 처리한다.
- 처리 결과는 `ANAL-002` (분석 이력 조회) 또는 `ANAL-003` (분석 상세 조회)으로 확인한다.

### 관련 기능
- TERM-BATCH-001 (배치 분석 오케스트레이션)
