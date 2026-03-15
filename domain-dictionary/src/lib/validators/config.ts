// 환경설정 유효성 검사 함수

export function validateCheckInterval(ms: unknown): string | null {
  if (ms === undefined || ms === null || ms === '') return null; // 선택 필드
  const num = Number(ms);
  if (!Number.isFinite(num) || num < 60000) {
    return '분석 주기는 최소 60,000ms(1분) 이상이어야 합니다.';
  }
  return null;
}
