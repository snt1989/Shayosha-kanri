import { promises as fs } from 'fs';
import path from 'path';
import {
  AppData,
  DEFAULT_DRIVERS,
  DEFAULT_MASTERS,
  DEFAULT_VEHICLES,
  Masters,
} from './types';

const DATA_KEY = 'fleet:data:v1';

function hasUpstash() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  );
}

function defaultData(): Omit<AppData, 'persistent'> {
  return {
    reports: [],
    vehicles: DEFAULT_VEHICLES,
    drivers: DEFAULT_DRIVERS,
    masters: DEFAULT_MASTERS,
  };
}

function mergeMasters(masters: Partial<Masters> | undefined): Masters {
  const base = DEFAULT_MASTERS;
  if (!masters) return base;
  return {
    departments: masters.departments ?? base.departments,
    checkers: masters.checkers ?? base.checkers,
    checkMethods: masters.checkMethods ?? base.checkMethods,
    maintTypes: masters.maintTypes ?? base.maintTypes,
    tireTypes: masters.tireTypes ?? base.tireTypes,
    licenseTypes: masters.licenseTypes ?? base.licenseTypes,
  };
}

// --- Upstash Redis backend (本番/Vercel推奨) ---
let redisClient: import('@upstash/redis').Redis | null = null;
async function getRedis() {
  if (!redisClient) {
    const { Redis } = await import('@upstash/redis');
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL!;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN!;
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

// --- ローカルファイル backend（開発用フォールバック） ---
// Vercel本番環境ではプロジェクトディレクトリが読み取り専用のため、書き込み可能な /tmp を使用します。
// ただし /tmp はインスタンスの再起動やデプロイで消えるため、本番では必ず Upstash Redis を設定してください。
const LOCAL_DIR = process.env.VERCEL
  ? path.join('/tmp', 'fleet-app-data')
  : path.join(process.cwd(), '.data');
const LOCAL_FILE = path.join(LOCAL_DIR, 'fleet-data.json');

async function readLocal(): Promise<Omit<AppData, 'persistent'>> {
  try {
    const raw = await fs.readFile(LOCAL_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      reports: parsed.reports ?? [],
      vehicles: parsed.vehicles ?? DEFAULT_VEHICLES,
      drivers: parsed.drivers ?? DEFAULT_DRIVERS,
      masters: mergeMasters(parsed.masters),
    };
  } catch {
    const d = defaultData();
    await writeLocal(d);
    return d;
  }
}

async function writeLocal(data: Omit<AppData, 'persistent'>) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(LOCAL_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function loadData(): Promise<AppData> {
  if (hasUpstash()) {
    const redis = await getRedis();
    const raw = await redis.get<Omit<AppData, 'persistent'>>(DATA_KEY);
    if (!raw) {
      const d = defaultData();
      await redis.set(DATA_KEY, d);
      return { ...d, persistent: true };
    }
    return {
      reports: raw.reports ?? [],
      vehicles: raw.vehicles ?? DEFAULT_VEHICLES,
      drivers: raw.drivers ?? DEFAULT_DRIVERS,
      masters: mergeMasters(raw.masters),
      persistent: true,
    };
  }
  const local = await readLocal();
  return { ...local, persistent: false };
}

export async function saveData(data: Omit<AppData, 'persistent'>): Promise<void> {
  if (hasUpstash()) {
    const redis = await getRedis();
    await redis.set(DATA_KEY, data);
    return;
  }
  await writeLocal(data);
}
