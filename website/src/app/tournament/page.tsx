import { Trophy, Calendar, Users, MapPin } from "lucide-react";

export default function TournamentPage() {
  return (
    <div data-testid="tournament-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 data-testid="tournament-heading" className="text-3xl font-bold text-[--color-accent] mb-2">
        Tournaments
      </h1>
      <p className="text-[--color-text-secondary] mb-8">
        Compete in organized events, test your skills, and climb the ranks.
      </p>

      {/* Upcoming Tournament */}
      <section data-testid="upcoming-tournament" className="mb-12">
        <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-6 flex items-center gap-2">
          <Trophy className="text-[--color-accent]" size={24} />
          Upcoming Tournament
        </h2>
        <div className="bg-[--color-surface] rounded-lg border border-[--color-accent] p-6">
          <h3 data-testid="tournament-name" className="text-xl font-bold text-[--color-accent] mb-4">
            Spring 2025 Championship
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <InfoCard icon={<Calendar size={20} />} label="Date" value="March 29, 2025" testId="tournament-date" />
            <InfoCard icon={<Users size={20} />} label="Format" value="Single Elimination" testId="tournament-format" />
            <InfoCard icon={<MapPin size={20} />} label="Map" value="Europe (Standard)" testId="tournament-map" />
            <InfoCard icon={<Trophy size={20} />} label="Slots" value="32 Players" testId="tournament-slots" />
          </div>

          <h4 className="font-semibold text-[--color-text-primary] mb-3">Schedule</h4>
          <div data-testid="tournament-schedule" className="space-y-2">
            <ScheduleItem phase="Registration" dates="January 20 – February 15" />
            <ScheduleItem phase="Group Stage" dates="February 22 – March 8" />
            <ScheduleItem phase="Playoffs" dates="March 15 – March 22" />
            <ScheduleItem phase="Finals" dates="March 29" />
          </div>
        </div>
      </section>

      {/* Rules */}
      <section data-testid="tournament-rules" className="mb-12">
        <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-6">Rules & Format</h2>
        <div className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6">
          <ul className="space-y-3 text-[--color-text-secondary]">
            <li className="flex items-start gap-2">
              <span className="text-[--color-accent]">•</span>
              Best of 3 matches in each round
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[--color-accent]">•</span>
              Standard mode on the Europe map
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[--color-accent]">•</span>
              Minimum 16 players per lobby for ranked games
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[--color-accent]">•</span>
              No team play allowed in tournament FFA matches
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[--color-accent]">•</span>
              Results tracked via wc3stats integration
            </li>
          </ul>
        </div>
      </section>

      {/* Past Tournaments */}
      <section data-testid="past-tournaments">
        <h2 className="text-2xl font-semibold text-[--color-text-primary] mb-6">Past Tournaments</h2>
        <div className="bg-[--color-surface] rounded-lg border border-[--color-border] p-6 text-center">
          <p className="text-[--color-text-secondary]">
            Past tournament results will be displayed here as events are completed.
          </p>
        </div>
      </section>
    </div>
  );
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}

function InfoCard({ icon, label, value, testId }: InfoCardProps) {
  return (
    <div data-testid={testId} className="bg-[--color-primary] rounded-lg p-3">
      <div className="flex items-center gap-2 text-[--color-accent] mb-1">
        {icon}
        <span className="text-xs text-[--color-text-secondary]">{label}</span>
      </div>
      <div className="text-sm font-semibold text-[--color-text-primary]">{value}</div>
    </div>
  );
}

interface ScheduleItemProps {
  phase: string;
  dates: string;
}

function ScheduleItem({ phase, dates }: ScheduleItemProps) {
  return (
    <div className="flex items-center justify-between bg-[--color-primary] rounded px-4 py-2">
      <span className="text-sm font-medium text-[--color-text-primary]">{phase}</span>
      <span className="text-sm text-[--color-text-secondary]">{dates}</span>
    </div>
  );
}
