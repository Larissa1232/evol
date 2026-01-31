import React from 'react';
import '../styles/globals.css';
import '../src/components/PlayerPanel.css';
import '../src/components/PlayerSidebar.css';

export default function MyApp({ Component, pageProps }){
  return <Component {...pageProps} />;
}
