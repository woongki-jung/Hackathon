import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

// Vercel Postgres: POSTGRES_URL 환경변수를 자동으로 사용
export const db = drizzle(sql, { schema });

// PostgreSQL 초기화 SQL 구문
const INIT_SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (NOW()::text),
    updated_at TEXT NOT NULL DEFAULT (NOW()::text),
    deleted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY NOT NULL,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::text),
    updated_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS mail_processing_logs (
    id TEXT PRIMARY KEY NOT NULL,
    executed_at TEXT NOT NULL,
    completed_at TEXT,
    process_type TEXT NOT NULL,
    status TEXT NOT NULL,
    mail_count INTEGER DEFAULT 0,
    analyzed_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::text),
    updated_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS terms (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT NOT NULL,
    file_path TEXT,
    frequency INTEGER NOT NULL DEFAULT 1,
    last_source_description TEXT,
    last_source_date TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::text),
    updated_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS term_source_files (
    id TEXT PRIMARY KEY NOT NULL,
    term_id TEXT NOT NULL REFERENCES terms(id),
    source_file_name TEXT NOT NULL,
    source_description TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS term_source_files_term_id_source_file_name_idx
    ON term_source_files(term_id, source_file_name)`,
  `CREATE TABLE IF NOT EXISTS stop_words (
    id TEXT PRIMARY KEY NOT NULL,
    word TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  `CREATE TABLE IF NOT EXISTS analysis_queue (
    id TEXT PRIMARY KEY NOT NULL,
    file_name TEXT NOT NULL UNIQUE,
    webhook_code TEXT,
    content TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    summary TEXT,
    action_items TEXT,
    extracted_term_count INTEGER DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    analyzed_at TEXT,
    source_description TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (NOW()::text),
    updated_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  // 기존 테이블에 content 컬럼 추가 (이미 있으면 무시)
  `DO $$ BEGIN
    ALTER TABLE analysis_queue ADD COLUMN content TEXT;
  EXCEPTION WHEN duplicate_column THEN NULL;
  END $$`,
  `CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (NOW()::text)
  )`,
  // PostgreSQL 전문 검색: GIN 인덱스 (빠른 FTS)
  `CREATE INDEX IF NOT EXISTS terms_fts_idx ON terms USING GIN (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, ''))
  )`,
];

declare global {
  var __db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  var __dbInitialized: boolean;
}

// HMR 중복 방지 싱글톤
if (!globalThis.__db) {
  globalThis.__db = drizzle(sql, { schema });
  globalThis.__dbInitialized = false;
}

export { schema };

/**
 * DB 초기화 (테이블 생성)
 * 서버 시작 시 1회 호출 (instrumentation.ts)
 */
export async function initDb(): Promise<void> {
  if (globalThis.__dbInitialized) return;
  for (const sqlStr of INIT_SQL_STATEMENTS) {
    await sql.query(sqlStr);
  }
  globalThis.__dbInitialized = true;
}

export type Db = typeof db;
