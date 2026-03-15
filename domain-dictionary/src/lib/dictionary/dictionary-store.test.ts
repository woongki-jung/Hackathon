import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toSafeFileName, buildGlossaryMarkdown, saveTerm } from './dictionary-store';

// DB 및 파일시스템 의존성 모킹
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock('@/db/schema', () => ({
  terms: { id: 'id', name: 'name' },
  termSourceFiles: {},
}));
vi.mock('@/lib/fs/file-manager', () => ({
  writeFile: vi.fn(),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// --- toSafeFileName 순수 함수 테스트 ---
describe('toSafeFileName', () => {
  it('일반 문자는 그대로 유지', () => {
    expect(toSafeFileName('EMR시스템')).toBe('EMR시스템');
  });

  it('/ 를 _ 로 치환', () => {
    expect(toSafeFileName('a/b')).toBe('a_b');
  });

  it('\\ 를 _ 로 치환', () => {
    expect(toSafeFileName('a\\b')).toBe('a_b');
  });

  it('? * : | " < > % 를 _ 로 치환', () => {
    expect(toSafeFileName('a?b*c:d|e"f<g>h')).toBe('a_b_c_d_e_f_g_h');
  });

  it('복합 특수문자 치환', () => {
    expect(toSafeFileName('term/name:value')).toBe('term_name_value');
  });
});

// --- buildGlossaryMarkdown 순수 함수 테스트 ---
describe('buildGlossaryMarkdown', () => {
  const baseTerm = {
    name: 'EMR',
    category: 'emr',
    description: '전자의무기록 시스템입니다.',
    frequency: 5,
    updatedAt: '2025-01-15T10:00:00.000Z',
  };

  it('마크다운 헤더에 용어명 포함', () => {
    const md = buildGlossaryMarkdown(baseTerm);
    expect(md).toContain('# EMR');
  });

  it('카테고리 라벨 포함 (emr → EMR)', () => {
    const md = buildGlossaryMarkdown(baseTerm);
    expect(md).toContain('**카테고리**: EMR');
  });

  it('business 카테고리 라벨 변환', () => {
    const md = buildGlossaryMarkdown({ ...baseTerm, category: 'business' });
    expect(md).toContain('**카테고리**: 비즈니스');
  });

  it('abbreviation 카테고리 라벨 변환', () => {
    const md = buildGlossaryMarkdown({ ...baseTerm, category: 'abbreviation' });
    expect(md).toContain('**카테고리**: 약어');
  });

  it('general 카테고리 라벨 변환', () => {
    const md = buildGlossaryMarkdown({ ...baseTerm, category: 'general' });
    expect(md).toContain('**카테고리**: 일반');
  });

  it('미정의 카테고리는 그대로 출력', () => {
    const md = buildGlossaryMarkdown({ ...baseTerm, category: 'unknown' });
    expect(md).toContain('**카테고리**: unknown');
  });

  it('등장 빈도 포함', () => {
    const md = buildGlossaryMarkdown(baseTerm);
    expect(md).toContain('**등장 빈도**: 5회');
  });

  it('해설 섹션에 description 포함', () => {
    const md = buildGlossaryMarkdown(baseTerm);
    expect(md).toContain('## 해설');
    expect(md).toContain('전자의무기록 시스템입니다.');
  });
});

// --- saveTerm DB 의존 테스트 ---
describe('saveTerm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const newTerm = {
    name: 'HIS',
    category: 'emr' as const,
    description: '병원정보시스템입니다.',
  };
  const source = {
    fileName: 'test.txt',
    sourceDescription: '테스트',
    receivedAt: '2025-01-15T10:00:00.000Z',
  };

  it('신규 용어: insert 호출 후 isNew=true 반환', async () => {
    const { db } = await import('@/db');

    // select → [] (기존 없음)
    const selectChain = { from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) };
    vi.mocked(db.select).mockReturnValue(selectChain as unknown as ReturnType<typeof db.select>);

    // insert → returning [{ id: 'new-id' }]
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'new-id' }]),
    };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    // 두 번째 select (최종 조회)
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{
        id: 'new-id', name: 'HIS', category: 'emr',
        description: '병원정보시스템', frequency: 1, updatedAt: '2025-01-15',
      }]),
    };
    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>);

    const result = await saveTerm(newTerm, source);
    expect(result.isNew).toBe(true);
    expect(result.termId).toBe('new-id');
  });

  it('기존 용어: update 호출 후 isNew=false 반환', async () => {
    const { db } = await import('@/db');

    const existing = {
      id: 'existing-id', name: 'HIS', category: 'emr',
      description: '구해설', frequency: 3, updatedAt: '2025-01-10',
    };

    // 첫 번째 select → 기존 용어 반환
    const selectChain1 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([existing]),
    };
    // update 체인
    const updateChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue({}),
    };
    vi.mocked(db.update).mockReturnValue(updateChain as unknown as ReturnType<typeof db.update>);

    // insert (termSourceFiles용)
    const insertChain = {
      values: vi.fn().mockResolvedValue(undefined),
      returning: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(db.insert).mockReturnValue(insertChain as unknown as ReturnType<typeof db.insert>);

    // 마지막 select (최종 조회)
    const selectChain2 = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ ...existing, frequency: 4, updatedAt: '2025-01-15' }]),
    };

    vi.mocked(db.select)
      .mockReturnValueOnce(selectChain1 as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce(selectChain2 as unknown as ReturnType<typeof db.select>);

    const result = await saveTerm(newTerm, source);
    expect(result.isNew).toBe(false);
    expect(result.termId).toBe('existing-id');
    expect(db.update).toHaveBeenCalled();
  });
});
