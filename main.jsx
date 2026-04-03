import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './src/App.jsx'

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Uygulama yüklendikten 1 saniye sonra Splash Screen'i yumuşakça kaldır (iOS/Web evrensel efekti için)
setTimeout(() => {
    const splash = document.getElementById('app-splash');
    if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500); // CSS animasyonu bittikten sonra DOM'dan tamamen sil
    }
}, 1000);
