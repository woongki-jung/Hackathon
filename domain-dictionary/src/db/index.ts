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
    last_source_mail_subject TEXT,
    last_source_mail_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS term_source_files (
    id TEXT PRIMARY KEY NOT NULL,
    term_id TEXT NOT NULL REFERENCES terms(id),
    mail_file_name TEXT NOT NULL,
    mail_subject TEXT,
    mail_received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS term_source_files_term_id_mail_file_name_idx
    ON term_source_files(term_id, mail_file_name);

  CREATE TABLE IF NOT EXISTS stop_words (
    id TEXT PRIMARY KEY NOT NULL,
    word TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS analysis_queue (
    id TEXT PRIMARY KEY NOT NULL,
    file_name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    summary TEXT,
    action_items TEXT,
    extracted_term_count INTEGER DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    analyzed_at TEXT,
    mail_subject TEXT,
    mail_received_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

function createDbConnection() {
  // data/ 디렉터리 자동 생성
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // WAL 모드 및 외래 키 활성화
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

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
