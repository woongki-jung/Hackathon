import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  webhooks: { code: 'code' },
  analysisQueue: { id: 'id', status: 'status' },
}));
vi.mock('@/lib/analysis/batch-analyzer', () => ({
  analyzeSingleItem: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const validPayload = { body: '테스트 메일 본문입니다.' };

describe('processWebhookPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('미등록 웹훅 코드이면 null 반환', async () => {
    const { db } = await import('@/db');
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    const { processWebhookPayload } = await import('./webhook-receiver');
    const result = await processWebhookPayload('unknown-code', validPayload);

    expect(result).toBeNull();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('등록된 코드이면 분석 큐에 insert 후 분석 실행', async () => {
    const { db } = await import('@/db');
    const { analyzeSingleItem } = await import('@/lib/analysis/batch-analyzer');

    const webhook = { id: 'wh-1', code: 'test-code', description: '테스트 웹훅' };
    const queueItem = { id: 'q-1', status: 'completed', content: '테스트', fileName: 'test.txt' };

    // webhooks select
    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([webhook]),
    };
    // insert returning
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'q-1' }]),
    };
    // analysisQueue select (item 조회)
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([queueItem]),
    };
    // 최종 상태 조회
    const selectChain3 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ status: 'completed' }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain3 as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    const { processWebhookPayload } = await import('./webhook-receiver');
    const result = await processWebhookPayload('test-code', validPayload);

    expect(result).not.toBeNull();
    expect(result?.status).toBe('completed');
    expect(db.insert).toHaveBeenCalled();
    expect(analyzeSingleItem).toHaveBeenCalledWith(queueItem);
  });

  it('subject 포함 시 content에 제목 포함', async () => {
    const { db } = await import('@/db');
    const webhook = { id: 'wh-1', code: 'test-code', description: '웹훅 설명' };

    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([webhook]),
    };
    let capturedContent = '';
    const insertChain = {
      values: vi.fn().mockImplementation((vals) => {
        capturedContent = vals.content;
        return insertChain;
      }),
      returning: vi.fn().mockResolvedValue([{ id: 'q-2' }]),
    };
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: 'q-2', status: 'pending', content: capturedContent }]),
    };
    const selectChain3 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ status: 'completed' }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain3 as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    const { processWebhookPayload } = await import('./webhook-receiver');
    await processWebhookPayload('test-code', { subject: '긴급 공지', body: '내용' });

    expect(capturedContent).toContain('제목: 긴급 공지');
    expect(capturedContent).toContain('내용');
  });
});
