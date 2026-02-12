export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-column">
            <h3 className="footer-title">Product</h3>
            <a className="footer-link">Features</a>
            <a className="footer-link">Security</a>
            <a className="footer-link">Enterprise</a>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">Company</h3>
            <a className="footer-link">About</a>
            <a className="footer-link">Careers</a>
            <a className="footer-link">Contact</a>
          </div>

          <div className="footer-column">
            <h3 className="footer-title">Legal</h3>
            <a className="footer-link">Privacy</a>
            <a className="footer-link">Terms</a>
            <a className="footer-link">GDPR</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-text">
            © 2026 TheCord. All rights reserved.
          </p>
          <p className="footer-text">
            Built for Practical DevOps Production
          </p>
        </div>
      </div>
    </footer>
  );
}
