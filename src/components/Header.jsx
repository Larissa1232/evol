import React from 'react';
import styles from './Header.module.css';

export default function Header(){
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{
    let mounted = true;
    fetch('/api/auth/me').then(r=>r.json()).then(j=>{
      if(!mounted) return;
      if(j && j.ok && j.user) setUser(j.user);
    }).catch(()=>{}).finally(()=>{ if(mounted) setLoading(false); });
    return ()=>{ mounted = false };
  },[]);

  async function handleLogout(){
    try{ await fetch('/api/auth/logout'); }catch(e){}
    window.location.href = '/login';
  }

  return (
    <header className={styles.headerRoot}>
      <div className={styles.headerBrand}>
        <div className={styles.headerLogo}>E</div>
        <div>
          <div className={styles.headerTitle}>Evol Panel</div>
          <div className={styles.headerSubtitle}>{user ? (user.displayName || user.username) : (loading ? 'Carregando...' : '')}</div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
      </div>
    </header>
  );
}
