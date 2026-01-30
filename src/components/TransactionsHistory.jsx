import React, { useEffect, useState } from 'react';
import './PlayerPanel.css';

const TransactionsHistory = () => {
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transacoes')
      .then(res => res.json())
      .then(data => {
        setTransacoes(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="table-wrap">Carregando...</div>;

  return (
    <div className="table-wrap" style={{marginTop: 32}}>
      <h2 className="section-title" style={{textAlign: 'left', marginBottom: 18}}>Minhas doações</h2>
      <div style={{overflowX: 'auto'}}>
        <table className="chars-table" style={{minWidth: 800}}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuário</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Descrição</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {transacoes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{textAlign: 'center', color: '#9ca3af', padding: 32}}>
                  Nenhuma doação encontrada.
                </td>
              </tr>
            ) : (
              transacoes.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.user_id}</td>
                  <td style={{color: '#10b981', fontWeight: 700}}>R$ {Number(tx.valor).toFixed(2)}</td>
                  <td>{tx.tipo}</td>
                  <td>{tx.status}</td>
                  <td>{tx.descricao}</td>
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
