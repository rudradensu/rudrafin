import { v4 as uuidv4 } from 'uuid';

import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();

  await accountDb.transaction(async txDb => {
    await txDb.exec(`
      CREATE TABLE users
        (id TEXT PRIMARY KEY,
        user_name TEXT,
        display_name TEXT,
        role TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        owner INTEGER NOT NULL DEFAULT 0)
    `);
    await txDb.exec(`
      CREATE TABLE user_access
        (user_id TEXT,
        file_id TEXT,
        PRIMARY KEY (user_id, file_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (file_id) REFERENCES files(id))
    `);
    await txDb.exec(`ALTER TABLE files ADD COLUMN owner TEXT`);
    await txDb.exec(`ALTER TABLE sessions ADD COLUMN expires_at INTEGER`);
    await txDb.exec(`ALTER TABLE sessions ADD COLUMN user_id TEXT`);
    await txDb.exec(`ALTER TABLE sessions ADD COLUMN auth_method TEXT`);

    const userId = uuidv4();
    await txDb.mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, 1, 1, ?)',
      [userId, '', '', 'ADMIN'],
    );

    await txDb.mutate(
      'UPDATE sessions SET user_id = ?, expires_at = ?, auth_method = ? WHERE auth_method IS NULL',
      [userId, -1, 'password'],
    );
  });
};

export const down = async function () {
  await getAccountDb().transaction(async txDb => {
    await txDb.exec(`DROP TABLE IF EXISTS user_access`);
    await txDb.exec(`
      CREATE TABLE sessions_backup (
        token TEXT PRIMARY KEY
      )
    `);
    await txDb.exec(`INSERT INTO sessions_backup (token) SELECT token FROM sessions`);
    await txDb.exec(`DROP TABLE sessions`);
    await txDb.exec(`ALTER TABLE sessions_backup RENAME TO sessions`);
    await txDb.exec(`
      CREATE TABLE files_backup (
        id TEXT PRIMARY KEY,
        group_id TEXT,
        sync_version SMALLINT,
        encrypt_meta TEXT,
        encrypt_keyid TEXT,
        encrypt_salt TEXT,
        encrypt_test TEXT,
        deleted BOOLEAN DEFAULT false,
        name TEXT
      )
    `);
    await txDb.exec(`
      INSERT INTO files_backup (id, group_id, sync_version, encrypt_meta, encrypt_keyid, encrypt_salt, encrypt_test, deleted, name)
      SELECT id, group_id, sync_version, encrypt_meta, encrypt_keyid, encrypt_salt, encrypt_test, deleted, name
      FROM files
    `);
    await txDb.exec(`DROP TABLE files`);
    await txDb.exec(`ALTER TABLE files_backup RENAME TO files`);
    await txDb.exec(`DROP TABLE IF EXISTS users`);
  });
};
