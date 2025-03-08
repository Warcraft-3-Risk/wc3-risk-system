import { NameManager } from '../managers/names/name-manager';
import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { SettingsContext } from '../settings/settings-context';
import { DiplomacyStringsColorFormatted } from '../settings/strategies/diplomacy-strategy';
import { FogOptionsColorFormatted } from '../settings/strategies/fog-strategy';
import { GameTypeOptionsColorFormatted } from '../settings/strategies/game-type-strategy';
import { OvertimeStringsColorFormatted } from '../settings/strategies/overtime-strategy';
import { PromodeOptionsColorFormatted } from '../settings/strategies/promode-strategy';
import { HexColors } from '../utils/hex-colors';
import { ShuffleArray } from '../utils/utils';

/**
 * Responsible for creating in-game quests.
 */

type QuestType =
	| 'QUEST_CREDITS'
	| 'QUEST_HOW_TO_PLAY'
	| 'QUEST_ARMY_COMPOSITION'
	| 'QUEST_OVERTIME'
	| 'QUEST_CAMERA'
	| 'QUEST_SETTINGS'
	| 'QUEST_SHUFFLED_PLAYER_LIST';

export class Quests {
	private static instance: Quests = null;
	private quests: Map<QuestType, quest> = new Map();
	private shuffledPlayerList: ActivePlayer[];

	private constructor() {}

	public static getInstance(): Quests {
		if (!Quests.instance) {
			Quests.instance = new Quests();
		}
		return Quests.instance;
	}

	public Create() {
		this.Credits();
		this.Tutorial();
		this.ArmyComposition();
		this.OvertimeDescription();
		this.CameraDescription();
	}

	private Credits() {
		let description: string = 'Main Dev/Code: ForLolz#11696';
		description += '\nTerrain: Nerla#1510';
		description += '\nUnits: Saran, ForLolz#11696';
		description += '\nIcons: High/Low Health Guard: Moy | High Value Guard: The Panda | Low Value Guard NemoVonFish';
		description += '\nSS Ship Model: ??, please let ForLolz know if you know the author';
		description += '\nSpecial Thanks: The Risk Community, Priwin, PsycoMarauder, RodOfNod, goble-r1sk, Saran, and all the devs before me!';

		this.BuildQuest('QUEST_CREDITS', 'Credits', description, 'ReplaceableTextures\\CommandButtons\\BTNTome.blp', false);
	}

	private Tutorial() {
		let description: string = 'The goal of the game is to conquer a specific amount of cities and hold them until the end of the turn.';
		description += ' To gain income you need to control a whole country when the turn ends.';
		description += ' It is best to start with smaller countries to gain income quickly.';
		description += ' Try to expand in a way that will keep your countries connected.';
		description += ' Make sure to use your spawns, they are free units you get each turn form countries you own.';
		description += ' Chat is essential in Risk, make sure to use it and read it. Diplomacy is key.';
		description += ' Make sure to peace other players, but also be ready to be backstabbed when your are vulnerable.';

		this.BuildQuest('QUEST_HOW_TO_PLAY', 'How to play', description, 'ReplaceableTextures\\WorldEditUI\\Editor-Random-Unit.blp', true);
	}

	private ArmyComposition() {
		let description: string = 'Risk is not your typical, "buy the more expensive unit" game. Army composition is very important.';
		description += ' The main bulk of your army will be Riflemen. They should be supported by Priests and Mortors.';
		description += ' Those three unit types will do most of your fighting on land.';
		description += ' It is also important to build a couple of Roarers to cast Roar and Dispel.';
		description += ' Units such as Knights and Generals are mostly used to overhwelm your enemy in specific situations.';
		description += ' These situations are not often, it is mostly when your enemy loses their Riflemen line.';
		description += ' Artillery are a long range splash damage units. Be careful with them as they are defensively weak.';
		description += ' Tanks are strong units that are best used in mass. Be sure to micro weak tanks back so they can heal.';
		description += ' SS are king of the seas, they are the go to ship in FFA games.';
		description += ' Warship B is best used to chase down other weak ships including SS.';
		description += ' Warship A is an early game unit.';
		description += ' It should only really be used the first couple of turns in fights on specific coastlines.';

		this.BuildQuest(
			'QUEST_ARMY_COMPOSITION',
			'Army Composition',
			description,
			'ReplaceableTextures\\WorldEditUI\\Editor-MultipleUnits.blp',
			true
		);
	}

	private OvertimeDescription() {
		let description: string =
			'Overtime is a feature designed to help conclude games more efficiently by gradually reducing the number of cities required for victory. Once activated, each turn decreases the victory threshold by one city until a player wins.';
		description += '\n\nThere are four Overtime settings:';
		description += '\n1. Turbo Mode: Overtime begins at turn 30, accelerating the game pace early on. This is the default setting.';
		description += '\n2. Medium Mode: Overtime starts at turn 60, allowing for a long gameplay before the mechanic activates.';
		description += '\n3. Extended Mode: Overtime starts at turn 120, allowing for extended gameplay before the mechanic activates.';
		description += '\n4. Off: Overtime is disabled.';

		description += '\n\nThis system ensures flexibility and adaptability based on player preferences.';

		this.BuildQuest(
			'QUEST_OVERTIME',
			'Overtime Explained',
			description,
			'ReplaceableTextures\\CommandButtons\\BTNSorceressMaster.blp',
			true
		);
	}

