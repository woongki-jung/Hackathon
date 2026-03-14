# 빈도 트렌드 조회 기능 정의

## 개요
- 발견 빈도가 높은 용어 상위 목록 및 최근 갱신된 용어 조회 기능을 정의한다.
- 적용 범위: 용어사전 뷰어 페이지의 빈도 높은 용어 바로가기 영역

---

## VIEW-TREND-001 빈도 트렌드 조회

### 기본 정보
| 항목 | 내용 |
|------|------|
| 기능명 | 빈도 트렌드 조회 |
| 분류 | 도메인 특화 로직 |
| 레이어 | lib/views |
| 트리거 | 용어사전 뷰어 페이지 로드 시 |
| 관련 정책 | POL-UI (UI-R-017) |

### 입력 / 출력

#### 1. 빈도 상위 용어 조회 (getTopFrequentTerms)

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| limit | number | ❌ | 조회 건수 | 기본값 10 (UI-R-017) |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| terms | TermSummary[] | 빈도 내림차순 용어 목록 |

```typescript
interface TermSummary {
  id: string;
  name: string;
  category: string;
  frequency: number;
  updatedAt: string;
}
```

#### 2. 최근 갱신 용어 조회 (getRecentlyUpdatedTerms)

##### 입력 (Input)
| 파라미터 | 타입 | 필수 | 설명 | 유효성 규칙 |
|----------|------|------|------|-------------|
| limit | number | ❌ | 조회 건수 | 기본값 10 |

##### 출력 (Output)
| 항목 | 타입 | 설명 |
|------|------|------|
| terms | TermSummary[] | 갱신일 내림차순 용어 목록 |

### 처리 흐름

1. **빈도 조회**: terms 테이블에서 frequency DESC, 상위 N건 조회
2. **최근 갱신 조회**: terms 테이블에서 updated_at DESC, 상위 N건 조회
3. **결과 반환**: TermSummary 배열

### 구현 가이드

- **패턴**: Service 함수 - lib/views/trend-service.ts
- **성능**: frequency, updated_at 인덱스 활용
- **외부 의존성**: Drizzle ORM

### 관련 기능
- **이 기능을 호출하는 기능**: API Route Handler (GET /api/terms/trending)
- **이 기능이 호출하는 기능**: 없음

### 관련 데이터
- DATA-004 Term (terms 테이블)

### 테스트 시나리오

| 시나리오 | 입력 조건 | 기대 결과 |
|----------|-----------|-----------|
| 빈도 상위 10건 | 용어 50건 존재 | 빈도 높은 순 10건 |
| 최근 갱신 10건 | 용어 50건 존재 | 갱신일 최신순 10건 |
| 용어 없음 | 빈 DB | 빈 배열 |
| limit 지정 | limit=5 | 5건만 반환 |
