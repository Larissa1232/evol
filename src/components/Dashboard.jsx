import React from 'react';
import './PlayerPanel.css';

function Card({title, value, color}){
  return (
    <div className="card" style={{background: color}}>
      <div className="card-title">{title}</div>
      <div className="card-value">{value}</div>
      <div className="card-link">Visualizar detalhes</div>
    </div>
  );
}

export default function Dashboard(){
  return (
    <div className="dashboard">
      <Card title="DOAÇÕES FEITAS" value="R$ 0,00" color="#e74c3c" />
      <Card title="TICKETS" value="0" color="#f39c12" />
      <Card title="LOGS" value="6" color="#4b5563" />
      <Card title="PERSONAGENS" value="1" color="#10b981" />
    </div>
  );
}
