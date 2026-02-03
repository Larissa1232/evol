import React, {useState, useEffect} from 'react';
import styles from './Sidebar.module.css';

export default function Sidebar({onNavigate = ()=>{}}) {
  const [donationOpen, setDonationOpen] = useState(true);
  const [accountOpen, setAccountOpen] = useState(false);
  const [votesOpen, setVotesOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(()=>{
    let mounted = true;
    fetch('/api/auth/me').then(r=>r.json()).then(j=>{
      if(!mounted) return;
      if(j && j.ok && j.user) setUser(j.user);
    }).catch(()=>{});
    return ()=>{ mounted = false };
  },[]);

  async function handleLogout(){
    try{ await fetch('/api/auth/logout'); }catch{};
    window.location.href = '/login';
  }

  return (
    <aside className={styles.sidebarRoot} role="complementary" aria-label="Sidebar">
      <div className={styles.profile}>
        <div className={styles.avatar}>{(user && (user.displayName || user.username) || 'L')[0]?.toUpperCase()}</div>
        <div style={{flex:1}}>
          <div className={styles.profileInfo}>
            <div className={styles.name}>{user ? (user.displayName || user.username) : 'Carregando...'}</div>
            <div className={styles.tag}>{user && user.email ? user.email : 'connected'}</div>
          </div>
          <div className={styles.profileActions}>
            <button className={`${styles.actionBtn} ${styles.donateBtn}`} onClick={()=>onNavigate('donate')}>Doar</button>
            <button className={`${styles.actionBtn} ${styles.exitBtn}`} onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </div>

      <nav className={styles.menu} role="navigation" aria-label="Main Navigation">
        <div className={styles.menuSection}>INÍCIO</div>
        <button className={`${styles.menuItem} ${styles.menuItemActive}`} onClick={()=>onNavigate('dashboard')} role="menuitem" aria-current="page">Dashboard</button>

        <div className={styles.menuSection}>PAINEL</div>

        <div className={styles.hasChildrenWrapper}>
          <button
            className={styles.menuLink}
            onClick={() => setDonationOpen(v => !v)}
            aria-expanded={donationOpen}
            aria-controls="submenu-donations"
            role="menuitem"
          >
            <span className={styles.icon}>♡</span>
            <span className={styles.label}>Doações</span>
            <span className={`${styles.caret} ${donationOpen ? styles.caretOpen : ''}`}>
              ▾
            </span>
          </button>

          <ul id="submenu-donations" className={`${styles.hasChildrenSubmenu} ${donationOpen ? styles.hasChildrenSubmenuOpen : ''}`} role="menu">
            <li><button className={styles.submenuItem} role="menuitem" onClick={() => onNavigate('donate')}>Fazer uma doação</button></li>
            <li><button className={styles.submenuItem} role="menuitem" onClick={() => onNavigate('transacoes')}>Minhas doações</button></li>
          </ul>
        </div>

        <div className={styles.hasChildrenWrapper}>
          <button
            className={styles.menuLink}
            onClick={() => setVotesOpen(v => !v)}
            aria-expanded={votesOpen}
            aria-controls="submenu-votes"
            role="menuitem"
          >
            <span className={styles.icon}>🗳️</span>
            <span className={styles.label}>Votos</span>
            <span className={`${styles.caret} ${votesOpen ? styles.caretOpen : ''}`}>▾</span>
          </button>

          <ul id="submenu-votes" className={`${styles.hasChildrenSubmenu} ${votesOpen ? styles.hasChildrenSubmenuOpen : ''}`} role="menu">
            <li><button className={styles.submenuItem} role="menuitem" onClick={() => onNavigate('votos-ranking')}>Ranking</button></li>
            <li><button className={styles.submenuItem} role="menuitem" onClick={() => onNavigate('votos-recompensa')}>Recompensa de Voto</button></li>
          </ul>
        </div>

        <div className={styles.hasChildrenWrapper}>
          <button
            className={styles.menuLink}
            onClick={() => setAccountOpen(v => !v)}
            aria-expanded={accountOpen}
            aria-controls="submenu-account"
            role="menuitem"
          >
            <span className={styles.icon}>👤</span>
            <span className={styles.label}>Minha Conta</span>
            <span className={`${styles.caret} ${accountOpen ? styles.caretOpen : ''}`}>▾</span>
          </button>

          <ul id="submenu-account" className={`${styles.hasChildrenSubmenu} ${accountOpen ? styles.hasChildrenSubmenuOpen : ''}`} role="menu">
            <li><button className={styles.submenuItem} role="menuitem" onClick={() => onNavigate('profile')}>Editar perfil</button></li>
            <li><button className={styles.submenuItem} role="menuitem" onClick={() => onNavigate('change-password')}>Alterar senha</button></li>
          </ul>
        </div>
      </nav>
    </aside>
  );
}
