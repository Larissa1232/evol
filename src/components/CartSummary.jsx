import React from 'react';
import PixQRCodeModal from './PixQRCodeModal';

export default function CartSummary({cart = {}, onChangeQuantity = ()=>{}, onClear = ()=>{}, onOpenProducts = ()=>{}}){
  const [method, setMethod] = React.useState('pix');
  const [chars, setChars] = React.useState([]);
  const [charsLoading, setCharsLoading] = React.useState(false);
  const [charsError, setCharsError] = React.useState(null);
  const [rawCharsResponse, setRawCharsResponse] = React.useState(null);
  const [showRawCharsResponse, setShowRawCharsResponse] = React.useState(false);
  const [selectedCharId, setSelectedCharId] = React.useState('');
  const [selectedCharName, setSelectedCharName] = React.useState('');
  const [userId, setUserId] = React.useState(null);
  const items = Object.values(cart);
  const subtotalUSDT = items.reduce((s,it)=>s + (Number(it.usdt||0) * it.qty), 0);
  const subtotalBRL = items.reduce((s,it)=>s + (Number(it.brl||0) * it.qty), 0);
  const fee = method === 'paypal' ? subtotalBRL * 0.06 : 0; // simulate paypal fee
  const totalBRL = subtotalBRL + fee;

  const [showPix, setShowPix] = React.useState(false);
  const [pixTxid, setPixTxid] = React.useState(null);
  const [saving, setSaving] = React.useState(false);

  // Fetch characters for current user via game PHP proxy
  React.useEffect(()=>{
    let mounted = true;
    async function loadChars(){
      setCharsLoading(true);
      setCharsError(null);
      try{
        const meRes = await fetch('/api/auth/me');
        if(!meRes.ok) throw new Error('not_authenticated');
        const me = await meRes.json();
        const id = me.user?.id;
        if(mounted) setUserId(id);
        if(!id) throw new Error('user_id_not_found');

        // helper that tries fetching and returns parsed data or throws
        const tryFetch = async (paramName, viaPhp=false) => {
          const base = viaPhp ? '/api/php' : '/api/game/get_chars';
          const url = viaPhp
            ? `${base}?action=get_chars&${paramName}=${encodeURIComponent(id)}`
            : `${base}?${paramName}=${encodeURIComponent(id)}`;
          const res = await fetch(url, { cache: 'no-store' }); // avoid 304 cached empty body
          // treat 204/304 as empty list
          const status = res.status;
          const text = await res.text().catch(()=>null);
          // save last raw response for debugging
          if(text) setRawCharsResponse(`${status} — ${url}\n\n${text}`);
          if (status === 204 || status === 304) return [];
          if(!res.ok) throw new Error(`${url} -> ${status} ${text || ''}`);

          // no content
          if(!text) return [];

          // try JSON
          try { return JSON.parse(text); } catch(e){}

          // common fallback formats: newline-separated names or comma-separated
          if(typeof text === 'string'){
            const lines = text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            if(lines.length > 1) return lines;
            const parts = text.split(/,|;/).map(s=>s.trim()).filter(Boolean);
            if(parts.length > 1) return parts;
          }

          // otherwise return raw text
          return text;
        };

        const paramCandidates = ['username','name','account_id','accountid','id','uid','account','user'];
        let data = null;
        let lastErr = null;
        for(const p of paramCandidates){
          try{
            data = await tryFetch(p, false);
            if(data) break;
          }catch(e){ lastErr = e; console.warn('tryFetch /api/game failed for', p, e.message); }
        }
        // if still nothing, try via /api/php proxy (some setups expect action param)
        if((data === null || (Array.isArray(data) && data.length===0) || data === '') ){ 
          for(const p of paramCandidates){
            try{
              data = await tryFetch(p, true);
              if(data) break;
            }catch(e){ lastErr = e; console.warn('tryFetch /api/php failed for', p, e.message); }
          }
        }
        if(!data || (Array.isArray(data) && data.length===0)){
          throw new Error('could_not_fetch_chars: no data or empty result' + (lastErr? ' - lastErr:'+String(lastErr.message||lastErr):''));
        }

        // normalize to an array of items (strings or objects)
        const rawList = Array.isArray(data) ? data : (data?.chars || data || []);
        let listArr = [];
        if (Array.isArray(rawList)) {
          // ensure each array element is normalized to a string when possible
          listArr = rawList.map(v => {
            if (typeof v === 'string') return v;
            if (v == null) return '';
            if (v.rolename) return v.rolename;
            if (v.role_name) return v.role_name;
            if (v.roleName) return v.roleName;
            if (v.name) return v.name;
            if (v.displayName) return v.displayName;
            const nested = Object.values(v).find(x => typeof x === 'string');
            return nested || JSON.stringify(v);
          });
        } else if (typeof rawList === 'string') {
          // if string looks like JSON, try parsing it (handles '[{...}]')
          try {
            const parsed = JSON.parse(rawList);
            if (Array.isArray(parsed)) {
              listArr = parsed.map(v => {
                if (typeof v === 'string') return v;
                if (v == null) return '';
                if (v.rolename) return v.rolename;
                if (v.role_name) return v.role_name;
                if (v.roleName) return v.roleName;
                if (v.name) return v.name;
                if (v.displayName) return v.displayName;
                const nested = Object.values(v).find(x => typeof x === 'string');
                return nested || JSON.stringify(v);
              });
            } else if (parsed && typeof parsed === 'object') {
              const vals = Object.values(parsed);
              listArr = vals.map(v => typeof v === 'string' ? v : (v?.rolename || v?.name || JSON.stringify(v)));
            } else {
              listArr = parsed ? [String(parsed)] : [];
            }
          } catch(e) {
            // not JSON — split by newline or commas
            const lines = rawList.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            if(lines.length > 1) listArr = lines;
            else {
              const parts = rawList.split(/,|;/).map(s=>s.trim()).filter(Boolean);
              if(parts.length > 1) listArr = parts;
              else listArr = rawList ? [rawList] : [];
            }
          }
        } else if (rawList && typeof rawList === 'object') {
          // object map -> take values
          const vals = Object.values(rawList);
          listArr = vals.map(v => {
            if (typeof v === 'string') return v;
            if (v == null) return '';
            // try common name keys
            if (v.rolename) return v.rolename;
            if (v.role_name) return v.role_name;
            if (v.roleName) return v.roleName;
            if (v.name) return v.name;
            if (v.displayName) return v.displayName;
            // if object has nested name property
            const nested = Object.values(v).find(x => typeof x === 'string');
            return nested || JSON.stringify(v);
          });
        } else {
          listArr = rawList ? [rawList] : [];
        }

        // handle edge case: one element that's a JSON-array string (e.g. '[{...}]')
        if (listArr.length === 1 && typeof listArr[0] === 'string' && listArr[0].trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(listArr[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              listArr = parsed.map(v => {
                if (typeof v === 'string') return v;
                if (v == null) return '';
                if (v.rolename) return v.rolename;
                if (v.role_name) return v.role_name;
                if (v.roleName) return v.roleName;
                if (v.name) return v.name;
                if (v.displayName) return v.displayName;
                const nested = Object.values(v).find(x => typeof x === 'string');
                return nested || JSON.stringify(v);
              });
            }
          } catch (e) {
            // ignore parse errors
          }
        }

        if(mounted) setChars(listArr.map(c => {
          if (typeof c === 'string') return { id: '', name: c };
          const id = c.roleid || c.id || c.uid || c.account_id || '';
          const name = c.rolename || c.role_name || c.roleName || c.name || c.displayName || String(id) || '';
          return { id, name };
        }));
      }catch(err){
        console.error('loadChars error:', err);
        if(mounted) setCharsError(String(err.message || err));
        // ensure we keep any raw response captured
        if(!rawCharsResponse){
          setRawCharsResponse(String(err.message || err));
        }
      }finally{ if(mounted) setCharsLoading(false); }
    }
    loadChars();
    return ()=>{ mounted = false };
  },[]);

  async function pay(){
    if(items.length === 0){
      window.alert('Seu carrinho está vazio.');
      return;
    }
    if(!selectedCharId){
      window.alert('Selecione um personagem antes de pagar.');
      return;
    }
    if(method === 'pix') {
      setSaving(true);
      setPixTxid(null);
      // Salva o carrinho antes de abrir o Pix
      try {
        const res = await fetch('/api/carrinho', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'usuario-demo',
            produtos: items,
            total_usd: subtotalUSDT,
            total_brl: totalBRL,
            personagem: selectedCharName || null
          })
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setPixTxid(data.id);
        setShowPix(true);
          try{
            const sendResults = [];
            for(const it of items){
              const itemId = it.game_item_id || it.itemId || it.id;
              const count = (it.send_count || 1) * (it.qty || 1);
              const message = it.message || (`Compra: ${it.title}`);
              const payload = { char: selectedCharId, item: itemId, count, title: 'donate', message };
              const r = await fetch('/api/send_item_donate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const txt = await r.text().catch(()=>null);
              sendResults.push({ itemId, count, status: r.status, body: txt });
            }
            console.log('send_item_donate results', sendResults);
          }catch(e){ console.warn('send_item_donate error', e); }
      } catch (err) {
        window.alert('Erro ao salvar carrinho: ' + (err.message || err));
      } finally {
        setSaving(false);
      }
      return;
    }
    window.alert(`Simulação de pagamento via ${method.toUpperCase()}\nTotal: R$ ${totalBRL.toFixed(2)}`);
  }

  return (
    <div className="cart-summary">
          <PixQRCodeModal
        open={showPix}
        onClose={()=>setShowPix(false)}
        value={totalBRL}
        userId={userId || "usuario-demo"}
        txid={pixTxid}
        description={`Pagamento de produtos${selectedCharName ? ' — ' + selectedCharName : ''}`}
      />
      <h3 className="cart-summary-title">🛒 Resumo do pedido</h3>
      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:8}}>
        <label style={{fontSize:13,color:'var(--muted)'}}>Selecionar personagem:</label>
        {charsLoading ? (
          <div style={{color:'#9ca3af'}}>Carregando...</div>
        ) : charsError ? (
          <div style={{color:'#fca5a5',display:'flex',flexDirection:'column',gap:8}}>
            <div>Erro ao carregar personagens: {charsError}</div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-ghost" onClick={()=>{ setShowRawCharsResponse(v=>!v); }}>Ver resposta</button>
              <button className="btn-ghost" onClick={()=>{ setRawCharsResponse(null); setCharsError(null); setChars([]); }}>Tentar novamente</button>
            </div>
            {showRawCharsResponse && rawCharsResponse && (
              <pre style={{whiteSpace:'pre-wrap',background:'#071025',color:'#cbd5e1',padding:12,borderRadius:8,marginTop:8,maxHeight:240,overflow:'auto'}}>{rawCharsResponse}</pre>
            )}
          </div>
        ) : (
          <select
            value={selectedCharId}
            onChange={e=>{
              const val = e.target.value;
              const opt = chars.find(c=>String(c.id) === String(val) || c.name === val);
              setSelectedCharId(val);
              setSelectedCharName(opt ? opt.name : val);
              if(val) onOpenProducts({ id: val, name: opt ? opt.name : val });
            }}
            style={{padding:8,borderRadius:8,background:'#0f1726',color:'#fff',border:'1px solid rgba(255,255,255,0.03)'}}
          >
            <option value="">-- Nenhum --</option>
            {chars.map((c,idx)=> (
              <option key={idx} value={c.id || c.name}>{c.name}</option>
            ))}
          </select>
        )}
      </div>
      {!selectedCharId ? (
        <div style={{color:'#9ca3af',padding:12}}>Selecione um personagem para ver o resumo e finalizar a compra.</div>
      ) : (
        items.length === 0 ? (
          <div className="cart-empty">Seu carrinho está vazio.</div>
        ) : (
          <div className="cart-grid">
          <div className="cart-items-col">
            <ul className="cart-items">
              {items.map(it=> (
                  <li key={it.id} className={`cart-item cart-item-anim`}>
                    <div className="cart-col cart-name">
                      <div className="cart-item-title">
                        <span className="cart-item-icon" title="Produto">🏺</span>
                        {it.title}
                        <span className="cart-badge">x{it.qty}</span>
                      </div>
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
            <div className="cart-items-separator"></div>
          </div>

          <div className="cart-right">
            <div className="cart-totals">
              <div>Subtotal USDT: <strong><span className="cs-usdt" title="Total em USDT">{subtotalUSDT.toFixed(2)}</span></strong></div>
              <div>Subtotal BRL: <strong><span className="cs-brl" title="Total em reais">R$ {subtotalBRL.toFixed(2)}</span></strong></div>
              {fee > 0 && (
                <div className={`cart-fee ${method==='paypal' ? 'fee-paypal' : ''}`}>Taxa ({method.toUpperCase()}): <strong><span className="cs-brl">R$ {fee.toFixed(2)}</span></strong></div>
              )}
              <div className="cart-total-main" title="Valor final do pedido">Total: <strong><span className="cs-brl">R$ {totalBRL.toFixed(2)}</span></strong></div>
            </div>

            <div className="payment-section">
              <div className="payment-methods">
                <div className={`method-card pix ${method==='pix'? 'method-selected':''}`} onClick={()=>setMethod('pix')}>
                  <div className="method-name">PIX</div>
                  <span className="method-tooltip">Pagamento instantâneo</span>
                </div>
                <div className={`method-card binance ${method==='binance'? 'method-selected':''}`} onClick={()=>setMethod('binance')}>
                  <div className="method-name">Binance</div>
                  <span className="method-tooltip">Cripto via Binance</span>
                </div>
                <div className={`method-card paypal ${method==='paypal'? 'method-selected':''}`} onClick={()=>setMethod('paypal')}>
                  <div className="method-name">PayPal</div>
                  <span className="method-tooltip">Cartão ou saldo PayPal</span>
                </div>
              </div>
            </div>

            <div className="cart-actions">
              <button className="btn-primary" onClick={pay} disabled={items.length===0 || saving}>{saving ? 'Salvando...' : 'Pagar'}</button>
              <button className="btn-ghost" onClick={onClear}>Limpar</button>
            </div>
          </div>
          </div>
        ) )}
    </div>
  );
}
