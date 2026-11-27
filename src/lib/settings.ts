import { db } from "./db";
import { SETTING_DEFAULTS, SettingSchemas, type Settings } from "./settings-defaults";

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return SETTING_DEFAULTS[key];
  const parsed = SettingSchemas[key].safeParse(JSON.parse(row.value));
  return (parsed.success ? parsed.data : SETTING_DEFAULTS[key]) as Settings[K];
}

export async function setSetting<K extends keyof Settings>(key: K, value: unknown): Promise<Settings[K]> {
  const parsed = SettingSchemas[key].parse(value) as Settings[K];
  await db.setting.upsert({ where: { key }, update: { value: JSON.stringify(parsed) }, create: { key, value: JSON.stringify(parsed) } });
  return parsed;
}

export { SETTING_DEFAULTS };
export type { Settings };
