export interface Ownable {
	setOwner(newOwner: player): void;
	getOwner(): player;
}
