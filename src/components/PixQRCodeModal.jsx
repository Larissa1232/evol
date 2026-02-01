import React, { useState } from 'react';
import { FaRegCopy } from 'react-icons/fa';

export default function PixQRCodeModal({ open, onClose, value, userId, txid, description }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    if (open && value) {
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
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { throw new Error(txt || 'Invalid response from server'); }
          if (!r.ok) {
            const msg = (data && (data.error || data.message)) ? (data.error || data.message) : JSON.stringify(data);
            throw new Error(msg || 'Server error');
          }
          return data?.data || data || null;
        })
        .then((data) => setQrData(data))
        .catch((err) => setError(err.message || String(err)))
        .finally(() => setLoading(false));
    }
  }, [open, value, userId, txid, description]);

  if (!open) return null;

  function copyPixCode() {
    const code = qrData?.brCode || qrData?.raw?.brCode || qrData?.raw?.charge?.brCode || '';
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const brCode = qrData?.brCode || qrData?.raw?.brCode || qrData?.raw?.charge?.brCode || '';
  const imgSrc = qrData?.qrcodeImage || qrData?.qrCodeImage || qrData?.raw?.qrCodeImage || qrData?.raw?.charge?.qrCodeImage || null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#18181b', padding: 28, borderRadius: 12, minWidth: 320, maxWidth: 420, textAlign: 'center', color: '#fff', position: 'relative', boxShadow: '0 8px 32px #0008' }}>
        <button onClick={onClose} aria-label="Fechar" style={{ position: 'absolute', top: 8, right: 10, background: 'transparent', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer' }}>×</button>
        <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 12 }}>Pagamento via Pix</h2>

        {loading && <div style={{ margin: '18px 0', color: '#cbd5e1' }}>Gerando QR Code…</div>}
        {error && <div style={{ margin: '18px 0', color: '#f87171' }}>Erro: {error}</div>}

        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 220, height: 220, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {imgSrc && !imgError ? (
                <img src={imgSrc} onError={() => setImgError(true)} alt="QR Code Pix" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ color: '#6b7280' }}>{imgError ? 'QR não disponível' : (loading ? 'Carregando...' : 'QR indisponível')}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 320 }}>
              <div style={{ wordBreak: 'break-all', fontSize: 14, background: '#111827', padding: 10, borderRadius: 8, flex: 1, textAlign: 'left', color: '#e5e7eb' }}>{brCode}</div>
              <button onClick={copyPixCode} title="Copiar código Pix" style={{ background: '#a3e635', border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#111827', fontWeight: 700 }}>
                <FaRegCopy />
              </button>
            </div>

            {copied && <div style={{ color: '#a3e635', fontSize: 13 }}>Código Pix copiado!</div>}

            <div style={{ color: '#a3e635', fontWeight: 700, fontSize: 18 }}>Valor: R$ {(Number(value)).toFixed(2)}</div>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>Escaneie o QR no app do seu banco ou copie o código acima.</div>
          </div>
        )}

      </div>
    </div>
  );
}
