import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const {
  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME,
  JWT_SECRET = process.env.API_SECRET_KEY,
} = process.env;

async function findColumns(conn){
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  );
  return rows.map(r => r.COLUMN_NAME);
}

function pickColumn(columns, candidates){
  for(const c of candidates) if(columns.includes(c)) return c;
  return null;
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error: 'missing_credentials' });
  if(!DB_HOST || !DB_USER || !DB_NAME) return res.status(500).json({ error: 'db_not_configured' });
  if(!JWT_SECRET) return res.status(500).json({ error: 'jwt_secret_not_set' });

  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  try{
    const cols = await findColumns(conn);
    const usernameCol = pickColumn(cols, ['username','account_name','name','user','login','email']);
    const passwordCol = pickColumn(cols, ['password','passwd','pass','pwd','senha']);
    if(!usernameCol || !passwordCol) return res.status(500).json({ error: 'users_table_incompatible' });

    const [rows] = await conn.query(`SELECT * FROM users WHERE ${usernameCol} = ? LIMIT 1`, [username]);
    const user = rows[0];
    if(!user) return res.status(401).json({ error: 'invalid_credentials' });

    const stored = user[passwordCol];
    let ok = false;
    // bcrypt
    if(typeof stored === 'string' && stored.startsWith('$2')){
      ok = await bcrypt.compare(password, stored);
    } else if(typeof stored === 'string'){
      // md5 fallback (handle plain 32-char hex or MySQL '0x' prefix)
      const crypto = await import('crypto');
      const md5 = crypto.createHash('md5').update(password).digest('hex');
      if(stored.length === 32){
        ok = md5 === stored;
      } else if(stored.startsWith('0x') && stored.length >= 34){
        ok = md5 === stored.slice(2).toLowerCase();
      } else {
        // plaintext fallback (not recommended)
        ok = stored == password;
      }
    } else {
      // plaintext fallback (not recommended)
      ok = stored == password;
    }

    if(!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const token = jwt.sign({ sub: user.id ?? user[usernameCol] }, JWT_SECRET, { expiresIn: '7d' });
    res.setHeader('Set-Cookie', serialize('auth', token, { httpOnly: true, path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60*60*24*7 }));
    // build safe user object mapping common columns
    const idCol = ['id','account_id','uid','user_id','accountid','accountID'].find(c=>c in user) || Object.keys(user)[0];
    const displayCol = ['display_name','name','account_name','username','user'].find(c=>c in user);
    const emailCol = ['email','mail','username'].find(c=>c in user && c !== usernameCol);

    const safeUser = {
      id: user[idCol],
      username: user[usernameCol],
      displayName: displayCol ? user[displayCol] : user[usernameCol],
    };
    if(emailCol) safeUser.email = user[emailCol];
    // include other non-sensitive small fields if present
    for(const f of ['created_at','created','created_on','criado_em']) if(f in user) safeUser.created = user[f];

    return res.json({ ok: true, user: safeUser });
  }catch(e){
    return res.status(500).json({ error: 'server_error', message: e.message });
  }finally{
    try{ await conn.end(); }catch{};
  }
}
