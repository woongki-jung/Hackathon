import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { getAllSettings, setMultipleSettings, type SettingKey } from '@/lib/config/settings-service';
import { validateImapPort, validateCheckInterval } from '@/lib/validators/config';

export const runtime = 'nodejs';

// CFG-001: 환경설정 조회
export async function GET() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const settings = await getAllSettings();

  return NextResponse.json({
    success: true,
    data: {
      mail: {
        imapHost: settings['mail.imap.host'] ?? null,
        imapPort: settings['mail.imap.port'] ? Number(settings['mail.imap.port']) : null,
        imapUsername: settings['mail.imap.username'] ?? null,
        useSsl: settings['mail.imap.use_ssl'] === 'true',
        checkInterval: settings['mail.check_interval'] ? Number(settings['mail.check_interval']) : null,
        passwordConfigured: !!process.env.MAIL_PASSWORD,
      },
      analysis: {
        model: settings['analysis.model'] ?? null,
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
      },
    },
  });
}

// CFG-002: 환경설정 수정 (Partial Update)
export async function PUT(request: Request) {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, message: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { mail, analysis } = body as {
    mail?: {
      imapHost?: string;
      imapPort?: number;
      imapUsername?: string;
      useSsl?: boolean;
      checkInterval?: number;
    };
    analysis?: { model?: string };
  };

  // 유효성 검사
  if (mail?.imapPort !== undefined) {
    const portError = validateImapPort(mail.imapPort);
    if (portError) return NextResponse.json({ success: false, message: portError }, { status: 400 });
  }
  if (mail?.checkInterval !== undefined) {
    const intervalError = validateCheckInterval(mail.checkInterval);
    if (intervalError) return NextResponse.json({ success: false, message: intervalError }, { status: 400 });
  }

  const entries: { key: SettingKey; value: string }[] = [];

  if (mail?.imapHost !== undefined) entries.push({ key: 'mail.imap.host', value: mail.imapHost });
  if (mail?.imapPort !== undefined) entries.push({ key: 'mail.imap.port', value: String(mail.imapPort) });
  if (mail?.imapUsername !== undefined) entries.push({ key: 'mail.imap.username', value: mail.imapUsername });
  if (mail?.useSsl !== undefined) entries.push({ key: 'mail.imap.use_ssl', value: String(mail.useSsl) });
  if (mail?.checkInterval !== undefined) entries.push({ key: 'mail.check_interval', value: String(mail.checkInterval) });
  if (analysis?.model !== undefined) entries.push({ key: 'analysis.model', value: analysis.model });

  await setMultipleSettings(entries);

  return NextResponse.json({ success: true, message: '설정이 저장되었습니다.' });
}
