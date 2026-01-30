import React from 'react';
import './PlayerPanel.css';

export default function CartSummary({cart = {}, onChangeQuantity = ()=>{}, onClear = ()=>{}}){
  const [method, setMethod] = React.useState('pix');
  const items = Object.values(cart);
  const subtotalUSDT = items.reduce((s,it)=>s + (Number(it.usdt||0) * it.qty), 0);
  const subtotalBRL = items.reduce((s,it)=>s + (Number(it.brl||0) * it.qty), 0);
  const fee = method === 'paypal' ? subtotalBRL * 0.06 : 0; // simulate paypal fee
  const totalBRL = subtotalBRL + fee;

  function pay(){
    if(items.length === 0){
      window.alert('Seu carrinho está vazio.');
      return;
    }
    // Simulated payment action
    window.alert(`Simulação de pagamento via ${method.toUpperCase()}\nTotal: R$ ${totalBRL.toFixed(2)}`);
  }

  return (
    <div className="cart-summary">
      <h3>Resumo do pedido</h3>
      {items.length === 0 ? (
        <div className="cart-empty">Seu carrinho está vazio.</div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items-col">
            <ul className="cart-items">
              {items.map(it=> (
                  <li key={it.id} className="cart-item">
                    <div className="cart-col cart-name">
                      <div className="cart-item-title">{it.title}</div>
                      <div className="cart-item-price"><span className="cs-usdt">USDT {(it.usdt*it.qty).toFixed(2)}</span> • <span className="cs-brl">R$ {(it.brl*it.qty).toFixed(2)}</span></div>
                    </div>

                    <div className="cart-col cart-qty-display">{it.qty}</div>

                    <div className="cart-col cart-controls">
                      <button className="cart-qty" onClick={()=>onChangeQuantity(it.id, Math.max(0, it.qty-1), it)}>-</button>
                      <button className="cart-qty" onClick={()=>onChangeQuantity(it.id, it.qty+1, it)}>+</button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>

          <div className="cart-right">
            <div className="cart-totals">
              <div>Subtotal USDT: <strong><span className="cs-usdt">{subtotalUSDT.toFixed(2)}</span></strong></div>
              <div>Subtotal BRL: <strong><span className="cs-brl">R$ {subtotalBRL.toFixed(2)}</span></strong></div>
              {fee > 0 && (
                <div className={`cart-fee ${method==='paypal' ? 'fee-paypal' : ''}`}>
                  Taxa ({method.toUpperCase()}): <strong><span className="cs-brl">R$ {fee.toFixed(2)}</span></strong>
                </div>
              )}
              <div className="cart-total-main">Total: <strong><span className="cs-brl">R$ {totalBRL.toFixed(2)}</span></strong></div>
            </div>

            <div className="payment-section">
              <div className="payment-methods">
                <div className={`method-card pix ${method==='pix'? 'method-selected':''}`} onClick={()=>setMethod('pix')}>
                  <div className="method-name">PIX</div>
                </div>
                <div className={`method-card binance ${method==='binance'? 'method-selected':''}`} onClick={()=>setMethod('binance')}>
                  <div className="method-name">Binance</div>
                </div>
                <div className={`method-card paypal ${method==='paypal'? 'method-selected':''}`} onClick={()=>setMethod('paypal')}>
                  <div className="method-name">PayPal</div>
                </div>
              </div>
            </div>

            <div className="cart-actions">
              <button className="btn-primary" onClick={pay} disabled={items.length===0}>Pagar</button>
              <button className="btn-ghost" onClick={onClear}>Limpar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
