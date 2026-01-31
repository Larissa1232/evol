import React, {useState, useEffect} from 'react';

export default function Sidebar({onNavigate = ()=>{}}) {
  const [donationOpen, setDonationOpen] = useState(true);
  const [functionsOpen, setFunctionsOpen] = useState(false);
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
    <aside className="sidebar">
      <div className="profile">
        <div className="avatar">{(user && (user.displayName || user.username) || 'L')[0]?.toUpperCase()}</div>
        <div className="profile-info">
          <div className="name">{user ? (user.displayName || user.username) : 'Carregando...'}</div>
          <div className="tag">{user && user.email ? user.email : 'connected'}</div>
        </div>
        <div style={{marginLeft:'auto'}}>
          <button onClick={handleLogout} title="Logout" style={{background:'transparent',border:'none',color:'rgba(230,238,248,0.8)',cursor:'pointer'}}>⎋</button>
        </div>
      </div>

      <nav className="menu">
        <div className="menu-section">INÍCIO</div>
        <button className="menu-item active" onClick={()=>onNavigate('dashboard')}>Dashboard</button>

        <div className="menu-section">PAINEL</div>

        <div className="menu-item has-children">
          <button
            className="menu-link"
            onClick={() => setDonationOpen(v => !v)}
            aria-expanded={donationOpen}
          >
            <span className="icon">♡</span>
            <span className="label">Doações</span>
            <span className={`caret ${donationOpen ? 'open' : ''}`}>
              ▾
            </span>
          </button>

          <ul className={`submenu ${donationOpen ? 'open' : ''}`}>
            <li><button className="submenu-item" onClick={() => onNavigate('donate')}>Fazer uma doação</button></li>
            <li><button className="submenu-item" onClick={() => onNavigate('transacoes')}>Minhas doações</button></li>
          </ul>
        </div>

        {/* Removed 'Funções' submenu per request */}
        <div className="menu-section"></div>
        <button className="menu-item" onClick={()=>onNavigate('minha-conta')}>Minha conta</button>
      </nav>
    </aside>
  );
}
