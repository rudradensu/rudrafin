import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();
  await accountDb.transaction(async txDb => {
    await txDb.exec(`
      CREATE TABLE auth_new
        (method TEXT PRIMARY KEY,
        display_name TEXT,
        extra_data TEXT,
        active INTEGER)
    `);
    await txDb.exec(`
      INSERT INTO auth_new (method, display_name, extra_data, active)
        SELECT 'password', 'Password', password, 1 FROM auth
    `);
    await txDb.exec(`DROP TABLE auth`);
    await txDb.exec(`ALTER TABLE auth_new RENAME TO auth`);
    await txDb.exec(`
      CREATE TABLE pending_openid_requests
        (state TEXT PRIMARY KEY,
        code_verifier TEXT,
        return_url TEXT,
        expiry_time INTEGER)
    `);
  });
};

export const down = async function () {
  const accountDb = getAccountDb();
  await accountDb.transaction(async txDb => {
    await txDb.exec(`ALTER TABLE auth RENAME TO auth_temp`);
    await txDb.exec(`CREATE TABLE auth (password TEXT)`);
    await txDb.exec(
      `INSERT INTO auth (password) SELECT extra_data FROM auth_temp WHERE method = 'password'`,
    );
    await txDb.exec(`DROP TABLE auth_temp`);
    await txDb.exec(`DROP TABLE pending_openid_requests`);
  });
};
