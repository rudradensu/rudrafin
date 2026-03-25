import * as bcrypt from 'bcrypt';

import { bootstrapOpenId } from './accounts/openid';
import { bootstrapPassword, loginWithPassword } from './accounts/password';
import { openDatabase } from './db';

let _accountDb;

export function getAccountDb() {
  if (_accountDb === undefined) {
    _accountDb = openDatabase();
  }
  return _accountDb;
}

export async function needsBootstrap() {
  const accountDb = getAccountDb();
  const rows = await accountDb.all('SELECT * FROM auth');
  return rows.length === 0;
}

export async function listLoginMethods() {
  const accountDb = getAccountDb();
  const rows = await accountDb.all('SELECT method, display_name, active FROM auth');
  const { config } = await import('./load-config');
  return rows
    .filter(f =>
      rows.length > 1 && config.get('enforceOpenId')
        ? f.method === 'openid'
        : true,
    )
    .map(r => ({
      method: r.method,
      active: r.active,
      displayName: r.display_name,
    }));
}

export async function getActiveLoginMethod() {
  const accountDb = getAccountDb();
  const row = await accountDb.first('SELECT method FROM auth WHERE active = 1');
  return row ? row.method : undefined;
}

/*
 * Get the Login Method in the following order
 * req (the frontend can say which method in the case it wants to resort to forcing password auth)
 * config options
 * fall back to using password
 */
export async function getLoginMethod(req) {
  const { config } = await import('./load-config');
  if (
    typeof req !== 'undefined' &&
    (req.body || { loginMethod: null }).loginMethod &&
    config.get('allowedLoginMethods').includes(req.body.loginMethod)
  ) {
    const accountDb = getAccountDb();
    const activeRow = await accountDb.first(
      'SELECT method FROM auth WHERE method = ? AND active = 1',
      [req.body.loginMethod],
    );
    if (activeRow) return req.body.loginMethod;
  }

  //BY-PASS ANY OTHER CONFIGURATION TO ENSURE HEADER AUTH
  if (
    config.get('loginMethod') === 'header' &&
    config.get('allowedLoginMethods').includes('header')
  ) {
    return config.get('loginMethod');
  }

  const activeMethod = await getActiveLoginMethod();
  return activeMethod || config.get('loginMethod');
}

export async function bootstrap(loginSettings, forced = false) {
  if (!loginSettings) {
    return { error: 'invalid-login-settings' };
  }
  const passEnabled = 'password' in loginSettings;
  const openIdEnabled = 'openId' in loginSettings;

  const accountDb = getAccountDb();

  try {
    const row = await accountDb.first(
      `SELECT count(*) as "countOfOwner"
   FROM users
   WHERE users.user_name <> '' and users.owner = 1`,
    );
    const countOfOwner = row ? row.countOfOwner : 0;

    if (!forced && (!openIdEnabled || countOfOwner > 0)) {
      if (!(await needsBootstrap())) {
        return { error: 'already-bootstrapped' };
      }
    }

    if (!passEnabled && !openIdEnabled) {
      return { error: 'no-auth-method-selected' };
    }

    if (passEnabled && openIdEnabled && !forced) {
      return { error: 'max-one-method-allowed' };
    }

    if (passEnabled) {
      const { error } = await bootstrapPassword(loginSettings.password);
      if (error) {
        return { error };
      }
    }

    if (openIdEnabled && forced) {
      const { error } = await bootstrapOpenId(loginSettings.openId);
      if (error) {
        return { error };
      }
    }

    return passEnabled ? loginWithPassword(loginSettings.password) : {};
  } catch (error) {
    throw error;
  }
}

export async function isAdmin(userId) {
  return hasPermission(userId, 'ADMIN');
}

export async function hasPermission(userId, permission) {
  return (await getUserPermission(userId)) === permission;
}

export async function enableOpenID(loginSettings) {
  if (!loginSettings || !loginSettings.openId) {
    return { error: 'invalid-login-settings' };
  }

  const { error } = (await bootstrapOpenId(loginSettings.openId)) || {};
  if (error) {
    return { error };
  }

  await getAccountDb().mutate('DELETE FROM sessions');
}

export async function disableOpenID(loginSettings) {
  if (!loginSettings || !loginSettings.password) {
    return { error: 'invalid-login-settings' };
  }

  const accountDb = getAccountDb();
  const row = await accountDb.first('SELECT extra_data FROM auth WHERE method = ?', [
    'password',
  ]);
  const passwordHash = row ? row.extra_data : undefined;

  if (!passwordHash) {
    return { error: 'invalid-password' };
  }

  if (!loginSettings?.password) {
    return { error: 'invalid-password' };
  }

  if (passwordHash) {
    const confirmed = bcrypt.compareSync(loginSettings.password, passwordHash);

    if (!confirmed) {
      return { error: 'invalid-password' };
    }
  }

  const { error } = (await bootstrapPassword(loginSettings.password)) || {};
  if (error) {
    return { error };
  }

  try {
    await accountDb.transaction(async txDb => {
      await txDb.mutate('DELETE FROM sessions');
      await txDb.mutate(
        `DELETE FROM user_access
                              WHERE user_access.user_id IN (
                                  SELECT users.id
                                  FROM users
                                  WHERE users.user_name <> ?
                              );`,
        [''],
      );
      await txDb.mutate('DELETE FROM users WHERE user_name <> ?', ['']);
      await txDb.mutate('DELETE FROM auth WHERE method = ?', ['openid']);
    });
  } catch (err) {
    console.error('Error cleaning up openid information:', err);
    return { error: 'database-error' };
  }
}

export async function getSession(token) {
  const accountDb = getAccountDb();
  return accountDb.first('SELECT * FROM sessions WHERE token = ?', [token]);
}

export async function getUserInfo(userId) {
  const accountDb = getAccountDb();
  return accountDb.first('SELECT * FROM users WHERE id = ?', [userId]);
}

export async function getUserPermission(userId) {
  const accountDb = getAccountDb();
  const row = await accountDb.first(
    `SELECT role FROM users WHERE users.id = ?`,
    [userId],
  );
  return row ? row.role : '';
}

export async function getServerPrefs() {
  const accountDb = getAccountDb();
  const rows = (await accountDb.all('SELECT key, value FROM server_prefs')) || [];

  return rows.reduce((prefs, row) => {
    prefs[row.key] = row.value;
    return prefs;
  }, {});
}

export async function setServerPrefs(prefs) {
  const accountDb = getAccountDb();

  if (!prefs) {
    return;
  }

  await accountDb.transaction(async txDb => {
    for (const [key, value] of Object.entries(prefs)) {
      await txDb.mutate(
        'INSERT INTO server_prefs (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value],
      );
    }
  });
}

export async function clearExpiredSessions() {
  const clearThreshold = Math.floor(Date.now() / 1000) - 3600;

  const result = await getAccountDb().mutate(
    'DELETE FROM sessions WHERE expires_at <> -1 and expires_at < ?',
    [clearThreshold],
  );

  console.log(`Deleted ${result.changes} old sessions`);
}
