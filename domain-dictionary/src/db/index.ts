import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';

const INIT_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY NOT NULL,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mail_processing_logs (
    id TEXT PRIMARY KEY NOT NULL,
    executed_at TEXT NOT NULL,
    completed_at TEXT,
    process_type TEXT NOT NULL,
    status TEXT NOT NULL,
    mail_count INTEGER DEFAULT 0,
    analyzed_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS terms (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT NOT NULL,
    file_path TEXT,
    frequency INTEGER NOT NULL DEFAULT 1,
    last_source_description TEXT,
    last_source_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS term_source_files (
    id TEXT PRIMARY KEY NOT NULL,
    term_id TEXT NOT NULL REFERENCES terms(id),
    source_file_name TEXT NOT NULL,
    source_description TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS term_source_files_term_id_source_file_name_idx
    ON term_source_files(term_id, source_file_name);

  CREATE TABLE IF NOT EXISTS stop_words (
    id TEXT PRIMARY KEY NOT NULL,
    word TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS analysis_queue (
    id TEXT PRIMARY KEY NOT NULL,
    file_name TEXT NOT NULL UNIQUE,
    webhook_code TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    summary TEXT,
    action_items TEXT,
    extracted_term_count INTEGER DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    analyzed_at TEXT,
    source_description TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const FTS5_SQL = `
  CREATE VIRTUAL TABLE IF NOT EXISTS terms_fts USING fts5(
    name,
    description,
    content='terms',
    content_rowid='rowid'
  );
`;

const TRIGGER_INSERT_SQL = `
  CREATE TRIGGER IF NOT EXISTS terms_fts_insert AFTER INSERT ON terms BEGIN
    INSERT INTO terms_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
  END;
`;

const TRIGGER_UPDATE_SQL = `
  CREATE TRIGGER IF NOT EXISTS terms_fts_update AFTER UPDATE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, name, description) VALUES('delete', old.rowid, old.name, old.description);
    INSERT INTO terms_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
  END;
`;

const TRIGGER_DELETE_SQL = `
  CREATE TRIGGER IF NOT EXISTS terms_fts_delete AFTER DELETE ON terms BEGIN
    INSERT INTO terms_fts(terms_fts, rowid, name, description) VALUES('delete', old.rowid, old.name, old.description);
  END;
`;

/**
 * 스키마 마이그레이션: 기존 DB에서 컬럼명 변경 처리
 * - SQLite RENAME COLUMN은 3.25.0+에서 지원
 * - 이미 변경된 경우 오류 무시
 */
function runMigrations(sqlite: InstanceType<typeof Database>) {
  const migrations = [
    // term_source_files: mail_* → source_*, received_at
    `ALTER TABLE term_source_files RENAME COLUMN mail_file_name TO source_file_name`,
    `ALTER TABLE term_source_files RENAME COLUMN mail_subject TO source_description`,
    `ALTER TABLE term_source_files RENAME COLUMN mail_received_at TO received_at`,
    // terms: last_source_mail_* → last_source_*
    `ALTER TABLE terms RENAME COLUMN last_source_mail_subject TO last_source_description`,
    `ALTER TABLE terms RENAME COLUMN last_source_mail_date TO last_source_date`,
    // analysis_queue: mail_* → source_description, received_at; add webhook_code
    `ALTER TABLE analysis_queue RENAME COLUMN mail_subject TO source_description`,
    `ALTER TABLE analysis_queue RENAME COLUMN mail_received_at TO received_at`,
    `ALTER TABLE analysis_queue ADD COLUMN webhook_code TEXT`,
    // webhooks 테이블 (INIT_SCHEMA_SQL의 IF NOT EXISTS로 처리되나 명시적으로도 처리)
  ];

  for (const sql of migrations) {
    try {
      sqlite.exec(sql);
    } catch {
      // 이미 마이그레이션 완료 또는 해당 없는 경우 무시
    }
  }
}

function createDbConnection() {
  // data/ 디렉터리 자동 생성
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // WAL 모드 및 외래 키 활성화
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // 스키마 마이그레이션 (기존 DB 컬럼명 변경)
  runMigrations(sqlite);

  // 핵심 테이블 자동 생성 (최초 실행 시 npm run db:push 없이 동작)
  sqlite.exec(INIT_SCHEMA_SQL);

  // FTS5 가상 테이블 초기화 (terms 전문 검색)
  sqlite.exec(FTS5_SQL);

  // FTS5 동기화 트리거
  sqlite.exec(TRIGGER_INSERT_SQL);
  sqlite.exec(TRIGGER_UPDATE_SQL);
  sqlite.exec(TRIGGER_DELETE_SQL);

  return drizzle(sqlite, { schema });
}

// HMR(Hot Module Replacement) 중 DB 연결 중복 방지
declare global {
  var __db: ReturnType<typeof createDbConnection> | undefined;
}

export const db = globalThis.__db ?? createDbConnection();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__db = db;
}

export type Db = typeof db;
