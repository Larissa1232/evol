import mysql from 'mysql2/promise';

const {
  DB_HOST, DB_USER, DB_PASSWORD, DB_NAME,
} = process.env;

function validName(n){
  return /^[0-9a-zA-Z_-]+$/.test(n);
}

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).end();
  const { username, password, email } = req.body || {};
  if(!username || !password || !email) return res.status(400).json({ error: 'missing_fields' });

  const Login = String(username).trim().toLowerCase();
  const Pass = String(password).trim();
  const Email = String(email).trim();

  if(Login.length < 4 || Login.length > 10) return res.status(400).json({ error: 'username_length' });
  if(Pass.length < 4 || Pass.length > 10) return res.status(400).json({ error: 'password_length' });
  if(Email.length < 4 || Email.length > 255) return res.status(400).json({ error: 'email_length' });
  if(!validName(Login)) return res.status(400).json({ error: 'invalid_username_chars' });
  if(!validName(Pass)) return res.status(400).json({ error: 'invalid_password_chars' });
  if(Email.includes("'")) return res.status(400).json({ error: 'invalid_email_chars' });

  if(!DB_HOST || !DB_USER || !DB_NAME) return res.status(500).json({ error: 'db_not_configured' });

  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME });
  try{
    // compute salt as PHP did: 0x + md5(login+password)
    const crypto = await import('crypto');
    const md5 = crypto.createHash('md5').update(String(Login) + String(Pass)).digest('hex');
    const Salt = '0x' + md5;

    // try to call stored procedure adduser (common in legacy PHP apps)
    try{
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      const params = [Login, Salt, 0, 0, 0, ip, Email, 0,0,0,0,0,0,0, '', '', Salt];
      await conn.query('CALL adduser(' + params.map(()=>'?').join(',') + ')', params);
      return res.json({ ok: true, created: true, method: 'procedure' });
    }catch(procerr){
      // procedure not available or failed — fallback to INSERT into users
    }

    // fallback: find username/password columns
    const [colsRows] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
      [DB_NAME]
    );
    const cols = colsRows.map(r=>r.COLUMN_NAME);
    const usernameCol = ['username','account_name','name','user','login','email'].find(c=>cols.includes(c));
    const passwordCol = ['password','passwd','pass','pwd','senha','panel_passwd'].find(c=>cols.includes(c));
    const emailCol = ['email','mail'].find(c=>cols.includes(c));
    if(!usernameCol || !passwordCol) return res.status(500).json({ error: 'users_table_incompatible' });

    // check existing
    const [exists] = await conn.query(`SELECT 1 FROM users WHERE ${usernameCol} = ? LIMIT 1`, [Login]);
    if(exists.length) return res.status(409).json({ error: 'username_exists' });

    const insertCols = [usernameCol, passwordCol];
    const insertVals = [Login, Salt];
    if(emailCol){ insertCols.push(emailCol); insertVals.push(Email); }

    const q = `INSERT INTO users (${insertCols.map(c=>`\`${c}\``).join(',')}) VALUES (${insertCols.map(()=>'?').join(',')})`;
    await conn.query(q, insertVals);
    return res.json({ ok: true, created: true, method: 'insert' });
  }catch(e){
    return res.status(500).json({ error: 'server_error', message: e.message });
  }finally{
    try{ await conn.end(); }catch{};
  }
}
