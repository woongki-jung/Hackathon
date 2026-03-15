import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// DATA-001: 사용자 테이블
export const users = sqliteTable('users', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username', { length: 20 }).unique().notNull(),
  passwordHash: text('password_hash', { length: 60 }).notNull(),
  role: text('role', { length: 10 }).notNull().default('user'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
});

// DATA-002: 앱 설정 테이블
export const appSettings = sqliteTable('app_settings', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  settingKey: text('setting_key', { length: 100 }).unique().notNull(),
  settingValue: text('setting_value', { length: 500 }),
  description: text('description', { length: 255 }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// DATA-003: 처리 로그 테이블
export const mailProcessingLogs = sqliteTable('mail_processing_logs', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  executedAt: text('executed_at').notNull(),
  completedAt: text('completed_at'),
  processType: text('process_type', { length: 20 }).notNull(),
  status: text('status', { length: 20 }).notNull(),
  mailCount: integer('mail_count').default(0),
  analyzedCount: integer('analyzed_count').default(0),
  errorMessage: text('error_message', { length: 1000 }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// DATA-004: 용어 테이블
export const terms = sqliteTable('terms', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name', { length: 200 }).unique().notNull(),
  category: text('category', { length: 50 }),
  description: text('description').notNull(),
  filePath: text('file_path', { length: 500 }),
  frequency: integer('frequency').notNull().default(1),
  lastSourceDescription: text('last_source_description', { length: 500 }),
  lastSourceDate: text('last_source_date'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// DATA-005: 용어 출처 파일 테이블
export const termSourceFiles = sqliteTable(
  'term_source_files',
  {
    id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
    termId: text('term_id', { length: 36 }).notNull().references(() => terms.id),
    sourceFileName: text('source_file_name', { length: 255 }).notNull(),
    sourceDescription: text('source_description', { length: 500 }),
    receivedAt: text('received_at'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex('term_source_files_term_id_source_file_name_idx').on(table.termId, table.sourceFileName)]
);

// DATA-006: 불용어 테이블
export const stopWords = sqliteTable('stop_words', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  word: text('word', { length: 100 }).unique().notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

// DATA-007: 분석 큐 테이블
export const analysisQueue = sqliteTable('analysis_queue', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  fileName: text('file_name', { length: 255 }).unique().notNull(),
  webhookCode: text('webhook_code', { length: 100 }),
  status: text('status', { length: 20 }).notNull().default('pending'),
  summary: text('summary'),
  actionItems: text('action_items'),
  extractedTermCount: integer('extracted_term_count').default(0),
  retryCount: integer('retry_count').notNull().default(0),
  errorMessage: text('error_message', { length: 1000 }),
  analyzedAt: text('analyzed_at'),
  sourceDescription: text('source_description', { length: 500 }),
  receivedAt: text('received_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

// DATA-008: 웹훅 테이블
export const webhooks = sqliteTable('webhooks', {
  id: text('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code', { length: 100 }).unique().notNull(),
  description: text('description', { length: 500 }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});
