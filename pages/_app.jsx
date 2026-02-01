import React from 'react';
import '../styles/globals.css';
import '../src/components/PlayerPanel.css';
import '../src/components/PlayerSidebar.css';

export default function MyApp({ Component, pageProps }){
  React.useEffect(()=>{
    // Defensive monkey-patch: some runtime environments may attempt to
    // remove a node that's already been detached, which throws a
    // NotFoundError. Wrap `removeChild` to avoid uncaught errors.
    const orig = Node.prototype.removeChild;
    Node.prototype.removeChild = function(child){
      try{
        return orig.call(this, child);
      }catch(err){
        // Ignore NotFoundError (node not a child) to avoid breaking the app.
        // Log only other errors.
        if(err && err.name === 'NotFoundError'){
          console.warn('Ignored NotFoundError in removeChild', child, err);
          return null;
        }
        throw err;
      }
    };
    return ()=>{ Node.prototype.removeChild = orig };
  },[]);

  return <Component {...pageProps} />;
}
