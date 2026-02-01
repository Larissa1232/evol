import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import mysql from 'mysql2/promise';

const { JWT_SECRET = process.env.API_SECRET_KEY, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

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
  if(req.method !== 'GET') return res.status(405).end();
  if(!JWT_SECRET) return res.status(500).json({ error: 'jwt_secret_not_set' });
  const cookieHeader = req.headers.cookie || '';
  const cookies = parse(cookieHeader || '');
  const token = cookies.auth;
  if(!token){
    // In development allow a demo user so the frontend can work without real auth.
    if(process.env.NODE_ENV !== 'production'){
      return res.json({ ok: true, user: { id: 'usuario-demo', username: 'usuario-demo', displayName: 'Usuário Demo' } });
    }
    return res.status(401).json({ error: 'not_authenticated' });
  }

  let payload;
  try{ payload = jwt.verify(token, JWT_SECRET); }catch(e){ return res.status(401).json({ error: 'invalid_token' }); }

  const sub = payload.sub;
  if(!DB_HOST || !DB_USER || !DB_NAME) return res.status(500).json({ error: 'db_not_configured' });

  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  try{
    const cols = await findColumns(conn);
    const idCol = pickColumn(cols, ['id','account_id','uid','user_id','accountid','accountID']) || cols[0];
    const usernameCol = pickColumn(cols, ['username','account_name','name','user','login','email']);

    let row;
    if(typeof sub === 'number' || (/^\d+$/.test(String(sub)) && idCol)){
      const [rows] = await conn.query(`SELECT * FROM users WHERE ${idCol} = ? LIMIT 1`, [sub]);
      row = rows[0];
    } else if(usernameCol){
      const [rows] = await conn.query(`SELECT * FROM users WHERE ${usernameCol} = ? LIMIT 1`, [sub]);
      row = rows[0];
    }

    if(!row) return res.status(404).json({ error: 'user_not_found' });

    const displayCol = ['display_name','name','account_name','username','user'].find(c=>c in row);
    const emailCol = ['email','mail','username'].find(c=>c in row && c !== usernameCol);

    const safeUser = {
      id: row[idCol],
      username: row[usernameCol] || row[displayCol] || null,
      displayName: displayCol ? row[displayCol] : (row[usernameCol] || null),
    };
    if(emailCol) safeUser.email = row[emailCol];
    for(const f of ['created_at','created','created_on','criado_em']) if(f in row) safeUser.created = row[f];

    return res.json({ ok: true, user: safeUser });
  }catch(e){
    return res.status(500).json({ error: 'server_error', message: e.message });
  }finally{
    try{ await conn.end(); }catch{};
  }
}
