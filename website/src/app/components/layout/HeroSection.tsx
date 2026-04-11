import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section
      data-testid="hero-section"
      className="relative py-28 px-4 sm:px-6 lg:px-8 text-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <Image 
          src="/hero-image.png" 
          alt="Hero background" 
          fill 
          className="object-cover opacity-50 mix-blend-overlay"
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1820]/70 via-[--color-primary]/80 to-[--color-primary]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
        <Image 
          src="/icons/logo/risklogo-full.svg" 
          alt="Risk Reforged" 
          width={480} 
          height={160} 
          className="mb-8 drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
        />
        
        <p
          data-testid="hero-subtitle"
          className="text-xl sm:text-2xl text-[--color-text-primary] mb-10 max-w-2xl mx-auto drop-shadow-md font-medium"
        >
          A strategic conquest and diplomacy game. Command armies, forge alliances,
          and conquer territories across Europe, Asia, and the World.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center mt-4">
          <Link
            href="/how-to/game-guide"
            data-testid="hero-cta-guide"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-[#f9c701] text-black font-extrabold text-lg hover:bg-[#ffdb4d] hover:scale-105 transition-all shadow-[0_0_25px_rgba(249,199,1,0.6)] uppercase tracking-wider border-2 border-[#f9c701]"
          >
            Game Guide
          </Link>
          <Link
            href="/how-to/units-page"
            data-testid="hero-cta-units"
            className="inline-flex items-center justify-center px-8 py-4 rounded-lg bg-black/40 backdrop-blur-sm border-2 border-white text-white font-extrabold text-lg hover:bg-white hover:text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] uppercase tracking-wider"
          >
            Explore Units
          </Link>
        </div>
      </div>
    </section>
  );
}
