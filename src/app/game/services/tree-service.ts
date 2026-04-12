import { Resetable } from 'src/app/interfaces/resetable';
import { Destructable } from 'w3ts';
import { Wait } from 'src/app/utils/wait';
import { computeBatches } from 'src/app/utils/tree-reset-logic';
import { UNIT_ID } from 'src/configs/unit-id';

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
	/** O(1) membership lookup — populated in parallel with treeArray. */
	private treeSet: Set<destructable> = new Set();
	/** Tracks trees that have died or been damaged since the last reset. */
	private damagedOrDestroyed: Set<destructable> = new Set();
	/** Queue of hit positions from mortar/artillery attacks awaiting batch processing. */
	private hitQueue: Array<{ x: number; y: number }> = [];
	/** Single trigger shared by all trees for death event listening. */
	private deathTrigger: trigger;
	/** Trigger fired when any unit is attacked — used to find mortar/artillery attacks. */
	private attackTrigger: trigger;
	/** Periodic timer that drains the hit queue and scans for nearby trees. */
	private queueTimer: timer;
	private static instance: TreeManager;

	/**
	 * Scan radius around an AoE attack impact point.
	 * Covers the maximum outer splash radius of both Mortar and Artillery.
	 */
	private static readonly AOE_SCAN_RADIUS = 300;

	/** How often (in seconds) the hit-position queue is drained and trees are scanned. */
	private static readonly QUEUE_PROCESS_INTERVAL = 10;

	/**
	 * Constructor initializes the tree setup.
	 */
	private constructor() {
		this.treeSetup();
		this.setupAttackTracking();
		this.setupQueueProcessor();
	}

	public static getInstance(): TreeManager {
		return this.instance || (this.instance = new this());
	}

	/**
	 * Resets only damaged and destroyed trees to their maximum life.
	 * Trees at full health are skipped entirely.
	 * Processes the affected trees in batches to avoid frame spikes.
	 */
	public async reset(batchSize = 100, intervalSeconds = 0.1): Promise<void> {
		// Snapshot and clear the tracked set so new damages during the
		// async reset are captured for the next round.
		const treesToReset = Array.from(this.damagedOrDestroyed);
		this.damagedOrDestroyed.clear();

		const batches = computeBatches(treesToReset, batchSize);

		for (let b = 0; b < batches.length; b++) {
			const batch = batches[b];

			for (const tree of batch) {
				DestructableRestoreLife(tree, GetDestructableMaxLife(tree), false);
				SetDestructableInvulnerable(tree, true);
			}

			if (b < batches.length - 1) {
				await Wait.forSeconds(intervalSeconds);
			}
		}

		if (treesToReset.length > 0) {
			const treeTimer: timer = CreateTimer();

			TimerStart(treeTimer, 3.0, false, () => {
				PauseTimer(treeTimer);
				DestroyTimer(treeTimer);
				this.removeInvulnerabilityBatched(treesToReset, batchSize, intervalSeconds);
			});
		}
	}

	/**
	 * Removes invulnerability from the given trees in batches.
	 */
	private async removeInvulnerabilityBatched(trees: destructable[], batchSize: number, intervalSeconds: number): Promise<void> {
		const batches = computeBatches(trees, batchSize);

		for (let b = 0; b < batches.length; b++) {
			const batch = batches[b];

			for (const tree of batch) {
				SetDestructableInvulnerable(tree, false);
			}

			if (b < batches.length - 1) {
				await Wait.forSeconds(intervalSeconds);
			}
		}
	}

	/**
	 * Set up trees on the map by changing their model based on the terrain
	 * tile type they are on. Registers a single death-event trigger so that
	 * destroyed trees are automatically added to the reset tracking set.
	 *
	 * Note: WC3 has no native destructable-damage event, so only fully
	 * destroyed trees (life === 0) are captured here. Trees that are damaged
	 * but not killed will not appear in the tracking set. In practice this is
	 * acceptable because trees in this map have their max life set to half
	 * their initial HP (see treeSetup), so they are almost always killed
	 * outright rather than left at partial health.
	 */
	private treeSetup() {
		// One trigger for all tree deaths — more efficient than one per tree.
		this.deathTrigger = CreateTrigger();
		TriggerAddCondition(
			this.deathTrigger,
			Condition(() => {
				const dying = GetTriggerDestructable();
				if (dying !== undefined) {
					this.damagedOrDestroyed.add(dying);
				}
				return false;
			})
		);

		EnumDestructablesInRect(GetEntireMapRect(), undefined, () => {
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
			this.treeSet.add(newTree);

			// Register this tree for death event tracking.
			TriggerRegisterDeathEvent(this.deathTrigger, newTree);

			newTree = undefined;
			enumObject = undefined;
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

	/**
	 * Registers a trigger that fires whenever any unit is attacked.
	 * When the attacker is a Mortar or Artillery unit, the target's position
	 * is pushed into the hit queue for deferred tree scanning.
	 */
	private setupAttackTracking() {
		this.attackTrigger = CreateTrigger();

		for (let i = 0; i < bj_MAX_PLAYER_SLOTS; i++) {
			TriggerRegisterPlayerUnitEvent(this.attackTrigger, Player(i), EVENT_PLAYER_UNIT_ATTACKED, undefined);
		}

		TriggerAddAction(this.attackTrigger, () => {
			const attacker = GetAttacker();
			if (attacker === undefined) return;

			const typeId = GetUnitTypeId(attacker);
			if (typeId !== UNIT_ID.MORTAR && typeId !== UNIT_ID.ARTILLERY) return;

			const target = GetTriggerUnit();
			if (target === undefined) return;

			this.hitQueue.push({ x: GetUnitX(target), y: GetUnitY(target) });
		});
	}

	/**
	 * Starts a periodic timer that drains the hit-position queue every
	 * {@link QUEUE_PROCESS_INTERVAL} seconds, scanning for nearby trees
	 * at each queued position.
	 */
	private setupQueueProcessor() {
		this.queueTimer = CreateTimer();
		TimerStart(this.queueTimer, TreeManager.QUEUE_PROCESS_INTERVAL, true, () => {
			this.processHitQueue();
		});
	}

	/**
	 * Drains all queued hit positions, scanning for trees near each one.
	 * Swaps the queue reference so new hits that arrive during processing
	 * are captured in a fresh array.
	 */
	private processHitQueue() {
		if (this.hitQueue.length === 0) return;

		const positions = this.hitQueue;
		this.hitQueue = [];

		for (const pos of positions) {
			this.markNearbyTrees(pos.x, pos.y, TreeManager.AOE_SCAN_RADIUS);
		}
	}

	/**
	 * Enumerates destructables within a square bounding box centred on
	 * (`cx`, `cy`), then filters to trees within the circle of `radius` using
	 * a squared-distance check.  Matching trees are added to the
	 * `damagedOrDestroyed` tracking set.
	 *
	 * Using `EnumDestructablesInRect` (the only range-based destructable
	 * enumeration available in WC3) with a subsequent circle check avoids
	 * including corner trees from the bounding square.
	 */
	private markNearbyTrees(cx: number, cy: number, radius: number) {
		const r = Rect(cx - radius, cy - radius, cx + radius, cy + radius);
		const radiusSq = radius * radius;

		try {
			EnumDestructablesInRect(r, undefined, () => {
				const d = GetEnumDestructable();
				if (d === undefined || !this.treeSet.has(d)) return;

				const dx = GetDestructableX(d) - cx;
				const dy = GetDestructableY(d) - cy;
				if (dx * dx + dy * dy <= radiusSq) {
					this.damagedOrDestroyed.add(d);
				}
			});
		} finally {
			RemoveRect(r);
		}
	}
}
