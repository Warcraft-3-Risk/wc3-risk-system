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
	| 'QUEST_PLAYERS';

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
		this.HowToPlay();
		this.ArmyComposition();
		this.Overtime();
		this.Camera();
	}

	private Credits() {
		let description = `Join our community on Discord: https://discord.gg/wc3risk
		 
		Devs/Code: ForLolz#11696, microhive#2772, roflmaooo#2930, xate#21335
		Terrain: Nerla#1510
		Units: Saran, ForLolz#11696
		Icons: High/Low Health Guard: Moy | High Value Guard: The Panda | Low Value Guard NemoVonFish
		SS Ship Model: ??, please let ForLolz know if you know the author
		Special Thanks: The Risk Community, Priwin, PsycoMarauder, RodOfNod, goble-r1sk, Saran, and all the devs before me!
	`;

		this.BuildQuest('QUEST_CREDITS', 'Credits', description, 'ReplaceableTextures\\CommandButtons\\BTNTome.blp', false);
	}

	private HowToPlay() {
		const description = `The goal of the game is to conquer a set number of cities and hold them until the end of the turn.  
			
			To earn income, you must control an entire country when the turn ends. It’s often best to begin with smaller countries to secure income quickly. Expand carefully and keep your territories connected for stronger defense.  
			
			Use your spawns wisely - they are free units granted each turn from the countries you control.  
			
			Communication is essential in risk - make sure to pay attention to the chat. Diplomacy is key. Make peace with other players when it benefits you, but always be ready for betrayal when you are vulnerable.
		`;

		this.BuildQuest('QUEST_HOW_TO_PLAY', 'How to Play', description, 'ReplaceableTextures\\WorldEditUI\\Editor-Random-Unit.blp', true);
	}

	private ArmyComposition() {
		const description = `Risk is not your typical "buy the most expensive unit" game - army composition matters greatly.
			
			The backbone of your army will be Riflemen, supported by Priests and Mortars. These three units will do most of the fighting on land.  
			It is also important to include a few Roarers to cast Roar and Dispel.  
			
			Other units serve more specialized purposes:  
			- Knights and Generals are situational, best used to overwhelm your enemy once their riflemen line has collapsed.  
			- Artillery provide long-range splash damage, but are fragile and require protection.  
			- Tanks are powerful when massed. Be sure to pull back weakened tanks so they can recover.  
			
			At sea:  
			- SS dominate the waters and are the primary ship of choice in FFA games.  
			- Warship B excels at chasing down weakened ships, including SS.  
			- Warship A is an early-game vessel, useful mainly in the opening turns along vulnerable coastlines.  
			
			Choose your forces wisely - the right mix will decide the battle.
		`;

		this.BuildQuest(
			'QUEST_ARMY_COMPOSITION',
			'Army Composition',
			description,
			'ReplaceableTextures\\WorldEditUI\\Editor-MultipleUnits.blp',
			true
		);
	}

	private Overtime() {
		const description = `Overtime is a feature designed to help conclude games more efficiently by gradually reducing the number of cities required for victory. Once activated, each turn decreases the victory threshold by one city until a player wins.
			
			There are four Overtime settings:
			1. Turbo Mode: Overtime starts immediately, accelerating the game pace early on. This is the default setting.
			2. Medium Mode: Overtime starts at turn 30, allowing a longer game before the mechanic activates. 
			3. Extended Mode: Overtime starts at turn 60, allowing for extended gameplay before the mechanic activates.
			4. Off: Overtime is disabled.
			
			If two or more players exceed the city requirement to win while having the exact same number of cities, the game will be extended by additional turns until one player breaks the tie and leads in city count.

			This system ensures flexibility and adaptability based on player preferences.
		`;

		this.BuildQuest('QUEST_OVERTIME', 'Overtime', description, 'ReplaceableTextures\\CommandButtons\\BTNSorceressMaster.blp', true);
	}

	private Camera() {
		const description = `The camera system allows full control over a player's camera. You can adjust the distance, rotation, and angle of attack (AoA).
			
			To use the camera command, type -cam or -zoom.  
			Format: -cam <distance> <rotation> <AoA>
			
			You don’t need to supply all three parameters. However, if you want to change the second or third, you must also provide all preceding parameters.  
			To reset your camera to default values, type the command with no parameters.
			
			This example sets your camera to a top-down view with the default rotation and a distance of 5000:
			-cam 5000 90 270  
			-zoom 5000 90 270
			
			Parameter Ranges:
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
		let description = `Game Settings:
			Host: ${NameManager.getInstance().getBtag(PlayerManager.getInstance().getHost().getPlayer())}
			Diplomacy: ${DiplomacyStringsColorFormatted[settings.getSettings().Diplomacy.option]}
			Fog: ${FogOptionsColorFormatted[settings.getSettings().Fog]}
			Game Type: ${GameTypeOptionsColorFormatted[settings.getSettings().GameType]}
			Overtime: ${OvertimeStringsColorFormatted[settings.getSettings().Overtime.option]}
			Promode: ${PromodeOptionsColorFormatted[settings.getSettings().Promode]}
		`;

		this.BuildQuest('QUEST_SETTINGS', 'Settings', description, 'ReplaceableTextures\\CommandButtons\\BTNEngineeringUpgrade.blp', false);
	}

	public addPlayersQuest(): void {
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
		this.BuildQuest('QUEST_PLAYERS', 'Players', description, 'ReplaceableTextures\\CommandButtons\\BTNPeasant.blp', false);
	}

	public updatePlayersQuest(): void {
		if (!this.quests.has('QUEST_PLAYERS')) this.addPlayersQuest();

		let description: string = `${HexColors.YELLOW}Active Players|r`;

		const activePlayers = this.shuffledPlayerList.filter((player) => (player.status ? player.status.isAlive() : false));
		activePlayers.forEach((player) => {
			description += `\n${NameManager.getInstance().getBtag(player.getPlayer())} (${HexColors.GREEN + 'Active|r'})`;
		});

		description += `\n\n${HexColors.YELLOW}Eliminated Players|r`;
		const eliminatedPlayers = this.shuffledPlayerList.filter((player) => (player.status ? player.status.isEliminated() : false));
		eliminatedPlayers.forEach((player) => {
			description += `\n${ParticipantEntityManager.getParticipantColoredBTagPrefixedWithOptionalTeamNumber(player.getPlayer())} (${player.status ? player.status.status : 'Unknown'})`;

			if (player.killedBy) {
				const killedByActivePlayer = PlayerManager.getInstance().players.get(player.killedBy);

				// Dependent on whether the killer is still alive or not we have to be careful to not leak his player name
				if (killedByActivePlayer.status.isActive()) {
					description += ' killed by ' + NameManager.getInstance().getDisplayName(player.killedBy);
				} else {
					description += ' killed by ' + ParticipantEntityManager.getParticipantColoredBTagPrefixedWithOptionalTeamNumber(player.killedBy);
				}

				description += ' (' + (killedByActivePlayer.status ? killedByActivePlayer.status.status : 'Unknown') + ')';
			}
		});

		this.BuildQuest('QUEST_PLAYERS', 'Players', description, 'ReplaceableTextures\\CommandButtons\\BTNPeasant.blp', false);
	}
}
