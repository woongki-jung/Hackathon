// MAIL-RECV-001: IMAP 메일 수신 기능
import { ImapFlow } from 'imapflow';
import { getSetting } from '@/lib/config/settings-service';
import { logger } from '@/lib/logger';
import { withRetry } from '@/lib/http/retry';
import { parseMail, type ParsedMail } from './mail-parser';

export interface ReceivedMail extends ParsedMail {
  uid: number;
  fileName: string;
}

/**
 * IMAP 서버에 접속하여 INBOX의 UNSEEN 메일을 수신합니다.
 * IMAP 설정이 없으면 빈 배열을 반환합니다.
 */
export async function receiveMails(): Promise<ReceivedMail[]> {
  const host = await getSetting('mail.imap.host');
  const portStr = await getSetting('mail.imap.port');
  const username = await getSetting('mail.imap.username');
  const useSslStr = await getSetting('mail.imap.use_ssl');

  const password = process.env.MAIL_PASSWORD;

  if (!host || !portStr || !username || !password) {
    logger.warn('[imap-receiver] IMAP 설정 미완료 — 메일 수신 건너뜀');
    return [];
  }

  const port = Number(portStr);
  const secure = useSslStr !== 'false';

  return withRetry(async () => {
    const client = new ImapFlow({
      host,
      port,
      secure,
      auth: { user: username, pass: password },
      logger: false,
      connectionTimeout: 15000,
      greetingTimeout: 5000,
    });

    await client.connect();
    logger.info('[imap-receiver] IMAP 연결 성공', { host, port });

    const mails: ReceivedMail[] = [];

    try {
      const lock = await client.getMailboxLock('INBOX');
      try {
        // UNSEEN 메일 검색
        const searchResult = await client.search({ seen: false });
        const uids: number[] = Array.isArray(searchResult) ? searchResult : [];
        logger.info('[imap-receiver] UNSEEN 메일 수', { count: uids.length });

        for (const uid of uids) {
          try {
            const msg = await client.fetchOne(String(uid), {
              uid: true,
              envelope: true,
              bodyStructure: true,
              source: true,
            });

            if (!msg) continue;

            // 메일 파싱 (simple-mailparser 없이 직접 처리)
            const parsed = parseMail({
              subject: msg.envelope?.subject,
              text: undefined,
              html: undefined,
              date: msg.envelope?.date,
            });

            // source에서 텍스트 추출 (간단한 본문 추출)
            if (msg.source) {
              const rawText = msg.source.toString('utf-8');
              // Content-Type: text/plain 본문 추출
              const textMatch = rawText.match(/Content-Type: text\/plain[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\r\nContent-Type:|$)/i);
              const htmlMatch = rawText.match(/Content-Type: text\/html[\s\S]*?\r\n\r\n([\s\S]*?)(?:\r\n--|\r\n\r\nContent-Type:|$)/i);

              if (textMatch) {
                parsed.textBody = decodeMailBody(textMatch[1]).trim();
              } else if (htmlMatch) {
                const { convert } = await import('html-to-text');
                parsed.textBody = convert(decodeMailBody(htmlMatch[1]), {
                  wordwrap: false,
                  selectors: [
                    { selector: 'a', options: { ignoreHref: true } },
                    { selector: 'img', format: 'skip' },
                  ],
                }).trim();
              }
            }

            const timestamp = Date.now();
            const fileName = `${timestamp}_${uid}.txt`;

            mails.push({ ...parsed, uid, fileName });
          } catch (err) {
            logger.warn('[imap-receiver] 개별 메일 처리 실패', { uid, error: String(err) });
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
      logger.info('[imap-receiver] IMAP 연결 종료');
    }

    return mails;
  }, { maxAttempts: 2, baseDelayMs: 2000 });
}

/**
 * Base64 또는 Quoted-Printable 인코딩 메일 본문을 디코딩합니다.
 */
function decodeMailBody(body: string): string {
  // Quoted-Printable 디코딩 (= 로 끝나는 줄 이어붙이기)
  return body
    .replace(/=\r\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
