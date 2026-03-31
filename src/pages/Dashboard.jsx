import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, Star, Clock, PieChart, 
  Send, Bot, Target, AlertTriangle, ShieldCheck, 
  TrendingUp, TrendingDown, RefreshCcw, LogOut, Zap, ArrowLeft, MessageSquare, X, Rocket, History
} from 'lucide-react';

export default function Dashboard({ user, onLogout }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLog, setChatLog] = useState([{ sender: 'ai', text: 'Periskop AI devrede. Piyasa dalgalarını analiz edebiliriz. Hangi Coin hakkında görüş istersiniz?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('markets');
  const [favorites, setFavorites] = useState([]);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [livePrices, setLivePrices] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [favFilter, setFavFilter] = useState('ALL');
  const [historyFilter, setHistoryFilter] = useState('WIN');
  const [historicalSignals, setHistoricalSignals] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [prevSignalTrades, setPrevSignalTrades] = useState([]);
  const [prevSignalLoading, setPrevSignalLoading] = useState(false);

  // --- KİŞİSEL İSTATİSTİK HESAPLAMALARI (Favoriler için) ---
  const calculatePnl = (s) => {
    if (!s || s.status !== 'ACTIVE') return 0;
    const symbolKey = s.coin ? s.coin.replace('/', '') : s.symbol.replace('/', '');
    const currentPrice = livePrices[symbolKey];
    if (!currentPrice) return 0;
    
    const rawEntry = (s.entry || s.entryPrice || '').toString().replace(/[^0-9.]/g, '');
    const entry = parseFloat(rawEntry) || 0;
    if (entry === 0) return 0;

    return (s.type === 'LONG') 
        ? ((currentPrice - entry) / entry) * 100
        : ((entry - currentPrice) / entry) * 100;
  };

  const totalWins = favorites.filter(sig => sig.status === 'WIN').length;
  const totalLosses = favorites.filter(sig => sig.status === 'LOSS').length;
  const closedSignals = totalWins + totalLosses;
  const winRate = closedSignals > 0 ? ((totalWins / closedSignals) * 100).toFixed(1) : 0;
  
  const reachedTwoPercentCount = favorites.filter(sig => calculatePnl(sig) >= 2.0).length;
  const totalFavPnl = favorites.reduce((acc, curr) => acc + calculatePnl(curr), 0);
  const totalPnlColor = totalFavPnl >= 0 ? '#4ade80' : '#f87171';
  let totalPnlSign = totalFavPnl >= 0 ? '+' : '';
  
  let totalPnlBlinkClass = '';
  if (Math.abs(totalFavPnl) >= 5) {
      totalPnlBlinkClass = totalFavPnl >= 0 ? 'blink-speed-3' : 'blink-speed-3-loss';
  } else if (Math.abs(totalFavPnl) >= 3) {
      totalPnlBlinkClass = totalFavPnl >= 0 ? 'blink-speed-1' : 'blink-speed-1-loss';
  }

  // Sinyal Filitreleme
  const displayedFavorites = favorites.filter(s => {
      if (favFilter === 'ALL') return true;
      return s.status === favFilter;
  });

  // Taramalar İstatistikleri
  const activeMainSignals = signals.filter(s => s.status === 'ACTIVE');
  const mainLongs = activeMainSignals.filter(s => s.type === 'LONG').length;
  const mainShorts = activeMainSignals.filter(s => s.type === 'SHORT').length;
  let mainProfitCount = 0;
  let mainLossCount = 0;
  let totalMarketPnl = 0;
  activeMainSignals.forEach(s => {
      const p = calculatePnl(s);
      totalMarketPnl += p;
      if (p > 0) mainProfitCount++;
      else if (p < 0) mainLossCount++; 
  });

  const marketPnlColor = totalMarketPnl >= 0 ? '#4ade80' : '#f87171';
  let marketPnlSign = totalMarketPnl >= 0 ? '+' : '';
  let marketPnlBlinkClass = '';
  if (Math.abs(totalMarketPnl) >= 5) {
      marketPnlBlinkClass = totalMarketPnl >= 0 ? 'blink-speed-3' : 'blink-speed-3-loss';
  } else if (Math.abs(totalMarketPnl) >= 3) {
      marketPnlBlinkClass = totalMarketPnl >= 0 ? 'blink-speed-1' : 'blink-speed-1-loss';
  }

  useEffect(() => {
    fetchSignals();
    fetchPrices();
    
    if (user && user.telegramId) {
       axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`)
          .then(res => setFavorites(res.data))
          .catch(err => console.error("Ağ hatası: Favoriler alınamadı", err));
    }

    const interval = setInterval(() => {
        fetchSignals();
        if (user && user.telegramId) {
            axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`)
               .then(res => setFavorites(res.data))
               .catch(e => console.error(e));
        }
    }, 60000);
    const priceInterval = setInterval(fetchPrices, 5000);
    return () => {
        clearInterval(interval);
        clearInterval(priceInterval);
    };
  }, [user]);

  useEffect(() => {
     if (selectedSignal) {
         setPrevSignalLoading(true);
         const symbol = (selectedSignal.coin || selectedSignal.symbol).replace('/', '');
         axios.get(`/api/signals/history?symbol=${symbol}&ts=${Date.now()}`)
            .then(res => {
                const closedTrades = res.data.filter(d => d.id.toString() !== selectedSignal.id.toString());
                if (closedTrades.length > 0) {
                    const processed = closedTrades.map(pt => {
                        const rawEntry = (pt.entryPrice || pt.entry || '').toString().replace(/[^0-9.]/g, '');
                        const entry = parseFloat(rawEntry);
                        let diff = 0;
                        if (pt.status === 'WIN') {
                            const rawTarget = (pt.targetPrice || pt.target || '').toString().replace(/[^0-9.]/g, '');
                            const target = parseFloat(rawTarget);
                            diff = pt.type === 'LONG' ? ((target - entry) / entry) * 100 : ((entry - target) / entry) * 100;
                        } else if (pt.status === 'LOSS') {
                            const rawStop = (pt.stopPrice || pt.stop || '').toString().replace(/[^0-9.]/g, '');
                            const stop = parseFloat(rawStop);
                            diff = pt.type === 'LONG' ? ((stop - entry) / entry) * 100 : ((entry - stop) / entry) * 100;
                        }
                        pt.calculatedPnl = diff.toFixed(2);
                        return pt;
                    });
                    setPrevSignalTrades(processed);
                } else {
                    setPrevSignalTrades([]);
                }
            })
            .catch(console.error)
            .finally(() => setPrevSignalLoading(false));
     } else {
         setPrevSignalTrades([]);
         setPrevSignalLoading(false);
     }
  }, [selectedSignal]);

  const loadStats = () => {
      axios.get(`/api/signals/stats?ts=${Date.now()}`)
        .then(res => {
            setStats(res.data);
            setStatsLoading(false);
        })
        .catch(err => {
            console.error("Stats fetching error", err);
            setStatsLoading(false);
        });
  };

  const loadHistoryData = (status) => {
      setHistoryFilter(status);
      setActiveTab('history');
      setHistoryLoading(true);
      axios.get(`/api/signals/history?status=${status}`)
          .then(res => {
              setHistoricalSignals(res.data);
              setHistoryLoading(false);
          })
          .catch(err => {
              console.error("History fetch error:", err);
              setHistoryLoading(false);
          });
  };

  useEffect(() => {
     loadStats();
     const statsInterval = setInterval(loadStats, 15000);
     return () => clearInterval(statsInterval);
  }, []);

  const fetchSignals = async () => {
    try {
      const res = await axios.get('/api/signals/active');
      setSignals(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const res = await axios.get('https://api.bybit.com/v5/market/tickers?category=linear');
      if (res.data && res.data.result && res.data.result.list) {
         const prices = {};
         res.data.result.list.forEach(t => {
            prices[t.symbol] = parseFloat(t.lastPrice);
         });
         setLivePrices(prices);
      }
    } catch(e) {}
  };

  const toggleFavorite = async (signal) => {
    if (!user || !user.telegramId) return;
    
    // Optistic UI update
    setFavorites(prev => {
        const isFav = prev.some(f => f.id === signal.id);
        return isFav ? prev.filter(f => f.id !== signal.id) : [...prev, signal];
    });

    try {
        await axios.post('/api/favorites/toggle', {
            telegramId: user.telegramId,
            signalId: signal.id
        });
        
        // Fetch to ensure full data sync (incognito status updates)
        const res = await axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`);
        setFavorites(res.data);
    } catch (err) {
        console.error("Favori toggle error:", err);
    }
  };

  const handleChat = async () => {
    if(!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput;
    setChatLog([...chatLog, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const resp = await axios.post('/api/analysis', { coin: userMsg });
      setChatLog(prev => [...prev, { sender: 'ai', text: resp.data.message || 'Analiz tamamlandı.' }]);
    } catch (err) {
      setChatLog(prev => [...prev, { sender: 'ai', text: 'Sistem hatası. AWS sunucusuna ulaşılamadı. Lütfen VIP grubunu kontrol edin.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const calculateProgress = (entry, current, target, isLong) => {
      const rand = Math.random() * 80 + 10;
      return rand;
  };

  const renderSignalCard = (s, isFavTab) => {
    const isLong = s.type === 'LONG';
    const isFav = favorites.some(f => f.id === s.id);
    const fmtPrice = val => parseFloat(val).toLocaleString('en-US', {maximumFractionDigits:5});
    
    const symbolKey = s.coin ? s.coin.replace('/', '') : s.symbol.replace('/', '');
    const currentPrice = livePrices[symbolKey];
    
    let pnl = null;
    let blinkClass = '';
    let isProfit = false;
    let isBigProfit = false;
    
    if (currentPrice && s.status === 'ACTIVE') {
       const rawEntry = (s.entry || s.entryPrice || '').toString().replace(/[^0-9.]/g, '');
       const entry = parseFloat(rawEntry) || 0;
       
       if (entry > 0) {
           if (isLong) pnl = ((currentPrice - entry) / entry) * 100;
           else pnl = ((entry - currentPrice) / entry) * 100;
       }
       
       isProfit = pnl > 0;
       isBigProfit = Math.abs(pnl) >= 1.0;
       if (isBigProfit) {
           if (Math.abs(pnl) >= 3.0) blinkClass = isProfit ? 'blink-speed-3' : 'blink-speed-3-loss';
           else if (Math.abs(pnl) >= 2.0) blinkClass = isProfit ? 'blink-speed-2' : 'blink-speed-2-loss';
           else blinkClass = isProfit ? 'blink-speed-1' : 'blink-speed-1-loss';
       }
    }

    return (
        <div className={`signal-card ${s.type}`} key={isFavTab ? `fav-${s.id}` : s.id} style={{ padding: '16px', borderRadius: '20px', backgroundColor: '#162336', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', marginBottom: '4px', cursor: 'pointer' }} onClick={() => setSelectedSignal(s)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: isLong ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '14px' }}>
                        {isLong ? <TrendingUp color={isLong ? '#4ade80' : '#f87171'} size={20} /> : <TrendingDown color={isLong ? '#4ade80' : '#f87171'} size={20} />}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>{s.symbol}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span style={{ color: '#888', fontSize: '0.8rem' }}>{new Date(s.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 6px', borderRadius: '6px' }}>
                                <Zap color="#38bdf8" size={10} fill="#38bdf8" style={{marginRight: 4}} />
                                <span style={{color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold'}}>{s.qualityScore || 0}</span>
                            </div>
                            {s.dailyCount > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(249, 115, 22, 0.15)', padding: '2px 6px', borderRadius: '6px' }}>
                                    <AlertTriangle color="#f97316" size={10} style={{marginRight: 4}} />
                                    <span style={{color: '#f97316', fontSize: '0.75rem', fontWeight: 'bold'}}>Uyarı: Günün {s.dailyCount}. Sinyali</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
        
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {pnl !== null && (
                        <div className={`pnl-badge ${isProfit ? 'profit' : 'loss'} ${blinkClass}`}>
                            {isProfit ? '+' : ''}{pnl.toFixed(2)}%
                        </div>
                    )}
                    <span style={{ color: isLong ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: '0.95rem', letterSpacing: '0.5px' }}>{s.type}</span>
                    <Star color={isFav ? '#eab308' : '#555'} fill={isFav ? '#eab308' : 'none'} size={24} style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); toggleFavorite(s); }} />
                </div>
            </div>
        
            <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '8px' }}>Giriş</span>
                    <span style={{ color: '#fff', fontSize: '1rem', fontWeight: '600' }}>${fmtPrice(s.entryPrice)}</span>
                </div>
        
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <span style={{ color: '#aaa', fontSize: '0.75rem' }}>Hedef</span>
                        <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: 'bold' }}>(+%{(Math.abs(s.targetPrice - s.entryPrice) / s.entryPrice * 100).toFixed(2)})</span>
                    </div>
                    <span style={{ color: '#fff', fontSize: '1rem', fontWeight: '600' }}>${fmtPrice(s.targetPrice)}</span>
                </div>
        
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <span style={{ color: '#aaa', fontSize: '0.75rem' }}>Stop Loss</span>
                        <span style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: 'bold' }}>(-%{(Math.abs(s.stopPrice - s.entryPrice) / s.entryPrice * 100).toFixed(2)})</span>
                    </div>
                    <span style={{ color: '#fff', fontSize: '1rem', fontWeight: '600' }}>${fmtPrice(s.stopPrice)}</span>
                </div>
            </div>
        </div>
    );
  };

  if(!user) return null;

  return (
    <div className="dashboard-layout">
      
      {/* SIDEBAR */}
      <div className="sidebar">
        <div 
          onClick={() => setActiveTab('markets')}
          style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <img src="/logo.jpg" alt="Elyte Logo" style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '1px solid rgba(74, 222, 128, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <h2 style={{ letterSpacing: 1, fontSize: '1.4rem' }}>ELYTE</h2>
        </div>
        
        <div style={{ padding: '1.5rem 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '24px' }}>ANA MENÜ</p>
            
            <div className={`sidebar-nav-item ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => setActiveTab('markets')}>
               <Activity size={20} />
               <span>Taramalar</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>
               <Star size={20} />
               <span>Favoriler</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
               <PieChart size={20} />
               <span>İstatistikler</span>
            </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
               <img src={user.photo || 'https://randomuser.me/api/portraits/lego/1.jpg'} style={{ width: 44, height: 44, borderRadius: 22, border: '2px solid rgba(255,255,255,0.1)' }}/>
               <div style={{flex: 1, overflow: 'hidden'}}>
                  <p style={{ fontWeight: 'bold', fontSize: '1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      {user.isVip ? <ShieldCheck size={14} color="#eab308" /> : null}
                      <p style={{ fontSize: '0.75rem', color: user.isVip ? '#eab308' : '#888' }}>{user.isVip ? 'VIP Üye' : 'Standart Üye'}</p>
                  </div>
               </div>
            </div>
            <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', width: '100%', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}>
                <LogOut size={18} /> Çıkış Yap
            </button>
        </div>
      </div>

      {/* MIDDLE PANEL - SIGNALS */}
      <div className="signals-panel">
        
        {selectedSignal ? (
            <div className="signal-detail-view" style={{ animation: 'slideIn 0.3s forwards' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px' }}>
                    <button onClick={() => setSelectedSignal(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>{selectedSignal.coin || selectedSignal.symbol} Analizi</h1>
                </div>
                
                {renderSignalCard(selectedSignal, false)}

                <div style={{ marginTop: '24px', background: 'rgba(22, 35, 54, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Canlı Piyasa Grafiği (1H)</h3>
                    </div>
                    
                    <div style={{ height: '480px', width: '100%' }}>
                        <iframe 
                            src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=BYBIT%3A${(selectedSignal.coin || selectedSignal.symbol).replace('/', '')}.P&interval=60&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=tr&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BYBIT%3A${(selectedSignal.coin || selectedSignal.symbol).replace('/', '')}.P`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allowTransparency="true"
                            scrolling="no"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>

                {/* PREVIOUS TRADES HISTORY (Conditionally Displayed if fetched) */}
                {prevSignalLoading ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Geçmiş Sinyaller Yükleniyor...</div>
                ) : prevSignalTrades.length > 0 ? (
                    <div style={{ marginTop: '24px', background: 'rgba(22, 35, 54, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <History size={18} color="#888" /> 
                               Önceki İşlemler (Sinyal Geçmişi)
                            </h3>
                        </div>
                        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {prevSignalTrades.map((pt, i) => (
                                <div key={pt.id || i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#888', fontWeight: 'bold' }}>Geçmiş #{i + 1}</span>
                                            <span style={{ color: pt.type === 'LONG'? '#4ade80' : '#f87171', fontWeight: 'bold', padding: '2px 8px', background: pt.type === 'LONG' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', borderRadius: '6px' }}>{pt.type}</span>
                                        </div>
                                        <div style={{ color: pt.status === 'WIN' ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: '0.9rem', background: pt.status === 'WIN' ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                                            {pt.status === 'WIN' ? 'KAZANÇ (TP)' : 'KAYIP (SL)'} ({parseFloat(pt.calculatedPnl) > 0 ? '+' : ''}{pt.calculatedPnl}%)
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>Giriş</div>
                                            <div style={{ color: '#fff', fontWeight: 'bold' }}>${parseFloat(pt.entryPrice || pt.entry || 0).toLocaleString('en-US', {maximumFractionDigits:5})}</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>Hedef</div>
                                            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>${parseFloat(pt.targetPrice || pt.target || 0).toLocaleString('en-US', {maximumFractionDigits:5})}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '4px' }}>Stop</div>
                                            <div style={{ color: '#f87171', fontWeight: 'bold' }}>${parseFloat(pt.stopPrice || pt.stop || 0).toLocaleString('en-US', {maximumFractionDigits:5})}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

            </div>
        ) : (
          <>
            {activeTab === 'markets' && (
          <>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: '800' }}>Canlı Akış</h1>
                    <p style={{ color: '#888', fontSize: '1rem' }}>Periskop yapay zeka analiz motorunun anlık tespitleri.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                   {activeMainSignals.length > 0 && (
                       <div className={marketPnlBlinkClass} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '10px', marginRight: '4px', border: marketPnlBlinkClass ? undefined : `1px solid rgba(255,255,255,0.05)`, transition: 'all 0.3s' }}>
                           <span style={{ color: '#888', fontSize: '0.9rem', marginRight: '6px' }}>Toplam Net:</span>
                           <span style={{ color: marketPnlColor, fontWeight: 'bold', fontSize: '1.2rem', textShadow: marketPnlBlinkClass ? 'none' : `0 0 10px ${marketPnlColor}40` }}>
                               {marketPnlSign}{totalMarketPnl.toFixed(2)}%
                           </span>
                       </div>
                   )}
                   <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                       <span style={{ color: '#888' }}>Aktif:</span> <span style={{ fontWeight: 'bold', fontSize: '1rem', marginLeft: '4px' }}>{activeMainSignals.length}</span>
                   </div>
                   <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                       <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{mainLongs} L</span>
                   </div>
                   <div style={{ background: 'rgba(248, 113, 113, 0.1)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}>
                       <span style={{ color: '#f87171', fontWeight: 'bold' }}>{mainShorts} S</span>
                   </div>
                   <div style={{ background: 'rgba(74, 222, 128, 0.15)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                       <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{mainProfitCount} Kâr</span>
                   </div>
                   <div style={{ background: 'rgba(248, 113, 113, 0.15)', padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem', border: '1px solid rgba(248, 113, 113, 0.3)' }}>
                       <span style={{ color: '#f87171', fontWeight: 'bold' }}>{mainLossCount} Zarar</span>
                   </div>
                </div>
             </div>
            
            {loading ? (
               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '15px' }}>
                   <Activity size={32} color="#4ade80" />
                   <p style={{ color: '#888' }}>Sinyaller Taranıyor...</p>
               </div>
            ) : (
                <div className="signals-grid">
                    {signals.filter(s => s.status === 'ACTIVE').length === 0 ? (
                        <div className="glass" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1', borderRadius: '20px' }}>
                            <Target size={40} color="#888" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ color: '#aaa', marginBottom: '0.5rem' }}>Aktif Fırsat Yok</h3>
                            <p style={{ color: '#666' }}>Piyasa koşulları şu an Elliott sarmalına uygun değil, lütfen bekleyin.</p>
                        </div>
                    ) : signals.filter(s => s.status === 'ACTIVE').map(s => renderSignalCard(s, false))}
                </div>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          <div style={{ animation: 'slideIn 0.3s forwards' }}>
            {/* FAVORITES HEADER (User Info & Total PnL) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <img src={user.photo || 'https://randomuser.me/api/portraits/lego/1.jpg'} style={{ width: 50, height: 50, borderRadius: 25, border: '2px solid rgba(255,255,255,0.1)' }}/>
                  <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '800', lineHeight: 1 }}>{user.name}</h1>
                    <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>İzleme listenizde {favorites.length} işlem var.</p>
                  </div>
               </div>
               {favorites.some(s => s.status === 'ACTIVE') && (
                   <div style={{ textAlign: 'right' }}>
                       <span className={totalPnlBlinkClass} style={{ fontSize: '1.4rem', fontWeight: 'bold', color: totalPnlColor, textShadow: totalPnlBlinkClass ? 'none' : `0 0 10px ${totalPnlColor}40`, padding: '4px 12px', borderRadius: '8px', border: totalPnlBlinkClass ? undefined : '1px solid transparent', transition: 'all 0.3s' }}>
                           {totalPnlSign}{totalFavPnl.toFixed(2)}%
                       </span>
                   </div>
               )}
            </div>

            {/* PERSONAL PERFORMANCE GRID */}
            <div style={{ background: 'rgba(22, 35, 54, 0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Kişisel Performans</h3>
                    {favFilter !== 'ALL' && (
                        <button onClick={() => setFavFilter('ALL')} style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}>
                            Tümünü Göster
                        </button>
                    )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    
                    {/* TP Hit */}
                    <div 
                        onClick={() => setFavFilter('WIN')}
                        style={{ background: favFilter === 'WIN' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.03)', border: favFilter === 'WIN' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid transparent', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <div style={{ background: 'rgba(74, 222, 128, 0.15)', padding: '12px', borderRadius: '12px' }}>
                            <TrendingUp color="#4ade80" size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalWins}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>TP Hit</div>
                        </div>
                    </div>

                    {/* SL Hit */}
                    <div 
                        onClick={() => setFavFilter('LOSS')}
                        style={{ background: favFilter === 'LOSS' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255,255,255,0.03)', border: favFilter === 'LOSS' ? '1px solid rgba(248, 113, 113, 0.3)' : '1px solid transparent', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                        <div style={{ background: 'rgba(248, 113, 113, 0.15)', padding: '12px', borderRadius: '12px' }}>
                            <TrendingDown color="#f87171" size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{totalLosses}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>SL Hit</div>
                        </div>
                    </div>

                    {/* Win Rate */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(234, 179, 8, 0.15)', padding: '12px', borderRadius: '12px' }}>
                            <Target color="#eab308" size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>%{winRate}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>Kazanma Oranı</div>
                        </div>
                    </div>

                    {/* +%2 Actives */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '12px', borderRadius: '12px' }}>
                            <Rocket color="#38bdf8" size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{reachedTwoPercentCount}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>+%2 Kârdakiler</div>
                        </div>
                    </div>

                </div>
            </div>

            {displayedFavorites.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column' }}>
                   <Star size={48} color="#eab308" style={{ opacity: 0.5 }} />
                   <h2 style={{ marginTop: '1rem', color: '#888' }}>{favFilter === 'ALL' ? 'Favori Listeniz Boş' : (favFilter === 'WIN' ? 'Henüz TP olan işleminiz yok.' : 'Henüz SL olan işleminiz yok.')}</h2>
                </div>
            ) : (
                <div className="signals-grid">
                   {displayedFavorites.map(s => renderSignalCard(s, true))}
                </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-container" style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
             {statsLoading || !stats ? (
                 <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                     <span style={{ color: '#4ade80' }}>Veriler Yükleniyor...</span>
                 </div>
             ) : (
                 <>
                    <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                        <PieChart size={28} color="#4ade80" /> Elyte Statistics
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>Reports the simulated result as if every signal was traded with a fixed $30 size.</p>

                    <div style={{
                        background: '#162336', padding: '1.5rem', borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Simulated Wallet Growth (PnL)</p>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: stats.totalProfit >= 0 ? '#4ade80' : '#f87171' }}>
                            {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
                        </h1>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <div 
                            style={{
                                flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', cursor: 'pointer'
                            }}
                            onClick={() => loadHistoryData('WIN')}
                        >
                            <TrendingUp color="#4ade80" size={32} style={{ margin: '0 auto' }} />
                            <div style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'rgba(74, 222, 128, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 'bold' }}>+%{(stats.totalWinPercentage || 0).toFixed(1)}</span>
                            </div>
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>{stats.wins}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Wins (TP)</p>
                            <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '4px' }}>Tıkla ve İncele</p>
                        </div>
                        <div 
                            style={{
                                flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', cursor: 'pointer'
                            }}
                            onClick={() => loadHistoryData('LOSS')}
                        >
                            <TrendingDown color="#f87171" size={32} style={{ margin: '0 auto' }} />
                            <div style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'rgba(248, 113, 113, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                <span style={{ color: '#f87171', fontSize: '0.75rem', fontWeight: 'bold' }}>-%{(stats.totalLossPercentage || 0).toFixed(1)}</span>
                            </div>
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>{stats.losses}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Losses (SL)</p>
                            <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '4px' }}>Tıkla ve İncele</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <Target color="#3b82f6" size={32} style={{ margin: '0 auto' }} />
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>%{stats.winRate.toFixed(1)}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Win Rate</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <Zap color="#eab308" size={32} style={{ margin: '0 auto' }} />
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>{stats.totalSignals}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Total Signals</p>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(234, 179, 8, 0.1)', padding: '1.5rem', borderRadius: '16px',
                        border: '1px solid rgba(234, 179, 8, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>✨</span>
                            <span style={{ color: '#eab308', fontWeight: 'bold' }}>Trades Reaching +2%</span>
                        </div>
                        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#fff' }}>{stats.reachedTwoPercentCount} <span style={{ fontSize: '1rem', color: '#aaa', fontWeight: 'normal' }}>trades</span></h2>
                        <p style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>Total number of strong trades that successfully reached at least +2% profit while active, even if they eventually hit stop-loss.</p>
                    </div>
                 </>
             )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-container" style={{ padding: '1rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', cursor: 'pointer', gap: '8px', padding: '10px 15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', width: 'fit-content' }} onClick={() => setActiveTab('stats')}>
                  <ArrowLeft size={20} color="#fff" />
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>İstatistiklere Dön</span>
              </div>
              
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {historyFilter === 'WIN' ? <TrendingUp color="#4ade80" size={32} /> : <TrendingDown color="#f87171" size={32} />}
                  <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#fff' }}>
                      {historyFilter === 'WIN' ? 'Kazanan İşlemler (TP)' : 'Kaybeden İşlemler (SL)'}
                  </h2>
              </div>

              {historyLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                      <span style={{ color: '#888' }}>Geçmiş Veriler Yükleniyor...</span>
                  </div>
              ) : historicalSignals.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', flexDirection: 'column', alignItems: 'center' }}>
                      <Clock size={48} color="#888" style={{ marginBottom: '1rem' }} />
                      <span style={{ color: '#888' }}>Bu kategoride işlem bulunmuyor.</span>
                  </div>
              ) : (
                  <div className="signals-grid">
                      {historicalSignals.map(s => renderSignalCard(s, false))}
                  </div>
              )}
          </div>
        )}
        </>
        )}
      </div>

      {/* FLOATING ACTION BUTTON */}
      <div className="chat-fab" onClick={() => setIsChatOpen(!isChatOpen)}>
          {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </div>

      {/* RIGHT PANEL - AI CHAT (Now Floating) */}
      <div className={`chat-panel ${isChatOpen ? 'active' : ''}`}>
         <div style={{ padding: '1.5rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '12px' }}>
                   <Bot color="#3b82f6" size={24} />
                </div>
                <div>
                   <h3 style={{ fontSize: '1.1rem', letterSpacing: '0.5px' }}>Periskop AI Sohbet</h3>
                   <p style={{ fontSize: '0.8rem', color: '#888' }}>GPT-4 Turbo ile desteklenir</p>
                </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
            </button>
         </div>
         
         <div className="chat-messages">
             {chatLog.map((chat, i) => (
                 <div key={i} className={`chat-bubble ${chat.sender}`}>
                     <p>{chat.text}</p>
                 </div>
             ))}
         </div>
         
         <div className="chat-input-container">
             <input 
                type="text" 
                className="chat-input"
                value={chatInput} 
                onChange={e=>setChatInput(e.target.value)} 
                onKeyDown={e=>e.key==='Enter' && handleChat()} 
                placeholder="Örn: BTC yarın ne olur?" 
             />
             <button className="chat-send-btn" onClick={handleChat} disabled={chatLoading}>
                 {chatLoading ? <Activity size={20} className="fa-spin" /> : <Send size={20} />}
             </button>
         </div>
      </div>
    </div>
  );
}
