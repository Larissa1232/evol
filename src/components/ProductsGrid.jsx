import React from 'react';
import {useEffect, useState} from 'react';
import './PlayerPanel.css';
const STATIC_PRODUCTS = [
  {id:1,title:'Pack 1$',usdt:0.20, brl:1.04},
  {id:2,title:'Pack 3$',usdt:2.55, brl:13.26},
  {id:3,title:'Pack 5$',usdt:4.25, brl:22.10},
  {id:4,title:'Pack 10$',usdt:7.50, brl:39.01},
  {id:5,title:'Pack 30$',usdt:22.50, brl:117.02},
  {id:6,title:'Pack 50$',usdt:39.00, brl:202.84},
];

// Use relative API base so frontend requests the same origin
const API_BASE = '';

export default function ProductsGrid({cart = {}, onChangeQuantity = ()=>{}}){
  const [products, setProducts] = useState(STATIC_PRODUCTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchProducts(){
    setLoading(true);
    setError(null);
    try{
      const r = await fetch(`${API_BASE}/api/products`);
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const mapped = data.map(p=>({ id: p.id, title: p.title, usdt: Number(p.usdt), brl: Number(p.brl) }));
      setProducts(mapped);
    }catch(err){
      console.warn('Could not load products from API, using static list', err);
      setError(err.message || String(err));
      setProducts(STATIC_PRODUCTS);
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
    const next = qtyFor(p.id) + 1;
    onChangeQuantity(p.id, next, p);
  }

  function dec(p){
    const next = Math.max(0, qtyFor(p.id) - 1);
    onChangeQuantity(p.id, next, p);
  }

  function onInputChange(p, e){
    const v = parseInt(e.target.value || 0, 10);
    onChangeQuantity(p.id, isNaN(v)?0:v, p);
  }

  return (
    <div className="products-panel">
      <div className="products-grid">
        {loading && <div style={{gridColumn:'1/-1',color:'#9ca3af',padding:'12px'}}>Carregando produtos...</div>}
        {error && <div style={{gridColumn:'1/-1',color:'#fca5a5',padding:'12px',display:'flex',gap:8,alignItems:'center'}}>
          <div>Erro ao carregar produtos: {error}</div>
          <button className="btn-ghost" onClick={fetchProducts}>Tentar novamente</button>
        </div>}
        {products.map(p => {
          const qty = qtyFor(p.id);
          return (
            <div key={p.id} className={`product-card ${qty>0? 'selected':''}`}>
              {qty>0 && <div className="product-check">✓</div>}
              <div className="product-icon">🏺</div>
              <div className="product-title">{p.title}</div>
              <div className="product-usdt">USDT {p.usdt.toFixed(2)}</div>
              <div className="product-brl">R$ {p.brl.toFixed(2)}</div>
              <div className="product-controls">
                <button className="qty-btn" onClick={()=>dec(p)}>-</button>
                <input className="qty-input" type="number" min="0" value={qty} onChange={(e)=>onInputChange(p,e)} />
                <button className="qty-btn" onClick={()=>inc(p)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
