import { NextResponse } from 'next/server';
import { requireAdmin, isNextResponse } from '@/lib/auth/require-admin';
import { getAllSettings, setMultipleSettings, type SettingKey } from '@/lib/config/settings-service';

export const runtime = 'nodejs';

// CFG-001: 환경설정 조회
export async function GET() {
  const authResult = await requireAdmin();
  if (isNextResponse(authResult)) return authResult;

  const settings = await getAllSettings();

  return NextResponse.json({
    success: true,
    data: {
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

  const { analysis } = body as {
    analysis?: { model?: string };
  };

  const entries: { key: SettingKey; value: string }[] = [];

  if (analysis?.model !== undefined) entries.push({ key: 'analysis.model', value: analysis.model });

  await setMultipleSettings(entries);

  return NextResponse.json({ success: true, message: '설정이 저장되었습니다.' });
}
