import React, { useState } from 'react';
import { FaRegCopy } from 'react-icons/fa';

export default function PixQRCodeModal({ open, onClose, value, userId, txid, description }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    if (open && value && userId) {
      setLoading(true);
      setError(null);
      setQrData(null);
      fetch('/api/pix/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(Number(value) * 100), reference: txid || userId, description })
      })
        .then(async (r) => {
          const txt = await r.text().catch(() => '');
          let data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) {
            // server returned non-JSON (likely HTML) — surface the body as error
            throw new Error(txt || 'Invalid response from server');
          }
          if (!r.ok) {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : JSON.stringify(data);
            throw new Error(msg || 'Server error');
          }
          // prefer normalized `data` returned by the API, otherwise fall back
          return data?.data || data || null;
        })
        .then((data) => setQrData(data))
        .catch((err) => setError(err.message || String(err)))
        .finally(() => setLoading(false));
    }
  }, [open, value, userId, txid, description]);

  if (!open) return null;

  function copyPixCode() {
    if (qrData?.brCode) {
      navigator.clipboard.writeText(qrData.brCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#18181b', padding: 32, borderRadius: 16, minWidth: 340, maxWidth: 420, textAlign: 'center', color: '#fff', position: 'relative', boxShadow: '0 8px 32px #0008' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}>×</button>
        <h2 style={{ fontWeight: 800, fontSize: 26, marginBottom: 8, letterSpacing: 0.5 }}>Pagamento via Pix</h2>
        {qrData?.orderNumber && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            background: '#232323', borderRadius: 10, padding: '10px 0 8px 0', marginBottom: 12, border: '1px solid #333',
          }}>
            <div style={{ fontSize: 15, color: '#a3e635', fontWeight: 700, letterSpacing: 0.5 }}>
              Nº do Pedido: <span style={{ color: '#fff', background: '#222', borderRadius: 6, padding: '2px 8px', marginLeft: 4 }}>{qrData.orderNumber}</span>
            </div>
          </div>
        )}
        {loading && <div style={{ margin: 24 }}>Gerando QR Code...</div>}
        {error && <div style={{ color: '#f87171', margin: 24 }}>Erro: {error}</div>}
        {qrData && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {(() => {
                const imgSrc = qrData.qrcodeImage || qrData.qrCodeImage || (qrData.raw && (qrData.raw.qrCodeImage || qrData.raw.charge && qrData.raw.charge.qrCodeImage)) || null;
                if (imgSrc && !imgError) {
                  return <img src={imgSrc} onError={() => setImgError(true)} alt="QR Code Pix" style={{ width: 220, height: 220, margin: 8, borderRadius: 12, background: '#fff', boxShadow: '0 2px 12px #0004' }} />
                }
                return <div style={{ width: 220, height: 220, margin: 8, borderRadius: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>{imgError ? 'QR não disponível' : 'Gerando imagem...'}</div>
              })()}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '10px 0', width: '100%' }}>
                <div style={{ wordBreak: 'break-all', fontSize: 13, background: '#222', padding: 8, borderRadius: 6, maxWidth: 260, textAlign: 'left', flex: 1, border: '1px solid #333' }}>{qrData.brCode || qrData.raw?.brCode || qrData.raw?.charge?.brCode}</div>
                <button onClick={copyPixCode} style={{ background: '#a3e635', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#222', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', boxShadow: '0 1px 4px #a3e63555' }} title="Copiar código Pix">
                  <FaRegCopy />
                </button>
              </div>
              {imgError && qrData?.raw?.paymentLinkUrl && (
                <div style={{ marginTop: 8 }}>
                  <a href={qrData.raw.paymentLinkUrl} target="_blank" rel="noreferrer" style={{ color: '#a3e635' }}>Abrir link de pagamento</a>
                </div>
              )}
              {copied && <div style={{ color: '#a3e635', fontSize: 13, marginBottom: 4 }}>Código Pix copiado!</div>}
              <div style={{ color: '#a3e635', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Valor: R$ {(Number(value)).toFixed(2)}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 2 }}>Escaneie o QR Code no app do seu banco ou copie o código Pix acima.</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
