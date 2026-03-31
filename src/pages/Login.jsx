import React, { useState, useRef } from 'react';

export default function Login({ onLogin }) {
  const [connecting, setConnecting] = useState(false);
  const [errorDesc, setErrorDesc] = useState('');
  const pollInterval = useRef(null);

  const handleTelegramAuth = async () => {
    // Safari Popup Blocker Bypass: Synchronously open blank ref
    const newTab = window.open('', '_blank');

    try {
      setConnecting(true);
      setErrorDesc('');
      
      const res = await fetch('/api/auth/session');
      if (!res.ok) throw new Error("API sunucusu çevrimdışı");
      const data = await res.json();
      const sessionId = data.sessionId;

      const botUsername = 'ElytDev_Bot';
      const tgUrl = `https://t.me/${botUsername}?start=${sessionId}`;
      
      if (newTab) {
          newTab.location.href = tgUrl;
      } else {
          window.location.href = tgUrl; // Fallback
      }

      // Poll every 3 seconds
      pollInterval.current = setInterval(async () => {
        try {
            const checkReq = await fetch(`/api/auth/session/${sessionId}`);
            if (checkReq.ok) {
                const checkData = await checkReq.json();
                if (checkData.session && checkData.session.isAuthenticated === 1) {
                    clearInterval(pollInterval.current);
                    pollInterval.current = null;
                    if (newTab && !newTab.closed) {
                        try { newTab.close(); } catch(e) {}
                    }
                    setConnecting(false);
                    onLogin({
                        telegramId: checkData.session.telegramId,
                        name: checkData.session.name,
                        photo: checkData.session.photo,
                        isVip: checkData.session.isVip,
                        provider: 'Telegram'
                    });
                }
            }
        } catch (e) {
            console.warn("Poll Error:", e);
        }
      }, 3000);

      // 2 dk Timeout 
      setTimeout(() => {
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            if (newTab && !newTab.closed) {
                try { newTab.close(); } catch(e) {}
            }
            setConnecting(false);
            setErrorDesc("Bağlantı zaman aşımına uğradı, tekrar deneyin.");
        }
      }, 120000);

    } catch (err) {
      if (newTab && !newTab.closed) {
          try { newTab.close(); } catch(e) {}
      }
      setConnecting(false);
      setErrorDesc(err.message || 'Bilinmeyen Hata');
    }
  };

  return (
    <div style={{ flex: 1, height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass" style={{ padding: '4rem', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        <i className="ph-fill ph-radar" style={{ fontSize: '4rem', color: '#4ade80', marginBottom: '1rem' }}></i>
        <h2 style={{ marginBottom: '10px' }}>VIP Girişi</h2>
        <p style={{ color: '#888', marginBottom: '2rem' }}>Derin piyasa sularına dalmak için Telegram ile doğrulayın.</p>
        
        {errorDesc && <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{errorDesc}</p>}
        
        <button 
          onClick={handleTelegramAuth} 
          disabled={connecting}
          style={{ 
            width: '100%', padding: '15px', borderRadius: '12px', background: '#2AABEE',
            border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: 'bold',
            opacity: connecting ? 0.6 : 1, cursor: connecting ? 'not-allowed' : 'pointer'
          }}
        >
          {connecting ? 'Telegram Bekleniyor...' : 'Telegram ile Bağlan'}
        </button>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666' }}>Yeni sekmede açılan bottan Start tuşuna basıp buraya otomatik döneceksiniz.</p>
      </div>
    </div>
  );
}
