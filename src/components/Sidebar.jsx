import React from 'react';
import './PlayerSidebar.css';

export default function Sidebar() {
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
        <a className="menu-item">Doações</a>
        <a className="menu-item">Fazer uma doação</a>
        <a className="menu-item">Minhas doações</a>
        <a className="menu-item">Troca de classe</a>
      </nav>
    </aside>
  );
}
