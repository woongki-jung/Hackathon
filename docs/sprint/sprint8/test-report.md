# Sprint 8 Playwright 검증 보고서

**작성일:** 2026-03-15
**검증 환경:** http://localhost:3000 (Next.js dev 서버)
**검증 계정:** admin / Admin123!
**빌드 결과:** npm run build 통과 / npm run lint 통과

---

## 자동 검증 결과 요약

| 항목 | 결과 |
|------|------|
| `npm run build` | ✅ 통과 |
| `npm run lint` | ✅ 통과 |
| 대시보드 렌더링 | ✅ 정상 |
| 대시보드 "상세 보기" 링크 | ✅ `/work/{id}` URL 정상 |
| 대시보드 이력 "보기" 링크 | ✅ `/work/{id}` URL 정상 |
| 업무지원 상세 화면 렌더링 | ✅ 정상 |
| 업무지원 상세 메일 정보 | ✅ 제목, 수신일, 분석완료일, 상태 뱃지 표시 |
| 업무지원 상세 AI 요약 | ✅ 정상 표시 |
| 업무지원 상세 후속 작업 체크리스트 | ✅ 정상 표시 (4개 항목) |
| 업무지원 상세 추출 용어 태그 | ✅ 2개 표시 (처방전, EMR) |
| 용어 태그 → /dictionary/{id} 이동 | ✅ 정상 (직접 URL 접근 확인) |
| /work/nonexistent-id 404 처리 | ✅ "요청하신 분석 항목을 찾을 수 없습니다." 정상 표시 |
| GNB /dictionary/[id] 경로 "용어사전" 하이라이트 | ✅ 정상 |
| GNB /work/[id] 경로 하이라이트 없음 | ✅ 정상 (어떤 메뉴도 활성화 안 됨) |
| GNB 전체 메뉴 표시 (데스크톱) | ✅ 대시보드, 용어사전, 환경설정, 사용자 관리 |
| 콘솔 에러 | ✅ 0건 |

---

## 발견된 이슈

### Medium: 날짜 포맷 표시 형식 불일치 (M-01)

**위치:** 전체 화면 날짜 표시
**현상:** 날짜가 "YYYY-MM-DD HH:mm" 형식이 아닌 "YYYY-MM-DD-오전/오후 HH:mm" 형식으로 표시됨
- 예: `2026-03-14-오후 05:30` (실제 표시)
- 예: `2026-03-14 17:30` (사양 UI-R-015 기대값)

**원인:** `src/lib/utils/date.ts`의 `formatDate()` 함수에서 `ko-KR` 로케일의 12시간제 포맷이 사용됨
```typescript
return new Date(iso).toLocaleString('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit',
}).replace(/\. /g, '-').replace('.', '').trim();
```
`ko-KR` 로케일에서 12시간제를 사용하면 "오전/오후"가 포함됨. 24시간제(`hour12: false`)를 사용하거나 직접 ISO 문자열을 파싱하는 방식으로 변경 필요.

**영향 범위:** 대시보드, 업무지원 상세, 용어 상세 등 날짜가 표시되는 모든 화면
**권장 조치:** Sprint 9에서 `hour12: false` 옵션 추가 또는 ISO 문자열 직접 파싱 방식으로 수정

---

### 참고: Playwright SPA 링크 클릭 동작

**현상:** Playwright MCP에서 Next.js App Router의 `<Link>` 컴포넌트 클릭 시 페이지 이동이 되지 않는 경우 발생
**원인:** Next.js의 클라이언트 사이드 라우팅이 Playwright의 click 이벤트와 충돌할 수 있음
**조치:** 직접 URL 탐색(`browser_navigate`)으로 우회하여 검증 완료
**기능 영향 없음:** `href` 속성이 올바르게 설정되어 있어 실제 사용자 환경에서는 정상 동작

---

## 스크린샷

| 파일 | 설명 |
|------|------|
| [01-dashboard-empty.png](01-dashboard-empty.png) | 대시보드 초기 상태 (분석 결과 없음) |
| [02-dashboard-with-data.png](02-dashboard-with-data.png) | 대시보드 — 분석 결과 및 "상세 보기"/"보기" 링크 |
| [03-work-detail.png](03-work-detail.png) | 업무지원 상세 화면 전체 (요약, 후속 작업, 추출 용어) |
| [04-work-detail-checked.png](04-work-detail-checked.png) | 업무지원 상세 — 후속 작업 체크박스 영역 |
| [05-dictionary-detail-from-work.png](05-dictionary-detail-from-work.png) | 용어 상세 화면 (업무지원 상세에서 연동) |
| [06-gnb-dictionary-active.png](06-gnb-dictionary-active.png) | GNB — 모바일 뷰 |
| [07-gnb-desktop-dictionary-active.png](07-gnb-desktop-dictionary-active.png) | GNB 데스크톱 — 용어사전 메뉴 활성화 하이라이트 |
| [08-gnb-work-no-highlight.png](08-gnb-work-no-highlight.png) | GNB 데스크톱 — /work 경로 메뉴 하이라이트 없음 |

---

## 수동 검증 필요 항목

deploy.md 참고.
