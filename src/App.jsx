import React from 'react';
import './styles.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CharactersTable from './components/CharactersTable';

function App() {
	return (
		<div className="app">
			<Sidebar />
			<div className="main">
				<Header />
				<div className="content">
					<Dashboard />
					<h2 className="section-title">SEUS PERSONAGENS</h2>
					<CharactersTable />
				</div>
			</div>
		</div>
	);
}

export default App;
