import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CharactersTable from './components/CharactersTable';
import ProductsGrid from './components/ProductsGrid';
import CartSummary from './components/CartSummary';
import TransactionsHistory from './components/TransactionsHistory';
import Votes from './components/Votes';

function App(){
	const [page, setPage] = React.useState('dashboard');

	// On the client, restore last page from localStorage after hydration to avoid
	// server/client markup mismatch (prevents hydration errors).
	React.useEffect(() => {
		try {
			const saved = window.localStorage.getItem('app_page');
			if (saved) setPage(saved);
		} catch (e) {}
	}, []);
	const [cart, setCart] = React.useState({});

	function navigate(p){
		setPage(p);
		try { if (typeof window !== 'undefined') window.localStorage.setItem('app_page', p); } catch(e){}
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
								<ProductsGrid id="products-grid" cart={cart} onChangeQuantity={setQuantity} />
								<CartSummary
									cart={cart}
									onChangeQuantity={setQuantity}
									onClear={clearCart}
									onOpenProducts={(char)=>{
										navigate('donate');
										setTimeout(()=>{
											const el = document.getElementById('products-grid');
											if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
										}, 100);
									}}
								/>
							</>
						)}
					{page === 'transacoes' && (
					<TransactionsHistory />
					)}

					{page === 'votos-ranking' && (
						<Votes view="ranking" />
					)}

					{page === 'votos-recompensa' && (
						<Votes view="reward" />
					)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
