// 인증 관련 유효성 검사 공용 함수 (클라이언트/서버 공유)

/**
 * 아이디 유효성 검사 (AUTH-R-003)
 * - 4~20자, 영소문자/숫자/밑줄(_) 조합
 */
export function validateUsername(username: string): string | null {
  if (!username || username.trim() === '') {
    return '아이디를 입력해 주세요.';
  }
  if (!/^[a-z0-9_]{4,20}$/.test(username)) {
    return '아이디는 4~20자의 영소문자, 숫자, 밑줄(_)만 사용할 수 있습니다.';
  }
  return null;
}

/**
 * 비밀번호 유효성 검사 (AUTH-R-005, AUTH-R-006)
 * - 8자 이상
 * - 영문, 숫자, 특수문자 각 1자 이상 포함
 */
export function validatePassword(password: string): string | null {
  if (!password || password.trim() === '') {
    return '비밀번호를 입력해 주세요.';
  }
  if (password.length < 8) {
    return '비밀번호는 8자 이상이어야 합니다.';
  }
  if (!/[a-zA-Z]/.test(password)) {
    return '비밀번호에 영문자를 포함해야 합니다.';
  }
  if (!/[0-9]/.test(password)) {
    return '비밀번호에 숫자를 포함해야 합니다.';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return '비밀번호에 특수문자를 포함해야 합니다.';
  }
  return null;
}
