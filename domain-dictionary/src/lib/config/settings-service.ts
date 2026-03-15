import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { appSettings } from '@/db/schema';

// 지원하는 설정 키 목록
export const SETTING_KEYS = [
  'analysis.model',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = db.select().from(appSettings).where(eq(appSettings.settingKey, key)).get();
  return row?.settingValue ?? null;
}

export async function setSetting(key: SettingKey, value: string): Promise<void> {
  const existing = db.select().from(appSettings).where(eq(appSettings.settingKey, key)).get();
  if (existing) {
    db.update(appSettings)
      .set({ settingValue: value, updatedAt: new Date().toISOString() })
      .where(eq(appSettings.settingKey, key))
      .run();
  } else {
    db.insert(appSettings).values({ settingKey: key, settingValue: value }).run();
  }
}

export async function getAllSettings(): Promise<Record<string, string | null>> {
  const rows = db.select().from(appSettings).all();
  const result: Record<string, string | null> = {};
  for (const row of rows) {
    result[row.settingKey] = row.settingValue;
  }
  return result;
}

export async function setMultipleSettings(entries: { key: SettingKey; value: string }[]): Promise<void> {
  for (const { key, value } of entries) {
    await setSetting(key, value);
  }
}
