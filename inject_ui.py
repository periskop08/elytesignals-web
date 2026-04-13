import re

with open('/Users/periskop/.gemini/antigravity/scratch/crypto-signal-app/web/src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State Addition
s_state_old = """  const [newsAnalysisReport, setNewsAnalysisReport] = useState("");"""
s_state_new = """  const [newsAnalysisReport, setNewsAnalysisReport] = useState("");

  const [shadowStats, setShadowStats] = useState(null);
  const [shadowLoading, setShadowLoading] = useState(false);"""
code = code.replace(s_state_old, s_state_new)

# 2. Function Addition
f_old = """  const fetchNewsAnalysis = async (newsId) => {"""
f_new = """  const loadShadowData = () => {
      setActiveTab('shadow');
      setShadowLoading(true);
      axios.get('/api/shadow-stats')
          .then(res => {
              setShadowStats(res.data);
              setShadowLoading(false);
          })
          .catch(err => {
              console.error("Shadow stats fetch error:", err);
              setShadowLoading(false);
          });
  };

  const fetchNewsAnalysis = async (newsId) => {"""
code = code.replace(f_old, f_new)

# 3. Sidebar Addition
sb_old = """            <div className={`sidebar-nav-item ${activeTab === 'news' ? 'active' : ''}`} onClick={loadNewsData}>
                <Newspaper size={20} />
                <span>Kantan İstihbarat</span>
            </div>"""
sb_new = """            <div className={`sidebar-nav-item ${activeTab === 'news' ? 'active' : ''}`} onClick={loadNewsData}>
                <Newspaper size={20} />
                <span>Kantan İstihbarat</span>
            </div>
            <div className={`sidebar-nav-item ${activeTab === 'shadow' ? 'active' : ''}`} onClick={loadShadowData}>
                <ShieldCheck size={20} />
                <span>Gölge Analitik</span>
            </div>"""
code = code.replace(sb_old, sb_new)

# 4. Content Block Addition
cb_old = """        {activeTab === 'history' && ("""
cb_new = """        {activeTab === 'shadow' && (
            <div className="stats-tab-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <ShieldCheck size={28} color="#a855f7" />
                    <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>Gölge Ajan Analizi (Danışman Modu)</h2>
                </div>
                {shadowLoading || !shadowStats ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Analiz yükleniyor...</div>
                ) : (
                    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <p style={{ color: '#cbd5e1', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            Yapay zekanın <strong>Danışman</strong> modunda puanını kırdığı (Soft Veto) veya geçmişte tamamen engellediği yatırımların arka plan PnL başarısı. Eğer engellenen işlemler kâra gidiyorsa (False Negative), sistem fazla korumacı demektir.
                        </p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                            <div className="stat-box" style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px' }}>Puanı Kırılan Toplam</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>{shadowStats.totalAssessed}</div>
                            </div>
                            <div className="stat-box" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#f87171', marginBottom: '8px' }}>İyi ki Puanı Kırılmış (Zarar Edecekti)</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f87171' }}>{shadowStats.wouldLoss}</div>
                            </div>
                            <div className="stat-box" style={{ background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#4ade80', marginBottom: '8px' }}>Puanı Kırıldı ama Kâr Edecekti ⚠️</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4ade80' }}>{shadowStats.wouldWin}</div>
                            </div>
                        </div>

                        {shadowStats.falseNegatives && shadowStats.falseNegatives.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <h3 style={{ color: '#facc15', fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <AlertTriangle size={18} color="#facc15" /> En Çok Fırsat Kaçırtan Dersler (False Negative)
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {shadowStats.falseNegatives.map((fn, idx) => (
                                        <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: '#fff', fontWeight: 'bold' }}>{fn.symbol}</span>
                                            <span style={{ color: '#888', fontSize: '0.85rem' }}>Ders ID: <strong style={{ color: '#38bdf8' }}>{fn.lessonId}</strong></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'history' && ("""
code = code.replace(cb_old, cb_new)

with open('/Users/periskop/.gemini/antigravity/scratch/crypto-signal-app/web/src/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("UI Python script executed")
