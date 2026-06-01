export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --black: #0d0d0d; --lime: #c8f55a; --white: #ffffff; --gray: #f5f4f0; --muted: #888; --border: #e8e6e0; }
        html { scroll-behavior: smooth; }
        nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: rgba(13,13,13,0.95); backdrop-filter: blur(10px); padding: 0 2rem; height: 60px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1a1a1a; }
        .nav-logo { font-family: var(--font-syne), sans-serif; font-size: 22px; font-weight: 800; color: #fff; letter-spacing: -0.5px; text-decoration: none; }
        .nav-logo span { color: #c8f55a; }
        .nav-cta { background: #c8f55a; color: #0d0d0d; border: none; border-radius: 20px; padding: 8px 20px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: var(--font-inter), sans-serif; text-decoration: none; }
        .hero { background: #0d0d0d; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 6rem 2rem 4rem; }
        .hero-badge { background: #1a1a1a; border: 1px solid #333; color: #c8f55a; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; padding: 6px 16px; border-radius: 20px; margin-bottom: 2rem; display: inline-block; }
        .hero h1 { font-family: var(--font-syne), sans-serif; font-size: clamp(48px, 8vw, 96px); font-weight: 800; color: #fff; line-height: 0.95; letter-spacing: -2px; margin-bottom: 1.5rem; }
        .hero h1 span { color: #c8f55a; }
        .hero p { font-size: clamp(16px, 2vw, 20px); color: #888; max-width: 500px; line-height: 1.6; margin-bottom: 2.5rem; font-weight: 300; }
        .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 1rem; }
        .btn-primary { background: #c8f55a; color: #0d0d0d; border: none; border-radius: 12px; padding: 16px 32px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: var(--font-syne), sans-serif; text-decoration: none; letter-spacing: 0.02em; }
        .btn-secondary { background: transparent; color: #fff; border: 1px solid #333; border-radius: 12px; padding: 16px 32px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: var(--font-inter), sans-serif; text-decoration: none; }
        .hero-note { color: #444; font-size: 12px; }
        .phone { background: #111; border: 2px solid #222; border-radius: 40px; padding: 12px; width: 260px; margin: 3rem auto 0; }
        .phone-screen { background: #f5f4f0; border-radius: 30px; overflow: hidden; }
        .phone-header { background: #0d0d0d; padding: 12px 16px 10px; }
        .phone-logo { font-family: var(--font-syne), sans-serif; font-size: 16px; font-weight: 800; color: #fff; }
        .phone-logo span { color: #c8f55a; }
        .phone-nav { display: flex; gap: 4px; margin-top: 10px; }
        .phone-nav-btn { flex: 1; padding: 6px 0; border-radius: 16px; border: none; font-size: 10px; font-weight: 700; font-family: var(--font-inter), sans-serif; }
        .phone-nav-active { background: #c8f55a; color: #0d0d0d; }
        .phone-nav-inactive { background: #1a1a1a; color: #555; }
        .phone-body { padding: 12px; }
        .phone-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
        .phone-card { background: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #ece9e2; }
        .phone-card-img { height: 70px; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .phone-card-body { padding: 6px 8px 8px; }
        .phone-card-name { font-size: 9px; font-weight: 600; color: #0d0d0d; margin-bottom: 3px; }
        .phone-outfit { background: #fff; border-radius: 10px; border: 1.5px solid #c8f55a; overflow: hidden; }
        .phone-outfit-header { background: #0d0d0d; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; }
        .phone-outfit-name { font-family: var(--font-syne), sans-serif; font-size: 10px; font-weight: 800; color: #fff; }
        .phone-outfit-score { background: #c8f55a; color: #0d0d0d; font-size: 9px; font-weight: 800; border-radius: 10px; padding: 2px 7px; }
        .phone-outfit-body { padding: 8px 10px; display: flex; gap: 6px; }
        .phone-outfit-item { width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: #f5f4f0; border: 1px solid #ece9e2; }
        .proof { background: #0d0d0d; padding: 16px 2rem; display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap; border-top: 1px solid #1a1a1a; }
        .proof-item { color: #555; font-size: 12px; font-weight: 500; letter-spacing: 0.05em; }
        .proof-item strong { color: #c8f55a; }
        .features { background: #f5f4f0; padding: 6rem 2rem; }
        .section-label { font-size: 11px; font-weight: 700; color: #888; letter-spacing: 0.2em; text-transform: uppercase; text-align: center; margin-bottom: 1rem; }
        .section-title { font-family: var(--font-syne), sans-serif; font-size: clamp(32px, 5vw, 52px); font-weight: 800; text-align: center; letter-spacing: -1px; margin-bottom: 1rem; line-height: 1.05; }
        .section-sub { color: #888; text-align: center; font-size: 16px; max-width: 480px; margin: 0 auto 4rem; line-height: 1.6; font-weight: 300; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-width: 1000px; margin: 0 auto; }
        .feature-card { background: #fff; border-radius: 20px; padding: 2rem; border: 1px solid #e8e6e0; }
        .feature-icon { width: 48px; height: 48px; background: #0d0d0d; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 1.25rem; }
        .feature-title { font-family: var(--font-syne), sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 8px; }
        .feature-desc { color: #888; font-size: 14px; line-height: 1.65; }
        .how { background: #fff; padding: 6rem 2rem; }
        .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2rem; max-width: 900px; margin: 0 auto; }
        .step { text-align: center; }
        .step-num { width: 48px; height: 48px; background: #c8f55a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--font-syne), sans-serif; font-size: 20px; font-weight: 800; color: #0d0d0d; margin: 0 auto 1rem; }
        .step-title { font-family: var(--font-syne), sans-serif; font-size: 16px; font-weight: 800; margin-bottom: 8px; }
        .step-desc { color: #888; font-size: 14px; line-height: 1.6; }
        .pricing { background: #f5f4f0; padding: 6rem 2rem; }
        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; max-width: 700px; margin: 0 auto; }
        .plan { background: #fff; border-radius: 24px; padding: 2rem; border: 1px solid #e8e6e0; }
        .plan-pro { background: #0d0d0d; border-color: #c8f55a; border-width: 2px; }
        .plan-badge { background: #c8f55a; color: #0d0d0d; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 1.25rem; }
        .plan-name { font-family: var(--font-syne), sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 4px; }
        .plan-name-pro { color: #fff; }
        .plan-price { font-family: var(--font-syne), sans-serif; font-size: 42px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
        .plan-price-pro { color: #c8f55a; }
        .plan-period { font-size: 13px; color: #888; margin-bottom: 1.5rem; }
        .plan-period-pro { color: #555; }
        .plan-features { list-style: none; margin-bottom: 2rem; }
        .plan-features li { font-size: 14px; padding: 8px 0; border-bottom: 1px solid #e8e6e0; display: flex; align-items: center; gap: 8px; color: #444; }
        .plan-features-pro li { border-bottom-color: #1a1a1a; color: #aaa; }
        .plan-features li:last-child { border-bottom: none; }
        .plan-features li::before { content: "✓"; color: #c8f55a; font-weight: 800; font-size: 13px; flex-shrink: 0; }
        .plan-btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-family: var(--font-syne), sans-serif; font-size: 15px; font-weight: 800; cursor: pointer; text-decoration: none; display: block; text-align: center; }
        .plan-btn-free { background: #f5f4f0; color: #0d0d0d; }
        .plan-btn-pro { background: #c8f55a; color: #0d0d0d; }
        .cta { background: #0d0d0d; padding: 6rem 2rem; text-align: center; }
        .cta h2 { font-family: var(--font-syne), sans-serif; font-size: clamp(32px, 5vw, 56px); font-weight: 800; color: #fff; letter-spacing: -1px; margin-bottom: 1rem; line-height: 1.05; }
        .cta h2 span { color: #c8f55a; }
        .cta p { color: #555; font-size: 16px; margin-bottom: 2.5rem; font-weight: 300; }
        .email-form { display: flex; gap: 10px; max-width: 440px; margin: 0 auto 1rem; flex-wrap: wrap; justify-content: center; }
        .email-input { flex: 1; min-width: 220px; padding: 14px 18px; border-radius: 12px; border: 1px solid #333; background: #111; color: #fff; font-size: 15px; font-family: var(--font-inter), sans-serif; outline: none; }
        .email-input::placeholder { color: #444; }
        .email-submit { background: #c8f55a; color: #0d0d0d; border: none; border-radius: 12px; padding: 14px 24px; font-size: 14px; font-weight: 800; cursor: pointer; font-family: var(--font-syne), sans-serif; }
        .cta-note { color: #333; font-size: 12px; }
        footer { background: #080808; padding: 2rem; text-align: center; border-top: 1px solid #111; }
        .footer-logo { font-family: var(--font-syne), sans-serif; font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 8px; }
        .footer-logo span { color: #c8f55a; }
        .footer-note { color: #333; font-size: 12px; }
      `}</style>

      <nav>
        <a href="/" className="nav-logo">wore<span>.</span></a>
        <a href="/app" className="nav-cta">Get started</a>
      </nav>

      <section className="hero">
        <div className="hero-badge">✦ AI-powered styling</div>
        <h1>Your closet.<br /><span>Styled by AI.</span></h1>
        <p>Take photos of your clothes. wore. builds outfits from what you actually own — ranked by style, every single day.</p>
        <div className="hero-btns">
          <a href="/app" className="btn-primary">Start for free →</a>
          <a href="#how" className="btn-secondary">See how it works</a>
        </div>
        <p className="hero-note">No credit card required · Works on any device</p>
        <div className="phone">
          <div className="phone-screen">
            <div className="phone-header">
              <div className="phone-logo">wore<span>.</span></div>
              <div className="phone-nav">
                <button className="phone-nav-btn phone-nav-active">Closet</button>
                <button className="phone-nav-btn phone-nav-inactive">+ Add</button>
                <button className="phone-nav-btn phone-nav-inactive">Outfits</button>
              </div>
            </div>
            <div className="phone-body">
              <div className="phone-grid">
                <div className="phone-card">
                  <div className="phone-card-img" style={{background:"#f0ede8"}}>👕</div>
                  <div className="phone-card-body"><div className="phone-card-name">White linen shirt</div></div>
                </div>
                <div className="phone-card">
                  <div className="phone-card-img" style={{background:"#e8ede8"}}>🧥</div>
                  <div className="phone-card-body"><div className="phone-card-name">Tan trench coat</div></div>
                </div>
              </div>
              <div className="phone-outfit">
                <div className="phone-outfit-header">
                  <div className="phone-outfit-name">Clean lines</div>
                  <div className="phone-outfit-score">9.2 / 10</div>
                </div>
                <div className="phone-outfit-body">
                  <div className="phone-outfit-item">👕</div>
                  <div className="phone-outfit-item">🩳</div>
                  <div className="phone-outfit-item">👟</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="proof">
        <div className="proof-item">✦ AI outfit generation</div>
        <div className="proof-item">✦ Works on <strong>any device</strong></div>
        <div className="proof-item">✦ Front & back photo support</div>
        <div className="proof-item">✦ Dirty item tracking</div>
      </div>

      <section className="features" id="features">
        <div className="section-label">Features</div>
        <h2 className="section-title">Everything your closet needs</h2>
        <p className="section-sub">wore. is the only app that actually looks at your clothes and builds real outfits from what you own.</p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <div className="feature-title">Photo your wardrobe</div>
            <div className="feature-desc">Snap front and back photos of every item. wore. builds a visual catalog of everything you own.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background:"#c8f55a"}}>✨</div>
            <div className="feature-title">AI outfit generation</div>
            <div className="feature-desc">Claude AI analyzes your actual clothes and creates stylish outfit combinations ranked by style score.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧺</div>
            <div className="feature-title">Dirty item tracking</div>
            <div className="feature-desc">Mark items as dirty and wore. automatically excludes them from outfit suggestions.</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⭐</div>
            <div className="feature-title">Style rankings</div>
            <div className="feature-desc">Every outfit gets a style score out of 10 with honest feedback and tips.</div>
          </div>
        </div>
      </section>

      <section className="how" id="how">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to your best outfit</h2>
        <p className="section-sub">Getting started takes less than 5 minutes.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <div className="step-title">Photo your clothes</div>
            <div className="step-desc">Take front and back photos of everything in your closet.</div>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <div className="step-title">Mark what's clean</div>
            <div className="step-desc">Tap once to mark dirty items. wore. only builds outfits from clothes that are ready to wear.</div>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <div className="step-title">Get styled</div>
            <div className="step-desc">Hit "Outfits" and Claude AI creates 4 ranked outfit combinations in seconds.</div>
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div className="section-label">Pricing</div>
        <h2 className="section-title">Simple pricing</h2>
        <p className="section-sub">Start free. Upgrade when you're ready.</p>
        <div className="pricing-grid">
          <div className="plan">
            <div className="plan-name">Free</div>
            <div className="plan-price">$0</div>
            <div className="plan-period">forever</div>
            <ul className="plan-features">
              <li>Up to 15 clothing items</li>
              <li>5 outfit generations per month</li>
              <li>Front & back photos</li>
              <li>Dirty item tracking</li>
              <li>Style scores & tips</li>
            </ul>
            <a href="/app" className="plan-btn plan-btn-free">Get started free</a>
          </div>
          <div className="plan plan-pro">
            <div className="plan-badge">Most popular</div>
            <div className="plan-name plan-name-pro">Pro</div>
            <div className="plan-price plan-price-pro">$6.99</div>
            <div className="plan-period plan-period-pro">per month</div>
            <ul className="plan-features plan-features-pro">
              <li>Unlimited clothing items</li>
              <li>Unlimited outfit generations</li>
              <li>Front & back photos</li>
              <li>Dirty item tracking</li>
              <li>Style scores & tips</li>
            </ul>
            <a href="/app" className="plan-btn plan-btn-pro">Start Pro free →</a>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Stop staring at<br />your <span>closet.</span></h2>
        <p>Join thousands getting dressed smarter every day.</p>
        <div className="email-form">
          <input type="email" className="email-input" placeholder="Enter your email" />
          <button className="email-submit">Get early access</button>
        </div>
        <p className="cta-note">No spam. No credit card. Unsubscribe anytime.</p>
      </section>

      <footer>
        <div className="footer-logo">wore<span>.</span></div>
        <div className="footer-note">© 2026 wore. All rights reserved.</div>
      </footer>
    </div>
  );
}
