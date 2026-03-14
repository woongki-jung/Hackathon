// MAIL-PROC-001: 메일 내용 추출 (HTML → 텍스트 변환)
import { convert } from 'html-to-text';

export interface ParsedMail {
  subject: string;
  textBody: string;
  receivedAt: string | null;
}

/**
 * imapflow의 메시지 소스(raw)에서 제목과 텍스트 본문을 추출합니다.
 * HTML 본문은 순수 텍스트로 변환하며, 첨부파일은 무시합니다.
 */
export function parseMail(rawMessage: {
  subject?: string;
  text?: string;
  html?: string;
  date?: Date;
}): ParsedMail {
  const subject = rawMessage.subject ?? '(제목 없음)';

  let textBody = '';
  if (rawMessage.text) {
    textBody = rawMessage.text.trim();
  } else if (rawMessage.html) {
    textBody = convert(rawMessage.html, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
      ],
    }).trim();
  }

  const receivedAt = rawMessage.date ? rawMessage.date.toISOString() : null;

  return { subject, textBody, receivedAt };
}
