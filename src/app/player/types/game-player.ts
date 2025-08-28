export interface GamePlayer {
	onKill(victim: player, unit: unit): void;
	onDeath(killer: player, unit: unit): void;
	getPlayer(): player;
}
