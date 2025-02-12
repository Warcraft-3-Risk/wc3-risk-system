import { Resetable } from 'src/app/interfaces/resetable';
import { Destructable } from 'w3ts';

// Tree type constants
const BARRENS_TREE = FourCC('T000');
const SNOWY_TREE = FourCC('T001');
const VILLAGE_TREE = FourCC('T002');
const ASHENV_CANOPY = FourCC('T003');
const BARRENS_CANOPY = FourCC('T004');

// Terrain type constants
const FELWOOD_ROUGHT_DIRT = FourCC('Cdrd');
const ASHENVALE_GRASS = FourCC('Agrs');
const NORTHREND_DARK_DIRT = FourCC('Ndrd');

// Tree color constants
const BARRENS_TREE_COLORS = {
	[FELWOOD_ROUGHT_DIRT]: FourCC('B008'),
	[ASHENVALE_GRASS]: FourCC('B000'),
	[NORTHREND_DARK_DIRT]: FourCC('B001'),
};

const BARRENS_TREE_DEFAULT_COLOR = FourCC('B007');

const SNOWY_TREE_COLORS = {
	[FELWOOD_ROUGHT_DIRT]: FourCC('B00J'),
	[ASHENVALE_GRASS]: FourCC('B00I'),
	[NORTHREND_DARK_DIRT]: FourCC('B00K'),
};

const SNOWY_TREE_DEFAULT_COLOR = FourCC('B00O');

const VILLAGE_TREE_COLORS = {
	[FELWOOD_ROUGHT_DIRT]: FourCC('B00N'),
	[ASHENVALE_GRASS]: FourCC('B00L'),
	[NORTHREND_DARK_DIRT]: FourCC('B00P'),
};

const VILLAGE_TREE_DEFAULT_COLOR = FourCC('B00M');

const BARRENS_CANOPY_COLORS = {
	[FELWOOD_ROUGHT_DIRT]: FourCC('B00H'),
	[ASHENVALE_GRASS]: FourCC('B00F'),
	[NORTHREND_DARK_DIRT]: FourCC('B003'),
};

const BARRENS_CANOPY_DEFAULT_COLOR = FourCC('B00G');

const ASHENV_CANOPY_COLORS = {
	[FELWOOD_ROUGHT_DIRT]: FourCC('B00C'),
	[ASHENVALE_GRASS]: FourCC('B00D'),
	[NORTHREND_DARK_DIRT]: FourCC('B002'),
};

const ASHENV_CANOPY_DEFAULT_COLOR = FourCC('B00B');

/**
 * TreeService is a class responsible for managing trees in the game.
 * It handles the setup, and resetting of tree states.
 * It implements the Resetable interface.
 */
export class TreeManager implements Resetable {
	private treeArray: destructable[] = [];
	private static instance: TreeManager;

	/**
	 * Constructor initializes the tree setup.
	 */
	private constructor() {
		this.treeSetup();
	}

	public static getInstance(): TreeManager {
		return this.instance || (this.instance = new this());
	}

	/**
	 * Resets the trees to their maximum life if they are damaged.
	 */
	public reset(): void {
		this.treeArray.forEach((tree) => {
			if (GetDestructableLife(tree) < GetDestructableMaxLife(tree)) {
				DestructableRestoreLife(tree, GetDestructableMaxLife(tree), false);
				SetDestructableInvulnerable(tree, true);
			}
		});

		const treeTimer: timer = CreateTimer();

		TimerStart(treeTimer, 3.0, false, () => {
			this.treeArray.forEach((tree) => {
				SetDestructableInvulnerable(tree, false);
			});

			PauseTimer(treeTimer);
			DestroyTimer(treeTimer);
		});
	}

	/**
	 * Set up trees on the map by changing their model based on the terrain tile type they are on.
	 */
	private treeSetup() {
		EnumDestructablesInRect(GetEntireMapRect(), null, () => {
			let enumObject = Destructable.fromHandle(GetEnumDestructable());
			let treeTypeID: number = enumObject.typeId;
			let objectX: number = enumObject.x;
			let objectY: number = enumObject.y;
			let terrainType: number = GetTerrainType(objectX, objectY);
			let newTree: destructable;
			let newType: number;

			switch (treeTypeID) {
				case BARRENS_TREE:
					newType = this.getTreeColor(BARRENS_TREE_COLORS, terrainType, BARRENS_TREE_DEFAULT_COLOR);
					break;
				case SNOWY_TREE:
					newType = this.getTreeColor(SNOWY_TREE_COLORS, terrainType, SNOWY_TREE_DEFAULT_COLOR);
					break;
				case VILLAGE_TREE:
					newType = this.getTreeColor(VILLAGE_TREE_COLORS, terrainType, VILLAGE_TREE_DEFAULT_COLOR);
					break;
				case BARRENS_CANOPY:
					newType = this.getTreeColor(BARRENS_CANOPY_COLORS, terrainType, BARRENS_CANOPY_DEFAULT_COLOR);
					break;
				case ASHENV_CANOPY:
					newType = this.getTreeColor(ASHENV_CANOPY_COLORS, terrainType, ASHENV_CANOPY_DEFAULT_COLOR);
					break;
				default:
					newType = enumObject.typeId;
					break;
			}

			enumObject.destroy();

			newTree = CreateDestructable(newType, objectX, objectY, 270, Math.random() * (1.2 - 0.8) + 0.8, Math.floor(Math.random() * 10) + 1);
			SetDestructableMaxLife(newTree, GetDestructableLife(newTree) / 2);
			this.treeArray.push(newTree);

			newTree = null;
			enumObject = null;
		});
	}

	/**
	 * Determines the color type for a tree based on the terrain type.
	 * @param treeColorMap - A mapping from terrain types to tree color types.
	 * @param terrainType - The type of terrain where the tree is located.
	 * @param defaultColor - The default color type for the tree.
	 * @returns The tree color type.
	 */
	private getTreeColor(treeColorMap: Record<number, number>, terrainType: number, defaultColor: number) {
		return treeColorMap[terrainType] ?? defaultColor;
	}
}
