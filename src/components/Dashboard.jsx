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
  const [charsCount, setCharsCount] = React.useState(null);
  const [donations, setDonations] = React.useState(null);
  React.useEffect(()=>{
    let mounted = true;
    async function load(){
      try{
        const meRes = await fetch('/api/auth/me');
        if(!meRes.ok) return;
        const me = await meRes.json();
        const uid = me?.user?.id;
        if(!uid) return;

        // fetch roles
        try{
          const r = await fetch(`/api/characters?username=${encodeURIComponent(uid)}`);
          if(r.ok){ const roles = await r.json(); if(mounted) setCharsCount(Array.isArray(roles)? roles.length: 0); }
        }catch(e){ console.warn('chars err', e); }

        // fetch transactions and sum valor
        try{
          const rt = await fetch(`/api/transacoes?user_id=${encodeURIComponent(uid)}`);
          if(rt.ok){ const tx = await rt.json(); const sum = (Array.isArray(tx) ? tx.reduce((s,t)=> s + Number(t.valor||0), 0) : 0); if(mounted) setDonations(sum); }
        }catch(e){ console.warn('transacoes err', e); }

      }catch(e){ console.warn('load dashboard data', e); }
    }
    load();
    return ()=>{ mounted = false };
  },[]);

  const fmtBRL = v => v == null ? '...' : (Number(v||0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

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
        <HeroCard title="Doações feitas" value={fmtBRL(donations)} variant="red" />
        <HeroCard title="Tickets" value="0" variant="orange" />
        <HeroCard title="Logs" value="21" variant="gray" />
        <HeroCard title="Personagens" value={charsCount === null ? '...' : String(charsCount)} variant="green" />
      </div>
    </div>
  );
}
