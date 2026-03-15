import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSetting, setSetting } from './settings-service';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  appSettings: { settingKey: 'settingKey', settingValue: 'settingValue' },
}));

describe('getSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('설정 값이 존재하면 값 반환', async () => {
    const { db } = await import('@/db');
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ settingKey: 'analysis.model', settingValue: 'gemini-1.5-pro' }]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as unknown as ReturnType<typeof db.select>);

    const result = await getSetting('analysis.model');
    expect(result).toBe('gemini-1.5-pro');
  });

  it('설정 값이 없으면 null 반환', async () => {
    const { db } = await import('@/db');
    const mockChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(mockChain as unknown as ReturnType<typeof db.select>);

    const result = await getSetting('analysis.model');
    expect(result).toBeNull();
  });
});

describe('setSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('기존 설정이 있으면 update 호출', async () => {
    const { db } = await import('@/db');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ settingKey: 'analysis.model', settingValue: 'old-value' }]),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    await setSetting('analysis.model', 'new-value');

    expect(db.update).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('기존 설정이 없으면 insert 호출', async () => {
    const { db } = await import('@/db');

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    await setSetting('analysis.model', 'new-value');

    expect(db.insert).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
