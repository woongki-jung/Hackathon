import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  users: { username: 'username' },
}));
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$hashed$'),
  },
}));
vi.mock('@/lib/validators/auth', () => ({
  validateUsername: vi.fn().mockReturnValue(null),
  validatePassword: vi.fn().mockReturnValue(null),
}));

describe('seedAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('환경변수 미설정 시 DB 호출 없이 건너뜀', async () => {
    delete process.env.ADMIN_USERNAME;
    delete process.env.ADMIN_PASSWORD;

    const { seedAdmin } = await import('./seed-admin');
    const { db } = await import('@/db');

    await seedAdmin();

    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('ADMIN_USERNAME만 있고 ADMIN_PASSWORD 없으면 건너뜀', async () => {
    process.env.ADMIN_USERNAME = 'admin';
    delete process.env.ADMIN_PASSWORD;

    const { seedAdmin } = await import('./seed-admin');
    const { db } = await import('@/db');

    await seedAdmin();

    expect(db.insert).not.toHaveBeenCalled();
  });

  it('이미 존재하는 계정이면 insert 호출 없이 건너뜀', async () => {
    process.env.ADMIN_USERNAME = 'admin_user';
    process.env.ADMIN_PASSWORD = 'Admin@1234';

    const { db } = await import('@/db');
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ id: '1', username: 'admin_user' }]),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    const { seedAdmin } = await import('./seed-admin');
    await seedAdmin();

    expect(db.insert).not.toHaveBeenCalled();
  });

  it('정상 환경변수 + 미존재 계정이면 bcrypt hash 후 insert', async () => {
    process.env.ADMIN_USERNAME = 'admin_user';
    process.env.ADMIN_PASSWORD = 'Admin@1234';

    const { db } = await import('@/db');
    const bcrypt = (await import('bcrypt')).default;

    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    const { seedAdmin } = await import('./seed-admin');
    await seedAdmin();

    expect(bcrypt.hash).toHaveBeenCalledWith('Admin@1234', 10);
    expect(db.insert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'admin_user', role: 'admin' })
    );
  });
});
