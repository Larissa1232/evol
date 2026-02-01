import React from 'react';
import {useEffect, useState} from 'react';
import styles from './ProductsGrid.module.css';
// import './PlayerPanel.css'; // Removed redundant CSS import

// Use relative API base so frontend requests the same origin
const API_BASE = '';

export default function ProductsGrid({cart = {}, onChangeQuantity = ()=>{}}){
  // start empty and load from DB via /api/products
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchProducts(){
    setLoading(true);
    setError(null);
    try{
      const r = await fetch(`${API_BASE}/api/products`);
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const mapped = data.map(p=>({
        id: p.id,
        title: p.title,
        usdt: Number(p.usdt),
        brl: Number(p.brl),
        image: p.image || null,
        ativo: Boolean(p.ativo),
        message: p.message || null,
        min: Number(p.min || 1),
        max: Number(p.max || 1),
        game_item_id: p.game_item_id || null,
        send_count: p.send_count || 1
      }));
      setProducts(mapped);
    }catch(err){
      console.warn('Could not load products from API', err);
      setError(err.message || String(err));
      setProducts([]);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{
    let mounted = true;
    fetchProducts();
    return ()=>{ mounted = false };
  },[]);
  function qtyFor(id){
    return cart[id]?.qty || 0;
  }

  function inc(p){
    const current = qtyFor(p.id);
    const next = Math.min(p.max || 99999, current + 1);
    onChangeQuantity(p.id, next, p);
  }

  function dec(p){
    const current = qtyFor(p.id);
    const next = Math.max(p.min || 0, current - 1);
    onChangeQuantity(p.id, next, p);
  }

  function onInputChange(p, e){
    let v = parseInt(e.target.value || 0, 10);
    if (isNaN(v)) v = 0;
    if (p.min != null) v = Math.max(Number(p.min), v);
    if (p.max != null) v = Math.min(Number(p.max), v);
    onChangeQuantity(p.id, v, p);
  }

  return (
    <div className={styles.productsPanel}>
      <div className={styles.productsGrid}>
        {loading && <div style={{gridColumn:'1/-1',color:'var(--muted)',padding:'12px'}}>Carregando produtos...</div>}
        {error && <div style={{gridColumn:'1/-1',color:'var(--danger)',padding:'12px',display:'flex',gap:8,alignItems:'center'}}>
          <div>Erro ao carregar produtos: {error}</div>
          <button className="btn-ghost" onClick={fetchProducts}>Tentar novamente</button>
        </div>}
        {products.filter(p=>p.ativo).map(p => {
          const qty = qtyFor(p.id);
          return (
            <div key={p.id} className={`${styles.productCard} ${qty>0? styles.productCardSelected : ''}`}>
              {qty>0 && <div className={styles.productCheck}>✓</div>}
              <div className={styles.productBadge}>{qty > 0 ? `x${qty}` : 'Novo'}</div>
              <div className={styles.productIcon}>
                {p.image ? <img src={p.image} alt={p.title} /> : '🏺'}
              </div>
              <div className={styles.productTitle}>{p.title}</div>
              <div className={styles.productPrices}>
                <span className="product-usdt" style={{color:'var(--accent-2)',fontWeight:700}}>USDT {p.usdt.toFixed(2)}</span>
                <span className="product-brl" style={{color:'var(--success)',fontWeight:700}}>R$ {p.brl.toFixed(2)}</span>
              </div>
              <div className={styles.productControls}>
                <button className={styles.qtyBtn} onClick={()=>dec(p)} disabled={qty <= (p.min || 0)}>-</button>
                <input className={styles.qtyInput} type="number" min={p.min || 0} max={p.max || ''} value={qty} onChange={(e)=>onInputChange(p,e)} />
                <button className={styles.qtyBtn} onClick={()=>inc(p)} disabled={qty >= (p.max || 99999)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
