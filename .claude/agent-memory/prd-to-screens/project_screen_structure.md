---
name: project_screen_structure
description: 메일 수신 용어 해설 도구의 전체 화면 구조 - 6개 화면 (TRAY 2, MAIN 3, SET 1)
type: project
---

전체 화면 수: 6개, 3개 섹션(TRAY/MAIN/SET)으로 구분

**Why:** Windows 데스크톱 앱(WinUI 3/WPF)으로 트레이 상주 + 메인 윈도우 구조. 사용자 역할 구분 없음 (로컬 단일 사용자).

**How to apply:**
- 화면 코드 체계: TRAY-001~002, MAIN-001~003, SET-001
- 핵심 사용자 여정 5개: 최초 실행/환경설정, 메일 수신 후 확인, 용어 검색, 메일 즉시 확인, 앱 종료
- 공통 UI 패턴: 검색+목록+상세 (MAIN-001/002/003), 트레이 상주+풍선 알림
- 플랫폼: Windows 11+, 기본 800x600, 최소 640x480, 다크/라이트 모드 자동
