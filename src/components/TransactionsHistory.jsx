import React, { useEffect, useState } from 'react';

const TransactionsHistory = () => {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(){
      try{
        // try get current user
        const meRes = await fetch('/api/auth/me');
        let userId = null;
        if(meRes.ok){
          const me = await meRes.json();
          userId = me.user?.id || me.id || null;
        }
        const url = userId ? `/api/transacoes?user_id=${encodeURIComponent(userId)}` : '/api/transacoes';
        const res = await fetch(url);
        const data = await res.json();
        setTransacoes(data);
      }catch(e){
        console.warn('Erro ao carregar transações', e);
      }finally{
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="table-wrap">Carregando...</div>;

  return (
    <div className="table-wrap" style={{marginTop: 32}}>
      <h2 className="section-title" style={{textAlign: 'left', marginBottom: 18}}>Minhas doações</h2>
      <div style={{overflowX: 'auto'}}>
        <table className="chars-table" style={{minWidth: 800}}>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {transacoes.length === 0 ? (
              <tr>
                <td colSpan={4} style={{textAlign: 'center', color: '#9ca3af', padding: 32}}>
                  Nenhuma doação encontrada.
                </td>
              </tr>
            ) : (
              transacoes.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.user_id}</td>
                  <td style={{color: '#10b981', fontWeight: 700}}>R$ {Number(tx.valor).toFixed(2)}</td>
                  <td>{tx.tipo}</td>
                  <td>{new Date(tx.criado_em).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionsHistory;
