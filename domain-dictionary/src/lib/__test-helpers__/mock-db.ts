// 테스트 전용 Drizzle ORM 체이닝 API 모킹 헬퍼
import { vi } from 'vitest';

/**
 * Drizzle ORM의 체이닝 API를 모킹하는 factory 함수
 * vi.mock('@/db') 와 함께 사용합니다.
 *
 * 사용 예:
 *   const mockDb = createMockDb({ select: [{ id: '1' }] });
 *   vi.mocked(db.select).mockReturnValue(mockDb.selectChain);
 */

interface MockDbOptions {
  selectResult?: unknown[];
  insertResult?: unknown[];
  updateResult?: unknown;
  deleteResult?: unknown;
}

export function createMockDb(options: MockDbOptions = {}) {
  const {
    selectResult = [],
    insertResult = [],
    updateResult = {},
    deleteResult = {},
  } = options;

  // select 체인: .select().from().where() => resolves to array
  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(selectResult),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  };

  // insert 체인: .insert().values().returning() => resolves to array
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(insertResult),
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  };

  // update 체인: .update().set().where() => resolves to result
  const updateChain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(updateResult),
  };

  // delete 체인: .delete().where() => resolves to result
  const deleteChain = {
    where: vi.fn().mockResolvedValue(deleteResult),
  };

  return {
    selectChain,
    insertChain,
    updateChain,
    deleteChain,
    mockDb: {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
      delete: vi.fn().mockReturnValue(deleteChain),
    },
  };
}
