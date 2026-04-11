import Link from "next/link";
import units from "../../data/units.json";

export default function UnitsPage() {
  const landUnits = units.filter((u) => u.category === "land");
  const navalUnits = units.filter((u) => u.category === "naval");
  const ships = units.filter((u) => u.category === "ship");

  return (
    <div data-testid="units-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="units-heading" className="text-3xl font-bold text-[--color-accent] mb-2">
        Units & Combat
      </h1>
      <p className="text-[--color-text-secondary] mb-8">
        Explore all unit types, their stats, abilities, and combat roles.
      </p>

      {/* Land Units */}
      <section className="mb-12">
        <h2 data-testid="land-units-heading" className="text-2xl font-semibold text-[--color-text-primary] mb-6">
          ⚔️ Land Units
        </h2>
        <div data-testid="unit-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {landUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      </section>

      {/* Naval Units */}
      <section className="mb-12">
        <h2 data-testid="naval-units-heading" className="text-2xl font-semibold text-[--color-text-primary] mb-6">
          🌊 Naval Units
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {navalUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      </section>

      {/* Ships */}
      <section className="mb-12">
        <h2 data-testid="ships-heading" className="text-2xl font-semibold text-[--color-text-primary] mb-6">
          🚢 Ships
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ships.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface UnitData {
  id: string;
  name: string;
  hp: number;
  damage: number;
  role: string;
  costTier: string;
  category: string;
  icon: string;
  characterArt: string | null;
}

function UnitCard({ unit }: { unit: UnitData }) {
  const isCityTrained = unit.category === "land";
  const trainingIcon = isCityTrained ? "/icons/small-icons/city-icon.webp" : "/icons/small-icons/port-icon.webp";
  const trainingTooltip = isCityTrained ? "Trained at City" : "Trained at Port";

  return (
    <Link
      href={`/how-to/units-page/${unit.id}`}
      data-testid={`unit-card-${unit.id}`}
      className="block bg-[--color-surface] rounded-lg border border-[--color-border] hover:border-[--color-accent] transition-all p-4 group relative"
    >
      <div 
        className="absolute top-2 right-2 opacity-80 group-hover:opacity-100 transition-opacity"
        title={trainingTooltip}
      >
        <img
          src={trainingIcon}
          alt={trainingTooltip}
          className="w-6 h-6 rounded-sm border border-[#2a455a] shadow-sm"
        />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <img
          src={unit.icon}
          alt={unit.name}
          className="w-10 h-10 rounded"
          data-testid={`unit-icon-${unit.id}`}
        />
        <div>
          <h3 className="font-semibold text-[--color-text-primary] group-hover:text-[--color-accent] transition-colors pr-6">
            {unit.name}
          </h3>
          <span className="text-xs text-[--color-text-secondary]">{unit.costTier} tier</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-[--color-text-secondary]">HP: </span>
          <span className="text-[--color-text-primary] font-medium">{unit.hp.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[--color-text-secondary]">DMG: </span>
          <span className="text-[--color-text-primary] font-medium">{unit.damage}</span>
        </div>
      </div>
      <p className="text-xs text-[--color-text-secondary] mt-2">{unit.role}</p>
    </Link>
  );
}
