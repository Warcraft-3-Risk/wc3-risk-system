import { GitBranch, Heart, Code, Gamepad2 } from "lucide-react";

export default function AboutUsPage() {
  return (
    <div data-testid="about-us-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="about-heading" className="text-3xl font-bold text-[--color-accent] mb-2">
        About Risk Reforged
      </h1>
      <p className="text-[--color-text-secondary] mb-8">
        Learn about the team and project behind Risk Reforged.
      </p>

      {/* Project Overview */}
      <section data-testid="about-overview" className="mb-12">
        <div className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-4 flex items-center gap-2">
            <Gamepad2 className="text-[--color-accent]" size={24} />
            The Game
          </h2>
          <div className="text-[--color-text-secondary] space-y-4">
            <p>
              Risk Reforged is a strategic conquest and diplomacy game built as a Warcraft III custom map.
              Inspired by the classic board game Risk, it brings territory control, army management, and
              diplomatic strategy to the Warcraft III engine.
            </p>
            <p>
              Players compete across detailed maps of Europe, Asia, and the World — commanding armies,
              capturing cities and countries, forging alliances, and battling for supremacy. With multiple
              game modes, a deep economy system, and competitive ranked play, Risk Reforged offers
              hundreds of hours of strategic gameplay.
            </p>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section data-testid="about-features" className="mb-12">
        <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FeatureCard
            title="Multiple Maps"
            description="Europe (233 cities), Asia (229 cities), and World (555 cities) — each with unique strategic challenges."
            testId="feature-maps"
          />
          <FeatureCard
            title="5 Game Modes"
            description="Standard, Promode, Capitals, W3C, and Equalized Promode — each with distinct rules and strategies."
            testId="feature-modes"
          />
          <FeatureCard
            title="Ranked Play"
            description="ELO-based ranking system with placement matches, rank tiers, and competitive leaderboards."
            testId="feature-ranked"
          />
          <FeatureCard
            title="16 Unit Types"
            description="From basic Riflemen to powerful Tanks and Battleships — a diverse roster for every strategy."
            testId="feature-units"
          />
        </div>
      </section>

      {/* Open Source */}
      <section data-testid="about-open-source" className="mb-12">
        <div className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-4 flex items-center gap-2">
            <Code className="text-[--color-accent]" size={24} />
            Open Source
          </h2>
          <p className="text-[--color-text-secondary] mb-4">
            Risk Reforged is an open-source project. The game system source code, documentation,
            and this website are all publicly available on GitHub.
          </p>
          <a
            href="https://github.com/Warcraft-3-Risk/wc3-risk-system"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="about-github-link"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[--color-primary] border border-[--color-border] text-[--color-text-primary] hover:border-[--color-accent] hover:text-[--color-accent] transition-colors"
          >
            <GitBranch size={20} />
            View on GitHub
          </a>
        </div>
      </section>

      {/* Community */}
      <section data-testid="about-community">
        <div className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-4 flex items-center gap-2">
            <Heart className="text-[--color-accent]" size={24} />
            Community
          </h2>
          <p className="text-[--color-text-secondary] mb-4">
            Join our growing community of strategic minds. Whether you are a veteran commander
            or a new recruit, there is a place for you.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://discord.com/invite/wc3risk"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="about-discord-link"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[--color-accent] text-[--color-primary] font-semibold hover:bg-[--color-accent-hover] transition-colors"
            >
              Join Discord
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  testId: string;
}

function FeatureCard({ title, description, testId }: FeatureCardProps) {
  return (
    <div data-testid={testId} className="bg-[--color-surface] rounded-lg border border-[--color-border] p-5">
      <h3 className="font-semibold text-[--color-text-primary] mb-2">{title}</h3>
      <p className="text-sm text-[--color-text-secondary]">{description}</p>
    </div>
  );
}
