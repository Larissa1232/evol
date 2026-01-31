import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/login.module.css';

export default function LoginPage(){
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState(null);
  const [loading,setLoading]=useState(false);
  const [showPwd,setShowPwd]=useState(false);
  const [remember,setRemember]=useState(false);
  const router = useRouter();

  async function submit(e){
    e.preventDefault();
    setError(null);
    setLoading(true);
    try{
      // client-side validation
      if(!username || !password){ setError('Preencha usuário e senha'); setLoading(false); return; }
      const r = await fetch('/api/auth/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
      if(r.ok){ router.push('/'); return; }
      const j = await r.json(); setError(j.error || 'Falha no login');
    }catch(e){ setError('Erro de rede'); }
    finally{ setLoading(false); }
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.card} role="main">
        <div className={styles.brand}>
          <div className={styles.logoCircle}>L</div>
          <div>
            <div className={styles.brandTitle}>Evol Panel</div>
            <div className={styles.brandSub}>Painel de Gerenciamento</div>
          </div>
        </div>

        <div className={styles.hint}>Entre com sua conta para acessar o painel.</div>

        <form className={styles.form} onSubmit={submit} aria-live="polite">
          <div className={styles.inputWrap}>
            <input className={styles.input} placeholder="Usuário" value={username} onChange={e=>setUsername(e.target.value)} aria-label="Usuário" required />
          </div>

          <div className={styles.inputWrap}>
            <input className={styles.input} type={showPwd ? 'text' : 'password'} placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} aria-label="Senha" required minLength={3} />
            <button type="button" className={styles.showToggle} onClick={()=>setShowPwd(s=>!s)} aria-pressed={showPwd} aria-label={showPwd ? 'Esconder senha' : 'Mostrar senha'}>
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>

          <div className={styles.row} style={{justifyContent:'space-between'}}>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} /> Lembrar
            </label>
            <button type="button" className={styles.secondary} onClick={()=>{ setUsername(''); setPassword(''); setError(null); }}>Limpar</button>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>{loading ? 'Acessando...' : 'Entrar'}</button>
          </div>

          {error && <div className={styles.error} role="alert">{error}</div>}
        </form>

        <div className={styles.footer}>
          Não tem conta? <span className={styles.smallLink}>Contate o administrador</span>
        </div>
      </div>
    </div>
  );
}
