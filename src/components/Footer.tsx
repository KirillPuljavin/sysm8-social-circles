// Global Footer Component
// Professional placeholder - styling scaffold only

export default function Footer() {
  return (
    <footer className="bg-secondary border-t border-accent mt-auto">
      <div className="container p-xl">
        <div className="grid grid-cols-3 gap-xl mb-lg">
          {/* Column 1: Product */}
          <div>
            <h3 className="font-semibold mb-md">Product</h3>
            <ul className="flex flex-col gap-sm text-sm text-secondary">
              <li>Features</li>
              <li>Security</li>
              <li>Enterprise</li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h3 className="font-semibold mb-md">Company</h3>
            <ul className="flex flex-col gap-sm text-sm text-secondary">
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h3 className="font-semibold mb-md">Legal</h3>
            <ul className="flex flex-col gap-sm text-sm text-secondary">
              <li>Privacy</li>
              <li>Terms</li>
              <li>GDPR</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
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
