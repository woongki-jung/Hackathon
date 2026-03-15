import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  analysisQueue: { id: 'id', status: 'status', retryCount: 'retryCount', updatedAt: 'updatedAt', analyzedAt: 'analyzedAt' },
}));
vi.mock('./pii-filter', () => ({
  filterPII: vi.fn().mockImplementation((text: string) => text),
}));
vi.mock('./term-extractor', () => ({
  extractTerms: vi.fn().mockResolvedValue([]),
}));
vi.mock('./description-generator', () => ({
  generateMailAnalysis: vi.fn().mockResolvedValue({ summary: '요약', actionItems: [] }),
}));
vi.mock('@/lib/dictionary/dictionary-store', () => ({
  saveTerm: vi.fn().mockResolvedValue({ termId: 'id', isNew: true }),
}));
vi.mock('./gemini-client', () => ({
  GeminiError: class GeminiError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'GeminiError';
      this.code = code;
    }
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const makeQueueItem = (overrides = {}) => ({
  id: 'item-1',
  fileName: 'test.txt',
  content: '분석할 메일 본문 텍스트',
  status: 'pending',
  retryCount: 0,
  sourceDescription: '테스트',
  receivedAt: '2025-01-15T10:00:00.000Z',
  createdAt: '2025-01-15T10:00:00.000Z',
  updatedAt: '2025-01-15T10:00:00.000Z',
  analyzedAt: null,
  summary: null,
  actionItems: null,
  extractedTermCount: null,
  errorMessage: null,
  webhookCode: null,
  ...overrides,
});

describe('analyzeSingleItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('정상 분석: processing → completed 상태 전이', async () => {
    const { db } = await import('@/db');
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const { analyzeSingleItem } = await import('./batch-analyzer');
    await analyzeSingleItem(makeQueueItem());

    // update 두 번: 처음 processing, 마지막 completed
    expect(db.update).toHaveBeenCalledTimes(2);
    const secondCall = updateChain.set.mock.calls[1][0];
    expect(secondCall.status).toBe('completed');
  });

  it('content 없을 때 failed 상태로 전이', async () => {
    const { db } = await import('@/db');
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const { analyzeSingleItem } = await import('./batch-analyzer');
    await expect(analyzeSingleItem(makeQueueItem({ content: null }))).rejects.toThrow();

    // failed 상태로 업데이트되어야 함
    const failedCall = updateChain.set.mock.calls.find(
      (call: [Record<string, unknown>]) => call[0].status === 'failed'
    );
    expect(failedCall).toBeDefined();
  });

  it('NO_API_KEY 에러 시 pending 상태 유지', async () => {
    const { db } = await import('@/db');
    const { extractTerms } = await import('./term-extractor');
    const { GeminiError } = await import('./gemini-client');

    vi.mocked(extractTerms).mockRejectedValue(
      new GeminiError('API 키 없음', 'NO_API_KEY')
    );

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    const { analyzeSingleItem } = await import('./batch-analyzer');
    await expect(analyzeSingleItem(makeQueueItem())).rejects.toThrow();

    // pending 상태로 업데이트 확인
    const pendingCall = updateChain.set.mock.calls.find(
      (call: [Record<string, unknown>]) => call[0].status === 'pending'
    );
    expect(pendingCall).toBeDefined();
  });
});
