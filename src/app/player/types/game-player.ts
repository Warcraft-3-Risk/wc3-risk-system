export interface GamePlayer {
	onKill(victim: player, unit: unit, isPlayerCombat: boolean, pointValue: number, unitTypeKey: string): void;
	onDeath(killer: player, unit: unit, isPlayerCombat: boolean, pointValue: number, unitTypeKey: string): void;
	getPlayer(): player;
}
