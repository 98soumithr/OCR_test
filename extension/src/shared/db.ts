import { openDB } from 'idb';

const DB_NAME = 'formpilot';
const DB_VERSION = 1;

export async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles');
      }
      if (!db.objectStoreNames.contains('logs')) {
        db.createObjectStore('logs', { autoIncrement: true });
      }
    }
  });
}

export async function getProfile(key: string) {
  const db = await getDb();
  return db.get('profiles', key);
}

export async function setProfile(key: string, value: any) {
  const db = await getDb();
  return db.put('profiles', value, key);
}

export async function logFill(entry: any) {
  const db = await getDb();
  return db.add('logs', { ts: Date.now(), ...entry });
}
