# Sprint 3 코드 리뷰 보고서

- **작성일**: 2026-03-15
- **리뷰 대상**: sprint3 브랜치 → main (PR 예정)
- **리뷰어**: sprint-close agent (code-reviewer subagent 기반)

---

## 요약

| 구분 | 건수 |
|------|------|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Suggestion | 4 |

Critical/High 이슈가 1건 식별됨. 해당 이슈에 대해 수정 여부 확인 필요.

---

## High 이슈

### H-1: `settings-service.ts` — async 함수 내 better-sqlite3 동기 호출 (불일치)

**파일**: `src/lib/config/settings-service.ts`
**위치**: `getSetting`, `setSetting`, `getAllSettings`, `setMultipleSettings` 함수

**내용**:
함수들이 `async`로 선언되어 있으나, better-sqlite3 API는 완전 동기식(`db.select().get()`, `db.insert().run()` 등)이다. async/await을 쓸 필요가 없으며, 호출자에서 `await`을 기대하는 코드가 섞일 경우 타입 혼선이 발생할 수 있다. 특히 `config/route.ts`에서 `await getAllSettings()`로 호출하는데, 실제로는 Promise가 아닌 동기 반환값을 unwrap하는 불필요한 await이다.

**영향**: 현재 동작에는 문제가 없지만(sync 값도 await 가능), 코드 의도와 실제 구현이 불일치하여 미래 리팩토링 시 혼란을 야기할 수 있다.

**권장 수정**:
```ts
// 현재
export async function getSetting(key: SettingKey): Promise<string | null> { ... }

// 권장
export function getSetting(key: SettingKey): string | null { ... }
```

---

## Medium 이슈

### M-1: `admin/users/page.tsx` — 날짜 표시 형식 불일치

**파일**: `src/app/(authenticated)/admin/users/page.tsx`
**위치**: 186번째 줄 근처 (`new Date(user.createdAt).toLocaleDateString('ko-KR')`)

**내용**:
사용자 등록일을 `toLocaleDateString('ko-KR')` 으로 표시하고 있어 `2026. 3. 15.` 형태로 출력된다. UI-R-015 규칙(`YYYY-MM-DD HH:mm`)을 따르지 않고 있다.

**권장 수정**:
```ts
// 현재
new Date(user.createdAt).toLocaleDateString('ko-KR')

// 권장
new Date(user.createdAt).toLocaleString('ko-KR', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false
})
// 또는 공통 포맷 유틸리티 함수 사용 (Sprint 8 T8-5에서 통일 예정)
```

### M-2: `GNB.tsx` — Server Component를 Client Component로 구현

**파일**: `src/components/layout/GNB.tsx`

**내용**:
스프린트 계획 문서(sprint3.md)에서는 "세션 정보를 가져오는 부분은 Server Component, 경로 하이라이트/햄버거 메뉴 토글은 Client Component로 분리"한다고 명시했으나, 실제 구현에서는 레이아웃(`layout.tsx`)에서 세션 정보를 props로 받아 Client Component인 GNB.tsx에 전달하는 방식을 선택했다.

결과적으로는 동일하게 동작하며, 세션 정보가 클라이언트로 직렬화되어 전송된다. 현재 `username`, `role` 정도의 비민감 데이터만 전달되어 보안 위험은 낮다. 다만 userId 같은 식별자가 추가로 노출될 경우 검토가 필요하다.

**현재 영향**: 낮음 (username, role만 전달)

### M-3: `test-mail/route.ts` — ImapFlow 연결 후 에러 발생 시 logout 미호출

**파일**: `src/app/api/config/test-mail/route.ts`
**위치**: getMailboxLock 이후 예외 발생 시 처리

**내용**:
`client.connect()` 이후 `getMailboxLock` 또는 `client.status()` 호출 중 예외가 발생하면 `catch` 블록에서 `client.logout()`이 호출되지 않아 IMAP 연결이 정리되지 않을 수 있다.

