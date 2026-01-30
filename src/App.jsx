import React from 'react';
import './styles.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CharactersTable from './components/CharactersTable';
import ProductsGrid from './components/ProductsGrid';
import CartSummary from './components/CartSummary';
import TransactionsHistory from './components/TransactionsHistory';

function App(){
	const [page, setPage] = React.useState('dashboard');
	const [cart, setCart] = React.useState({});

	function navigate(p){
		setPage(p);
		window.scrollTo({top:0,behavior:'smooth'});
	}

	function setQuantity(productId, qty, product){
		setCart(prev => {
			const next = {...prev};
			if(!qty || qty <= 0){
				delete next[productId];
			} else {
				next[productId] = { ...(next[productId]||{}), id:productId, qty, title:product.title, usdt:product.usdt, brl:product.brl };
			}
			return next;
		});
	}

	function clearCart(){ setCart({}); }

	return (
		<div className="app">
			<Sidebar onNavigate={navigate} />
			<div className="main">
				<Header />
				<div className="content">
					<div className="container">
						{page === 'dashboard' && (
							<>
								<Dashboard />
								<h2 className="section-title">SEUS PERSONAGENS</h2>
								<CharactersTable />
							</>
						)}

						{page === 'donate' && (
							<>
								<h2 className="section-title">Available products</h2>
								<ProductsGrid cart={cart} onChangeQuantity={setQuantity} />
								<CartSummary cart={cart} onChangeQuantity={setQuantity} onClear={clearCart} />
							</>
						)}
					{page === 'transacoes' && (
						<TransactionsHistory />
					)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
