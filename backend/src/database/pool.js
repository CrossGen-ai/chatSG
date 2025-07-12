require('dotenv').config();
const { Pool } = require('pg');

let pool = null;

function createPool() {
  if (pool) {
    return pool;
  }

  // Log SSL configuration for debugging
  console.log('[Database Pool] Creating NEW pool with SSL config:', {
    PGSSL: process.env.PGSSL,
    DATABASE_SSL: process.env.DATABASE_SSL,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    stack: new Error().stack.split('\n').slice(2, 5).join('\n')
  });

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
    // Parse SSL settings
    let sslConfig = false;
    if (process.env.PGSSL !== 'false' && process.env.DATABASE_SSL !== 'false') {
      if (process.env.NODE_ENV === 'production') {
        sslConfig = { rejectUnauthorized: false };
      }
    }
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig
    });
  } else {
    // Handle SSL for individual config too
    if (process.env.PGSSL === 'false' || process.env.DATABASE_SSL === 'false') {
      config.ssl = false;
    } else if (process.env.NODE_ENV === 'production') {
      config.ssl = { rejectUnauthorized: false };
    }
    
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

// Force pool recreation - useful when environment changes
async function recreatePool() {
  if (pool) {
    console.log('[Database Pool] Closing existing pool for recreation');
    try {
      await pool.end();
      console.log('[Database Pool] Pool closed successfully');
    } catch (err) {
      console.error('[Database Pool] Error closing pool:', err);
    }
    pool = null;
  }
  console.log('[Database Pool] Creating new pool after recreation');
  return createPool();
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
  createPool,
  recreatePool
};