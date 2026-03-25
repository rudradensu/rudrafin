import { getAccountDb } from './src/account-db';
import { run as runMigrations } from './src/migrations';

const GENERIC_ADMIN_ID = 'genericAdmin';
const GENERIC_USER_ID = 'genericUser';
const ADMIN_ROLE_ID = 'ADMIN';
const BASIC_ROLE_ID = 'BASIC';

const createUser = async (userId, userName, role, owner = 0, enabled = 1) => {
  try {
    await getAccountDb().mutate(
      'INSERT INTO users (id, user_name, display_name, enabled, owner, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, userName, userName, enabled, owner, role],
    );
  } catch (error) {
    console.error(`Error creating user ${userName}:`, error);
    throw error;
  }
};

const setSessionUser = async (userId, token = 'valid-token') => {
  try {
    const db = getAccountDb();
    const session = await db.first('SELECT token FROM sessions WHERE token = ?', [token]);
    if (!session) {
      throw new Error(`Session not found for token: ${token}`);
    }
    await db.mutate('UPDATE sessions SET user_id = ? WHERE token = ?', [userId, token]);
  } catch (error) {
    console.error(`Error updating session for user ${userId}:`, error);
    throw error;
  }
};

export async function setup() {
  const NEVER_EXPIRES = -1;

  await runMigrations();

  await createUser(GENERIC_ADMIN_ID, 'admin', ADMIN_ROLE_ID, 1);

  const db = getAccountDb();
  await db.transaction(async txDb => {
    await txDb.mutate('DELETE FROM sessions');
    await txDb.mutate(
      'INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)',
      ['valid-token', NEVER_EXPIRES, 'genericAdmin'],
    );
    await txDb.mutate(
      'INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)',
      ['valid-token-admin', NEVER_EXPIRES, 'genericAdmin'],
    );
    await txDb.mutate(
      'INSERT INTO sessions (token, expires_at, user_id) VALUES (?, ?, ?)',
      ['valid-token-user', NEVER_EXPIRES, 'genericUser'],
    );
  });

  await setSessionUser('genericAdmin');
  await setSessionUser('genericAdmin', 'valid-token-admin');

  await createUser(GENERIC_USER_ID, 'user', BASIC_ROLE_ID, 1);
}

export async function teardown() {
  await runMigrations('down');
}
