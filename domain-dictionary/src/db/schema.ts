import { pgTable, text, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// DATA-001: 사용자 테이블
export const users = pgTable('users', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
  updatedAt: text('updated_at').notNull().default(sql`now()::text`),
  deletedAt: text('deleted_at'),
});

// DATA-002: 앱 설정 테이블
export const appSettings = pgTable('app_settings', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  settingKey: text('setting_key').unique().notNull(),
  settingValue: text('setting_value'),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
  updatedAt: text('updated_at').notNull().default(sql`now()::text`),
});

// DATA-003: 처리 로그 테이블
export const mailProcessingLogs = pgTable('mail_processing_logs', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  executedAt: text('executed_at').notNull(),
  completedAt: text('completed_at'),
  processType: text('process_type').notNull(),
  status: text('status').notNull(),
  mailCount: integer('mail_count').default(0),
  analyzedCount: integer('analyzed_count').default(0),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
  updatedAt: text('updated_at').notNull().default(sql`now()::text`),
});

// DATA-004: 용어 테이블
export const terms = pgTable('terms', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  name: text('name').unique().notNull(),
  category: text('category'),
  description: text('description').notNull(),
  filePath: text('file_path'),
  frequency: integer('frequency').notNull().default(1),
  lastSourceDescription: text('last_source_description'),
  lastSourceDate: text('last_source_date'),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
  updatedAt: text('updated_at').notNull().default(sql`now()::text`),
});

// DATA-005: 용어 출처 파일 테이블
export const termSourceFiles = pgTable(
  'term_source_files',
  {
    id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
    termId: text('term_id').notNull().references(() => terms.id),
    sourceFileName: text('source_file_name').notNull(),
    sourceDescription: text('source_description'),
    receivedAt: text('received_at'),
    createdAt: text('created_at').notNull().default(sql`now()::text`),
  },
  (table) => [uniqueIndex('term_source_files_term_id_source_file_name_idx').on(table.termId, table.sourceFileName)]
);

// DATA-006: 불용어 테이블
export const stopWords = pgTable('stop_words', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  word: text('word').unique().notNull(),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
});

// DATA-007: 분석 큐 테이블
export const analysisQueue = pgTable('analysis_queue', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  fileName: text('file_name').unique().notNull(),
  webhookCode: text('webhook_code'),
  content: text('content'),
  status: text('status').notNull().default('pending'),
  summary: text('summary'),
  actionItems: text('action_items'),
  extractedTermCount: integer('extracted_term_count').default(0),
  retryCount: integer('retry_count').notNull().default(0),
  errorMessage: text('error_message'),
  analyzedAt: text('analyzed_at'),
  sourceDescription: text('source_description'),
  receivedAt: text('received_at'),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
  updatedAt: text('updated_at').notNull().default(sql`now()::text`),
});

// DATA-008: 웹훅 테이블
export const webhooks = pgTable('webhooks', {
  id: text('id').primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  code: text('code').unique().notNull(),
  description: text('description').notNull(),
  createdAt: text('created_at').notNull().default(sql`now()::text`),
});
