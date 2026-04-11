import Link from "next/link";

export function Footer() {
  return (
    <footer data-testid="footer" className="bg-[#0a1820] border-t border-[--color-border] py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 data-testid="footer-brand" className="text-[--color-accent] font-bold text-lg mb-3">
              Risk Reforged
            </h3>
            <p className="text-[--color-text-secondary] text-sm">
              A strategic conquest and diplomacy game set in Europe, Asia, and the World.
              Built as a Warcraft III custom map and standalone game.
            </p>
          </div>

          <div>
            <h4 className="text-[--color-text-primary] font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/how-to/game-guide" data-testid="footer-link-game-guide" className="text-[--color-text-secondary] hover:text-[--color-accent] transition-colors">
                  Game Guide
                </Link>
              </li>
              <li>
                <Link href="/how-to/units-page" data-testid="footer-link-units" className="text-[--color-text-secondary] hover:text-[--color-accent] transition-colors">
                  Units
                </Link>
              </li>
              <li>
                <Link href="/patch-notes" data-testid="footer-link-patch-notes" className="text-[--color-text-secondary] hover:text-[--color-accent] transition-colors">
                  Patch Notes
                </Link>
              </li>
              <li>
                <Link href="/news-and-events" data-testid="footer-link-news" className="text-[--color-text-secondary] hover:text-[--color-accent] transition-colors">
                  News & Events
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[--color-text-primary] font-semibold mb-3">Community</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://discord.gg/riskReforged"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="footer-link-discord"
                  className="text-[--color-text-secondary] hover:text-[--color-accent] transition-colors"
                >
                  Discord
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Warcraft-3-Risk/wc3-risk-system"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="footer-link-github"
                  className="text-[--color-text-secondary] hover:text-[--color-accent] transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[--color-border] text-center text-sm text-[--color-text-secondary]">
          <p data-testid="footer-copyright">© {new Date().getFullYear()} Risk Reforged. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