	private CameraDescription() {
		let description: string =
			'The camera system allows for full control of a players camera. The player can manipulate the distance, rotation, and angle of attack (AoA).';
		description += '\n\nTo use the camera command you can use the keyword -cam or -zoom';
		description +=
			'\nAfter the keyword you can input parameters to control the camera, the command would look like this -cam <distance> <rotation> <AoA>';
		description +=
			'\nYou do not need to supply all three parameters, but if want to change the 2nd or third you must provide all prior parameters';
		description += '\nIf you want to reset your camera back to default values you can simply type the command with no parameters provided';
		description += '\nAn example would be -cam 5000 90 270 or -zoom 5000 90 270';
		description += '\nThis command would give the player a top down camera with the default rotation and a distance of 5000';
		description +=
			'\nThis distance must be between 1000 and 8500, The rotation must be between 0 and 360, the AoA must be between 270 and 350';

		this.BuildQuest('QUEST_CAMERA', 'Camera Explained', description, 'ReplaceableTextures\\WorldEditUI\\Doodad-Cinematic.blp', true);
	}

	private BuildQuest(questType: QuestType, title: string, description: string, icon: string, required: boolean) {
		const quest: quest = this.quests.has(questType) ? this.quests.get(questType) : CreateQuest();

		QuestSetTitle(quest, title);
		QuestSetDescription(quest, description);
		QuestSetIconPath(quest, icon);
		QuestSetRequired(quest, required);
		QuestSetDiscovered(quest, true);
		QuestSetCompleted(quest, false);

		this.quests.set(questType, quest);
	}

	public AddSettingsQuest(settings: SettingsContext): void {
		let description: string = 'Game Settings:';
		description += `\nDiplomacy: ${DiplomacyStringsColorFormatted[settings.getSettings().Diplomacy.option]}`;
		description += `\nFog: ${FogOptionsColorFormatted[settings.getSettings().Fog]}`;
		description += `\nGame Type: ${GameTypeOptionsColorFormatted[settings.getSettings().GameType]}`;
		description += `\nOvertime: ${OvertimeStringsColorFormatted[settings.getSettings().Overtime.option]}`;
		description += `\nPromode: ${PromodeOptionsColorFormatted[settings.getSettings().Promode]}`;

		this.BuildQuest('QUEST_SETTINGS', 'Settings', description, 'ReplaceableTextures\\CommandButtons\\BTNEngineeringUpgrade.blp', false);
	}

	public AddShuffledPlayerListQuest(): void {
		let description: string = `${HexColors.YELLOW}Initial Players|r`;
		let nameList: ActivePlayer[] = [];
		const playerManager = PlayerManager.getInstance();
		const nameManager = NameManager.getInstance();
		playerManager.players.forEach((activePlayer) => {
			nameList.push(activePlayer);
		});
		ShuffleArray(nameList);

		// Save the shuffled list for future reference - in order to keep the list order consistent
		this.shuffledPlayerList = Array.from(nameList);

		nameList.forEach((player) => {
			description += `\n${nameManager.getBtag(player.getPlayer())}`;
		});
		this.BuildQuest(
			'QUEST_SHUFFLED_PLAYER_LIST',
			'Shuffled Player List',
			description,
			'ReplaceableTextures\\CommandButtons\\BTNPeasant.blp',
			false
		);
	}

	public UpdateShuffledPlayerListQuest(): void {
		if (!this.quests.has('QUEST_SHUFFLED_PLAYER_LIST')) this.AddShuffledPlayerListQuest();

		let description: string = `${HexColors.YELLOW}Active Players|r`;

		const activePlayers = this.shuffledPlayerList.filter((player) => (player.status ? player.status.isAlive() : false));
		activePlayers.forEach((player) => {
			description += `\n${NameManager.getInstance().getBtag(player.getPlayer())} (${HexColors.GREEN + 'Active|r'})`;
		});

		description += `\n\n${HexColors.YELLOW}Eliminated Players|r`;
		const eliminatedPlayers = this.shuffledPlayerList.filter((player) => (player.status ? player.status.isEliminated() : false));
		eliminatedPlayers.forEach((player) => {
			description += `\n${NameManager.getInstance().getBtag(player.getPlayer())} (${player.status ? player.status.status : 'Unknown'})`;
		});

		this.BuildQuest(
			'QUEST_SHUFFLED_PLAYER_LIST',
			'Shuffled Player List',
			description,
			'ReplaceableTextures\\CommandButtons\\BTNPeasant.blp',
			false
		);
	}
}
