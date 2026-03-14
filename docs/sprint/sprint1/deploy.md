# Sprint 1 배포 및 검증 가이드

## 자동 검증 완료

- ✅ Core 프로젝트 빌드 (`dotnet build src/MailTermAnalyzer.Core/`) — 오류 없음
- ✅ Infrastructure 프로젝트 빌드 (`dotnet build src/MailTermAnalyzer.Infrastructure/`) — 오류 없음
- ✅ 단위 테스트 6개 통과 (`dotnet test tests/MailTermAnalyzer.Tests/`) — Passed: 6, Failed: 0

## 수동 검증 필요

### 사전 준비: Visual Studio C++ 빌드 도구 설치

WinUI 3 앱 빌드는 MSVC (Microsoft C++ 빌드 도구)가 필요합니다.
Visual Studio Installer를 열어 다음 워크로드를 추가로 설치하세요:

1. Visual Studio Installer 실행 (`C:\Program Files (x86)\Microsoft Visual Studio\Installer\vs_installer.exe`)
2. Visual Studio 18 Professional의 "수정" 클릭
3. 다음 워크로드 선택 후 설치:
   - **C++를 사용한 데스크톱 개발** (Desktop development with C++)
   - **Windows 앱 개발** (Windows application development) — Windows App SDK 포함

### App 프로젝트 빌드 확인

```bash
dotnet build src/MailTermAnalyzer.App/MailTermAnalyzer.App.csproj -p:Platform=x64
```

예상 결과: `Build succeeded.`

### 앱 실행 및 트레이 아이콘 검증

1. 앱 실행:
   ```bash
   dotnet run --project src/MailTermAnalyzer.App/ -p:Platform=x64
   ```
   또는 `src/MailTermAnalyzer.App/bin/x64/Debug/net10.0-windows10.0.19041.0/` 의 .exe 실행

2. 트레이 아이콘 동작 확인:
   - ⬜ 시스템 트레이(작업 표시줄 오른쪽 하단)에 앱 아이콘 표시됨
   - ⬜ 아이콘 좌클릭 → 메인 윈도우 표시됨
   - ⬜ 메인 윈도우 X 버튼 클릭 → 앱 종료 아닌 트레이 이동됨
   - ⬜ 아이콘 우클릭 → 컨텍스트 메뉴 5개 항목 표시됨 (열기/환경설정/메일 즉시 확인/구분선/종료)

3. 환경설정 다이얼로그 검증:
   - ⬜ 트레이 우클릭 → "환경설정" 클릭 → 다이얼로그 열림
   - ⬜ 4개 설정 그룹 표시: 메일 계정 / 수신 설정 / 저장 경로 / 용어 분석
   - ⬜ 수신 설정 > 폴링 주기를 120으로 변경 후 "저장" 클릭
   - ⬜ 앱 재실행 → 환경설정 열기 → 폴링 주기 120 유지 확인

4. Client Secret 암호화 확인:
   - ⬜ `appsettings.local.json` 파일 내 `EncryptedClientSecret` 필드가 Base64 암호화 값임을 확인 (평문 없음)

## 알려진 이슈

| 이슈 | 원인 | 해결 방법 |
|------|------|-----------|
| App 빌드 실패 (MSVC not found) | Visual Studio C++ 빌드 도구 미설치 | 위 "사전 준비" 단계 수행 |
| 트레이 아이콘 미표시 | H.NotifyIcon.WinUI 패키지 아이콘 파일 필요 | `src/MailTermAnalyzer.App/Assets/tray-icon.ico` 파일 필요 (Sprint 1 TODO) |
