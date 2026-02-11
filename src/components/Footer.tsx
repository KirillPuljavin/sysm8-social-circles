export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--color-bg-secondary)",
        borderTop: "1px solid var(--color-border)",
        flexShrink: 0,
      }}
    >
      <div className="container p-xl">
        <div className="grid grid-cols-3 gap-xl mb-lg">
          <div>
            <h3 className="font-semibold mb-md">Product</h3>
            <ul className="flex flex-col gap-sm text-sm text-secondary">
              <li>Features</li>
              <li>Security</li>
              <li>Enterprise</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-md">Company</h3>
            <ul className="flex flex-col gap-sm text-sm text-secondary">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-md">Legal</h3>
            <ul className="flex flex-col gap-sm text-sm text-secondary">
              <li>Privacy</li>
              <li>Terms</li>
              <li>GDPR</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between pt-lg border-t border-accent">
          <p className="text-sm text-secondary">
            © 2026 TheCord. All rights reserved.
          </p>
          <p className="text-sm text-secondary">
            Built for Practical DevOps Production
          </p>
        </div>
      </div>
    </footer>
  );
}
