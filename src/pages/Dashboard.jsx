import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Activity, Star, Clock, PieChart, Home, Flame, Map, Wallet,
  Send, Bot, Target, AlertTriangle, ShieldCheck, 
  TrendingUp, TrendingDown, RefreshCcw, LogOut, Zap, ArrowLeft, MessageSquare, X, Rocket, History, Flag, Briefcase, ThumbsUp
} from 'lucide-react';

import PortfolioManager from '../components/PortfolioManager';

const renderMarkdown = (text) => {
    if (!text) return "AI analiz raporu bekleniyor...";
    return text.split('\n').map((line, i) => {
        let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff">$1</strong>');
        if (line.startsWith('### ')) {
            return <h3 key={i} style={{ color: '#60a5fa', margin: '16px 0 8px 0', fontSize: '1.1rem' }} dangerouslySetInnerHTML={{ __html: formattedLine.replace('### ', '') }} />;
        } else if (line.trim().startsWith('- ')) {
            return <li key={i} style={{ marginLeft: '16px', marginBottom: '6px', lineHeight: '1.6', color: '#cbd5e1' }} dangerouslySetInnerHTML={{ __html: formattedLine.replace('- ', '') }} />;
        } else if (line.match(/^\d+\)/)) {
            return <h4 key={i} style={{ color: '#94a3b8', margin: '14px 0 6px 0', fontSize: '1.05rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
        } else if (line.trim() === '') {
            return <br key={i} />;
        } else {
            return <div key={i} style={{ margin: '6px 0', lineHeight: '1.6', color: '#cbd5e1' }} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
        }
    });
};

export default function Dashboard({ user, onLogout }) {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatLog, setChatLog] = useState([{ sender: 'ai', text: 'Periskop AI devrede. Piyasa dalgalarını analiz edebiliriz. Hangi Coin hakkında görüş istersiniz?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [macroData, setMacroData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [favorites, setFavorites] = useState([]);
  const [userTrades, setUserTrades] = useState([]);
  const [closingTradeId, setClosingTradeId] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [adminBalance, setAdminBalance] = useState(null);
  const isAdmin = user?.telegramId?.toString() === '1194576674';
  const [livePrices, setLivePrices] = useState({});
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [favFilter, setFavFilter] = useState('ACTIVE');
  const [historyFilter, setHistoryFilter] = useState('WIN');
  const [newSignalIds, setNewSignalIds] = useState([]);
  const prevSignalsRef = useRef([]);
  const [historicalSignals, setHistoricalSignals] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [prevSignalTrades, setPrevSignalTrades] = useState([]);
  const [prevSignalLoading, setPrevSignalLoading] = useState(false);
  const [isHoveringChat, setIsHoveringChat] = useState(false);
  const [isAutoPoking, setIsAutoPoking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showVipModal, setShowVipModal] = useState(false);

  const handleTabClick = (tabName) => {
      // Çift tıkla/Aynı sekmeye basıldığında tepeye kaydır (Mobil App Davranışı)
      if (activeTab === tabName && !selectedSignal) {
          try {
             // 1. Desktop ve genel window kaydırmaları
             document.documentElement.style.scrollBehavior = 'smooth';
             document.body.style.scrollBehavior = 'smooth';
             window.scrollTo(0, 0);
             
             // 2. Mobil dashboard flex-container scroll (Ana taşıyıcı)
             const layout = document.querySelector('.dashboard-layout');
             if (layout) {
                 layout.style.scrollBehavior = 'smooth';
                 layout.scrollTop = 0;
             }
             
             // 3. Desktop orta panel kaydırması
             const panel = document.querySelector('.signals-panel');
             if (panel) {
                 panel.style.scrollBehavior = 'smooth';
                 panel.scrollTop = 0;
             }
          } catch(e) { console.warn("Scroll Error", e); }
      }
      setActiveTab(tabName);
      setSelectedSignal(null);
      if (tabName === 'favorites') {
          setFavFilter('ACTIVE');
      }
  };

  useEffect(() => {
      if (user && user.isVip === 0) {
         setShowVipModal(true);
     } else {
         setShowVipModal(false);
     }
  }, [user]);

  // --- OTOPILOT PERISKOP POP-UP (Yarım Saatte Bir) ---
  useEffect(() => {
    const pokeTimer = setInterval(() => {
      // Eğer sohbet açık değilse ve kullanıcı o an fareyle üstünde değilse çıkar.
      if (!isChatOpen && !isHoveringChat) {
        setIsAutoPoking(true);
        // 5 saniye sonra gizle
        setTimeout(() => setIsAutoPoking(false), 5000);
      }
    }, 30 * 60 * 1000); // 30 dakika

    return () => clearInterval(pokeTimer);
  }, [isChatOpen, isHoveringChat]);

  const calculatePnl = (s) => {
    if (!s || s.status !== 'ACTIVE') return 0;
    const symbolKey = s.coin ? s.coin.replace('/', '') : s.symbol.replace('/', '');
    const currentPrice = livePrices[symbolKey];
    if (!currentPrice) return 0;
    
    const rawEntry = (s.entry || s.entryPrice || '').toString().replace(/[^0-9.]/g, '');
    const entry = parseFloat(rawEntry) || 0;
    if (entry === 0) return 0;

    const spotPnl = (s.type === 'LONG') 
        ? ((currentPrice - entry) / entry) * 100
        : ((entry - currentPrice) / entry) * 100;
    
    return spotPnl * 10; // 10x Kaldıraç (ROE)
  };

  // Kişisel Performans Kartları İçin Sinyal Geçmişi
  const closedFavorites = favorites.filter(f => f.status === 'WIN' || f.status === 'LOSS');
  const totalWins = closedFavorites.filter(f => f.status === 'WIN').length;
  const totalLosses = closedFavorites.filter(f => f.status === 'LOSS').length;
  const closedSignals = totalWins + totalLosses;
  const winRate = closedSignals > 0 ? ((totalWins / closedSignals) * 100).toFixed(1) : 0;
  
  const activeFavorites = favorites.filter(f => f.status === 'ACTIVE');
  const reachedTwoPercentCount = activeFavorites.filter(t => {
      const sp = livePrices[t.symbol.replace('/', '')];
      if(!sp) return false;
      const p = t.type === 'LONG' ? ((sp - t.entryPrice)/t.entryPrice)*100 : ((t.entryPrice - sp)/t.entryPrice)*100;
      return p >= 2.0;
  }).length;
  
  const totalFavPnl = activeFavorites.reduce((acc, curr) => {
      const sp = livePrices[curr.symbol.replace('/', '')];
      if(!sp) return acc;
      const roePnl = (curr.type === 'LONG' ? ((sp - curr.entryPrice)/curr.entryPrice)*100 : ((curr.entryPrice - sp)/curr.entryPrice)*100) * 10;
      let usdProfit = 10 * (roePnl / 100); 
      if (user?.isAdmin) usdProfit -= 0.11;
      return acc + usdProfit;
  }, 0);
  
  // Teorik $10 Net Kâr (Kapalı Sinyaller İçin - Net Fatura Varsa Kullanır)
  const theoreticalClosedUsd = closedFavorites.reduce((acc, t) => {
       if (t.netPnlUsd !== undefined && t.netPnlUsd !== null) {
           return acc + parseFloat(t.netPnlUsd);
       }
       
       let roePnl = 0;
       if (t.customPnl !== undefined && t.customPnl !== null) {
           roePnl = t.customPnl;
       } else if (t.status === 'WIN') {
           roePnl = (t.type === 'LONG' ? ((t.targetPrice - t.entryPrice)/t.entryPrice)*100 : ((t.entryPrice - t.targetPrice)/t.entryPrice)*100) * 10;
       } else if (t.status === 'LOSS') {
           roePnl = (t.type === 'LONG' ? ((t.stopPrice - t.entryPrice)/t.entryPrice)*100 : ((t.entryPrice - t.stopPrice)/t.entryPrice)*100) * 10;
           if(roePnl > 0) roePnl = -roePnl; // Loss is negative 
       }
       let usdProfit = 10 * (roePnl / 100);
       if (user?.isAdmin) usdProfit -= 0.22;
       return acc + usdProfit;
  }, 0);

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
      if (favFilter === 'ALL') return s.status === 'ACTIVE';
      return s.status === favFilter;
  });

  const isCryptoSymbol = (symbol) => {
      if(!symbol) return true;
      const s = String(symbol).toUpperCase();
      return s.includes('USDT') || s.includes('USDC') || s.endsWith('BTC') || s.endsWith('ETH') || s.endsWith('PERP');
  };

  // Taramalar İstatistikleri
  const activeMainSignals = signals.filter(s => {
      if (s.status !== 'ACTIVE') return false;
      if (categoryFilter === 'CRYPTO' && !isCryptoSymbol(s.symbol)) return false;
      if (categoryFilter === 'ASSETS' && isCryptoSymbol(s.symbol)) return false;
      return true;
  });
  const mainLongs = activeMainSignals.filter(s => s.type === 'LONG').length;
  const mainShorts = activeMainSignals.filter(s => s.type === 'SHORT').length;
  let mainProfitCount = 0;
  let mainLossCount = 0;
  let totalMarketPnl = 0;
  activeMainSignals.forEach(s => {
      const p = calculatePnl(s);
      totalMarketPnl += (p * 3 / 100);
      if (p > 0) mainProfitCount++;
      else if (p < 0) mainLossCount++; 
  });

  const marketPnlColor = totalMarketPnl >= 0 ? '#4ade80' : '#f87171';
  let marketPnlSign = totalMarketPnl >= 0 ? '+' : '';
  let marketPnlBlinkClass = '';
  if (Math.abs(totalMarketPnl) >= 3) { 
      marketPnlBlinkClass = totalMarketPnl >= 0 ? 'blink-speed-3' : 'blink-speed-3-loss';
  } else if (Math.abs(totalMarketPnl) >= 1) { 
      marketPnlBlinkClass = totalMarketPnl >= 0 ? 'blink-speed-1' : 'blink-speed-1-loss';
  }

  useEffect(() => {
    fetchSignals();
    fetchPrices();
    
    if (user && user.telegramId) {
       axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`).then(res => setFavorites(res.data)).catch(console.error);
       axios.get(`/api/user-trades/${user.telegramId}?ts=${Date.now()}`).then(res => setUserTrades(res.data)).catch(console.error);
       if (isAdmin) {
           axios.get(`/api/admin/balance/${user.telegramId}?ts=${Date.now()}`)
               .then(res => { if (res.data.success) setAdminBalance(res.data.balance); })
               .catch(e => console.error("Admin balance error:", e.response?.data || e.message));
       }
    }
    axios.get(`/api/macro?ts=${Date.now()}`).then(res => setMacroData(res.data)).catch(console.error);
    axios.get(`/api/macro-risk?ts=${Date.now()}`).then(res => setRiskData(res.data)).catch(console.error);

    const interval = setInterval(() => {
        fetchSignals();
        axios.get(`/api/macro?ts=${Date.now()}`).then(res => setMacroData(res.data)).catch(console.error);
        axios.get(`/api/macro-risk?ts=${Date.now()}`).then(res => setRiskData(res.data)).catch(console.error);
        if (user && user.telegramId) {
            axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`).then(res => setFavorites(res.data)).catch(console.error);
            axios.get(`/api/user-trades/${user.telegramId}?ts=${Date.now()}`).then(res => setUserTrades(res.data)).catch(console.error);
            if (isAdmin) {
                axios.get(`/api/admin/balance/${user.telegramId}?ts=${Date.now()}`)
                    .then(res => { if (res.data.success) setAdminBalance(res.data.balance); })
                    .catch(e => console.error("Admin balance error:", e.response?.data || e.message));
            }
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

      axios.get(`/api/signals/stats?days=7&ts=${Date.now()}`)
        .then(res => setWeeklyStats(res.data))
        .catch(console.error);
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

  useEffect(() => {
      let isSubscribed = true;
      if (selectedStock && !selectedStock.aiReport) {
          const fetchReport = () => {
              axios.post('/api/llm/analyze', { symbol: selectedStock.symbol })
                   .then(res => {
                       if (!isSubscribed) return;
                       if (res.data && res.data.data) {
                           setSelectedStock(prev => {
                               if (prev && prev.symbol === selectedStock.symbol) {
                                   return {
                                       ...prev,
                                       aiReport: res.data.data.detailedReport,
                                       flagReason: res.data.data.summary || prev.flagReason
                                   };
                               }
                               return prev;
                           });
                       } else if (res.data && res.data.status === "processing") {
                           setTimeout(() => {
                               if (isSubscribed) fetchReport();
                           }, 4000);
                       }
                   })
                   .catch(err => console.error("AI Report Fetch Error:", err));
          };
          fetchReport();
      }
      return () => { isSubscribed = false; };
  }, [selectedStock?.symbol]);

  const fetchSignals = async () => {
    try {
      const res = await axios.get('/api/signals/active');
      const newSigs = res.data;
      
      if (prevSignalsRef.current.length > 0 && newSigs.length > 0) {
          const prevIds = new Set(prevSignalsRef.current.map(s => s.id));
          const arrivals = newSigs.filter(s => !prevIds.has(s.id)).map(s => s.id);
          
          if (arrivals.length > 0) {
              setNewSignalIds(prev => [...prev, ...arrivals]);
              setTimeout(() => {
                  setNewSignalIds(prev => prev.filter(id => !arrivals.includes(id)));
              }, 5000);
          }
      }
      prevSignalsRef.current = newSigs;
      setSignals(newSigs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const prices = {};
      
      // 1. Önce Bybit'ten çek (Çoğu altcoin ve memecoin'i kapsar)
      try {
        const bybitRes = await axios.get('https://api.bybit.com/v5/market/tickers?category=linear');
        if (bybitRes.data && bybitRes.data.result && bybitRes.data.result.list) {
           bybitRes.data.result.list.forEach(t => {
              prices[t.symbol] = parseFloat(t.lastPrice);
           });
        }
      } catch (e) {
        console.warn("Bybit API error", e);
      }

      // 2. Sonra Binance'den çek (SADECE Bybit'te olmayanları tamamla, üzerine yazma! XMR gibi delist olanlar hataya sebep olur)
      try {
        const binanceRes = await axios.get('https://api.binance.com/api/v3/ticker/price');
        if (binanceRes.data && Array.isArray(binanceRes.data)) {
           binanceRes.data.forEach(t => {
              if (!prices[t.symbol]) {
                  prices[t.symbol] = parseFloat(t.price);
              }
           });
        }
      } catch (e) {
        console.warn("Binance API error", e);
      }

      // 3. Elyte Backend Proxy'den (Geleneksel Varlıklar: XAUUSD, XAGUSD, NASDAQ vb.) - CORS yok
      try {
        const assetRes = await axios.get('/api/prices/assets');
        if (assetRes.data && typeof assetRes.data === 'object' && !Array.isArray(assetRes.data)) {
           Object.keys(assetRes.data).forEach(key => {
              prices[key] = parseFloat(assetRes.data[key]);
           });
        }
      } catch (e) {
        console.warn("Proxy Asset API error", e);
      }

      setLivePrices(prices);
    } catch(e) {}
  };

  const toggleFavorite = async (signal) => {
    if (!user || !user.telegramId) return;
    
    const isActiveFav = favorites.some(f => (f.id === signal.id || f.signalId === signal.id) && f.status === 'ACTIVE');
    if (isActiveFav) {
        alert("Bu işlem zaten açık durumdadır. İşlemi kapatmak için aktif favorilerinizdeki 'İşlemi Sonlandır' butonunu kullanın.");
        return;
    }

    if (user.isAdmin) {
        if(!window.confirm(`Borsada ${signal.symbol} sinyali için GERÇEK PARA ($10 risk) ile manuel işlem açılacaktır. Onaylıyor musunuz?`)){
            return;
        }
    }

    try {
        await axios.post('/api/favorites/toggle', {
            telegramId: user.telegramId,
            signalId: signal.id
        });
        
        // Fetch to ensure full data sync (incognito status updates)
        const res = await axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`);
        setFavorites(res.data);
    } catch (err) {
        alert("Borsada işlem açılamadı: " + (err.response?.data?.error || err.message));
        console.error("Favori toggle error:", err);
    }
  };

  const handleChat = async () => {
    if(!chatInput.trim() || chatLoading) return;
    
    const userMsg = chatInput;
    const currentHistory = [...chatLog];
    
    setChatLog([...chatLog, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const resp = await axios.post('/api/analysis', { coin: userMsg, history: currentHistory });
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

  const closeUserTrade = async (e, tradeId) => {
      e.stopPropagation();
      setClosingTradeId(tradeId);
      try {
          await axios.post('/api/user-trades/close', { telegramId: user.telegramId, tradeId });
          const res = await axios.get(`/api/user-trades/${user.telegramId}?ts=${Date.now()}`);
          setUserTrades(res.data);
          const favRes = await axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`);
          setFavorites(favRes.data);
      } catch(err) {
          alert("Hata: " + (err.response?.data?.error || err.message));
      } finally {
          setClosingTradeId(null);
      }
  };

  const closeFavoriteTrade = async (e, signalId, currentPnl) => {
      e.stopPropagation();
      const actionText = user.isAdmin ? "BingX borsasındaki canlı işlemi anlık PnL ile" : "Bu işlemi sanal takipten";
      if (!window.confirm(`(${actionText}) sonlandırmak istiyor musunuz?`)) return;
      try {
          await axios.post('/api/favorites/close', {
              telegramId: user.telegramId,
              signalId,
              currentPnl
          });
          const res = await axios.get(`/api/favorites/${user.telegramId}?ts=${Date.now()}`);
          setFavorites(res.data);
      } catch (err) {
          alert("İşlem kapatılırken hata oluştu: " + (err.response?.data?.error || err.message));
          console.error("Favori kapatma hatası:", err);
      }
  };

  const renderTableHeader = () => (
      <div className="signal-row-header">
          <span>Varlık & Yön</span>
          <span style={{ textAlign: 'center' }}>Fiyat Tablosu</span>
          <span style={{ textAlign: 'center' }}>Sinyal Durumu</span>
          <span style={{ textAlign: 'center' }}>Anlık Fiyat</span>
          <span style={{ textAlign: 'center' }}>Canlı PnL</span>
          <span style={{ textAlign: 'right' }}>Aksiyon</span>
      </div>
  );

  const renderSignalCard = (s, isFavTab) => {
    const isLong = s.type === 'LONG';
    const isFav = favorites.some(f => f.id === s.id && f.status === 'ACTIVE');
    const userTrade = userTrades.find(t => t.signalId === s.id);
    const fmtPrice = val => {
        const v = parseFloat(val);
        if (isNaN(v)) return val;
        if (v >= 1000) return v.toLocaleString('en-US', {maximumFractionDigits:2});
        if (v >= 10) return v.toLocaleString('en-US', {maximumFractionDigits:3});
        return v.toLocaleString('en-US', {maximumFractionDigits:5});
    };
    
    const symbolKey = s.coin ? s.coin.replace('/', '') : s.symbol.replace('/', '');
    const currentPrice = livePrices[symbolKey];
    
    // Geçmiş işlem kontrolü
    const pastTrades = favorites.filter(f => f.id === s.id && f.status !== 'ACTIVE' && f.favoriteId !== s.favoriteId);
    const hasPastTrades = pastTrades.length > 0;
    
    let pnl = s.customPnl !== undefined && s.customPnl !== null ? s.customPnl : null;
    let blinkClass = '';
    let isProfit = false;
    let isBigProfit = false;
    
    if (currentPrice && s.status === 'ACTIVE') {
       const rawEntry = (s.entry || s.entryPrice || '').toString().replace(/[^0-9.]/g, '');
       const entry = parseFloat(rawEntry) || 0;
       
       if (entry > 0) {
           const spotPnl = isLong 
              ? ((currentPrice - entry) / entry) * 100 
              : ((entry - currentPrice) / entry) * 100;
           pnl = spotPnl * 10; // 10x ROE
       }
       
       isProfit = pnl > 0;
       isBigProfit = Math.abs(pnl) >= 10.0; // %10 ROE
       if (isBigProfit) {
           if (Math.abs(pnl) >= 30.0) blinkClass = isProfit ? 'blink-speed-3' : 'blink-speed-3-loss';
           else if (Math.abs(pnl) >= 20.0) blinkClass = isProfit ? 'blink-speed-2' : 'blink-speed-2-loss';
           else blinkClass = isProfit ? 'blink-speed-1' : 'blink-speed-1-loss';
       }
    }

    const isNew = newSignalIds.includes(s.id);

    return (
        <div className={`signal-card-row ${s.type} ${isNew ? 'new-signal-blink' : ''}`} key={isFavTab ? `fav-${s.favoriteId || s.id}` : s.id} onClick={() => setSelectedSignal(s)}>
            
            {/* Sütun 1: Varlık & Yön */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: isLong ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '14px' }}>
                    {isLong ? <TrendingUp color={isLong ? '#4ade80' : '#f87171'} size={20} /> : <TrendingDown color={isLong ? '#4ade80' : '#f87171'} size={20} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>{s.symbol}</span>
                    <span style={{ color: isLong ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.5px' }}>{s.type}</span>
                </div>
            </div>

            {/* Sütun 2: Fiyat Tablosu */}
            <div className="price-table-mobile">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>Giriş</span>
                    <span style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '600' }}>${fmtPrice(s.entryPrice)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>Hedef</span>
                    <span style={{ color: '#4ade80', fontSize: '0.95rem', fontWeight: '600' }}>${fmtPrice(s.targetPrice)}</span>
                    {s.entryPrice && s.targetPrice && <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: 'bold', marginTop: '2px' }}>(+%{(Math.abs(s.targetPrice - s.entryPrice) / s.entryPrice * 100).toFixed(2)})</span>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '2px' }}>Stop Loss</span>
                    <span style={{ color: '#f87171', fontSize: '0.95rem', fontWeight: '600' }}>${fmtPrice(s.stopPrice)}</span>
                    {s.entryPrice && s.stopPrice && <span style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: 'bold', marginTop: '2px' }}>(-%{(Math.abs(s.stopPrice - s.entryPrice) / s.entryPrice * 100).toFixed(2)})</span>}
                </div>
            </div>

            {/* Sütun 3: Kalite & Filtreler */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    <Zap color="#38bdf8" size={12} fill="#38bdf8" style={{marginRight: 4}} />
                    <span style={{color: '#38bdf8', fontSize: '0.8rem', fontWeight: 'bold'}}>Skor: {s.qualityScore || 0}</span>
                </div>
                {(s.dailyCount > 1 || (hasPastTrades && s.status === 'ACTIVE') || (s.warnings && s.warnings.includes('Flag'))) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                        {s.warnings && s.warnings.includes('Flag') && (
                            <Flag color="#ec4899" size={14} title="Bayrak Formasyonu" />
                        )}
                        {s.dailyCount > 1 && (
                            <AlertTriangle color="#f97316" size={14} title={`Gün: #${s.dailyCount}`} />
                        )}
                        {hasPastTrades && s.status === 'ACTIVE' && (
                            <RefreshCcw color="#a855f7" size={14} title="Tekrar İşlem" />
                        )}
                    </div>
                )}
                <span style={{ color: '#888', fontSize: '0.7rem' }}>{new Date(s.createdAt + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>

            {/* Sütun 4: Anlık Fiyat */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {currentPrice ? (
                    <>
                        <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>${fmtPrice(currentPrice)}</span>
                        {s.entryPrice && (
                            <span style={{ color: (s.type === 'LONG' ? (currentPrice > s.entryPrice) : (currentPrice < s.entryPrice)) ? '#4ade80' : '#f87171', fontSize: '0.75rem', marginTop: '4px', fontWeight: 'bold' }}>
                                (Mevcut)
                            </span>
                        )}
                    </>
                ) : (
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Veri Yok</span>
                )}
            </div>

            {/* Sütun 5: Canlı PnL Durumu */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {pnl !== null ? (
                    <div className={`pnl-badge ${pnl > 0 ? 'profit' : 'loss'} ${blinkClass}`} style={{ margin: 0, padding: '4px 12px', fontSize: '1rem' }}>
                        {pnl > 0 ? '+' : ''}{pnl.toFixed(2)}%
                    </div>
                ) : (
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>Veri Yok</span>
                )}
                {userTrade && userTrade.status === 'ACTIVE' && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bot size={14} color="#38bdf8" />
                        <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold' }}>Açık Otopilot</span>
                    </div>
                )}
                {userTrade && userTrade.status !== 'ACTIVE' && (
                    <span style={{ color: userTrade.pnl > 0 ? '#4ade80' : '#f87171', fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
                        Geçmiş: {userTrade.pnl > 0 ? '+' : ''}{userTrade.pnl.toFixed(2)}%
                    </span>
                )}
            </div>

            {/* Sütun 6: Aksiyon */}
            <div className={`action-column-mobile ${isFavTab && s.status === 'ACTIVE' ? 'has-buttons' : ''}`}>
                {isFavTab && s.status === 'ACTIVE' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {userTrade && userTrade.status === 'ACTIVE' && (
                            <button 
                                onClick={(e) => closeUserTrade(e, userTrade.id)}
                                disabled={closingTradeId === userTrade.id}
                                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                {closingTradeId === userTrade.id ? '...' : 'Oto Kapat'}
                            </button>
                        )}
                        <button 
                            onClick={(e) => closeFavoriteTrade(e, s.id, pnl || 0)}
                            style={{ background: pnl >= 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: pnl >= 0 ? '#4ade80' : '#ef4444', border: `1px solid ${pnl >= 0 ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            İşlemi Sonlandır
                        </button>
                    </div>
                ) : (
                    <Star color={isFav ? '#eab308' : '#555'} fill={isFav ? '#eab308' : 'none'} size={24} style={{cursor: 'pointer'}} onClick={(e) => { e.stopPropagation(); toggleFavorite(s); }} />
                )}
            </div>
        </div>
    );
  };

  if(!user) return null;

  return (
    <div className="dashboard-layout" style={{ position: 'relative' }}>
      
      {/* Background Orbs for Glassmorphism */}
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* MOBILE TOP HEADER */}
      <div className="mobile-top-header">
         <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => handleTabClick('markets')}>
            <img src="/logo.jpg" alt="Elyte Logo" style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid rgba(74, 222, 128, 0.3)' }} />
            <h2 style={{ letterSpacing: 1, fontSize: '1.2rem', margin: 0, color: '#ffffff', textShadow: '0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)', fontWeight: '900' }}>ELYTE</h2>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
                onClick={() => setIsChatOpen(o => !o)} 
                style={{ background: isChatOpen ? 'rgba(255,255,255,0.1)' : '#3b82f6', border: 'none', color: isChatOpen ? '#aaa' : '#fff', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: isChatOpen ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.4)' }}
            >
                {isChatOpen ? <X size={20} /> : <MessageSquare size={18} />}
            </button>
            <img src={user.photo || 'https://randomuser.me/api/portraits/lego/1.jpg'} style={{ width: 34, height: 34, borderRadius: 17, border: '2px solid rgba(255,255,255,0.1)' }}/>
            <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                <LogOut size={22} />
            </button>
         </div>
      </div>

      {/* SIDEBAR */}
      <div className="sidebar">
        <div 
          onClick={() => handleTabClick('markets')}
          style={{ padding: '2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <img src="/logo.jpg" alt="Elyte Logo" style={{ width: '48px', height: '48px', borderRadius: '14px', objectFit: 'cover', border: '1px solid rgba(74, 222, 128, 0.3)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} />
          <h2 style={{ letterSpacing: 1, fontSize: '1.4rem', color: '#ffffff', textShadow: '0 0 12px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.4)', fontWeight: '900' }}>ELYTE</h2>
        </div>
        
        <div style={{ padding: '1.5rem 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ color: '#666', fontSize: '0.75rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '24px' }}>ANA MENÜ</p>
            
            <div className={`sidebar-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabClick('home')}>
               <Home size={20} />
               <span>Ana Sayfa</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => handleTabClick('markets')}>
               <Activity size={20} />
               <span>Sinyaller</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => handleTabClick('portfolio')}>
               <Briefcase size={20} />
               <span>Varlık Yöneticisi</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => handleTabClick('favorites')}>
               <Star size={20} />
               <span>Favoriler</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleTabClick('stats')}>
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
                        {(() => {
                            const getTradingViewSymbol = (symbol) => {
                                const s = symbol.replace('/', '');
                                const tvMap = {
                                    'SP500': 'SP:SPX',
                                    'NASDAQ100': 'NASDAQ:NDX',
                                    'DOW': 'DJI',
                                    'GOLD': 'OANDA:XAUUSD',
                                    'XAGUSD': 'OANDA:XAGUSD',
                                    'BRENT': 'TVC:UKOIL',
                                    'WTI': 'TVC:USOIL',
                                    'EURUSD': 'OANDA:EURUSD',
                                    'AAPL': 'NASDAQ:AAPL',
                                    'TSLA': 'NASDAQ:TSLA',
                                    'NVDA': 'NASDAQ:NVDA',
                                    'AMD': 'NASDAQ:AMD',
                                    'MSFT': 'NASDAQ:MSFT',
                                    'COIN': 'NASDAQ:COIN',
                                    'HOOD': 'NASDAQ:HOOD'
                                };
                                if (tvMap[s]) return tvMap[s];
                                if (!s.includes('USDT')) return `NASDAQ:${s}`;
                                return `BINGX:${s}.P`;
                            };
                            
                            const tvSymbol = getTradingViewSymbol(selectedSignal.coin || selectedSignal.symbol);
                            
                            return (
                                <iframe 
                                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(tvSymbol)}&interval=60&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    allowTransparency="true"
                                    scrolling="no"
                                    allowFullScreen
                                ></iframe>
                            );
                        })()}
                    </div>
                </div>

                {favorites.filter(f => f.id === selectedSignal.id && f.status !== 'ACTIVE').length > 0 && (
                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#162336', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
                            <History size={18} color="#a855f7" style={{ marginRight: '8px' }} />
                            Kişisel Geçmişte Bu Sinyaldeki İşlemlerin
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {favorites.filter(f => f.id === selectedSignal.id && f.status !== 'ACTIVE').map(past => (
                                <div key={`past-${past.favoriteId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px' }}>
                                    <span style={{ color: '#888', fontSize: '0.9rem' }}>{new Date(past.closedAt + 'Z').toLocaleString('tr-TR')}</span>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={{ color: past.status === 'WIN' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{past.status}</span>
                                        <div style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: past.status === 'WIN' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)' }}>
                                            <span style={{ color: past.status === 'WIN' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>%{past.customPnl?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                            <span style={{ color: '#666', fontSize: '0.8rem', marginLeft: '6px' }}>
                                                {pt.createdAt ? new Date(pt.createdAt + 'Z').toLocaleString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                                            </span>
                                        </div>
                                        <div style={{ color: pt.status === 'WIN' ? '#4ade80' : pt.status === 'BREAKEVEN' ? '#94a3b8' : '#f87171', fontWeight: 'bold', fontSize: '0.9rem', background: pt.status === 'WIN' ? 'rgba(74,222,128,0.15)' : pt.status === 'BREAKEVEN' ? 'rgba(148,163,184,0.15)' : 'rgba(248,113,113,0.15)', padding: '4px 10px', borderRadius: '8px' }}>
                                            {pt.status === 'WIN' ? 'KAZANÇ (TP)' : pt.status === 'BREAKEVEN' ? 'BAŞABAŞ (BE)' : 'KAYIP (SL)'} ({parseFloat(pt.calculatedPnl) > 0 ? '+' : ''}{pt.calculatedPnl}%)
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
        {activeTab === 'home' && (
            <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, background: 'linear-gradient(90deg, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Periskop Makro Pusula
                    </h1>
                    <p style={{ color: '#888', marginTop: '8px' }}>Yapay zeka tarama motorunu yöneten küresel piyasa yön sensörleri.</p>
                </div>
                
                {macroData ? (
                    <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        
                        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: macroData.btcTrend?.includes('BULL') ? '#4ade80' : '#ef4444', filter: 'blur(80px)', opacity: 0.15 }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                                    <Target size={24} color="#facc15" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Bitcoin Dominansı</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                                    %{macroData.cgDom?.btc?.toFixed(2) || '0.00'}
                                </div>
                                <span style={{ color: macroData.btcTrend?.includes('BULL') ? '#4ade80' : '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    BTC ({macroData.btcTrend === 'STRONG_BULL' ? 'GÜÇLÜ BOĞA' : (macroData.btcTrend === 'BULL' ? 'BOĞA' : (macroData.btcTrend === 'STRONG_BEAR' ? 'GÜÇLÜ AYI' : (macroData.btcTrend === 'BEAR' ? 'AYI' : 'NÖTR')))})
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Math.max(0, macroData.cgDom?.btc || 0))}%`, height: '100%', background: 'linear-gradient(90deg, #facc15, #f59e0b)', borderRadius: '3px', transition: 'width 1s ease-in-out' }}></div>
                            </div>
                            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '12px' }}>Kripto piyasasındaki toplam paranın yüzde kaçının Bitcoin'de olduğunu gösterir.</p>
                        </div>

                        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: macroData.cgDom?.usdt > 5 ? '#ef4444' : '#4ade80', filter: 'blur(80px)', opacity: 0.15 }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                                    <AlertTriangle size={24} color="#22d3ee" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>USDT Dominansı (Korku)</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                                    %{macroData.cgDom?.usdt?.toFixed(2) || '0.00'}
                                </div>
                                <span style={{ color: macroData.cgDom?.usdt > 5 ? '#ef4444' : '#4ade80', fontWeight: 'bold' }}>
                                    {macroData.cgDom?.usdt > 5 ? '🛑 YÜKSEK RİSK' : '✅ GÜVENLİ LİKİDİTE'}
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Math.max(0, macroData.cgDom?.usdt || 0))}%`, height: '100%', background: 'linear-gradient(90deg, #22d3ee, #0891b2)', borderRadius: '3px', transition: 'width 1s ease-in-out' }}></div>
                            </div>
                            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '12px' }}>Yatırımcıların nakitte bekleme oranıdır. Yükselmesi korkuyu, düşmesi piyasaya para girdiğini anlatır. %5 üzeri risklidir.</p>
                        </div>

                        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#c084fc', filter: 'blur(80px)', opacity: 0.15 }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                                    <Rocket size={24} color="#c084fc" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Altcoin Dominansı</h3>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                                    %{macroData.cgDom?.alt?.toFixed(2) || '0.00'}
                                </div>
                                <span style={{ color: macroData.ethTrend?.includes('BULL') ? '#4ade80' : '#ef4444', fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    ETH ({macroData.ethTrend?.includes('BULL') ? 'BOĞA' : (macroData.ethTrend?.includes('BEAR') ? 'AYI' : 'NÖTR')})
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '12px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Math.max(0, macroData.cgDom?.alt || 0))}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', borderRadius: '3px', transition: 'width 1s ease-in-out' }}></div>
                            </div>
                            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '12px' }}>Altcoinlere akan hacim. Ethereum (ETH) Proxy'si ile birlikte teyit edilir.</p>
                        </div>


                        {/* --- YENİ EKLENEN: NASDAQ QUANT HEDGE FUND PANELİ --- */}
                        {riskData && (
                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', gridColumn: '1 / -1' }}>
                                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: riskData.appetite.includes('Off') ? '#ef4444' : '#10b981', filter: 'blur(80px)', opacity: 0.15 }}></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                                        <Briefcase size={24} color="#fff" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Hedge Fund: Nasdaq Barometresi</h3>
                                        <span style={{ color: riskData.appetite.includes('Off') ? '#ef4444' : '#10b981', fontWeight: 'bold' }}>{riskData.appetite}</span>
                                    </div>
                                </div>
                                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '16px' }}>ABD teknoloji devlerinin gelir büyümesi ile mevcut fiyatlanma rasyolarımının (Forward P/E) çarpıştırılması sonucu analiz edilmiştir.</p>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
                                    {/* Table Header */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr', padding: '0 16px', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                                        <span>Sembol / F/K</span>
                                        <span style={{ textAlign: 'center' }}>Performans (G / H / A)</span>
                                        <span style={{ textAlign: 'center' }}>Kurumsal Akış</span>
                                        <span style={{ textAlign: 'center' }}>Hacim</span>
                                        <span style={{ textAlign: 'right' }}>Yapay Zeka Kararı</span>
                                    </div>
                                    
                                    {riskData.stocks && riskData.stocks.map((stock, i) => (
                                        <div 
                                            key={i} 
                                            onClick={() => setSelectedStock(stock)}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1.5fr 1fr 1fr', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)' }}
                                        >
                                            {/* Column 1: Symbol & P/E */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ color: '#fff', fontWeight: '800', fontSize: '1.1rem', letterSpacing: '0.5px' }}>{stock.symbol}</span>
                                                <span style={{ color: '#888', fontSize: '0.8rem' }}>Forward F/K: <span style={{ color: '#aaa' }}>{stock.pe?.toFixed(1)}</span></span>
                                            </div>

                                            {/* Column 2: Returns */}
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                                                    <span style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>Günlük</span>
                                                    <span style={{ color: stock.daily >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{stock.daily > 0 ? '+' : ''}{(stock.daily || 0).toFixed(1)}%</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                                                    <span style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>Haftalık</span>
                                                    <span style={{ color: stock.weekly >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{stock.weekly > 0 ? '+' : ''}{(stock.weekly || 0).toFixed(1)}%</span>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '8px' }}>
                                                    <span style={{ color: '#64748b', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>Aylık</span>
                                                    <span style={{ color: stock.monthly >= 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{stock.monthly > 0 ? '+' : ''}{(stock.monthly || 0).toFixed(1)}%</span>
                                                </div>
                                            </div>

                                            {/* Column 3: Institutional Flow */}
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <div style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', background: (stock.instFlow || '').includes('Alım') ? 'rgba(74, 222, 128, 0.1)' : ((stock.instFlow || '').includes('Satış') ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255,255,255,0.05)'), color: (stock.instFlow || '').includes('Alım') ? '#4ade80' : ((stock.instFlow || '').includes('Satış') ? '#f87171' : '#aaa'), border: `1px solid ${(stock.instFlow || '').includes('Alım') ? 'rgba(74, 222, 128, 0.2)' : ((stock.instFlow || '').includes('Satış') ? 'rgba(248, 113, 113, 0.2)' : 'rgba(255,255,255,0.1)')}` }}>
                                                    {(stock.instFlow || '').includes('Güçlü') && <Zap size={14} fill="currentColor" />}
                                                    {stock.instFlow || '-'}
                                                </div>
                                            </div>

                                            {/* Column 4: Volume Status */}
                                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '20px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: (stock.volume || '').includes('Aşırı') ? '#eab308' : ((stock.volume || '').includes('Yüksek') ? '#4ade80' : '#94a3b8'), boxShadow: (stock.volume || '').includes('Yüksek') ? '0 0 10px currentColor' : 'none', animation: (stock.volume || '').includes('Aşırı') ? 'pulse 1.5s infinite' : 'none' }}></div>
                                                    <span style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: '500' }}>{stock.volume || '-'}</span>
                                                </div>
                                            </div>

                                            {/* Column 5: Status Badge */}
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                <span style={{ color: stock.redFlag ? '#f87171' : '#4ade80', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', textShadow: `0 0 10px ${stock.redFlag ? 'rgba(248, 113, 113, 0.4)' : 'rgba(74, 222, 128, 0.4)'}` }}>
                                                    {stock.redFlag ? <AlertTriangle size={16} /> : <ThumbsUp size={16} />}
                                                    {stock.redFlag ? 'Aşırı Fiyatlandı' : (stock.score > 1.2 ? 'Güçlü Büyüme' : 'Dengeli')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
                        
                        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#3b82f6', filter: 'blur(80px)', opacity: 0.15 }}></div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                                        <Wallet size={24} color="#3b82f6" />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>BingX Aktif Kasa</h3>
                                </div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                                    ${isAdmin && adminBalance !== null ? adminBalance.toFixed(2) : (stats ? (500 + stats.totalProfit).toFixed(2) : '500.00')}
                                </div>
                            </div>
                            <span style={{ color: (isAdmin && adminBalance && adminBalance >= 500) || (!isAdmin && stats?.totalProfit >= 0) ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {(isAdmin && adminBalance && adminBalance >= 500) || (!isAdmin && stats?.totalProfit >= 0) ? <TrendingUp size={16}/> : <TrendingDown size={16}/>} 
                                {(isAdmin && adminBalance && adminBalance >= 500) || (!isAdmin && stats?.totalProfit >= 0) ? 'Net Kar Pozitif' : 'Net Kar Negatif'}
                            </span>
                        </div>

                        <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: '#ec4899', filter: 'blur(80px)', opacity: 0.15 }}></div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '12px' }}>
                                        <Zap size={24} color="#ec4899" />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Algoritma Performansı <span style={{fontSize:'0.8rem', color:'#aaa'}}>(7 Günlük)</span></h3>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                                        %{((weeklyStats || stats)?.winRate || 0).toFixed(1)}
                                    </div>
                                    <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Kazanma Oranı (WR)</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}><strong style={{color: '#fff'}}>{(weeklyStats || stats)?.totalSignals || 0}</strong> Sinyal</span>
                                <span style={{ color: '#4ade80', fontSize: '0.85rem' }}><strong style={{color: '#4ade80'}}>{(weeklyStats || stats)?.wins || 0}</strong> Başarı</span>
                                <span style={{ color: '#f87171', fontSize: '0.85rem' }}><strong style={{color: '#f87171'}}>{(weeklyStats || stats)?.losses || 0}</strong> Hata</span>
                            </div>
                        </div>
                    </div>
                    </>
                ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                         <RefreshCcw size={32} className="spinning" style={{ opacity: 0.5, marginBottom: '10px' }}/>
                         <div>Makro veriler analiz ediliyor...</div>
                    </div>
                )}

                {/* NASIL YORUMLANMALI AÇIKLAMA PANELİ */}
                <div style={{ marginTop: '30px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '24px', padding: '24px' }}>
                     <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <Map size={24} /> Makro Pusula Nasıl Yorumlanır?
                     </h3>
                     <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)'}}>
                             <strong style={{color: '#facc15', fontSize: '1.05rem', display: 'block', marginBottom: '6px'}}>1. Bitcoin Dominansı & Ana Yönü</strong>
                             <span style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: '1.6' }}>Piyasadaki total paranın Bitcoin'deki ağırlığını gösterir. Dominansın artması piyasanın Bitcoin'e güvendiğini anlatır. Ayrıca yanındaki yön belirteci <span style={{ color: '#4ade80', fontWeight: 'bold' }}>BOĞA</span> ise robot fiyatların yükseleceğini öngörerek Long (Alım) işlemlere ağırlık verir; <span style={{ color: '#ef4444', fontWeight: 'bold' }}>AYI</span> ise düşüş tehlikesi sebebiyle sistemi korumaya alır.</span>
                         </div>
                         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)'}}>
                             <strong style={{color: '#22d3ee', fontSize: '1.05rem', display: 'block', marginBottom: '6px'}}>2. USDT (Tether) Dominansı</strong>
                             <span style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: '1.6' }}>Yatırımcıların mevcut varlıklarını Dolarda (nakitte) tutma oranını gösterir. Bu oran %5'in üzerine çıktığında piyasada <span style={{ color: '#ef4444', fontWeight: 'bold' }}>KORKU</span> hakim demektir ve nakite kaçış hızlanmıştır. Oran düştükçe, sisteme taze para pompalanıyor demektir.</span>
                         </div>
                         <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.02)'}}>
                             <strong style={{color: '#c084fc', fontSize: '1.05rem', display: 'block', marginBottom: '6px'}}>3. Altcoin Dominansı & ETH Yönü</strong>
                             <span style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: '1.6' }}>Bitcoin dışındaki altcoin (Ethereum vb.) projelerine akan paranın yüzdesini gösterir. Ethereum (ETH) yönünün Boğa olması ve dominansın artması, Alt Sezon adı verilen harika yükseliş fırsatlarının kapıda olduğunu işaret eder.</span>
                         </div>
                     </div>
                </div>
            </div>
        )}

        {activeTab === 'markets' && (
          <>
             <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <h1 style={{ fontSize: '2rem', margin: 0, fontWeight: '800' }}>Canlı Akış</h1>
                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.9rem', cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="ALL" style={{color: '#000'}}>Hepsi</option>
                            <option value="CRYPTO" style={{color: '#000'}}>Kripto</option>
                            <option value="ASSETS" style={{color: '#000'}}>Varlıklar</option>
                        </select>
                    </div>
                    {activeMainSignals.length > 0 && (
                        <div className={marketPnlBlinkClass} style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '10px', border: marketPnlBlinkClass ? undefined : `1px solid ${marketPnlColor}66`, transition: 'all 0.3s' }}>
                            <span style={{ color: '#888', fontSize: '0.9rem', marginRight: '6px' }}>Net:</span>
                            <span style={{ color: marketPnlColor, fontWeight: 'bold', fontSize: '1.2rem', textShadow: marketPnlBlinkClass ? 'none' : `0 0 10px ${marketPnlColor}40` }}>
                                {marketPnlSign}${Math.abs(totalMarketPnl).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
                <p style={{ color: '#888', fontSize: '1rem', marginBottom: '16px' }}>Periskop yapay zeka analiz motorunun anlık tespitleri.</p>

                <div className="stats-scroll-container" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                   <style>{`.stats-scroll-container::-webkit-scrollbar { display: none; }`}</style>
                   
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'nowrap' }}>
                       <Activity size={16} color="#888" />
                       <span style={{ color: '#888', fontWeight: '500', fontSize: '0.85rem' }}>Aktif:</span> 
                       <span style={{ color: '#fff', fontWeight: '800', fontSize: '0.95rem' }}>{activeMainSignals.length}</span>
                   </div>
                   
                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.05)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', whiteSpace: 'nowrap' }}>
                       <TrendingUp size={16} color="#10b981" />
                       <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem' }}>{mainLongs} LONG</span>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.05)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)', whiteSpace: 'nowrap' }}>
                       <TrendingDown size={16} color="#ef4444" />
                       <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem' }}>{mainShorts} SHORT</span>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(74, 222, 128, 0.05)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(74, 222, 128, 0.1)', whiteSpace: 'nowrap' }}>
                       <Target size={16} color="#4ade80" />
                       <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem' }}>{mainProfitCount} Kâr</span>
                   </div>

                   <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(248, 113, 113, 0.05)', backdropFilter: 'blur(10px)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(248, 113, 113, 0.1)', whiteSpace: 'nowrap' }}>
                       <AlertTriangle size={16} color="#f87171" />
                       <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.9rem' }}>{mainLossCount} Zarar</span>
                   </div>
                </div>
             </div>
            
            {loading ? (
               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '15px' }}>
                   <Activity size={32} color="#4ade80" />
                   <p style={{ color: '#888' }}>Sinyaller Taranıyor...</p>
               </div>
            ) : (
                <div className="signals-list">
                    {renderTableHeader()}
                    {activeMainSignals.length === 0 ? (
                        <div className="glass" style={{ padding: '3rem', textAlign: 'center', gridColumn: '1 / -1', borderRadius: '20px' }}>
                            <Target size={40} color="#888" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ color: '#aaa', marginBottom: '0.5rem' }}>Aktif Fırsat Yok</h3>
                            <p style={{ color: '#666' }}>Piyasa koşulları şu an Elliott sarmalına uygun değil, lütfen bekleyin.</p>
                        </div>
                    ) : activeMainSignals.map(s => renderSignalCard(s, false))}
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
                    <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '4px' }}>İzleme listenizde {favorites.filter(s => s.status === 'ACTIVE').length} işlem var.</p>
                  </div>
               </div>
               {favorites.some(s => s.status === 'ACTIVE') && (
                   <div style={{ textAlign: 'right' }}>
                       <span className={totalPnlBlinkClass} style={{ fontSize: '1.4rem', fontWeight: 'bold', color: totalPnlColor, textShadow: totalPnlBlinkClass ? 'none' : `0 0 10px ${totalPnlColor}40`, padding: '4px 12px', borderRadius: '8px', border: totalPnlBlinkClass ? undefined : '1px solid transparent', transition: 'all 0.3s' }}>
                           {totalPnlSign}${Math.abs(totalFavPnl).toFixed(2)}
                       </span>
                   </div>
               )}
            </div>

            {/* PERSONAL PERFORMANCE GRID */}
            <div style={{ background: 'rgba(22, 35, 54, 0.4)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Kişisel Performans</h3>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    
                    {/* TP Hit */}
                    <div 
                        onClick={() => setFavFilter(favFilter === 'WIN' ? 'ACTIVE' : 'WIN')}
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
                        onClick={() => setFavFilter(favFilter === 'LOSS' ? 'ACTIVE' : 'LOSS')}
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

                    {/* $10 Sabit Margin PNL / Kasa Tutarı */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: (isAdmin && adminBalance) || theoreticalClosedUsd >= 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', padding: '12px', borderRadius: '12px' }}>
                            <Rocket color={(isAdmin && adminBalance) || theoreticalClosedUsd >= 0 ? '#4ade80' : '#f87171'} size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: (isAdmin && adminBalance) || theoreticalClosedUsd >= 0 ? '#4ade80' : '#f87171' }}>
                                ${isAdmin && adminBalance !== null ? adminBalance.toFixed(2) : (500 + theoreticalClosedUsd).toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>{isAdmin ? 'Gerçek BingX Kasa' : 'Güncel Kasa Hesabı'}</div>
                        </div>
                    </div>

                </div>
            </div>

            {displayedFavorites.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column' }}>
                   <Star size={48} color="#eab308" style={{ opacity: 0.5 }} />
                   <h2 style={{ marginTop: '1rem', color: '#888' }}>{favFilter === 'ACTIVE' ? 'Aktif Favoriniz Yok' : (favFilter === 'WIN' ? 'Henüz TP olan işleminiz yok.' : (favFilter === 'ALL' ? 'İzleme listeniz tamamen boş.' : 'Henüz SL olan işleminiz yok.'))}</h2>
                </div>
            ) : (
                <div className="signals-list">
                   {renderTableHeader()}
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
                        <PieChart size={28} color="#4ade80" /> Elyte İstatistikleri
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: '2rem' }}>Aşağıdaki veriler, $500 ana kasa ve işlem başına $10 (1R) risk alındığı varsayılarak hesaplanmaktadır. Borsanın kesmiş olduğu işlem açma-kapama komisyonları, slippage (kayma) ve fonlama giderleri de bu tabloya net olarak dahil edilmiştir.</p>

                    <div style={{
                        background: '#162336', padding: '1.5rem', borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                           {isAdmin ? 'Gerçek Anlık Borsa (BingX) Seçkin Kasa' : 'Güncel Kasa Bakiyesi (Başlangıç: $500)'}
                        </p>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: (isAdmin && adminBalance) || stats.totalProfit >= 0 ? '#4ade80' : '#f87171' }}>
                            ${isAdmin && adminBalance !== null ? adminBalance.toFixed(2) : (500 + stats.totalProfit).toFixed(2)}
                        </h1>
                        <p style={{marginTop: '10px'}}>
                            <span style={{color: (isAdmin && adminBalance && adminBalance >= 500) || (!isAdmin && stats.totalProfit >= 0) ? '#4ade80' : '#f87171', fontWeight: 'bold'}}>
                                {isAdmin && adminBalance !== null ? (adminBalance >= 500 ? '+' : '') + (adminBalance - 500).toFixed(2) : (stats.totalProfit >= 0 ? '+' : '') + stats.totalProfit.toFixed(2)} Net Büyüme (PnL)
                            </span>
                        </p>
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
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Başarılı (TP)</p>
                            <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '4px' }}>Tıkla ve İncele</p>
                        </div>
                        <div 
                            style={{
                                flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', position: 'relative', cursor: 'pointer'
                            }}
                            onClick={() => loadHistoryData('BREAKEVEN')}
                        >
                            <Target color="#94a3b8" size={32} style={{ margin: '0 auto' }} />
                            <div style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'rgba(148, 163, 184, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 'bold' }}>0.0%</span>
                            </div>
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>{stats.breakevens || 0}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Başabaş (BE)</p>
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
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Stop (SL)</p>
                            <p style={{ color: '#666', fontSize: '0.7rem', marginTop: '4px' }}>Tıkla ve İncele</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <Target color="#3b82f6" size={32} style={{ margin: '0 auto' }} />
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>%{stats.winRate.toFixed(1)}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Kazanma Oranı</p>
                        </div>
                        <div style={{ flex: 1, minWidth: '150px', background: '#162336', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                            <Zap color="#eab308" size={32} style={{ margin: '0 auto' }} />
                            <h2 style={{ margin: '1rem 0 0.25rem 0', fontSize: '1.75rem', color: '#fff' }}>{stats.totalSignals}</h2>
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: 0 }}>Toplam Sinyal</p>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(234, 179, 8, 0.1)', padding: '1.5rem', borderRadius: '16px',
                        border: '1px solid rgba(234, 179, 8, 0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>✨</span>
                            <span style={{ color: '#eab308', fontWeight: 'bold' }}>+%2 Kârı Gören İşlemler</span>
                        </div>
                        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#fff' }}>{stats.reachedTwoPercentCount} <span style={{ fontSize: '1rem', color: '#aaa', fontWeight: 'normal' }}>işlem</span></h2>
                        <p style={{ color: '#ccc', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>İşlem aktifken en az +%2 kâra ulaşan güçlü sinyallerin toplam sayısıdır. (İşlem sonrasında stop-loss kapanmış olsa bile buraya yansır)</p>
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
                  <div className="signals-list">
                      {renderTableHeader()}
                      {historicalSignals.map(s => renderSignalCard(s, false))}
                  </div>
              )}
          </div>
        )}

        {activeTab === 'portfolio' && (
            <PortfolioManager />
        )}
        </>
        )}
      </div>

      {/* FLOATING ACTION BUTTON WITH ANIMATED PERISCOPE */}
      <div 
         className="chat-fab-wrapper"
         style={{ position: 'fixed', bottom: '24px', right: '24px', width: '60px', height: '60px', zIndex: 1000 }}
         onMouseEnter={() => setIsHoveringChat(true)}
         onMouseLeave={() => { setIsHoveringChat(false); setMousePos({ x: 0, y: 0 }); }}
         onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            // X and Y offsets relative to the center of the fab wrapper (+/- 30 max)
            const xOffset = e.clientX - rect.left - rect.width / 2;
            const yOffset = e.clientY - rect.top - rect.height / 2;
            setMousePos({ x: xOffset, y: yOffset }); 
         }}
      >
          {/* AUTO-POKE SPEECH BUBBLE (Left side of button) */}
          {isAutoPoking && !isChatOpen && (
              <div style={{
                  position: 'absolute',
                  bottom: '10px', // Align near the bottom of the fab
                  right: '120%', // Push it to the left of the fab wrapper
                  width: '250px',
                  background: 'rgba(15, 23, 42, 0.70)', // Transparent dark glassy look
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  borderBottomRightRadius: '4px', // Tail pointing to the right towards the button
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  zIndex: 1100,
                  animation: 'fadeIn 0.3s ease-out forwards',
                  border: '1px solid rgba(56, 189, 248, 0.2)'
              }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '6px', color: '#38bdf8', letterSpacing: '0.5px' }}>Periskop AI</div>
                  Merhaba! İşlemlerinizle ilgili yardımcı olabilirim, sohbet etmek için bana tıklamanız yeterlidir.
              </div>
          )}

          {/* THE PERISCOPE BOT INCORPORATION */}
          <div 
             style={{
                position: 'absolute',
                top: 0,
                left: '2px',
                width: '56px',
                height: '80px',
                background: 'transparent',
                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s',
                transform: ((isHoveringChat || isAutoPoking) && !isChatOpen) ? `translateY(-75px)` : 'translateY(15px)',
                opacity: ((isHoveringChat || isAutoPoking) && !isChatOpen) ? 1 : 0,
                zIndex: -1,
                pointerEvents: 'none',
             }}
          >
              <svg viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.5))' }}>
                  <defs>
                      <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#475569" />
                          <stop offset="50%" stopColor="#94a3b8" />
                          <stop offset="100%" stopColor="#334155" />
                      </linearGradient>
                      <linearGradient id="lens" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0ea5e9" />
                          <stop offset="100%" stopColor="#1e3a8a" />
                      </linearGradient>
                  </defs>

                  {/* Base / Neck emerging from button */}
                  <path d="M 35 150 L 35 70 C 35 60, 65 60, 65 70 L 65 150 Z" fill="url(#metal)" />
                  
                  {/* Neck horizontal joints */}
                  <rect x="32" y="110" width="36" height="6" rx="3" fill="#1e293b" />
                  <rect x="32" y="130" width="36" height="6" rx="3" fill="#1e293b" />
                  <rect x="32" y="90" width="36" height="6" rx="3" fill="#1e293b" />

                  {/* Main Head that rotates and tracks in 3D using pseudo-parallax layers */}
                  <g style={{ transform: `rotate(${mousePos.x / 2.5}deg) translateY(${mousePos.y / 5}px)`, transformOrigin: '50px 50px', transition: 'transform 0.1s linear' }}>
                      {/* Layer 1: Outer Head casing (Moves slightly to show rotation) */}
                      <rect x={10 + mousePos.x/15} y={20 + mousePos.y/15} width="80" height="60" rx="30" fill="url(#metal)" stroke="#1e293b" strokeWidth="3" />
                      
                      {/* Layer 2: Inner black lens housing */}
                      <circle cx={50 + mousePos.x/8} cy={50 + mousePos.y/8} r="22" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                      
                      {/* Layer 3: Blue Glowing Lens */}
                      <circle cx={50 + mousePos.x/5} cy={50 + mousePos.y/5} r="16" fill="url(#lens)" />
                      
                      {/* Layer 4: Inner cyan glowing pupil moving furthest representing the camera retina */}
                      <circle cx={50 + mousePos.x/3} cy={50 + mousePos.y/3} r="5" fill="#22d3ee" style={{ filter: 'drop-shadow(0 0 5px #22d3ee)' }} />
                      
                      {/* Layer 5: Lens reflection (highlight) staying relatively fixed to light source */}
                      <path d={`M ${40 + mousePos.x/10} ${40 + mousePos.y/10} Q ${50 + mousePos.x/10} ${32 + mousePos.y/10} ${60 + mousePos.x/10} ${40 + mousePos.y/10} A 14 14 0 0 0 ${40 + mousePos.x/10} ${40 + mousePos.y/10}`} fill="rgba(255,255,255,0.4)" />
                  </g>
              </svg>
          </div>

          {/* WRAPPED CHAT TRIGGER */}
          <div 
             className="chat-fab" 
             onClick={() => setIsChatOpen(!isChatOpen)}
             style={{ position: 'relative', bottom: 'auto', right: 'auto', margin: 0 }}
          >
              {isChatOpen ? <X size={28} /> : <MessageSquare size={28} />}
          </div>
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
                   <p style={{ fontSize: '0.8rem', color: '#888' }}>Gemini 2.5 Pro ile desteklenir</p>
                </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
                <X size={24} />
            </button>
         </div>
         
         <div className="chat-messages">
             {chatLog.map((chat, i) => (
                 <div key={i} className={`chat-bubble ${chat.sender}`}>
                     <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{chat.text}</p>
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

      {/* MOBILE BOTTOM NAV */}
      <div className="mobile-bottom-nav">
         <div className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabClick('home')}>
             <Home size={24} color={activeTab === 'home' ? '#ec4899' : '#888'} />
             <span style={{ color: activeTab === 'home' ? '#ec4899' : '#888' }}>Ana Sayfa</span>
         </div>
         <div className={`bottom-nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => handleTabClick('portfolio')}>
             <Briefcase size={24} color={activeTab === 'portfolio' ? '#8b5cf6' : '#888'} />
             <span style={{ color: activeTab === 'portfolio' ? '#8b5cf6' : '#888' }}>Varlıklar</span>
         </div>
         <div className={`bottom-nav-item ${activeTab === 'markets' ? 'active' : ''}`} onClick={() => handleTabClick('markets')}>
             <Activity size={24} color={activeTab === 'markets' ? '#4ade80' : '#888'} />
             <span style={{ color: activeTab === 'markets' ? '#4ade80' : '#888' }}>Sinyaller</span>
         </div>
         <div className={`bottom-nav-item ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => handleTabClick('favorites')}>
             <Star size={24} color={activeTab === 'favorites' ? '#eab308' : '#888'} />
             <span style={{ color: activeTab === 'favorites' ? '#eab308' : '#888' }}>Favoriler</span>
         </div>
         <div className={`bottom-nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => handleTabClick('stats')}>
             <PieChart size={24} color={activeTab === 'stats' ? '#3b82f6' : '#888'} />
             <span style={{ color: activeTab === 'stats' ? '#3b82f6' : '#888' }}>İstatistik</span>
         </div>
      </div>

      {showVipModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,22,35,0.92)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
             <div style={{ backgroundColor: '#162336', padding: '30px 24px', borderRadius: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid #4ade80', boxShadow: '0 0 30px rgba(74, 222, 128, 0.2)' }}>
                 <img src={user?.photo || 'https://randomuser.me/api/portraits/lego/1.jpg'} style={{ width: '80px', height: '80px', borderRadius: '40px', marginBottom: '15px', border: '2px solid #4ade80' }} alt="User Profile" />
                 <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>Hoş Geldin, {user?.name}!</h2>
                 <p style={{ color: '#aaa', fontSize: '1rem', textAlign: 'center', marginBottom: '30px', lineHeight: '1.6' }}>
                     Elyte Signals topluluğuna katılarak canlı analizleri ve asıl bomba Setup'ları yakından takip edebilirsin.
                 </p>
                 <button 
                     onClick={() => { window.open('https://t.me/+Rw9Ea6LPHFgwZDU0', '_blank'); setShowVipModal(false); }}
                     style={{ backgroundColor: '#2AABEE', color: '#fff', border: 'none', padding: '16px 30px', borderRadius: '14px', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', marginBottom: '16px', boxShadow: '0 4px 12px rgba(42, 171, 238, 0.3)' }}
                 >
                     <Send size={20} style={{ marginRight: '10px' }} /> VIP Gruba Katıl
                 </button>
                 <button 
                     onClick={() => setShowVipModal(false)}
                     style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '0.9rem', cursor: 'pointer', padding: '10px' }}
                 >
                     Daha Sonra Belki
                 </button>
             </div>
          </div>
      )}
      {selectedStock && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: '#1e293b', border: `1px solid ${selectedStock.redFlag ? '#ef4444' : '#10b981'}`, borderRadius: '24px', padding: '24px', width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                  <button onClick={() => setSelectedStock(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10, transition: '0.2s', ':hover': { background: 'rgba(255,255,255,0.2)' } }}>
                      <X size={20} />
                  </button>
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '120px', height: '120px', background: selectedStock.redFlag ? '#ef4444' : '#10b981', filter: 'blur(70px)', opacity: 0.2 }}></div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '48px' }}>
                      {selectedStock.symbol}
                      {selectedStock.price !== undefined && (
                          <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>${selectedStock.price.toFixed(2)}</span>
                      )}
                  </h2>
                  <div style={{ color: selectedStock.redFlag ? '#ef4444' : '#10b981', fontWeight: 'bold', marginBottom: '20px', fontSize: '1rem' }}>
                      {selectedStock.status}
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '12px', marginBottom: '20px' }}>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ color: '#888', fontSize: '0.8rem' }}>İleri F/K</div>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{selectedStock.pe?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ color: '#888', fontSize: '0.8rem' }}>Mevcut F/K</div>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{selectedStock.trailingPE?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ color: '#888', fontSize: '0.8rem' }}>PEG Rasyosu</div>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>{selectedStock.pegRatio?.toFixed(2) || 'N/A'}</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ color: '#888', fontSize: '0.8rem' }}>Kâr Büyümesi</div>
                          <span style={{ color: selectedStock.epsGrowth > 0 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>%{(selectedStock.epsGrowth || 0).toFixed(1)}</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ color: '#888', fontSize: '0.8rem' }}>Özkaynak Borç Oranı</div>
                          <span style={{ color: selectedStock.debtToEquity > 100 ? '#ef4444' : '#4ade80', fontWeight: 'bold' }}>%{(selectedStock.debtToEquity || 0).toFixed(1)}</span>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '12px' }}>
                          <div style={{ color: '#888', fontSize: '0.8rem' }}>Toplam Borç</div>
                          <span style={{ color: '#fff', fontWeight: 'bold' }}>${((selectedStock.totalDebt || 0) / 1e9).toFixed(1)}B</span>
                      </div>
                  </div>

                  {selectedStock.earningsHistory && selectedStock.earningsHistory.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#cbd5e1', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                              <span>EPS Geçmişi (Son 4 Çeyrek)</span>
                              <span style={{ fontSize: '0.85rem', color: selectedStock.epsGrowth > 0 ? '#4ade80' : '#ef4444' }}>Yıllık Büyüme (YoY): %{(selectedStock.epsGrowth || 0).toFixed(1)}</span>
                          </h4>
                          {selectedStock.earningsHistory.map((q, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <span style={{ color: '#888', width: '60px' }}>{q.date}</span>
                                  <span style={{ color: '#888', fontSize: '0.85rem', flex: 1, textAlign: 'center' }}>Beklenti: {q.epsEstimate?.toFixed(2) || '-'}</span>
                                  <span style={{ color: q.epsActual >= q.epsEstimate ? '#4ade80' : '#ef4444', fontWeight: 'bold', width: '80px', textAlign: 'right' }}>Gelen: {q.epsActual?.toFixed(2) || '-'}</span>
                                  <span style={{ color: q.qoq > 0 ? '#4ade80' : (q.qoq < 0 ? '#ef4444' : '#888'), fontWeight: 'bold', width: '80px', textAlign: 'right', fontSize: '0.85rem' }}>
                                      {q.qoq !== null ? (q.qoq > 0 ? '+' : '') + q.qoq.toFixed(1) + '%' : 'N/A'}
                                  </span>
                              </div>
                          ))}
                      </div>
                  )}

                  <div style={{ padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', borderLeft: `4px solid #3b82f6`, marginBottom: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Zap size={16} /> AI Nitel Analiz Raporu
                      </h4>
                      <div style={{ margin: 0, fontSize: '0.9rem' }}>
                          {renderMarkdown(selectedStock.aiReport)}
                      </div>
                  </div>

                  {selectedStock.aiReport && (
                      <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: `4px solid ${selectedStock.redFlag ? '#ef4444' : '#10b981'}` }}>
                          <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.5' }}>
                              {selectedStock.flagReason || (selectedStock.score > 1.2 ? "Şirketin büyüme hızı, fiyatından daha avantajlı konumda. Algoritmamız bunu FIRSAT olarak etiketliyor." : "Şirketin kâr büyümesi ve fiyatlanması standart normlar içinde. Yüksek getiri için yeterli uçurum bulunmuyor.")}
                          </p>
                      </div>
                  )}

                  <button 
                      onClick={() => setSelectedStock(null)}
                      style={{ marginTop: '24px', width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                      Kapat
                  </button>
              </div>
          </div>
      )}

    </div>
  );
}
