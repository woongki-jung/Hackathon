# 개요
이 저장소는 Claude Code 설정(에이전트, 스킬)을 공유하기 위한 템플릿 레포지토리입니다. 빌드/테스트/린트 명령어가 없으며, 모든 파일은 Markdown 형식입니다.

## 저장소 구조

```
.claude/
  agents/          # Claude Code 서브 에이전트 정의
    code-reviewer.md
    prd-to-roadmap.md
    sprint-close.md
    sprint-planner.md
  skills/          # Claude Code 스킬 정의
    karpathy-guidelines/
    writing-plans/
docs/
  PRD.md           # 제품 요구사항 문서 (사용하는 프로젝트에서 생성)
  ROADMAP.md       # 프로젝트 로드맵 (prd-to-roadmap 에이전트가 생성)
  plans/           # 구현 계획 문서 (YYYY-MM-DD-<feature-name>.md)
  specs/           # 제품 상세 사양 문서
    policies/      # 제품 정책 문서 (policy_<policy-code>.md)
    datas/         # 데이터 정의 문서 (data_<data-name>.md)
    functions/     # 기능 정의 문서 (func_<function-code>.md)
    screens/       # 화면 정의 문서 (scr_<screen-code>.md>)
    interface/     # API 정의 문서 (api_<interface-name>.md)
  sprint/          # 스프린트 문서 및 검증 보고서
    sprint{N}.md
    sprint{N}/     # 스크린샷, Playwright 보고서
domain-dictionary  # 소스코드 프로젝트 루트 폴더
README.md          # 저장소 소개 및 사용 방법
CLAUDE.md          # Claude Code 설정 파일
CLAUDE.local.md          # Claude Code 로컬 설정 파일
```

## 에이전트 파일 형식 (`.claude/agents/*.md`)

각 에이전트 파일은 YAML frontmatter로 시작합니다:

```yaml
---
name: agent-name
description: 에이전트 설명
model: inherit | opus | sonnet | haiku
color: red | blue | green | ...
memory: project   # 프로젝트 메모리 자동 주입
---
```

**중요:** 에이전트 파일에 절대 경로(`/Users/...`)를 하드코딩하지 않습니다. `memory: project`가 런타임에 올바른 경로를 자동 주입합니다.

## 스킬 파일 형식 (`.claude/skills/<name>/SKILL.md`)

```yaml
---
name: skill-name
description: 스킬 설명
---
```

## 스프린트 워크플로우
1. **prd-to-policies** 에이전트: `docs.PRD.md` > `docs/policies/spec-policies.md` 및 하위 정책 정의 생성
2. **prd-to-datas** 에이전트: `docs.PRD.md` > `docs/datas/spec-datas.md` 및 하위 데이터 정의 생성
3. **prd-to-apis** 에이전트: `docs.PRD.md` > `docs/apis/spec-apis.md` 및 하위 API 정의 생성
4. **prd-to-functions** 에이전트: `docs.PRD.md` > `docs/functions/spec-functions.md` 및 하위 기능 정의 생성
5. **prd-to-screens** 에이전트: `docs.PRD.md` > `docs/screens/spec-screens.md` 및 하위 화면 정의 생성
6. **prd-to-roadmap** 에이전트: `docs/PRD.md` → `docs/ROADMAP.md` 생성
7. **sprint-planner** 에이전트: ROADMAP 기반으로 `docs/sprint/sprint{N}.md` 생성
8. 구현 (writing-plans 스킬로 세부 계획 수립 → 실행)
9. **sprint-close** 에이전트: ROADMAP 업데이트 → PR 생성 → 코드 리뷰 → Playwright 검증 → 검증 보고서 저장

## 핵심 에이전트 역할

| 에이전트               | 역할                    | 주요 입력         | 주요 출력                                               |
| ------------------ | --------------------- | ------------- | --------------------------------------------------- |
| `prd-to-policies`  | PRD -> 서비스 정책 변환      | `docs/PRD.md` | `docs/specs/policies/spec-policies.md` 및 하위 정책 문서   |
| `prd-to-datas`     | PRD -> 데이터 정의 변환      | `docs/PRD.md` | `docs/specs/datas/spec-datas.md` 및 하위 정책 문서         |
| `prd-to-apis`      | PRD -> 인터페이스 정의 변환    | `docs/PRD.md` | `docs/specs/interface/spec-apis.md` 및 하위 API 문서       |
| `prd-to-functions` | PRD -> 서비스 공통 기능정의 변환 | `docs/PRD.md` | `docs/specs/functions/spec-functions.md` 및 하위 정책 문서 |
| `prd-to-screens`   | PRD -> 서비스 화면정의 변환    | `docs/PRD.md` | `docs/specs/screens/spec-screens.md` 및 하위 정책 문서     |
| `prd-to-roadmap`   | PRD -> 로드맵 변환         | `docs/PRD.md` | `docs/ROADMAP.md`                                   |
| `sprint-planner`   | 스프린트 계획 수립            | `ROADMAP.md`  | `docs/sprint/sprint{N}.md`                          |
| `sprint-close`     | 스프린트 마무리              | 현재 브랜치        | PR, 검증 보고서                                          |
| `code-reviewer`    | 코드 리뷰                 | 구현 완료 단계      | 이슈 분류 보고 (Critical/Important/Suggestion)            |

