import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import * as schema from './schema';

const DB_PATH = process.env.DATABASE_PATH || './data/app.db';

function createDbConnection() {
  // data/ 디렉터리 자동 생성
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // WAL 모드 및 외래 키 활성화
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // FTS5 가상 테이블 초기화 (terms 전문 검색)
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS terms_fts USING fts5(
      name,
      description,
      content='terms',
      content_rowid='rowid'
    );
  `);

  // FTS5 동기화 트리거
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS terms_fts_insert AFTER INSERT ON terms BEGIN
      INSERT INTO terms_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
    END;
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS terms_fts_update AFTER UPDATE ON terms BEGIN
      INSERT INTO terms_fts(terms_fts, rowid, name, description) VALUES('delete', old.rowid, old.name, old.description);
      INSERT INTO terms_fts(rowid, name, description) VALUES (new.rowid, new.name, new.description);
    END;
  `);

  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS terms_fts_delete AFTER DELETE ON terms BEGIN
      INSERT INTO terms_fts(terms_fts, rowid, name, description) VALUES('delete', old.rowid, old.name, old.description);
    END;
  `);

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
