import pg from 'pg';

function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

class WrappedDatabase {
  constructor(pool) {
    this.pool = pool;
  }

  async all(sql, params = []) {
    const { rows } = await this.pool.query(convertPlaceholders(sql), params);
    return rows;
  }

  async first(sql, params = []) {
    const rows = await this.all(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  async exec(sql) {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of statements) {
      await this.pool.query(stmt);
    }
  }

  async mutate(sql, params = []) {
    const { rowCount, rows } = await this.pool.query(
      convertPlaceholders(sql),
      params,
    );
    const insertId = rows && rows.length > 0 ? rows[0] : null;
    return { changes: rowCount ?? 0, insertId };
  }

  async transaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const wrappedClient = new WrappedDatabase(client);
      const result = await fn(wrappedClient);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async close() {
    if (this.pool.end) {
      await this.pool.end();
    }
  }
}

let _sharedPool = null;

function getSharedPool() {
  if (!_sharedPool) {
    _sharedPool = new pg.Pool({
      connectionString:
        process.env.ACTUAL_POSTGRES_URL ||
        'postgresql://postgres:postgres@localhost:5432/actual',
    });
  }
  return _sharedPool;
}

export function openDatabase() {
  return new WrappedDatabase(getSharedPool());
}
