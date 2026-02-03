import React, { useEffect, useState } from 'react';
import styles from './Votes.module.css';

export default function Votes({ view = 'ranking' }){
  const [ranking, setRanking] = useState(view === 'ranking' ? 'top10' : 'top1');
  const [reward, setReward] = useState('coins');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    let mounted = true;
    async function load(){
      setLoading(true);
      try{
        // Example: fetch votes data (API may not exist in this repo)
        const url = `/api/votos?view=${encodeURIComponent(view)}&ranking=${encodeURIComponent(ranking)}&reward=${encodeURIComponent(reward)}`;
        const res = await fetch(url).catch(()=>null);
        if(!res || !res.ok){
          // fallback to empty
          if(mounted) setItems([]);
          return;
        }
        const data = await res.json();
        if(mounted) setItems(Array.isArray(data) ? data : (data.items || []));
      }catch(e){
        console.warn('votes load err', e);
      }finally{ if(mounted) setLoading(false); }
    }
    load();
    return ()=>{ mounted = false };
  },[view, ranking, reward]);

  // fallback reward items for the rewards view (useful when API is not available)
  const fallbackRewards = [
    { title: 'DH Hoodie', requiredVoteXP: 70 },
    { title: 'Cocolias Deception', requiredVoteXP: 150 },
    { title: 'Eden Genesis Outfit', requiredVoteXP: 450 },
    { title: 'Valkoinen', requiredVoteXP: 750 },
    { title: 'Svarog', requiredVoteXP: 1050 },
    { title: "Jing Yuans Legacy Wings", requiredVoteXP: 1500 },
    { title: 'Stygian Tails', requiredVoteXP: 1800 }
  ];

  return (
    <div className="table-wrap" style={{marginTop: 32}}>
      <h2 className="section-title">Votos — {view === 'ranking' ? 'Ranking' : 'Recompensa de Voto'}</h2>

      {null}

      {view === 'reward' ? (
        <div className={styles.grid}>
          {(items && items.length > 0 ? items : fallbackRewards).map((it, idx) => {
            const percent = it.progressPercent ?? 0;
            return (
              <div key={idx} className={styles.card}>
                <div>
                  <div className={styles.cardTitle}>{it.title}</div>
                  <div className={styles.cardMeta}>Required Vote XP: {it.requiredVoteXP ?? it.requiredVote ?? '—'}</div>
                  <div className={styles.small}>{percent}%</div>
                  <div className={styles.progressWrap} aria-hidden>
                    <div className={styles.progressFill} style={{width: `${percent}%`}} />
                  </div>
                </div>
                <div>
                  <button className={styles.infoBtn}>Info! Pending stage!</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{overflowX:'auto'}}>
          <table className="chars-table" style={{minWidth:600}}>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Pontos</th>
                <th>Recompensa</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{padding:24}}>Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} style={{textAlign:'center',color:'#9ca3af',padding:32}}>Sem votos encontrados.</td></tr>
              ) : (
                items.map((it, idx) => (
                  <tr key={idx}>
                    <td>{it.user || it.usuario || it.username || '—'}</td>
                    <td>{it.points ?? it.pontos ?? '—'}</td>
                    <td>{it.reward || reward}</td>
                    <td>{it.date ? new Date(it.date).toLocaleString() : (it.criado_em ? new Date(it.criado_em).toLocaleString() : '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
