export class W3CTipsService {
	private static tips: string[] = [
		'Alt-tabbing out of the game is not recommended!\n\nIt can cause issues with the game client and may lead to unexpected behavior such as crashes or desyncs.',
		'Practice makes perfect!\n\nPlay regularly to improve your skills.\n\nConsider joining the Risk Discord community for tips and tricks!',
		'Watch replays of professional players to learn new strategies.\n\nWatch matches through FloTV to see how the pros do it!',
		'Swap out your city defenders!\n\nUse the city "Swap" button to exchange defenders\nbetween cities for better defense!',
		'Cities can be captured with a single rifleman\nif approached from outside of city range!\n\nUse this to your advantage to capture extra cities\nat your own risk!',
		'Remember, 25 riflemen are always stronger\nthan a single tank!',
		'Roarers are critical support in battles!\n\nUse them to boost your units and turn the tide\nof battle in your favor!',
		'Use the -ff command to concede a match\nif you feel you cannot win.\n\nThis will end the match and allow you to start a new one.',
		"Use priests to heal your units between battles\nand keep them in fighting shape!\n\nHealing is crucial for maintaining your army's strength.",
	];

	public static getRandomTip(): string {
		const randomIndex = Math.floor(Math.random() * this.tips.length);
		return this.tips[randomIndex];
	}
}
