export interface GamePlayer {
	onKill(victim: player, unit: unit, isPlayerCombat: boolean): void;
	onDeath(killer: player, unit: unit, isPlayerCombat: boolean): void;
	getPlayer(): player;
}
