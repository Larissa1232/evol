import React from 'react';

export default function CharactersTable(){
  return (
    <div className="table-wrap">
      <div className="table-controls">
        <div className="rows-select">10 <span>results</span></div>
        <div className="search">Pesquisar <input placeholder="Pesquise aqui..." /></div>
      </div>
      <table className="chars-table">
        <thead>
          <tr>
            <th>NOME</th>
            <th>LEVEL</th>
            <th>SEXO</th>
            <th>CLASSE</th>
            <th>RAÇA</th>
            <th>HP</th>
            <th>MP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Charm</td>
            <td>17</td>
            <td>♀</td>
            <td>Arqueiro</td>
            <td>Elfo</td>
            <td>2254</td>
            <td>2529</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
