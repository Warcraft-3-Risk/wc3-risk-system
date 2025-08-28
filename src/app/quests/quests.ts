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
import { ParticipantEntityManager } from '../utils/participant-entity';
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
		let description: string = 'Devs/Code: ForLolz#11696, microhive#2772, roflmaooo#2930';
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
		const description = `
			Overtime is a feature designed to help conclude games more efficiently by gradually reducing the number of cities required for victory. Once activated, each turn decreases the victory threshold by one city until a player wins.
			
			There are four Overtime settings:
			1. Turbo Mode: Overtime begins at turn 30, accelerating the game pace early on. This is the default setting.
			2. Medium Mode: Overtime starts at turn 60, allowing for a long gameplay before the mechanic activates.
			3. Extended Mode: Overtime starts at turn 120, allowing for extended gameplay before the mechanic activates.
			4. Off: Overtime is disabled.
			
			This system ensures flexibility and adaptability based on player preferences.
		`;

		this.BuildQuest(
			'QUEST_OVERTIME',
			'Overtime',
			description,
			'ReplaceableTextures\\CommandButtons\\BTNSorceressMaster.blp',
			true
		);
	}

	private CameraDescription() {
		const description = `
			The camera system allows full control over a player's camera. You can adjust the distance, rotation, and angle of attack (AoA).
			
			To use the camera command, type -cam or -zoom.  
			Format: -cam <distance> <rotation> <AoA>
			
			You don’t need to supply all three parameters. However, if you want to change the second or third, you must also provide all preceding parameters.  
			To reset your camera to default values, type the command with no parameters.
			
			This example sets your camera to a top-down view with the default rotation and a distance of 5000:
			-cam 5000 90 270  
			-zoom 5000 90 270
			
			Parameter Ranges
			- Distance: 1000 – 8500  
			- Rotation: 0 – 360  
			- AoA: 270 – 350
		`;

		this.BuildQuest('QUEST_CAMERA', 'Camera', description, 'ReplaceableTextures\\WorldEditUI\\Doodad-Cinematic.blp', true);
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
		this.BuildQuest('QUEST_SHUFFLED_PLAYER_LIST', 'Players', description, 'ReplaceableTextures\\CommandButtons\\BTNPeasant.blp', false);
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
			description += `\n${ParticipantEntityManager.getParticipantColoredBTagPrefixedWithOptionalTeamNumber(player.getPlayer())} (${player.status ? player.status.status : 'Unknown'})`;
		});

		this.BuildQuest('QUEST_SHUFFLED_PLAYER_LIST', 'Players', description, 'ReplaceableTextures\\CommandButtons\\BTNPeasant.blp', false);
	}
}
