import React from 'react';
import styles from './CharactersTable.module.css';

import cls1 from '../assets/class/1.png';
import cls2 from '../assets/class/2.png';
import cls3 from '../assets/class/3.png';
import cls4 from '../assets/class/4.png';
import cls5 from '../assets/class/5.png';
import cls6 from '../assets/class/6.png';
import cls7 from '../assets/class/7.png';
import cls8 from '../assets/class/8.png';
import cls9 from '../assets/class/9.png';
import cls10 from '../assets/class/10.png';
import cls11 from '../assets/class/11.png';
import cls12 from '../assets/class/12.png';
import cls13 from '../assets/class/13.png';
import cls14 from '../assets/class/14.png';
import cls15 from '../assets/class/15.png';
import defaultClass from '../assets/class/arch.png';

export default function CharactersTable(){
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [error, setError] = React.useState(null);
  const [expanded, setExpanded] = React.useState(null);

  React.useEffect(()=>{
    let mounted = true;
    async function load(){
      setLoading(true);
      setError(null);
      try{
        const meRes = await fetch('/api/auth/me');
        if(!meRes.ok) throw new Error('not_authenticated');
        const me = await meRes.json();
        const uid = me.user?.id;
        if(!uid) throw new Error('user_id_not_found');

        const r = await fetch(`/api/characters?username=${encodeURIComponent(uid)}`);
        if(!r.ok) throw new Error('could_not_fetch_roles');
        const roles = await r.json();

        // fetch details for each role in parallel
        const details = await Promise.all(roles.map(async (role) => {
          try{
            const rr = await fetch(`/api/characters?char=${encodeURIComponent(role.id)}`);
            if(!rr.ok) return null;
            const info = await rr.json();
            return info;
          }catch(e){ return null; }
        }));

        const mapped = details.filter(Boolean).map(d => ({
          id: d.roleid ?? d.id ?? d.roleId ?? '',
          name: d.rolename || d.name || '',
          level: d.level ?? d.Level ?? '',
          sex: d.sex || d.gender || d.gender_label || '',
          classe: d.occupation || d.occupation_name || '',
          raca: d.race || '',
          raw: d
        }));

        if(mounted) setRows(mapped);
      }catch(err){
        console.error('chars load error', err);
        if(mounted) setError(String(err.message || err));
      }finally{ if(mounted) setLoading(false); }
    }
    load();
    return ()=>{ mounted = false };
  },[]);

  const ATTRS = [
    { label: 'Health', keys: ['hp','HP','health','hp_current','hp_max','hp_full'] },
    { label: 'Mana', keys: ['sp','SP','mp','MP','mana'] },
    { label: 'Attack', keys: ['atk','attack','ATK'] },
    { label: 'Defense', keys: ['def','defense','DEF'] },
    { label: 'Accuracy', keys: ['acc','accuracy'] },
    { label: 'Evasion', keys: ['eva','evasion'] },
    { label: 'Block', keys: ['block','blk'] },
    { label: 'Block Strength', keys: ['block_strength','blk_strength','blockstr','block_str'] },
    { label: 'Crit Chance', keys: ['cc','crit_chance','critChance'] },
    { label: 'Crit Dodge', keys: ['cdoge','crit_dodge','critDodge'] },
    { label: 'Crit Damage', keys: ['cdmg','crit_damage','critDmg','critDamage'] },
    { label: 'Crit Defense', keys: ['cdef','crit_defense','critDef'] }
  ];

  function getAttr(raw, keys){
    if(!raw) return '-';
    for(const k of keys){
      if(typeof raw[k] !== 'undefined' && raw[k] !== null && String(raw[k]) !== '') return raw[k];
    }
    return '-';
  }

  const CLASS_MAP = {
    '1': cls1,
    '2': cls2,
    '3': cls3,
    '4': cls4,
    '5': cls5,
    '6': cls6,
    '7': cls7,
    '8': cls8,
    '9': cls9,
    '10': cls10,
    '11': cls11,
    '12': cls12,
    '13': cls13,
    '14': cls14,
    '15': cls15
  };

  const RACE_MAP = {
    '1': 'Human',
    '2': 'Elf',
    '3': 'Dwarf',
    '4': 'Stoneman',
    '5': 'Kindred',
    '6': 'Lcan',
    '7': 'Demon'
  };

  return (
    <div className={styles.tableWrap}>
      <div className={styles.tableControls}>
        <div className={styles.rowsSelect}>{rows.length || 0} <span>results</span></div>
        <div className={styles.search}><label style={{color:'#9ca3af'}}>Pesquisar</label><input placeholder="Pesquise aqui..." /></div>
      </div>
      <table className={styles.charsTable}>
        <thead>
          <tr>
            <th>NOME</th>
            <th>LEVEL</th>
            <th>SEXO</th>
            <th>CLASSE</th>
            <th>RAÇA</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={5} className={styles.loadingRow}>Carregando personagens...</td></tr>
          ) : error ? (
            <tr><td colSpan={5} style={{color:'#fca5a5'}}>Erro: {error}</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={5} className={styles.emptyRow}>Nenhum personagem encontrado.</td></tr>
          ) : (
            rows.map((r,idx)=> (
              <React.Fragment key={r.id || idx}>
                <tr className={styles.rowClickable} onClick={() => setExpanded(expanded === (r.id||idx) ? null : (r.id||idx))}>
                  <td>{r.name}</td>
                  <td>{r.level}</td>
                  <td>{r.sex || '-'}</td>
                  <td className={styles.classCell}>
                    {(() => {
                      let imgSrc = CLASS_MAP[String(r.classe)] || defaultClass;
                      // handle possible module shapes from bundler: { default: '/_next/..' } or { src: '/_next/..' }
                      if(imgSrc && typeof imgSrc === 'object'){
                        imgSrc = imgSrc.default || imgSrc.src || imgSrc.url || '';
                      }
                      // final fallback to public/class/<id>.png if nothing resolved
                      if(!imgSrc){
                        imgSrc = `/class/${String(r.classe)}.png`;
                      }
                      return (
                        <img
                          src={imgSrc}
                          className={styles.classIcon}
                          alt={`class-${r.classe}`}
                          onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = defaultClass; }}
                        />
                      );
                    })()}
                  </td>
                  <td>{RACE_MAP[String(r.raca)] || r.raca || '-'}</td>
                </tr>
                {expanded === (r.id||idx) && (
                  <tr>
                    <td colSpan={5} className={styles.detailPanel}>
                      <div className={styles.detailGrid}>
                        <div className={styles.attrBox}>
                          <div className={styles.attrHeader}>
                            <div className={styles.attrTitle}>Basic Attributes</div>
                            <div className={styles.attrScore}>{r.raw?.attributes_score ?? r.raw?.score ?? r.raw?.basic_attributes_score ?? '-'}</div>
                          </div>

                          <div className={styles.attrTable}>
                            {ATTRS.map((a) => (
                              <div className={styles.attrItem} key={a.label}>
                                <div className={styles.attrLabel}>{a.label}</div>
                                <div className={styles.attrValue + (a.label.length>10 ? ' ' + styles.small : '')}>{getAttr(r.raw, a.keys)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
