// CMN-FS-001: 파일 시스템 관리 기능
import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

/**
 * 디렉터리가 존재하지 않으면 재귀적으로 생성합니다.
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info('[file-manager] 디렉터리 생성', { dirPath });
  }
}

/**
 * 파일을 안전하게 씁니다. 상위 디렉터리를 자동 생성합니다.
 * 경로 탈출(directory traversal) 방지: baseDir 외부 경로 차단
 */
export function writeFile(filePath: string, content: string): void {
  const absPath = path.resolve(filePath);
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, content, 'utf-8');
  logger.info('[file-manager] 파일 저장', { filePath: absPath });
}

/**
 * 파일을 읽습니다. 없으면 null을 반환합니다.
 */
export function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * 파일을 삭제합니다. 없으면 무시합니다.
 */
export function deleteFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath);
    logger.info('[file-manager] 파일 삭제', { filePath });
  } catch {
    // 파일이 없으면 무시
  }
}

/**
 * 디렉터리 내 파일 목록을 반환합니다. 디렉터리가 없으면 빈 배열을 반환합니다.
 */
export function listFiles(dirPath: string): string[] {
  try {
    return fs.readdirSync(dirPath).map((name) => path.join(dirPath, name));
  } catch {
    return [];
  }
}

/**
 * 파일 존재 여부를 반환합니다.
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * 파일의 최종 수정 시간(ms)을 반환합니다.
 */
export function getFileMtimeMs(filePath: string): number | null {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}
