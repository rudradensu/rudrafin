import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();
  await accountDb.exec(`
    CREATE TABLE IF NOT EXISTS messages_binary
      (group_id TEXT NOT NULL,
       timestamp TEXT NOT NULL,
       is_encrypted BOOLEAN,
       content BYTEA,
       PRIMARY KEY (group_id, timestamp))
  `);
  await accountDb.exec(`
    CREATE TABLE IF NOT EXISTS messages_merkles
      (group_id TEXT PRIMARY KEY,
       merkle TEXT)
  `);
};

export const down = async function () {
  const accountDb = getAccountDb();
  await accountDb.exec(`DROP TABLE IF EXISTS messages_binary`);
  await accountDb.exec(`DROP TABLE IF EXISTS messages_merkles`);
};
