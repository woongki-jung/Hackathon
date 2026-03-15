# Analysis API 정의

## 개요
- 웹훅 수신 후 분석 결과(요약, 후속 작업 제안)를 조회하는 API를 정의한다.
- 프론트엔드 대시보드, 업무지원 페이지에서 사용한다.
- 관련 도메인 객체: AnalysisQueue (DATA-007)
- 관련 기능: VIEW-STATE-001 (앱 상태 정보 조회)

---

## 분석 상태 흐름

```
웹훅 수신
    │
    ▼
pending ──▶ processing ──▶ completed
                │
                └──▶ failed (retry_count < 3 시 재시도 가능)
```

| 상태 | 설명 |
|------|------|
| `pending` | 큐에 등록됨, 분석 대기 중 |
| `processing` | 분석 진행 중 |
| `completed` | 분석 완료 |
| `failed` | 분석 실패 (retry_count < 3이면 재시도 가능) |

> **completed 전환 조건**: `analyzeSingleItem()` 실행 완료 시 `analyzed_at`, `summary`, `action_items`, `extracted_term_count`가 설정되고 status가 `completed`로 전환된다.

> **failed 전환 조건**: Gemini API 오류, 콘텐츠 없음 등 분석 불가 시 `error_message`와 함께 status가 `failed`로 전환되고 `retry_count`가 1 증가한다. `retry_count >= 3`이면 더 이상 재시도하지 않는다.

> **stuck 복구**: processing 상태가 5분 이상 지속된 항목은 `runBatchAnalysis()` 실행 시 자동으로 `pending`으로 복구된다 (Vercel 함수 강제 종료 대응).

---

## ANAL-001 최신 분석 결과 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/analysis/latest |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 가장 최근 완료된 분석 결과를 조회한다 |

### 요청

파라미터 없음.

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440010",
    "sourceDescription": "고객지원 메일 분석",
    "receivedAt": "2026-03-15T08:30:00Z",
    "status": "completed",
    "summary": "EMR 시스템 v3.2 업데이트가 3월 20일 예정되어 있으며...",
    "actionItems": [
      "3월 20일 업데이트 일정 확인 및 팀 공유",
      "진료기록 연동 API 변경사항 개발팀 전달"
    ],
    "extractedTermCount": 8,
    "analyzedAt": "2026-03-15T10:01:30Z"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 분석 큐 레코드 UUID |
| sourceDescription | string / null | 웹훅 제목 또는 설명 |
| receivedAt | string / null | 수신 일시 (ISO 8601) |
| status | string | 분석 상태 |
| summary | string | 핵심 내용 요약 |
| actionItems | string[] | 후속 작업 제안 목록 (최대 5개) |
| extractedTermCount | number | 추출된 용어 수 |
| analyzedAt | string | 분석 완료 일시 |

#### 성공 응답 (200 OK) - 결과 없음
```json
{
  "success": true,
  "data": null,
  "message": "분석 결과가 없습니다."
}
```

#### 에러 응답
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 세션 없음 또는 만료 |

### 비즈니스 규칙
- `analysis_queue`에서 `status = 'completed'`이고 `analyzed_at`이 가장 최신인 레코드 1건을 반환한다.
- `actionItems`는 DB에 JSON 배열 문자열로 저장되어 있으며, 파싱하여 배열로 반환한다.

---

## ANAL-002 분석 이력 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/analysis/history |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 분석 이력을 목록으로 조회한다 (페이지네이션) |

### 요청

