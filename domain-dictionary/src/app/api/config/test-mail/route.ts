import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { getSetting } from '@/lib/config/settings-service';

export const runtime = 'nodejs';

// CFG-003: 메일 서버 연결 테스트
export async function POST() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const host = await getSetting('mail.imap.host');
  const portStr = await getSetting('mail.imap.port');
  const username = await getSetting('mail.imap.username');
  const useSslStr = await getSetting('mail.imap.use_ssl');

  if (!host || !portStr) {
    return NextResponse.json(
      { success: false, message: 'IMAP 호스트와 포트를 먼저 설정해 주세요.' },
      { status: 400 }
    );
  }

  const password = process.env.MAIL_PASSWORD;
  if (!password || !username) {
    return NextResponse.json(
      { success: false, message: 'IMAP 아이디와 비밀번호 환경변수를 설정해 주세요.' },
      { status: 400 }
    );
  }

  const port = Number(portStr);
  const useSsl = useSslStr !== 'false';

  try {
    // 동적 import (서버 사이드 전용)
    const { ImapFlow } = await import('imapflow');

    const client = new ImapFlow({
      host,
      port,
      secure: useSsl,
      auth: { user: username, pass: password },
      logger: false,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    });

    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('연결 타임아웃 (10초)')), 10000)
      ),
    ]);

    const mailbox = await client.getMailboxLock('INBOX');
    let unseenCount = 0;
    let mailboxExists = false;

    try {
      const status = await client.status('INBOX', { unseen: true });
      mailboxExists = true;
      unseenCount = status.unseen ?? 0;
    } finally {
      mailbox.release();
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      data: { connected: true, mailboxExists, unseenCount },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return NextResponse.json({
      success: false,
      data: { connected: false, mailboxExists: false, unseenCount: 0, error: message },
    });
  }
}
