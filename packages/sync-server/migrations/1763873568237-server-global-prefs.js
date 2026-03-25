import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS server_prefs
      (key TEXT NOT NULL PRIMARY KEY,
       value TEXT)
  `);
};

export const down = async function () {
  await getAccountDb().exec(`DROP TABLE IF EXISTS server_prefs`);
};
