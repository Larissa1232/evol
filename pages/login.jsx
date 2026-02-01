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
      if(!username || !password){ setError('Preencha usuário e senha'); setLoading(false); return; }
      const r = await fetch('/api/auth/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
      if(r.ok){ router.push('/'); return; }
      const j = await r.json(); setError(j.error || 'Falha no login');
    }catch(e){ setError('Erro de rede'); }
    finally{ setLoading(false); }
  }

  return (
    <div className={styles.loginWrap}>
      <div className={styles.layout}>
        <aside className={styles.hero} aria-hidden>
          <div className={styles.heroSmall}>FORSAKEN WORLD</div>
          <div className={styles.heroMain}>Dragon Storm</div>
        </aside>

        <div className={styles.card} role="main">
        <h1 className={styles.title}>Acesse</h1>
        <div className={styles.subline}>Não é membro? <span className={styles.linkAction}>crie uma conta</span></div>

        <form className={styles.form} onSubmit={submit} aria-live="polite">
          <label className={styles.fieldLabel}>LOGIN</label>
          <div className={styles.inputWrap}>
            <input className={styles.input} placeholder="" value={username} onChange={e=>setUsername(e.target.value)} aria-label="Usuário" required />
          </div>

          <label className={styles.fieldLabel}>SENHA</label>
          <div className={styles.inputWrap}>
            <input className={styles.input} type={showPwd ? 'text' : 'password'} placeholder="" value={password} onChange={e=>setPassword(e.target.value)} aria-label="Senha" required minLength={3} />
            <button type="button" className={styles.showToggle} onClick={()=>setShowPwd(s=>!s)} aria-pressed={showPwd} aria-label={showPwd ? 'Esconder senha' : 'Mostrar senha'}>
              {showPwd ? '🙈' : '👁️'}
            </button>
          </div>

          <div className={styles.row}>
            <label className={styles.toggle}>
              <input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
              <span className={styles.switch} aria-hidden />
              <span className={styles.toggleLabel}>LEMBRAR CREDENCIAIS</span>
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>{loading ? 'Acessando...' : 'ENTRAR'}</button>
          </div>

          {error && <div className={styles.error} role="alert">{error}</div>}
        </form>

        <div className={styles.footerLinks}>
          <a className={styles.smallLink}>Esqueceu sua senha?</a>
          <a className={styles.smallLink}>Reenviar email de ativação</a>
        </div>
        </div>
      </div>
    </div>
  );
}
