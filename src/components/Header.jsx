import React from 'react';
import './PlayerPanel.css';

export default function Header() {
  return (
    <header className="header">
      <div className="logo">OMEGA</div>
      <div className="header-right">
        <button className="menu-btn">☰</button>
      </div>
    </header>
  );
}
