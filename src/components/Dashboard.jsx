import React from 'react';
import styles from './Dashboard.module.css';

function HeroCard({title, value, variant}){
  const cls = variant === 'red' ? styles.heroRed : variant === 'orange' ? styles.heroOrange : variant === 'green' ? styles.heroGreen : styles.heroGray;
  return (
    <div className={`${styles.heroCard} ${cls}`}>
      <div className={styles.heroTitle}>{title}</div>
      <div className={styles.heroValue}>{value}</div>
      <div className={styles.heroLink}>Visualizar detalhes ➜</div>
    </div>
  );
}

export default function Dashboard(){
  return (
    <div className={styles.dashboardRoot}>
      <div className={styles.dashboardBanner}>
        <div className={styles.dashboardBannerLogo}>OMEGA</div>
      </div>

      <div style={{padding:'10px 6px', borderRadius:10, marginBottom:6}}>
        <div style={{fontSize:20, fontWeight:800}}>Olá! Bem-vindo ao painel do jogador.</div>
        <div style={{color:'var(--muted)', marginTop:6}}>Gerencie seus produtos, pagamentos e personagens aqui.</div>
      </div>

      <div className={styles.heroCards}>
        <HeroCard title="Doações feitas" value="R$ 4.334,00" variant="red" />
        <HeroCard title="Tickets" value="0" variant="orange" />
        <HeroCard title="Logs" value="21" variant="gray" />
        <HeroCard title="Personagens" value="1" variant="green" />
      </div>
    </div>
  );
}
