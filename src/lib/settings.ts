// src/lib/settings.ts
import pool from './db';

let cache: Record<string, string> = {};
let cacheTime = 0;
const TTL = 60_000; // 1 دقیقه

export async function getSetting(key: string): Promise<string | null> {
  if (Date.now() - cacheTime > TTL) {
    const [rows]: any = await pool.query('SELECT key_name, key_value FROM settings');
    cache = Object.fromEntries(rows.map((r: any) => [r.key_name, r.key_value]));
    cacheTime = Date.now();
  }
  return cache[key] ?? null;
}

export function clearSettingsCache() {
  cacheTime = 0;
}