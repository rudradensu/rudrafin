import { getAccountDb } from '../src/account-db';

export const up = async function () {
  await getAccountDb().exec(`
    CREATE TABLE IF NOT EXISTS secrets (
      name TEXT PRIMARY KEY,
      value TEXT
    )
  `);
};

export const down = async function () {
  await getAccountDb().exec(`DROP TABLE IF EXISTS secrets`);
};
