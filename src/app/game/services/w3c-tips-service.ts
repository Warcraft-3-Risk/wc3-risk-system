export class W3CTipsService {
	private static tips: string[] = [
		'Practice makes perfect!\n\nPlay regularly to improve your skills.\n\nConsider joining the Risk Discord community for tips and tricks!',
		'Watch replays of professional players to learn new strategies.\n\nWatch matches through FloTV to see how the pros do it!',
		'Swap out your city defenders!\n\nUse the city "Swap" button to exchange defenders between cities for better defense!',
	];

	public static getRandomTip(): string {
		const randomIndex = Math.floor(Math.random() * this.tips.length);
		return this.tips[randomIndex];
	}
}
