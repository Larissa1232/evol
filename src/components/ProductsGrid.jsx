import React from 'react';
import './PlayerPanel.css';

const PRODUCTS = [
  {id:1,title:'Pack 1$',usdt:0.20, brl:1.04},
  {id:2,title:'Pack 3$',usdt:2.55, brl:13.26},
  {id:3,title:'Pack 5$',usdt:4.25, brl:22.10},
  {id:4,title:'Pack 10$',usdt:7.50, brl:39.01},
  {id:5,title:'Pack 30$',usdt:22.50, brl:117.02},
  {id:6,title:'Pack 50$',usdt:39.00, brl:202.84},
];

export default function ProductsGrid({cart = {}, onChangeQuantity = ()=>{}}){
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
        {PRODUCTS.map(p => {
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
