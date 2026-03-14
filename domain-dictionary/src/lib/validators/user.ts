// 사용자 관리 유효성 검사 함수

export function validateRole(role: unknown): string | null {
  if (role === undefined || role === null || role === '') return null; // 기본값 'user'
  if (role !== 'admin' && role !== 'user') {
    return "역할은 'admin' 또는 'user'여야 합니다.";
  }
  return null;
}
