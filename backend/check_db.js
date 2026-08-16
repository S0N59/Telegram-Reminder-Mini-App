import pg from 'pg';

async function run() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res1 = await pool.query('SELECT * FROM bot_users');
    console.log('Users:', res1.rows);
    
    const res2 = await pool.query('SELECT * FROM user_connections');
    console.log('Connections:', res2.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
run();
