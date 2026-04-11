import Link from "next/link";
import { Shield, Swords, Map, Trophy, BookOpen, Users } from "lucide-react";
import { HeroSection } from "./components/layout/HeroSection";

export default function Home() {
  return (
    <div data-testid="homepage">
      <HeroSection />

      {/* Quick Links */}
      <section data-testid="quick-links-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 data-testid="quick-links-heading" className="text-2xl font-bold text-[--color-accent] mb-8 text-center">
          Explore the Game
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickLinkCard
            testId="quick-link-game-guide"
            href="/how-to/game-guide"
            icon={<BookOpen size={32} />}
            title="Game Guide"
            description="Learn the mechanics, from basic controls to advanced strategies."
          />
          <QuickLinkCard
            testId="quick-link-units"
            href="/how-to/units-page"
            icon={<Swords size={32} />}
            title="Units & Combat"
            description="Explore all unit types, stats, abilities, and combat roles."
          />
          <QuickLinkCard
            testId="quick-link-patch-notes"
            href="/patch-notes"
            icon={<Shield size={32} />}
            title="Patch Notes"
            description="Stay up to date with the latest game changes and balance updates."
          />
          <QuickLinkCard
            testId="quick-link-maps"
            href="/how-to/game-guide#maps"
            icon={<Map size={32} />}
            title="Maps"
            description="Discover Europe, Asia, and World maps with hundreds of territories."
          />
          <QuickLinkCard
            testId="quick-link-tournament"
            href="/tournament"
            icon={<Trophy size={32} />}
            title="Tournaments"
            description="Compete in organized events and climb the ranks."
          />
          <QuickLinkCard
            testId="quick-link-community"
            href="/about-us"
            icon={<Users size={32} />}
            title="Community"
            description="Meet the team and join our growing community of players."
          />
        </div>
      </section>

      {/* Key Stats */}
      <section data-testid="stats-section" className="py-16 bg-[--color-secondary]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 data-testid="stats-heading" className="text-2xl font-bold text-[--color-accent] mb-8 text-center">
            Game at a Glance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <StatBlock testId="stat-maps" value="3" label="Maps" />
            <StatBlock testId="stat-countries" value="375+" label="Countries" />
            <StatBlock testId="stat-units" value="16" label="Unit Types" />
            <StatBlock testId="stat-modes" value="5" label="Game Modes" />
          </div>
        </div>
      </section>

      {/* Tutorial Videos */}
      <section data-testid="tutorials-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 data-testid="tutorials-heading" className="text-2xl font-bold text-[--color-accent] mb-8 text-center">
          Learn to Play
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TutorialCard
            testId="tutorial-step-1"
            title="Step 1: Minimap & City Distribution"
            youtubeId="_bQ6nbKLbSI"
          />
          <TutorialCard
            testId="tutorial-step-2"
            title="Step 2: Training Units & Capturing a City"
            youtubeId="sL3aVCC6R2o"
          />
          <TutorialCard
            testId="tutorial-step-3"
            title="Step 3: Capturing a Country"
            youtubeId="ZfYgqOAmtiE"
          />
          <TutorialCard
            testId="tutorial-step-4"
            title="Step 4: Mortars & Cutting Trees"
            youtubeId="e6c7QsV_EJ8"
          />
          <TutorialCard
            testId="tutorial-step-5"
            title="Step 5: Transporting Units & Naval Invasion"
            youtubeId="pKPSYQJQQDM"
          />
          <TutorialCard
            testId="tutorial-step-6"
            title="Step 6: Changing Guards"
            youtubeId="Zz5c9OgWcS0"
          />
        </div>
      </section>
    </div>
  );
}

interface QuickLinkCardProps {
  testId: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function QuickLinkCard({ testId, href, icon, title, description }: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className="block p-6 bg-[--color-surface] rounded-lg border border-[--color-border] hover:border-[--color-accent] hover:shadow-lg transition-all group"
    >
      <div className="text-[--color-accent] mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-lg font-semibold text-[--color-text-primary] mb-2">{title}</h3>
      <p className="text-sm text-[--color-text-secondary]">{description}</p>
    </Link>
  );
}

interface StatBlockProps {
  testId: string;
  value: string;
  label: string;
}

function StatBlock({ testId, value, label }: StatBlockProps) {
  return (
    <div data-testid={testId} className="p-4">
      <div className="text-3xl font-bold text-[--color-accent]">{value}</div>
      <div className="text-sm text-[--color-text-secondary] mt-1">{label}</div>
    </div>
  );
}

interface TutorialCardProps {
  testId: string;
  title: string;
  youtubeId: string;
}

function TutorialCard({ testId, title, youtubeId }: TutorialCardProps) {
  return (
    <div data-testid={testId} className="bg-[--color-surface] rounded-lg border border-[--color-border] overflow-hidden">
      <a
        href={`https://www.youtube.com/watch?v=${youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
          alt={title}
          className="w-full aspect-video object-cover"
        />
      </a>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[--color-text-primary]">{title}</h3>
      </div>
    </div>
  );
}
