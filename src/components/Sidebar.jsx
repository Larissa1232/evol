import React, {useState} from 'react';
import './PlayerSidebar.css';

export default function Sidebar({onNavigate = ()=>{}}) {
  const [donationOpen, setDonationOpen] = useState(true);
  const [functionsOpen, setFunctionsOpen] = useState(false);

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
            <li><button className="submenu-item" onClick={() => onNavigate('donate')}>Fazer uma doação</button></li>
            <li><button className="submenu-item" onClick={() => onNavigate('transacoes')}>Minhas doações</button></li>
          </ul>
        </div>

        
        <div className="menu-item has-children">
          <button
            className="menu-link"
            onClick={() => setFunctionsOpen(v => !v)}
            aria-expanded={functionsOpen}
          >
            <span className="icon">⎈</span>
            <span className="label">Funções</span>
            <span className={`caret ${functionsOpen ? 'open' : ''}`}>
              ▾
            </span>
          </button>

          <ul className={`submenu ${functionsOpen ? 'open' : ''}`}>
            <li><a className="submenu-item">Resgate de Presentes</a></li>
            <li><a className="submenu-item">Logado Premiado</a></li>
            <li><a className="submenu-item">Folhas por Hora</a></li>

            <li className="submenu-section">EVENTOS</li>
            <li><a className="submenu-item">Resgate de Folhas</a></li>
          </ul>
        </div>
        <div className="menu-section"></div>
        <a className="menu-item">Minha conta</a>
      </nav>
    </aside>
  );
}
