import Link from "next/link";
import { ReactNode } from "react";
import units from "../../../data/units.json";

interface UnitDetailPageProps {
  params: Promise<{ unitId: string }>;
}

export function generateStaticParams() {
  return units.map((unit) => ({
    unitId: unit.id,
  }));
}

export default async function UnitDetailPage({ params }: UnitDetailPageProps) {
  const { unitId } = await params;
  const unit = units.find((u) => u.id === unitId);

  if (!unit) {
    return (
      <div data-testid="unit-not-found" className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">Unit not found</h1>
        <Link href="/how-to/units-page" className="text-[--color-accent] hover:underline mt-4 inline-block">
          ← Back to Units
        </Link>
      </div>
    );
  }

  return (
    <div data-testid={`unit-detail-${unit.id}`} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/how-to/units-page"
        data-testid="unit-back-link"
        className="text-sm text-[--color-accent] hover:underline mb-6 inline-block"
      >
        ← Back to Units
      </Link>

      <div className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Character art */}
          <div className="md:w-1/3 flex justify-center">
            {unit.characterArt ? (
              <img
                src={unit.characterArt}
                alt={unit.name}
                data-testid="unit-detail-art"
                className="max-w-full max-h-80 w-auto h-auto object-contain rounded-lg drop-shadow-lg"
              />
            ) : (
              <div className="w-48 h-48 bg-[--color-primary] rounded-lg flex items-center justify-center">
                <img src={unit.icon} alt={unit.name} className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="md:w-2/3">
            <div className="flex items-center gap-3 mb-4">
              <img src={unit.icon} alt="" className="w-8 h-8 rounded" />
              <h1 data-testid="unit-detail-name" className="text-2xl font-bold text-[--color-accent]">
                {unit.name}
              </h1>
            </div>

            <p data-testid="unit-detail-description" className="text-[--color-text-secondary] mb-6">
              {unit.description}
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatRow label="HP" value={unit.hp.toLocaleString()} testId="unit-stat-hp" />
              <StatRow label="Damage" value={String(unit.damage)} testId="unit-stat-damage" />
              <StatRow label="Role" value={unit.role} testId="unit-stat-role" />
              <StatRow label="Cost Tier" value={unit.costTier} testId="unit-stat-cost" />
              <StatRow label="Category" value={unit.category} testId="unit-stat-category" />
              <StatRow 
                label="Trained At" 
                testId="unit-stat-trained"
                value={
                  <div className="flex items-center gap-1.5">
                    <img 
                      src={unit.category === "land" ? "/icons/small-icons/city-icon.webp" : "/icons/small-icons/port-icon.webp"} 
                      alt={unit.category === "land" ? "City" : "Port"}
                      className="w-4 h-4 rounded-sm border border-[#2a455a] shadow-sm"
                    />
                    <span>{unit.category === "land" ? "City" : "Port"}</span>
                  </div>
                } 
              />
              <StatRow label="Unit ID" value={unit.unitId} testId="unit-stat-id" />
            </div>

            {unit.abilities.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[--color-text-primary] mb-2">Abilities</h2>
                <div data-testid="unit-abilities" className="flex flex-wrap gap-2">
                  {unit.abilities.map((ability) => {
                    const iconMap: Record<string, string> = {
                      "Roar": "/icons/skills/battle-roar-icon.webp",
                      "Dispel Magic": "/icons/skills/dispel-magic-icon.webp",
                      "Heal": "/icons/skills/medic-skill-icon.webp",
                      "Ground Attack": "/icons/skills/attack-ground-icon.webp",
                      "Frenzy": "/icons/skills/BloodLust-icon.webp",
                      "Regeneration": "/icons/skills/health-icon.webp",
                    };
                    const iconPath = iconMap[ability];

                    return (
                      <span
                        key={ability}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-primary] text-[--color-accent] text-sm font-medium border border-[--color-border] shadow-sm hover:brightness-110 transition-all"
                      >
                        {iconPath && (
                          <img
                            src={iconPath}
                            alt={`${ability} icon`}
                            className="w-5 h-5 rounded-sm object-cover"
                          />
                        )}
                        {ability}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: ReactNode;
  testId: string;
}

function StatRow({ label, value, testId }: StatRowProps) {
  return (
    <div data-testid={testId} className="bg-[--color-primary] rounded px-3 py-2 flex flex-col justify-center">
      <div className="text-xs text-[--color-text-secondary]">{label}</div>
      <div className="text-sm font-semibold text-[--color-text-primary] h-5 flex items-center">{value}</div>

    </div>
  );
}
