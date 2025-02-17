/**
 * Responsible for creating in-game quests.
 */
export class Quests {
	//TODO Fight bonus explanation
	//TODO Bounty explanation
	//TODO Settings explanation
	public static Create() {
		Quests.Credits();
		Quests.Tutorial();
		Quests.ArmyComposition();
	}

	private static Credits() {
		let description: string = 'Main Dev/Code: ForLolz#11696';
		description += '\nTerrain: Nerla#1510';
		description += '\nUnits: Saran, ForLolz#11696';
		description += '\nIcons: High/Low Health Guard: Moy | High Value Guard: The Panda | Low Value Guard NemoVonFish';
		description += '\nSS Ship Model: ??, please let ForLolz know if you know the author';
		description +=
			'\nSpecial Thanks: The Wc3 Risk Community, Priwin, PsycoMarauder, RodOfNod, goble-r1sk, Saran, and all the devs before me!';

		Quests.BuildQuest('Credits', description, 'ReplaceableTextures\\CommandButtons\\BTNTome.blp', false);
	}

	private static Tutorial() {
		let description: string = 'The goal of the game is to conquer 135 cities and hold them until the end of the turn.';
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

	private static BuildQuest(title: string, description: string, icon: string, required: boolean) {
		const quest: quest = CreateQuest();
		QuestSetTitle(quest, title);
		QuestSetDescription(quest, description);
		QuestSetIconPath(quest, icon);
		QuestSetRequired(quest, required);
		QuestSetDiscovered(quest, true);
		QuestSetCompleted(quest, false);
	}
}
