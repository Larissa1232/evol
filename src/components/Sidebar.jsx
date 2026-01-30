import React, {useState} from 'react';
import './PlayerSidebar.css';

export default function Sidebar() {
  const [donationOpen, setDonationOpen] = useState(true);

  return (
    <aside className="sidebar">
      <div className="profile">
        <div className="avatar">L</div>
        <div className="profile-info">
          <div className="name">Larissa</div>
          <div className="tag">hime11#4736</div>
        </div>
      </div>

      <nav className="menu">
        <div className="menu-section">INÍCIO</div>
        <a className="menu-item active">Dashboard</a>

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
            <li><a className="submenu-item">Fazer uma doação</a></li>
            <li><a className="submenu-item">Minhas doações</a></li>
          </ul>
        </div>

        <a className="menu-item">Loja de Pontos</a>
        <a className="menu-item">Funções</a>
      </nav>
    </aside>
  );
}
