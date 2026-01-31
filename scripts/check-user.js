// quick DB check to inspect 'users' table and a given username
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
// load .env manually if dotenv not available
const envPath = path.resolve(__dirname, '..', '.env');
if(fs.existsSync(envPath)){
  const content = fs.readFileSync(envPath,'utf8');
  for(const line of content.split(/\r?\n/)){
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^#]*))?/);
    if(m){
      const key = m[1];
      const val = m[2] ?? m[3] ?? (m[4]||'').trim();
      if(!(key in process.env)) process.env[key]=val;
    }
  }
}

async function run(){
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if(!DB_HOST || !DB_USER || !DB_NAME){
    console.error('Missing DB env vars'); process.exit(1);
  }
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  try{
    const username = process.argv[2] || 'test';
    console.log('Querying users table for', username);
    const [cols] = await conn.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'", [DB_NAME]);
    const colNames = cols.map(c=>c.COLUMN_NAME);
    console.log('users columns:', colNames.join(', '));
    // try several candidate username columns
    const candidates = ['username','account_name','name','user','login','email','account'];
    let rows = [];
    let usedCol = null;
    for(const c of candidates){
      if(!colNames.includes(c)) continue;
      const r = await conn.query(`SELECT * FROM users WHERE ${c} = ? LIMIT 1`, [username]).catch(()=>[[]]);
      if(r && r[0] && r[0].length){ rows = r[0]; usedCol = c; break; }
    }
    if(!usedCol){
      // fallback: try numeric account id
      const rall = await conn.query(`SELECT * FROM users LIMIT 1`);
      rows = rall[0];
    }
    if(rows && rows.length) {
      const user = rows[0];
      // print safe preview
      const preview = {};
      for(const k of Object.keys(user)){
        if(/pass|pwd|senha/i.test(k)) {
          const v = String(user[k]||'');
          preview[k] = { len: v.length, startsWith: v.slice(0,3) };
        } else preview[k] = user[k];
      }
      console.log('found using column:', usedCol || '(unknown)');
      console.log('user row:', preview);
    } else console.log('no user found with username=', username);
  }catch(e){ console.error('ERROR', e.message); }
  finally{ try{ await conn.end(); }catch{} }
}

run();
