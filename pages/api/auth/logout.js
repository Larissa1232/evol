import { serialize } from 'cookie';
export default function handler(req, res){
  res.setHeader('Set-Cookie', serialize('auth','', { httpOnly: true, path: '/', expires: new Date(0) }));
  res.json({ ok: true });
}
