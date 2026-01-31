/**
 * Script to migrate existing user passwords to bcrypt.
 * WARNING: run after backing up DB. It will replace the password column values.
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run(){
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if(!DB_HOST || !DB_USER || !DB_NAME){
    console.error('Set DB_HOST, DB_USER, DB_NAME in env'); process.exit(1);
  }
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  try{
    const [cols] = await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'", [DB_NAME]);
    const colNames = cols.map(r=>r.COLUMN_NAME);
    const usernameCol = ['username','account_name','name','user','login','email'].find(c=>colNames.includes(c));
    const passwordCol = ['password','passwd','pass','pwd','senha'].find(c=>colNames.includes(c));
    if(!usernameCol || !passwordCol) throw new Error('users table missing expected columns');

    const [rows] = await conn.query(`SELECT ${usernameCol}, ${passwordCol} FROM users`);
    for(const r of rows){
      const current = r[passwordCol];
      if(typeof current === 'string' && current.startsWith('$2')) continue; // already bcrypt
      const hash = await bcrypt.hash(current+'', 10);
      await conn.query(`UPDATE users SET ${passwordCol} = ? WHERE ${usernameCol} = ?`, [hash, r[usernameCol]]);
      console.log('Upgraded', r[usernameCol]);
    }
    console.log('Done');
  }finally{ await conn.end(); }
}

run().catch(e=>{ console.error(e); process.exit(1); });
