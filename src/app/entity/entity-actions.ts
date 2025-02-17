export interface EntityActions {
	onKill(victim: player, unit: unit): void;
	onDeath(killer: player, unit: unit): void;
}