```ts
// 현재: 연결 실패 시 logout 없음
} catch (err) {
  const message = err instanceof Error ? err.message : '알 수 없는 오류';
  return NextResponse.json({ ... });
}
```

**권장**: `finally` 블록에서 연결 정리 시도 또는 `try/catch` 구조 재조정.

---

## Suggestion (제안)

### S-1: `users/route.ts` — 중복 확인 시 소프트 삭제 사용자 고려 필요

**파일**: `src/app/api/users/route.ts`
**위치**: 중복 확인 로직

**내용**:
현재 중복 아이디 확인에서 소프트 삭제된 사용자도 `existing`에 포함되어 충돌이 발생한다. 즉, 삭제된 사용자와 동일한 아이디로 재등록이 불가능하다. 스프린트 계획 문서에서는 "소프트 삭제 제외한 목록 반환"이라고 명시되어 있어, 중복 확인 기준도 `deletedAt IS NULL`로 제한하는 것이 더 자연스럽다.

```ts
// 현재: 삭제된 사용자 포함 중복 확인
const existing = db.select().from(users).where(eq(users.username, username!)).get();

// 권장: 활성 사용자만 중복 확인
const existing = db.select().from(users)
  .where(and(eq(users.username, username!), isNull(users.deletedAt)))
  .get();
```

### S-2: `settings-service.ts` — getAllSettings에서 SETTING_KEYS 범위 외 키도 반환

**파일**: `src/lib/config/settings-service.ts`

**내용**:
`getAllSettings()`는 `appSettings` 테이블 전체를 반환하는데, 미래에 다른 곳에서 정의되지 않은 키가 저장될 경우 응답에 포함된다. `SETTING_KEYS`로 제한하는 방식이 더 안전하다.

### S-3: `admin/users/page.tsx` — 등록 폼 password 필드에 autocomplete 누락

**파일**: `src/app/(authenticated)/admin/users/page.tsx`

**내용**:
비밀번호 입력 필드에 `autoComplete="new-password"` 속성이 없어 일부 브라우저에서 자동완성이 기존 비밀번호를 채울 수 있다. 관리자가 신규 사용자 비밀번호를 설정하는 폼이므로 `autoComplete="new-password"` 추가 권장.

### S-4: `config/route.ts` — CFG-002 응답에 업데이트된 ConfigData 미반환

**파일**: `src/app/api/config/route.ts`
**위치**: PUT 핸들러 응답

**내용**:
PUT `/api/config` 성공 시 `{ success: true, message: '...' }` 만 반환하고 있어, 클라이언트에서 저장 후 최신 설정을 확인하려면 GET을 다시 호출해야 한다. 스프린트 계획 문서(T3-4)에는 `{ success: true, data: ConfigData, message }` 형식으로 정의되어 있었다. `settings/page.tsx`의 `fetchConfig()` 재호출로 실질적 문제는 없으나, API 명세와 불일치.

---

## 긍정적 평가

- `requireAdmin()` + `isNextResponse()` 패턴이 일관되게 적용됨 — 모든 admin 전용 API에서 인증 검사가 누락되지 않음
- 민감정보(비밀번호, API 키) 마스킹이 올바르게 구현됨 (`process.env` 존재 여부만 boolean으로 반환)
- 사용자 소프트 삭제 패턴 (`deletedAt`) 구현이 적절함
- Toast 시스템이 Context API로 전역 관리되며, 3초 자동 제거 및 수동 닫기 모두 지원
- `imapflow` 연결 테스트 시 10초 타임아웃 구현이 올바름 (`Promise.race`)
- 환경설정 화면의 ms/분 변환 처리가 올바르게 구현됨

---

## 결론

**Critical 이슈 없음.** High 이슈(H-1) 1건은 동작 문제는 아니나 코드 품질 관점에서 수정 권장. Medium 이슈 3건은 추후 스프린트에서 점진적으로 개선 가능. 전반적으로 Sprint 3 구현 품질은 양호하다.