## Playwright MCP 검증

`sprint-close` 및 `prd-to-roadmap` 에이전트는 Playwright MCP 도구를 사용하여 앱 실행 상태에서 UI를 직접 검증합니다. 검증 결과는 `docs/sprint/sprint{N}/test-report.md`에 저장합니다.

## 언어 및 커뮤니케이션 규칙

- 기본 응답 언어: 한국어
- 코드 주석: 한국어로 작성
- 커밋 메시지: 한국어로 작성
- 문서화: 한국어로 작성
- 변수명/함수명: 영어 (코드 표준 준수)

## 개발시 유의해야할 사항
- 민감정보 보호
  - 절대 CLAUDE.local.md에 포함된 환경변수가 코드 또는 프로젝트 환경설정에 포함되지 않도록 주의합니다.
  - 로컬 실행을 위해 환경설정 파일 등으로 추가되는 경우, CLAUDE.local.md에 포함된 파일은 git 저장소에 포함되지 않도록 주의합니다.
- sprint 관련 문서 구조:
  - 스프린트 계획/완료 문서: `docs/sprint/sprint{n}.md`
  - 스프린트 첨부 파일 (스크린샷, 보고서 등): `docs/sprint/sprint{n}/`
- sprint 개발이 plan 모드로 진행될 때는 다음을 꼭 준수합니다.
  - karpathy-guidelines skill을 준수하세요.
  - sprint 가 새로 시작될 때는 새로 branch를 sprint{n} 이름으로 생성하고 해당 브랜치에서 작업해주세요. (worktree 사용하지 말아주세요)
  - 다음과 같이 agent를 활용합니다.
    1. sprint-planner agent가 계획 수립 작업을 수행하도록 해주세요.
    2. 구현/검증 단계에서는 각 task의 내용에 따라 적절한 agent가 있는지 확인 한 후 적극 활용해주세요.
    3. 스프린트 구현이 완료되면 sprint-close agent를 사용하여 마무리 작업(ROADMAP 업데이트, PR 생성, 코드 리뷰, 자동 검증)을 수행해주세요.

- 스프린트 검증 원칙 — **자동화 가능한 항목은 sprint-close 시점에 직접 실행**:
  - ✅ **자동 실행**: `dotnet test` — 단위/통합 테스트 실행
  - ✅ **자동 실행**: `dotnet build --configuration Release` — 빌드 성공 여부 확인
  - ✅ **자동 실행**: 정적 분석 (`dotnet format --verify-no-changes`) — 코드 스타일 검증
  - ❌ **수동 필요**: `dotnet build --configuration Release` 후 앱 직접 실행 — 새 코드 반영 확인 (타이밍을 사용자가 결정)
  - ❌ **수동 필요**: DB 마이그레이션 (`dotnet ef database update`) — 스키마 변경 (되돌릴 수 없으므로 사용자가 직접 실행)
  - ❌ **수동 필요**: WinUI 화면 시각적 확인 (렌더링, 버튼 동작, 네비게이션 등)
  - sprint-close agent는 자동 실행 항목을 실행하고 결과를 deploy.md에 기록해야 합니다.
  - deploy.md에는 "자동 검증 완료" 항목과 "수동 검증 필요" 항목을 명확히 구분하여 기재합니다.

- 사용자가 직접 수행해야 하는 작업은 deploy.md 파일을 생성하거나 기존에 존재하는 deploy.md에 수행해야하는 작업을 자세히 정리해주세요.
- 체크리스트 작성 형식:
  - 완료 항목: `- ✅ 항목 내용`
  - 미완료 항목: `- ⬜ 항목 내용`
  - GFM `[x]`/`[ ]` 대신 이모지를 사용하여 마크다운 미리보기에서 시각적 구분을 보장합니다.

- 조회 관련 명령어 또는 파일 열람은 별도의 승인단계를 생략하고 바로 진행합니다.

## 기존 작업 내용이 있는 경우
- 기존 작업 사항이 있는 경우. 확실히 다른 내용으로의 변경이 필요하거나, 기존 내용이 요건에 맞지 않는 경우에만 수정 작업을 진행합니다.
변경을 진행하는 경우, 변경 사유에 대하여 변경 지점과 변경 사유에 대하여 자세히 설명하고 진행 여부에 대한 응답을 확인합니다.