import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Ported JS for Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.transitionDelay = `${index * 0.15}s`;
        observer.observe(card);
    });

    const mockup = document.querySelector('.mockup-frame');
    const handleMouseMove = (e) => {
      if (mockup && window.innerWidth > 900) {
        const x = (window.innerWidth / 2 - e.pageX) / 50;
        const y = (window.innerHeight / 2 - e.pageY) / 50;
        mockup.style.transform = `rotateY(${-15 + x}deg) rotateX(${5 + y}deg) scale(0.95)`;
      }
    };
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      <nav className="navbar">
        <div className="container nav-content">
            <div className="logo">
                <i className="ph-fill ph-radar"></i>
                <span>Elyte Signals</span>
            </div>
            <div className="nav-links">
                <a href="#features">Özellikler</a>
                <a href="#periskop">Periskop Modeli</a>
                <button onClick={() => navigate('/login')} className="btn-primary-sm" style={{cursor: 'pointer', border: 'none'}}>Web'den Giriş Yap</button>
            </div>
        </div>
      </nav>

      <section className="hero container">
        <div className="hero-content">
            <div className="badge">
                <span className="pulse-dot"></span> Yeni AI Analyst Yayında
            </div>
            <h1 className="hero-title">Kripto Piyasasında<br/><span className="text-gradient">Akıllı Balina</span> Olun</h1>
            <p className="hero-desc">Sıradan indikatörleri çöpe atın. Periskop Modeli ve Yapay Zeka ile matematiğin gücünü cebinize taşıyın. Piyasa sizden önce hareket edemez.</p>
            
            <div className="hero-cta">
                <button onClick={() => navigate('/login')} className="btn-primary" style={{border: 'none'}}>
                    <i className="ph ph-desktop"></i>
                    Web Dashboard'a Gir
                </button>
                <a href="#" className="btn-secondary">
                    <i className="ph ph-android-logo"></i>
                     Android İndir
                </a>
            </div>
            
            <div className="stats-row">
                <div className="stat-item">
                    <h4>+%340</h4>
                    <p>Aylık Ortalama Başarı</p>
                </div>
                <div className="stat-item">
                    <h4>7/24</h4>
                    <p>AI Analiz Desteği</p>
                </div>
            </div>
        </div>

        <div className="hero-mockup">
            <div className="mockup-frame">
                <div className="mockup-header">
                    <h3>Elyte Signals</h3>
                    <div className="status-indicators">
                        <i className="ph-fill ph-wifi-high"></i>
                        <i className="ph-fill ph-battery-full"></i>
                    </div>
                </div>
                
                <div className="mockup-body">
                    <div className="mockup-card floating-anim">
                        <div className="card-top">
                            <span className="coin">BTC/USDT</span>
                            <span className="badge-long">LONG</span>
                        </div>
                        <div className="card-price">68,150.45</div>
                        <div className="card-bar-bg"><div className="card-bar-fill" style={{width: '75%'}}></div></div>
                        <p className="card-note">Hedef: 69,200.00 • Kalite: 75 ⭐</p>
                    </div>

                    <div className="mockup-card floating-anim delay-1">
                        <div className="card-top">
                            <span className="coin">ETH/USDT</span>
                            <span className="badge-short">SHORT</span>
                        </div>
                        <div className="card-price">3,450.10</div>
                        <div className="card-bar-bg"><div className="card-bar-fill short" style={{width: '40%'}}></div></div>
                        <p className="card-note">Hedef: 3,210.00 • Kalite: 45 ⭐</p>
                    </div>

                    <div className="mockup-chat floating-anim delay-2">
                        <p><strong>Periskop AI:</strong> Dostum, Solana'da harika bir Sweep tespit ettim. 4H grafikte bir yükseliş dalgası başlıyor. R:R oranın şu an 1'e 3!</p>
                    </div>
                </div>
                <div className="mockup-bottom"></div>
            </div>
        </div>
      </section>

      <section id="features" className="features container">
        <h2 className="section-title">Kuralları <span>Biz</span> Koyuyoruz</h2>
        <div className="feature-grid">
            <div className="feature-card glass">
                <div className="feature-icon"><i className="ph ph-chart-line-up"></i></div>
                <h3>Periskop Modeli</h3>
                <p>Elliot Wave kuralları ve dinamik ATR sarmaları ile manipülatif fiyattan arındırılmış temiz sinyaller.</p>
            </div>
            <div className="feature-card glass">
                <div className="feature-icon"><i className="ph ph-robot"></i></div>
                <h3>Kişisel AI Asistan</h3>
                <p>Piyasayı sadece izlemeyin, ona soru sorun. GPT destekli kripto analistiniz 7/24 hizmetinizde.</p>
            </div>
            <div className="feature-card glass">
                <div className="feature-icon"><i className="ph ph-bell-ringing"></i></div>
                <h3>Işık Hızında Bildirim</h3>
                <p>Bir fırsat oluştuğunda sadece uygulamaya değil, Telegram VIP grubuna da anında otomatik alarm.</p>
            </div>
        </div>
      </section>

      <footer>
        <div className="container footer-content">
            <div className="footer-logo">
                <i className="ph-fill ph-radar"></i> Elyte Signals
            </div>
            <p className="copyright">© 2026 Elyte Signals. Tüm hakları saklıdır. Kripto işlemleri risk taşır.</p>
        </div>
      </footer>
    </>
  );
}
