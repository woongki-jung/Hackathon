// 환경설정 유효성 검사 함수

export function validateImapPort(port: unknown): string | null {
  if (port === undefined || port === null || port === '') return null; // 선택 필드
  const num = Number(port);
  if (!Number.isInteger(num) || num < 1 || num > 65535) {
    return 'IMAP 포트는 1~65535 사이의 정수여야 합니다.';
  }
  return null;
}

export function validateCheckInterval(ms: unknown): string | null {
  if (ms === undefined || ms === null || ms === '') return null; // 선택 필드
  const num = Number(ms);
  if (!Number.isFinite(num) || num < 60000) {
    return '메일 확인 주기는 최소 60,000ms(1분) 이상이어야 합니다.';
  }
  return null;
}
