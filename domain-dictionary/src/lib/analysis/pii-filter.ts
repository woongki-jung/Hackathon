// TERM-PII-001: 개인정보 필터링 (마스킹)

const PII_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // 이메일 주소
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  // 한국 휴대폰 번호 (010-1234-5678, 01012345678)
  { pattern: /01[016789][.\-]?\d{3,4}[.\-]?\d{4}/g, replacement: '[PHONE]' },
  // 한국 일반 전화번호 (02-1234-5678, 031-123-4567)
  { pattern: /0[2-9]\d?[.\-]\d{3,4}[.\-]\d{4}/g, replacement: '[PHONE]' },
  // 주민등록번호 (123456-1234567)
  { pattern: /\d{6}[.\-]\d{7}/g, replacement: '[ID_NUM]' },
];

/**
 * 텍스트에서 개인정보 패턴을 마스킹하여 반환합니다.
 */
export function filterPII(text: string): string {
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
