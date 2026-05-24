import Link from "next/link";
import { Shield, Swords, Map, Trophy, BookOpen, Users, ExternalLink } from "lucide-react";
import { HeroSection } from "./components/layout/HeroSection";

export default function Home() {
  return (
    <div data-testid="homepage">
      <HeroSection />

      {/* Latest Mainline Update */}
      <section data-testid="latest-update-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <p className="text-sm font-bold uppercase text-[--color-accent] mb-3">
              Latest from main
            </p>
            <h2 data-testid="latest-update-heading" className="text-3xl font-bold text-[--color-text-primary] mb-3">
              Risk Europe unstable12: clearer control in large matches
            </h2>
            <p className="text-base text-[--color-text-secondary] leading-relaxed max-w-3xl">
              The current mainline build highlights better minimap readability, relationship-based color modes,
              observer camera tools, and more reliable transport handling for crowded games.
            </p>
          </div>
          <Link
            href="/how-to/game-guide#ally-color-filter"
            data-testid="latest-update-guide-link"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[--color-surface] border border-[--color-border] text-[--color-text-primary] hover:border-[--color-accent] hover:text-[--color-accent] transition-colors font-semibold"
          >
            Read the updated guide
            <ExternalLink size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <UpdateCard
            testId="latest-update-minimap"
            icon={<Map size={28} />}
            title="Minimap Clarity"
            description="Custom icons now better preserve city, unit, and shared-slot ownership colors, with F2 large city indicators for faster scanning."
          />
          <UpdateCard
            testId="latest-update-colors"
            icon={<Shield size={28} />}
            title="High Contrast Colors"
            description="F3 color contrast and F5 colorblind preferences apply local ally, enemy, and neutral colors while keeping replays stable."
          />
          <UpdateCard
            testId="latest-update-observer"
            icon={<Users size={28} />}
            title="Observer Tools"
            description="Observers and supported team modes can track camera positions, minimap camera markers, and range indicators with dedicated toggles."
          />
          <UpdateCard
            testId="latest-update-transports"
            icon={<Swords size={28} />}
            title="Transport Polish"
            description="Transport patrol, autoload, observer cargo labels, and post-unload minimap/color refreshes make naval movement easier to follow."
          />
        </div>
      </section>

      {/* Quick Links */}
      <section data-testid="quick-links-section" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 data-testid="quick-links-heading" className="text-3xl font-bold text-[--color-accent] mb-12 text-center tracking-wide">
          Explore the Game
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <QuickLinkCard
            testId="quick-link-game-guide"
            href="/how-to/game-guide"
            icon={<BookOpen size={40} />}
            title="Game Guide"
            description="Learn the mechanics, from basic controls to advanced strategies."
          />
          <QuickLinkCard
            testId="quick-link-units"
            href="/how-to/units-page"
            icon={<Swords size={40} />}
            title="Units & Combat"
            description="Explore all unit types, stats, abilities, and combat roles."
          />
          <QuickLinkCard
            testId="quick-link-patch-notes"
            href="/patch-notes"
            icon={<Shield size={40} />}
            title="Patch Notes"
            description="Stay up to date with the latest game changes and balance updates."
          />
          <QuickLinkCard
            testId="quick-link-maps"
            href="/how-to/game-guide#maps"
            icon={<Map size={40} />}
            title="Maps"
            description="Discover Europe, Asia, and World maps with hundreds of territories."
          />
          <QuickLinkCard
            testId="quick-link-tournament"
            href="/tournament"
            icon={<Trophy size={40} />}
            title="Tournaments"
            description="Compete in organized events and climb the ranks."
          />
          <QuickLinkCard
            testId="quick-link-community"
            href="/about-us"
            icon={<Users size={40} />}
            title="Community"
            description="Meet the team and join our growing community of players."
          />
        </div>
      </section>

      {/* Key Stats */}
      <section data-testid="stats-section" className="py-20 bg-[--color-surface] border-y border-[--color-border]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 data-testid="stats-heading" className="text-3xl font-bold text-[--color-accent] mb-12 text-center tracking-wide">
            Game at a Glance
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <StatBlock testId="stat-maps" value="3" label="Unique Maps" />
            <StatBlock testId="stat-countries" value="375+" label="Countries Built" />
            <StatBlock testId="stat-units" value="16" label="Combat Units" />
            <StatBlock testId="stat-modes" value="5" label="Game Modes" />
          </div>
        </div>
      </section>

      {/* Tutorial Videos */}
      <section data-testid="tutorials-section" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 data-testid="tutorials-heading" className="text-3xl font-bold text-[--color-accent] mb-12 text-center tracking-wide">
          General Tutorials
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <TutorialCard
            testId="tutorial-step-1"
            title="Step 1: Minimap & City Distribution"
            youtubeId="_bQ6nbKLbSI"
            guideLink="/how-to/game-guide#cities-countries"
          />
          <TutorialCard
            testId="tutorial-step-2"
            title="Step 2: Training Units & Capturing a City"
            youtubeId="sL3aVCC6R2o"
            guideLink="/how-to/game-guide#units"
          />
          <TutorialCard
            testId="tutorial-step-3"
            title="Step 3: Capturing a Country"
            youtubeId="ZfYgqOAmtiE"
            guideLink="/how-to/game-guide#economy"
          />
          <TutorialCard
            testId="tutorial-step-4"
            title="Step 4: Mortars & Cutting Trees"
            youtubeId="e6c7QsV_EJ8"
            guideLink="/how-to/game-guide#units"
          />
          <TutorialCard
            testId="tutorial-step-5"
            title="Step 5: Transporting Units & Naval Invasion"
            youtubeId="pKPSYQJQQDM"
            guideLink="/how-to/game-guide#naval"
          />
          <TutorialCard
            testId="tutorial-step-6"
            title="Step 6: Changing Guards"
            youtubeId="Zz5c9OgWcS0"
            guideLink="/how-to/game-guide#units"
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
      className="block p-8 bg-[#0a1820]/40 rounded-xl border-2 border-[--color-border] hover:border-[--color-accent] hover:bg-[--color-secondary] hover:shadow-[0_0_20px_rgba(249,199,1,0.1)] transition-all group"
    >
      <div className="text-[--color-accent] mb-5 group-hover:scale-110 transition-transform inline-block drop-shadow-[0_0_10px_rgba(249,199,1,0.3)]">{icon}</div>
      <h3 className="text-xl font-bold text-[--color-text-primary] mb-3 group-hover:text-[--color-accent] transition-colors">{title}</h3>
      <p className="text-base text-[--color-text-secondary] leading-relaxed">{description}</p>
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
    <div data-testid={testId} className="p-6 bg-[#0a1820]/30 rounded-xl border border-[--color-border] hover:border-[--color-accent]/50 transition-colors">
      <div className="text-5xl font-bold text-[--color-accent] mb-3 drop-shadow-[0_0_15px_rgba(249,199,1,0.3)]">{value}</div>
      <div className="text-lg text-[--color-text-primary] font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}

interface UpdateCardProps {
  testId: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function UpdateCard({ testId, icon, title, description }: UpdateCardProps) {
  return (
    <div data-testid={testId} className="h-full p-5 bg-[#0a1820]/40 rounded-lg border border-[--color-border]">
      <div className="text-[--color-accent] mb-4">{icon}</div>
      <h3 className="text-lg font-bold text-[--color-text-primary] mb-2">{title}</h3>
      <p className="text-sm text-[--color-text-secondary] leading-relaxed">{description}</p>
    </div>
  );
}

interface TutorialCardProps {
  testId: string;
  title: string;
  youtubeId: string;
  guideLink: string;
}

function TutorialCard({ testId, title, youtubeId, guideLink }: TutorialCardProps) {
  return (
    <div data-testid={testId} className="bg-[#0a1820]/40 rounded-xl border-2 border-[--color-border] overflow-hidden flex flex-col hover:border-[--color-accent]/50 hover:shadow-[0_0_15px_rgba(30,58,82,0.8)] transition-all">
      <div className="w-full relative aspect-video bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title={title}
          className="absolute top-0 left-0 w-full h-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-[--color-text-primary] mb-4 font-display">{title}</h3>
        <div className="mt-auto">
          <Link 
            href={guideLink} 
            className="inline-flex items-center gap-2 text-[--color-accent] font-medium hover:text-[--color-accent-hover] hover:underline hover:scale-105 transition-all text-lg"
          >
            <BookOpen size={20} />
            Read related guide
            <ExternalLink size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
