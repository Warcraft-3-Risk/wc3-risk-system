import { SettingsContext } from '../settings/settings-context';
import { DiplomacyStrings } from '../settings/strategies/diplomacy-strategy';
import { FogOptions } from '../settings/strategies/fog-strategy';
import { GameTypeOptions } from '../settings/strategies/game-type-strategy';
import { OvertimeStrings } from '../settings/strategies/overtime-strategy';
import { PromodeOptions } from '../settings/strategies/promode-strategy';

/**
 * Responsible for creating in-game quests.
 */
export class Quests {
	public static Create() {
		Quests.Credits();
		Quests.Tutorial();
		Quests.ArmyComposition();
		Quests.OvertimeDescription();
		Quests.CameraDescription();
	}

	private static Credits() {
		let description: string = 'Main Dev/Code: ForLolz#11696';
		description += '\nTerrain: Nerla#1510';
		description += '\nUnits: Saran, ForLolz#11696';
		description += '\nIcons: High/Low Health Guard: Moy | High Value Guard: The Panda | Low Value Guard NemoVonFish';
		description += '\nSS Ship Model: ??, please let ForLolz know if you know the author';
		description += '\nSpecial Thanks: The Risk Community, Priwin, PsycoMarauder, RodOfNod, goble-r1sk, Saran, and all the devs before me!';

		Quests.BuildQuest('Credits', description, 'ReplaceableTextures\\CommandButtons\\BTNTome.blp', false);
	}

	private static Tutorial() {
		let description: string = 'The goal of the game is to conquer a specific amount of cities and hold them until the end of the turn.';
		description += ' To gain income you need to control a whole country when the turn ends.';
		description += ' It is best to start with smaller countries to gain income quickly.';
		description += ' Try to expand in a way that will keep your countries connected.';
		description += ' Make sure to use your spawns, they are free units you get each turn form countries you own.';
		description += ' Chat is essential in Risk, make sure to use it and read it. Diplomacy is key.';
		description += ' Make sure to peace other players, but also be ready to be backstabbed when your are vulnerable.';

		Quests.BuildQuest('How to play', description, 'ReplaceableTextures\\WorldEditUI\\Editor-Random-Unit.blp', true);
	}

	private static ArmyComposition() {
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

		Quests.BuildQuest('Army Composition', description, 'ReplaceableTextures\\WorldEditUI\\Editor-MultipleUnits.blp', true);
	}

	private static OvertimeDescription() {
		let description: string =
			'Overtime is a feature designed to help conclude games more efficiently by gradually reducing the number of cities required for victory. Once activated, each turn decreases the victory threshold by 5 city until a player wins.';
		description += '\nThere are three Overtime settings:';
		description += '\n1. Turbo Mode: Overtime begins at turn 30, accelerating the game pace early on.';
		description += '\n2. Extended Form Mode: Overtime starts at turn 120, allowing for extended gameplay before the mechanic activates.';
		description += '\n3. Off: Overtime is disabled, keeping the default victory conditions.';
		description += '\nThis system ensures flexibility and adaptability based on player preferences.';

		Quests.BuildQuest('Overtime Explained', description, 'ReplaceableTextures\\CommandButtons\\BTNSorceressMaster.blp', true);
	}

	private static CameraDescription() {
		let description: string =
			'The camera system allows for full control of a players camera. The player can manipulate the distance, rotation, and angle of attack (AoA).';
		description += '\nTo use the camera command you can use the keyword -cam or -zoom';
		description +=
			'\nAfter the keyword you can input parameters to control the camera, the command would look like this -cam <distance> <rotation> <AoA>';
		description +=
			'\nYou do not need to supply all three parameters, but if want to change the 2nd or third you must provide all prior parameters';
		description += '\nIf you want to reset your camera back to default values you can simply type the command with no parameters provided';
		description += '\nAn example would be -cam 5000 90 270 or -zoom 5000 90 270';
		description += '\nThis command would give the player a top down camera with the default rotation and a distance of 5000';
		description +=
			'\nThis distance must be between 1000 and 8500, The rotation must be between 0 and 360, the AoA must be between 270 and 350';

		Quests.BuildQuest('Camera Explained', description, 'ReplaceableTextures\\WorldEditUI\\Doodad-Cinematic.blp', true);
	}

	private static BuildQuest(title: string, description: string, icon: string, required: boolean) {
		const quest: quest = CreateQuest();
		QuestSetTitle(quest, title);
		QuestSetDescription(quest, description);
		QuestSetIconPath(quest, icon);
		QuestSetRequired(quest, required);
		QuestSetDiscovered(quest, true);
		QuestSetCompleted(quest, false);
	}

	private static AddQuest(title: string, description: string, icon: string, required: boolean) {
		Quests.BuildQuest(title, description, icon, required);
	}

	public static AddSettingsQuest(settings: SettingsContext): void {
		let description: string = 'Game Settings:';
		description += `\nDiplomacy: ${DiplomacyStrings[settings.getSettings().Diplomacy.option]}`;
		description += `\nFog: ${FogOptions[settings.getSettings().Fog]}`;
		description += `\nGame Type: ${GameTypeOptions[settings.getSettings().GameType]}`;
		description += `\nOvertime: ${OvertimeStrings[settings.getSettings().Overtime.option]}`;
		description += `\nPromode: ${PromodeOptions[settings.getSettings().Promode]}`;

		Quests.AddQuest('Settings', description, 'ReplaceableTextures\\CommandButtons\\BTNEngineeringUpgrade.blp', false);
	}
}
