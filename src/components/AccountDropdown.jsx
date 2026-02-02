import React from 'react';
import styles from './AccountDropdown.module.css';

export default function AccountDropdown(){
  const [open, setOpen] = React.useState(false);
  const [user, setUser] = React.useState(null);

  React.useEffect(()=>{
    let mounted = true;
    fetch('/api/auth/me').then(r=>r.json()).then(j=>{ if(!mounted) return; if(j && j.ok && j.user) setUser(j.user); }).catch(()=>{});
    return ()=>{ mounted=false };
  },[]);

  return (
    <div className={styles.dropdown} onMouseLeave={()=>setOpen(false)}>
      <button className={styles.trigger} onClick={()=>setOpen(s=>!s)}>{user?.name || 'Minha conta'}</button>
      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.item} onClick={()=>{ window.location.href='/profile'; }}>Editar perfil</div>
          <div className={styles.item} onClick={()=>{ window.location.href='/profile#password'; }}>Alterar senha</div>
          <div className={styles.sep} />
          <div className={styles.small}>Conectado como</div>
          <div className={styles.item} style={{fontWeight:800}}>{user?.name || user?.email || '-'}</div>
        </div>
      )}
    </div>
  );
}
