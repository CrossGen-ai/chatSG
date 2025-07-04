const { Pool } = require('pg');

let pool = null;

function createPool() {
  if (pool) {
    return pool;
  }

  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB || 'chatsg',
    max: 10, // maximum number of connections in pool
    idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
    connectionTimeoutMillis: 2000, // how long to wait for connection
  };

  // Use DATABASE_URL if provided (common in production)
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  } else {
    pool = new Pool(config);
  }

  // Handle pool errors
  pool.on('error', (err, client) => {
    console.error('[Database Pool] Unexpected error on idle client', err);
  });

  pool.on('connect', () => {
    console.log('[Database Pool] New client connected');
  });

  return pool;
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[Database Pool] Pool closed');
  }
}

module.exports = {
  getPool,
  closePool,
  createPool
};