# 배포 가이드

## 사전 요구사항

- Node.js 20 이상
- npm 10 이상
- Gmail IMAP 또는 호환 IMAP 서버 계정
- Google AI Studio API 키 (Gemini API)

---

## 1. 프로젝트 설치

```bash
git clone <repository-url>
cd domain-dictionary
npm install
```

---

## 2. 환경변수 설정

`domain-dictionary/.env.local` 파일을 생성하고 아래 값을 입력합니다.

```env
# === 세션 암호화 키 (32자 이상 랜덤 문자열) ===
SESSION_SECRET=your-very-long-secret-key-at-least-32-characters

# === 메일 서버 (IMAP) ===
MAIL_IMAP_HOST=imap.gmail.com
MAIL_IMAP_PORT=993
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_USE_SSL=true
MAIL_CHECK_INTERVAL=3600000

# === Gemini AI API ===
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-pro

# === 관리자 초기 계정 (최초 실행 시 자동 생성) ===
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin1234!@

# === 데이터 경로 ===
DATABASE_PATH=./data/app.db
MAIL_STORAGE_PATH=./data/mails
GLOSSARY_STORAGE_PATH=./data/terms
```

> **Gmail 사용 시**: 일반 비밀번호 대신 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 사용하세요. 2단계 인증이 활성화된 상태에서 생성할 수 있습니다.

---

## 3. 데이터베이스 초기화

```bash
cd domain-dictionary
npm run db:push
```

`data/app.db` 파일이 생성됩니다.

---

## 4. 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `.next/` 디렉터리에 생성됩니다.

---

## 5. 서버 실행

### 직접 실행

```bash
npm start
```

### PM2로 실행 (권장)

```bash
# PM2 전역 설치
npm install -g pm2

# 앱 시작
pm2 start ecosystem.config.js

# 부팅 시 자동 시작 등록
pm2 startup
pm2 save
```

---

## 6. 포트 설정

기본 포트는 `3000`입니다. 변경하려면:

```bash
# 직접 실행
PORT=8080 npm start

# PM2 사용 시 ecosystem.config.js의 env.PORT 수정
```

---

## 7. 데이터 백업

정기적으로 아래 디렉터리를 백업하세요:

| 경로 | 내용 |
|------|------|
| `data/app.db` | 전체 데이터베이스 |
| `data/terms/` | 용어 해설집 Markdown 파일 |

---

## 트러블슈팅

### DB 파일 퍼미션 오류
```bash
chmod 664 data/app.db
```

### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :3000
```

### IMAP 연결 실패
- 보안 설정에서 IMAP 접근이 허용되어 있는지 확인
- Gmail의 경우 앱 비밀번호 사용 여부 확인
- 방화벽에서 포트 993(SSL) 또는 143(비SSL)이 열려 있는지 확인
