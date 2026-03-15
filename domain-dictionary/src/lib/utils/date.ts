// 날짜/시간 표시 공통 유틸리티

/**
 * ISO 날짜 문자열을 "YYYY-MM-DD HH:mm" 형식으로 변환
 * null이면 '-' 반환
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).replace(/\. /g, '-').replace('.', '').trim();
}
