// Quick check of Mem0 configuration
require('dotenv').config({ path: '../.env' });

console.log('=== Mem0 Configuration Check ===');
console.log('MEM0_ENABLED:', process.env.MEM0_ENABLED);
console.log('MEM0_PROVIDER:', process.env.MEM0_PROVIDER);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[SET]' : '[NOT SET]');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST || 'localhost');
console.log('POSTGRES_PORT:', process.env.POSTGRES_PORT || '5432');
console.log('POSTGRES_USER:', process.env.POSTGRES_USER || 'postgres');
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? '[SET]' : '[NOT SET]');
console.log('POSTGRES_DB:', process.env.POSTGRES_DB || 'chatsg');

// Load config
const { STORAGE_CONFIG } = require('../dist/config/storage.config');
console.log('\n=== Storage Config Values ===');
console.log('mem0.enabled:', STORAGE_CONFIG.mem0.enabled);
console.log('mem0.provider:', STORAGE_CONFIG.mem0.provider);
console.log('mem0.postgres.host:', STORAGE_CONFIG.mem0.postgres.host);
console.log('mem0.postgres.database:', STORAGE_CONFIG.mem0.postgres.database);