#### Query Parameters
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 (1부터 시작) |
| limit | number | ❌ | 20 | 페이지당 항목 수 (최대 100) |
| status | string | ❌ | - | 상태 필터 (`completed` / `failed` / `pending` / `processing`) |

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440010",
        "sourceDescription": "고객지원 메일 분석",
        "receivedAt": "2026-03-15T08:30:00Z",
        "status": "completed",
        "extractedTermCount": 8,
        "analyzedAt": "2026-03-15T10:01:30Z",
        "retryCount": 0,
        "errorMessage": null,
        "createdAt": "2026-03-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 42,
      "totalPages": 3
    }
  }
}
```

#### 에러 응답
| 상태 코드 | 설명 |
|-----------|------|
| 400 | page/limit 값 유효성 오류 |
| 401 | 세션 없음 또는 만료 |

### 비즈니스 규칙
- 기본 정렬: `created_at` 기준 최신순(내림차순).
- `status` 필터를 지정하지 않으면 모든 상태의 이력을 반환한다.

---

## ANAL-003 분석 상세 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/analysis/{id} |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 특정 분석 항목의 상세 정보와 추출된 용어 목록을 조회한다 |

### 요청

#### Path Parameters
| 파라미터 | 타입 | 설명 |
|----------|------|------|
| id | string | 분석 큐 레코드 UUID |

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "770e8400-e29b-41d4-a716-446655440010",
      "fileName": "webhook_mail-support_1710489000000.txt",
      "webhookCode": "mail-support",
      "status": "completed",
      "sourceDescription": "고객지원 메일 분석",
      "receivedAt": "2026-03-15T08:30:00Z",
      "summary": "EMR 시스템 v3.2 업데이트 관련 안내...",
      "actionItems": "[\"일정 확인\", \"개발팀 전달\"]",
      "extractedTermCount": 8,
      "analyzedAt": "2026-03-15T10:01:30Z",
      "retryCount": 0,
      "errorMessage": null,
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:01:30Z"
    },
    "extractedTerms": [
      { "id": "uuid", "name": "EMR", "category": "IT시스템" },
      { "id": "uuid", "name": "처방전 모듈", "category": "기능" }
    ]
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| item | object | 분석 큐 전체 레코드 |
| item.status | string | `pending` / `processing` / `completed` / `failed` |
| item.summary | string / null | 분석 요약 (completed 시 설정) |
| item.actionItems | string / null | JSON 배열 문자열 (completed 시 설정) |
| item.analyzedAt | string / null | 분석 완료 일시 (completed 시 설정) |
| item.errorMessage | string / null | 오류 메시지 (failed 시 설정) |
| item.retryCount | number | 재시도 횟수 (최대 3) |
| extractedTerms | array | 이 분석에서 추출된 용어 목록 |

> 이 엔드포인트는 웹훅 응답의 `queueId`를 사용하여 분석 완료 여부를 폴링하는 용도로 사용 가능하다.

#### 에러 응답
| 상태 코드 | 설명 |
|-----------|------|
| 401 | 세션 없음 또는 만료 |
| 404 | 분석 항목 없음 |

### 분석 완료 상태 업데이트 흐름

```
웹훅 POST 수신
    │
    ▼
analysis_queue INSERT (status: pending)
    │
    ▼
analyzeSingleItem() 실행
    │
    ├── 성공 → status: completed
    │          analyzedAt: <ISO 8601>
    │          summary: <텍스트>
    │          actionItems: <JSON 배열>
    │          extractedTermCount: <숫자>
    │
    └── 실패 → status: failed
               errorMessage: <오류 내용>
               retryCount: +1
```

웹훅 응답의 `data.queueId`를 사용하여 `GET /api/analysis/{queueId}`로 최종 상태를 확인할 수 있다.

### 비즈니스 규칙
- `completed` 전환: `analyzeSingleItem()` 성공 시 `analyzed_at`, `summary`, `action_items`, `extracted_term_count` 갱신
- `failed` 전환: 분석 오류 시 `error_message` 기록, `retry_count` 증가
- `retry_count >= 3`: 자동 재시도 불가, 수동 재처리 필요 (`POST /api/mail/check`)
- stuck 복구: `processing` 상태가 5분 이상 지속된 항목은 `runBatchAnalysis()` 실행 시 `pending`으로 자동 복구
