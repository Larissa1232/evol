import React from 'react';

export default function Header(){
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(()=>{
    let mounted = true;
    fetch('/api/auth/me').then(r=>r.json()).then(j=>{
      if(!mounted) return;
      if(j && j.ok && j.user) setUser(j.user);
    }).catch(()=>{}).finally(()=>{ if(mounted) setLoading(false); });
    return ()=>{ mounted = false };
  },[]);

  async function handleLogout(){
    try{
      await fetch('/api/auth/logout');
    }catch(e){}
    // redirect to login (force full reload to clear client state)
    window.location.href = '/login';
  }

  return (
    <header className="app-header" style={{padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:8,background:'linear-gradient(135deg,#6b3bd6,#3b82f6)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800}}>E</div>
        <div>
          <div style={{fontSize:14,fontWeight:800,color:'rgba(230,238,248,0.9)'}}>Evol Panel</div>
          <div style={{fontSize:12,color:'rgba(230,238,248,0.6)'}}>{user ? (user.displayName || user.username) : (loading ? 'Carregando...' : '')}</div>
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button onClick={handleLogout} className="btn" style={{background:'transparent',border:'1px solid rgba(255,255,255,0.06)',color:'white',padding:'8px 12px',borderRadius:10,cursor:'pointer'}}>Logout</button>
      </div>
    </header>
  );
}
