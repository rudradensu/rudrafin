import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();
  await accountDb.exec(`
    CREATE TABLE IF NOT EXISTS auth
      (password TEXT PRIMARY KEY)
  `);
  await accountDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions
      (token TEXT PRIMARY KEY)
  `);
  await accountDb.exec(`
    CREATE TABLE IF NOT EXISTS files
      (id TEXT PRIMARY KEY,
       group_id TEXT,
       sync_version SMALLINT,
       encrypt_meta TEXT,
       encrypt_keyid TEXT,
       encrypt_salt TEXT,
       encrypt_test TEXT,
       deleted BOOLEAN DEFAULT false,
       name TEXT)
  `);
};

export const down = async function () {
  const accountDb = getAccountDb();
  await accountDb.exec(`DROP TABLE IF EXISTS auth`);
  await accountDb.exec(`DROP TABLE IF EXISTS sessions`);
  await accountDb.exec(`DROP TABLE IF EXISTS files`);
};
