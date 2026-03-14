# Claude API 외부 연동 인터페이스 정의

## 개요
- Anthropic Claude API를 호출하여 메일 분석, 용어 추출, 해설 생성을 수행하는 외부 연동 인터페이스를 정의한다.
- 이 인터페이스는 REST API 엔드포인트가 아닌, 서버 사이드에서만 사용하는 외부 API 호출 규격이다.
- 관련 라이브러리: @anthropic-ai/sdk
- 관련 기능: TERM-EXT-001 (용어 추출), TERM-CLS-001 (용어 분류), TERM-GEN-001 (해설 생성)
- 관련 정책: POL-TERM (TERM-R-004 ~ TERM-R-009), POL-AUTH (AUTH-R-018)

---

## CLAUDE-001 Claude API 호출

### 기본 정보
| 항목 | 내용 |
|------|------|
| 유형 | 외부 API 호출 (서버 사이드 전용) |
| 대상 서비스 | Anthropic Claude Messages API |
| SDK | @anthropic-ai/sdk |
| 인증 | ANTHROPIC_API_KEY 환경변수 (AUTH-R-018) |
| 모델 | 환경변수 ANTHROPIC_MODEL (기본값: claude-sonnet-4-6) (TERM-R-005) |

### SDK 초기화

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

> API 키가 미설정(`ANTHROPIC_API_KEY` 환경변수 없음)이면 분석 프로세스를 건너뛴다 (TERM-R-006).

### 호출 규격

#### Messages API 호출
```typescript
const response = await client.messages.create({
  model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  max_tokens: 4096,
  system: "<시스템 프롬프트>",
  messages: [
    {
      role: "user",
      content: "<메일 본문 텍스트 (최대 10,000자)>"
    }
  ]
});
```

#### 요청 파라미터
| 파라미터 | 타입 | 값 | 설명 | 관련 정책 |
|----------|------|----|------|-----------|
| model | string | 환경변수 ANTHROPIC_MODEL | 사용 모델 | TERM-R-005 |
| max_tokens | number | 4096 | 최대 응답 토큰 수 | - |
| system | string | 분석 목적별 시스템 프롬프트 | 시스템 프롬프트 | - |
| messages[0].content | string | 메일 본문 (최대 10,000자) | 분석 대상 텍스트 | TERM-R-009 |

#### 응답 구조 (SDK 반환값)
```typescript
interface MessageResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: Array<{
    type: "text";
    text: string;  // JSON 문자열로 구조화된 응답
  }>;
  model: string;
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence";
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
```

### 분석 목적별 호출

#### 1. 메일 요약 및 후속 작업 생성

**시스템 프롬프트 목적**: 메일 본문의 핵심 내용을 요약하고 후속 작업을 제안한다.

**기대 응답 JSON 구조**:
```json
{
  "summary": "메일 핵심 내용 요약 (최대 500자)",
  "actionItems": [
    "후속 작업 1",
    "후속 작업 2"
  ]
}
```

| 필드 | 타입 | 제약 | 관련 정책 |
|------|------|------|-----------|
| summary | string | 최대 500자 | TERM-R-010 |
| actionItems | string[] | 최대 5개 항목 | TERM-R-011 |

#### 2. 용어 추출 및 분류

**시스템 프롬프트 목적**: 메일 본문에서 EMR/비즈니스/약어 용어를 추출하고 분류한다.

**기대 응답 JSON 구조**:
```json
{
  "terms": [
    {
      "name": "용어명",
      "category": "emr | business | abbreviation | general",
      "description": "용어에 대한 한국어 해설"
    }
  ]
}
```

| 필드 | 타입 | 제약 | 관련 정책 |
|------|------|------|-----------|
| terms | array | 최대 30개 | TERM-R-015 |
| terms[].name | string | 용어명 | - |
| terms[].category | string | emr/business/abbreviation/general 중 하나 | TERM-R-013 |
| terms[].description | string | 한국어 해설 | TERM-R-014 |

### 에러 처리

| 에러 상황 | 처리 방식 | 관련 정책 |
|-----------|-----------|-----------|
| API 키 미설정 | 분석 프로세스 건너뜀, 경고 로그 기록 | TERM-R-006 |
| API 호출 실패 (네트워크 등) | 최대 2회 재시도, 간격 5초 | TERM-R-007 |
| 타임아웃 (60초) | 재시도 로직 적용 | TERM-R-008 |
| 3회 모두 실패 | 해당 파일 분석 건너뜀, 오류 로그 기록 | TERM-R-007 |
| 응답 JSON 파싱 실패 | 분석 실패 처리, 오류 로그 기록 | - |
| Rate Limit (429) | 재시도 로직 적용 (지수 백오프) | CMN-HTTP-001 |

### 재시도 정책

```
시도 1: 즉시 실행
시도 2: 5초 대기 후 재시도
시도 3: 5초 대기 후 재시도
3회 모두 실패 시: 해당 파일 status = 'failed', retry_count 증가
```

> 파일 단위 재시도(TERM-R-021)와 API 호출 단위 재시도(TERM-R-007)는 별개이다. API 호출 3회 실패 시 파일 분석 실패로 처리하고, 파일 단위 재시도는 다음 스케줄러 주기에서 수행한다.

### 비즈니스 규칙
- API 키는 환경변수에서만 관리하며 DB에 저장하지 않는다 (AUTH-R-018).
- 메일 본문은 최대 10,000자로 제한하여 전송한다 (TERM-R-009).
- 메일 본문이 100자 미만인 경우 용어 분석을 건너뛰고 요약만 저장한다 (POL-TERM 예외 사항).
- 해설은 한국어로 생성한다. 영문 메일도 한국어 해설을 생성한다 (POL-TERM 예외 사항).
- 시스템 프롬프트는 별도 파일로 관리하여 유지보수성을 확보한다 (POL-TERM 구현 가이드).
- 분석은 순차 처리를 기본으로 한다 (POL-TERM 구현 가이드).

### 관련 기능
- TERM-EXT-001 (용어 추출)
- TERM-CLS-001 (용어 분류)
- TERM-GEN-001 (해설 생성)
- TERM-BATCH-001 (배치 분석 오케스트레이션)
- CMN-HTTP-001 (HTTP 재시도)
