const LOGO_URL = "https://visioninfinity.co/wp-content/uploads/2026/04/Untitled-design-8-1.png";
 
export default function Footer() {
  return (
    <footer className="vi-footer">
      <div className="vi-footer-inner">
 
        <div className="vi-footer-brand">
          <img src={LOGO_URL} alt="Vision Infinity" className="vi-footer-logo" />
          <p className="vi-footer-desc">
            AI-powered WhatsApp automation for businesses across Pakistan.
          </p>
        </div>
 
        <div className="vi-footer-links">
          <a href="https://visioninfinity.co" target="_blank" rel="noopener">Website</a>
          <a href="mailto:hello@visioninfinity.co">hello@visioninfinity.co</a>
        </div>
 
        <div className="vi-footer-copy">
          <p>© {new Date().getFullYear()} Vision Infinity. All rights reserved.</p>
          <p style={{ marginTop: 4, opacity: 0.5, fontSize: 11 }}>Your data is private and confidential.</p>
        </div>
 
      </div>
    </footer>
  );
}
