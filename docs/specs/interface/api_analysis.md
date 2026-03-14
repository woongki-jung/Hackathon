# Analysis API 정의

## 개요
- 메일 분석 결과(요약, 후속 작업 제안)를 조회하는 API를 정의한다.
- 프론트엔드 "업무지원" 페이지에서 사용한다.
- 관련 도메인 객체: AnalysisQueue (DATA-007)
- 관련 기능: VIEW-STATE-001 (앱 상태 정보 조회)
- 관련 정책: POL-UI (UI-R-008, UI-R-016)

---

## ANAL-001 최신 분석 결과 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/analysis/latest |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 가장 최근 완료된 메일 분석 결과를 조회한다 |

### 요청

파라미터 없음.

#### 요청 예시
```http
GET /api/analysis/latest HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440010",
    "mailSubject": "[긴급] EMR 시스템 업데이트 안내",
    "mailReceivedAt": "2026-03-15T08:30:00Z",
    "summary": "EMR 시스템 v3.2 업데이트가 3월 20일 예정되어 있으며, 주요 변경사항으로 처방전 모듈 개선과 진료기록 연동 API 변경이 포함됩니다.",
    "actionItems": [
      "3월 20일 업데이트 일정 확인 및 팀 공유",
      "진료기록 연동 API 변경사항 개발팀 전달",
      "업데이트 전 데이터 백업 계획 수립",
      "테스트 환경에서 사전 검증 일정 확보"
    ],
    "extractedTermCount": 8,
    "analyzedAt": "2026-03-15T10:01:30Z"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 분석 대기열 레코드 UUID |
| mailSubject | string / null | 메일 제목 |
| mailReceivedAt | string / null | 메일 수신 일시 (ISO 8601) |
| summary | string | 메일 핵심 내용 요약 (최대 500자, TERM-R-010) |
| actionItems | string[] | 후속 작업 제안 목록 (최대 5개, TERM-R-011) |
| extractedTermCount | number | 추출된 용어 수 |
| analyzedAt | string | 분석 완료 일시 (ISO 8601) |

#### 성공 응답 (200 OK) - 분석 결과 없음
```json
{
  "success": true,
  "data": null,
  "message": "분석 결과가 없습니다."
}
```

> 분석 완료된 결과가 하나도 없는 경우 `data: null`로 응답한다.

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- `analysis_queue` 테이블에서 `status = 'completed'`이고 `analyzed_at`이 가장 최신인 레코드 1건을 반환한다.
- 업무지원 페이지 상단에 노출되는 데이터이다 (UI-R-008).
- `actionItems`는 DB에 JSON 배열 문자열로 저장되어 있으며, 파싱하여 배열로 반환한다.

### 관련 기능
- TERM-BATCH-001 (배치 분석 결과)
- VIEW-STATE-001 (앱 상태 정보 조회)

---

## ANAL-002 분석 이력 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 메서드 | GET |
| 경로 | /api/analysis/history |
| 인증 | 필요 |
| 권한 | all (admin, user) |
| 설명 | 이전 메일 분석 결과 이력을 목록으로 조회한다 (페이지네이션) |

### 요청

#### Query Parameters
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| page | number | ❌ | 1 | 페이지 번호 (1부터 시작) |
| limit | number | ❌ | 20 | 페이지당 항목 수 (최대 100) |
| status | string | ❌ | - | 상태 필터 (`completed` / `failed` / `pending` / `processing`) |

#### 요청 예시
```http
GET /api/analysis/history?page=1&limit=20&status=completed HTTP/1.1
Cookie: mail-term-session=...
```

### 응답

#### 성공 응답 (200 OK)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440010",
        "fileName": "1710489000000_a1b2c3d4.txt",
        "mailSubject": "[긴급] EMR 시스템 업데이트 안내",
        "mailReceivedAt": "2026-03-15T08:30:00Z",
        "status": "completed",
        "summary": "EMR 시스템 v3.2 업데이트가 3월 20일 예정...",
        "actionItems": [
          "3월 20일 업데이트 일정 확인 및 팀 공유",
          "진료기록 연동 API 변경사항 개발팀 전달"
        ],
        "extractedTermCount": 8,
        "analyzedAt": "2026-03-15T10:01:30Z",
        "createdAt": "2026-03-15T10:00:00Z"
      },
      {
        "id": "770e8400-e29b-41d4-a716-446655440011",
        "fileName": "1710402600000_e5f6g7h8.txt",
        "mailSubject": "월간 보고서 검토 요청",
        "mailReceivedAt": "2026-03-14T14:00:00Z",
        "status": "completed",
        "summary": "3월 월간 보고서 검토 요청으로...",
        "actionItems": [
          "보고서 내용 검토 후 피드백 회신"
        ],
        "extractedTermCount": 5,
        "analyzedAt": "2026-03-14T15:02:00Z",
        "createdAt": "2026-03-14T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 42,
      "totalPages": 3
    }
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| items[].id | string | 분석 대기열 레코드 UUID |
| items[].fileName | string | 메일 임시 파일명 |
| items[].mailSubject | string / null | 메일 제목 |
| items[].mailReceivedAt | string / null | 메일 수신 일시 |
| items[].status | string | 분석 상태 (`pending` / `processing` / `completed` / `failed`) |
| items[].summary | string / null | 메일 요약 (completed인 경우에만) |
| items[].actionItems | string[] / null | 후속 작업 목록 (completed인 경우에만) |
| items[].extractedTermCount | number | 추출된 용어 수 |
| items[].analyzedAt | string / null | 분석 완료 일시 |
| items[].createdAt | string | 대기열 등록 일시 |
| pagination | object | 페이지네이션 정보 |

#### 에러 응답
| 상태 코드 | 에러 코드 | 설명 |
|-----------|-----------|------|
| 400 | INVALID_REQUEST | page/limit 값 유효성 오류 |
| 401 | UNAUTHORIZED | 세션 없음 또는 만료 |

### 비즈니스 규칙
- 기본 정렬: `analyzed_at` 또는 `created_at` 기준 최신순(내림차순) (UI-R-016).
- `status` 필터를 지정하지 않으면 모든 상태의 이력을 반환한다.
- `actionItems`는 DB의 JSON 배열 문자열을 파싱하여 반환한다. 파싱 실패 시 빈 배열을 반환한다.
- 분석 결과는 영구 보존한다 (POL-DATA DATA-R-018).

### 관련 기능
- TERM-BATCH-001 (배치 분석 결과)
