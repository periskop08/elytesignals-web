import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, TrendingUp, TrendingDown, Newspaper, ShieldCheck, Zap, AlertTriangle, RefreshCcw, BellRing, X } from 'lucide-react';

export default function PortfolioManager() {
    const [assets, setAssets] = useState([]);
    const [sentiments, setSentiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rebalancing, setRebalancing] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [aiQuery, setAiQuery] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    const fetchData = async () => {
        try {
            const [assetRes, sentRes] = await Promise.all([
                axios.get('/api/portfolio'),
                axios.get('/api/sentiments')
            ]);
            setAssets(assetRes.data);
            setSentiments(sentRes.data);
        } catch (error) {
            console.error("Portfolio fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRebalance = async () => {
        setRebalancing(true);
        try {
            await axios.post('/api/portfolio/rebalance');
            await fetchData();
        } catch(e) {
            console.error(e);
            alert("Rebalance Error!");
        } finally {
            setRebalancing(false);
        }
    };

    const handleAiSubmit = async () => {
        if (!aiQuery) return;
        setAiLoading(true);
        try {
            await axios.post('/api/llm/analyze', { symbol: aiQuery.toUpperCase() });
            setAiQuery("");
            await fetchData();
        } catch(e) {
            console.error(e);
            alert("LLM Analiz Hatası! Sunucu yanıt vermiyor.");
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 minute refresh
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                <h2>Varlıklar Yükleniyor...</h2>
            </div>
        );
    }

    const totalPortfolioValue = 12400.50; // Mock total value
    const totalPnl = 28.4; // Mock PNL

    return (
        <div style={{ padding: '20px', animation: 'fadeUp 0.4s ease-out', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Varlık Yöneticisi
                    </h1>
                    <p style={{ color: '#888', marginTop: '8px', margin: 0 }}>Yapay Zeka Destekli Uzun Vadeli Hedge Fund Portföyü</p>
                </div>
                
                <button 
                    onClick={handleRebalance}
                    disabled={rebalancing}
                    style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '16px', fontWeight: 'bold', fontSize: '1rem', cursor: rebalancing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)', transition: 'all 0.3s ease', opacity: rebalancing ? 0.7 : 1 }} 
                    onMouseOver={e => !rebalancing && (e.currentTarget.style.transform = 'scale(1.05)')} 
                    onMouseOut={e => !rebalancing && (e.currentTarget.style.transform = 'scale(1)')}
                >
                    <RefreshCcw size={20} className={rebalancing ? "fa-spin" : ""} />
                    {rebalancing ? "Hesaplanıyor..." : "Auto Rebalance"}
                </button>
            </div>

            {/* TOP WIDGETS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '30px', backdropFilter: 'blur(10px)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: totalPnl > 0 ? '#4ade80' : '#ef4444', filter: 'blur(80px)', opacity: 0.15 }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                            <Briefcase size={28} color="#ec4899" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Toplam Portföy (Örnek Demo)</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#fff' }}>
                            ${totalPortfolioValue.toLocaleString()}
                        </div>
                        <span style={{ color: totalPnl > 0 ? '#4ade80' : '#f87171', fontWeight: 'bold', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {totalPnl > 0 ? <TrendingUp size={18}/> : <TrendingDown size={18}/>}
                            %{totalPnl}
                        </span>
                    </div>

                    {/* LLM SOHBET KUTUSU */}
                    <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '0.9rem' }}>Yapay Zekaya Sor (Hisse Radarı)</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                                type="text" 
                                placeholder="Örn: TSLA, PLTR..." 
                                value={aiQuery}
                                onChange={(e) => setAiQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', outline: 'none' }} 
                            />
                            <button 
                                onClick={handleAiSubmit}
                                disabled={aiLoading || !aiQuery}
                                style={{ background: 'linear-gradient(90deg, #ec4899, #8b5cf6)', border: 'none', color: '#fff', padding: '0 20px', borderRadius: '12px', cursor: (aiLoading || !aiQuery) ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                            >
                                {aiLoading ? 'Analiz...' : 'Gönder'}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '24px', padding: '30px', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                            <Newspaper size={28} color="#3b82f6" />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Yapay Zeka (LLM) Radarı</h3>
                    </div>
                    
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '150px' }}>
                        {sentiments.length === 0 ? (
                            <span style={{ color: '#888' }}>Sistem analizleri taranıyor... Henüz AI raporu oluşmadı.</span>
                        ) : sentiments.map((s, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => {
                                    const existingAsset = assets.find(a => a.symbol === s.symbol);
                                    if(existingAsset) setSelectedAsset(existingAsset);
                                    else setSelectedAsset({
                                        symbol: s.symbol, type: 'STOCK', allocatedPercentage: 0, averageCost: 0, quantity: 0, drawdown: 0, aiScore: s.sentimentPercent, ceoScore: s.ceoScore, edgeScore: s.edgeScore, patentScore: s.patentScore, insiderScore: s.insiderScore
                                    });
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', borderLeft: `4px solid ${s.sentimentPercent > 80 ? '#4ade80' : (s.sentimentPercent > 50 ? '#facc15' : '#f87171')}`, cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <strong style={{ color: '#fff' }}>{s.symbol} Raporu</strong>
                                    <span style={{ color: '#aaa', fontSize: '0.85rem' }}>Duygu: %{s.sentimentPercent}</span>
                                </div>
                                <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: 0 }}>CEO Skoru: {s.ceoScore}/100, Teknoloji: {s.edgeScore}/100</p>
                                {s.summary && <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px', fontStyle: 'italic' }}>"{s.summary}"</p>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* HOLDINGS GRID */}
            <h2 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={28} color="#4ade80"/>
                Premium Borsa Varlıkları (Watchlist)
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                {assets.length === 0 ? (
                    <div style={{ color: '#888' }}>Varlık bulunamadı. Lütfen sisteme varlık ekleyin veya AI taramasını bekleyin.</div>
                ) : assets.filter(a => a.allocatedPercentage > 0).map(asset => (
                    <div key={asset.id} 
                         onClick={() => setSelectedAsset(asset)}
                         onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px) scale(1.01)'} 
                         onMouseOut={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                         style={{ background: 'rgba(30, 41, 59, 0.4)', border: asset.type === 'ETF' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px', padding: '24px', transition: 'all 0.3s ease', position: 'relative', cursor: 'pointer' }}>
                        {asset.insiderScore >= 80 && (
                            <div style={{ position: 'absolute', top: '-12px', right: '-12px', background: 'linear-gradient(90deg, #ef4444, #f97316)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.5)', zIndex: 10 }}>
                                <BellRing size={14} /> INSIDER ALERT
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>{asset.symbol}</h3>
                                <span style={{ color: asset.type === 'ETF' ? '#0ea5e9' : '#888', fontSize: '0.8rem', background: asset.type === 'ETF' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', display: 'inline-block' }}>{asset.type}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>%{asset.allocatedPercentage}</div>
                                <span style={{ color: '#888', fontSize: '0.85rem' }}>Portföy Ağırlığı</span>
                            </div>
                        </div>

                        {/* Mikro Skorlar Gridi */}
                        {asset.ceoScore > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>CEO Puanı: <strong style={{color: '#fff'}}>{asset.ceoScore}</strong></div>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Tech Edge: <strong style={{color: '#fff'}}>{asset.edgeScore}</strong></div>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Patent: <strong style={{color: '#fff'}}>{asset.patentScore}</strong></div>
                            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Insider: <strong style={{color: (asset.insiderScore >= 80 ? '#f87171' : '#fff')}}>{asset.insiderScore}</strong></div>
                        </div>
                        )}

                        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Ortalama Maliyet</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>${asset.averageCost.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Adet (Lot)</span>
                                <span style={{ color: '#fff', fontWeight: 'bold' }}>{asset.quantity}</span>
                            </div>
                            {asset.drawdown > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#aaa', fontSize: '0.9rem' }}>Aktif Zarar (DD)</span>
                                <span style={{ color: asset.drawdown >= 15 ? '#ef4444' : '#facc15', fontWeight: 'bold' }}>-%{asset.drawdown.toFixed(1)}</span>
                            </div>
                            )}
                        </div>
                        
                        <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, asset.aiScore))}%`, height: '100%', background: asset.aiScore > 85 ? 'linear-gradient(90deg, #4ade80, #22c55e)' : 'linear-gradient(90deg, #facc15, #eab308)' }}></div>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '6px', color: '#888', fontSize: '0.8rem' }}>FINAL AI SKORU: <strong style={{ color: asset.aiScore > 85 ? '#4ade80' : '#facc15' }}>{asset.aiScore}</strong> / 100</div>
                    </div>
                ))}
            </div>

            {/* ASSET DETAIL MODAL */}
            {selectedAsset && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,22,35,0.95)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
                    <div style={{ backgroundColor: '#162336', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)', overflow: 'hidden' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <h2 style={{ margin: 0, fontSize: '2rem', color: '#fff', fontWeight: 'bold' }}>{selectedAsset.symbol}</h2>
                                <span style={{ background: selectedAsset.type === 'ETF' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255,255,255,0.1)', color: selectedAsset.type === 'ETF' ? '#0ea5e9' : '#888', padding: '4px 12px', borderRadius: '12px', fontSize: '1rem' }}>{selectedAsset.type}</span>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', transition: 'color 0.2s', padding: '8px' }} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = '#888'}>
                                <X size={28} />
                            </button>
                        </div>
                        
                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                            {/* TradingView Chart */}
                            <div style={{ height: '400px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
                                <iframe 
                                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${selectedAsset.symbol}&interval=1D&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=tr`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="TradingView"
                                ></iframe>
                            </div>

                            {/* Portfolio Stats Bar */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                                    <span style={{ color: '#888', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Portföy Ağırlığı</span>
                                    <strong style={{ color: '#fff', fontSize: '1.2rem' }}>%{selectedAsset.allocatedPercentage}</strong>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                                    <span style={{ color: '#888', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Maliyet & Adet</span>
                                    <strong style={{ color: '#fff', fontSize: '1.2rem' }}>${selectedAsset.averageCost} ({selectedAsset.quantity})</strong>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                                    <span style={{ color: '#888', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>Aktif Zarar (DD)</span>
                                    <strong style={{ color: selectedAsset.drawdown > 15 ? '#ef4444' : (selectedAsset.drawdown > 0 ? '#facc15' : '#4ade80'), fontSize: '1.2rem' }}>{selectedAsset.drawdown > 0 ? `-%${selectedAsset.drawdown}` : '%0'}</strong>
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
                                    <span style={{ color: '#888', fontSize: '0.9rem', display: 'block', marginBottom: '4px' }}>FINAL AI GÜVENİ</span>
                                    <strong style={{ color: selectedAsset.aiScore > 85 ? '#4ade80' : '#facc15', fontSize: '1.2rem' }}>{selectedAsset.aiScore} / 100</strong>
                                </div>
                            </div>

                            {/* Detailed Report Component */}
                            <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '24px' }}>
                                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Newspaper size={20} color="#8b5cf6" />
                                    Yapay Zeka Yatırım Tezi (Investment Thesis)
                                </h3>
                                {sentiments.find(s => s.symbol === selectedAsset.symbol)?.detailedReport ? (
                                    <div style={{ color: '#cbd5e1', lineHeight: '1.8', fontSize: '1rem', whiteSpace: 'pre-wrap' }}>
                                        {sentiments.find(s => s.symbol === selectedAsset.symbol).detailedReport}
                                    </div>
                                ) : (
                                    <p style={{ color: '#888', fontStyle: 'italic' }}>Bu varlık için detaylı Yapay Zeka (LLM) raporu henüz oluşturulmamış veya sistem tarafından taranması bekleniyor.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
