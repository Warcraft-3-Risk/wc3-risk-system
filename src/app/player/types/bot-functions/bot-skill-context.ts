import { BotTerritoryTracker } from '../../../bot/territory-tracker';
import { City } from '../../../city/city';

export interface CampaignState {
	currentTarget: string | null;
	stagingCountry: string | null;
	campaignTicks: number;
	lastOwnedInTarget: number;
	consolidating: boolean;
}

export interface BotSkillContext {
	player: player;
	playerId: number;
	cities: City[];
	units: Set<unit>;
	territory: BotTerritoryTracker;
	campaign: CampaignState;
	pendingOrders: { unit: unit; x: number; y: number }[];
	orderedThisTick: Set<unit>;
}
