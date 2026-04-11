import Link from "next/link";

export function HeroSection() {
  return (
    <section
      data-testid="hero-section"
      className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0a1820] to-[--color-primary] text-center"
    >
      <div className="max-w-4xl mx-auto">
        <h1
          data-testid="hero-heading"
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[--color-text-primary] mb-4 tracking-tight"
        >
          Risk <span className="text-[--color-accent]">Reforged</span>
        </h1>
        <p
          data-testid="hero-subtitle"
          className="text-lg sm:text-xl text-[--color-text-secondary] mb-8 max-w-2xl mx-auto"
        >
          A strategic conquest and diplomacy game. Command armies, forge alliances,
          and conquer territories across Europe, Asia, and the World.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/how-to/game-guide"
            data-testid="hero-cta-guide"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-[--color-accent] text-[--color-primary] font-semibold hover:bg-[--color-accent-hover] transition-colors"
          >
            Game Guide
          </Link>
          <Link
            href="/how-to/units-page"
            data-testid="hero-cta-units"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-[--color-accent] text-[--color-accent] font-semibold hover:bg-[--color-accent] hover:text-[--color-primary] transition-colors"
          >
            Explore Units
          </Link>
        </div>
      </div>
    </section>
  );
}
