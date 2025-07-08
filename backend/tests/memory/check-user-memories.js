const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMemories() {
  try {
    // Check messages for user 2
    const messages = await pool.query(
      'SELECT COUNT(*) as count FROM chat_messages m JOIN chat_sessions s ON m.session_id = s.id WHERE s.user_id = $1',
      ['2']
    );
    console.log('PostgreSQL messages for user 2:', messages.rows[0].count);

    // Check memories in mem0_memories table
    const memories = await pool.query(
      `SELECT COUNT(*) as count FROM mem0_memories WHERE user_id = $1`,
      ['2']
    );
    console.log('Mem0 memories table for user 2:', memories.rows[0].count);

    // Show actual memories
    const actualMemories = await pool.query(
      `SELECT id, memory, created_at FROM mem0_memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      ['2']
    );
    console.log('\nActual Mem0 memories in PostgreSQL:');
    actualMemories.rows.forEach(m => {
      console.log(`- ${m.memory} (${new Date(m.created_at).toLocaleString()})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
    
    // Check if table exists
    if (err.message.includes('mem0_memories')) {
      console.log('\nNote: mem0_memories table might not exist. Checking schema...');
      const tables = await pool.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = 'public' AND table_name LIKE '%mem%'`
      );
      console.log('Memory-related tables:', tables.rows.map(r => r.table_name));
    }
  } finally {
    await pool.end();
  }
}

checkMemories();