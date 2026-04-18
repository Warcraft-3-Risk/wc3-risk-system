import { File } from 'w3ts';
import { PlayerManager } from 'src/app/player/player-manager';
import { CUSTOM_MAP_DATA_MATCH_DIRECTORY, CUSTOM_MAP_DATA_MINE_TYPE_TXT } from 'src/app/utils/utils';
import { serialiseSnapshot, type UnitEntry, type TurnSnapshot } from 'src/app/utils/unit-snapshot-logic';

/**
 * Records a compact end-of-turn snapshot of every field unit's id, type,
 * owner, and position, then writes it to a per-match file.
 *
 * Snapshots accumulate in an in-memory buffer and are flushed to disk
 * every {@link FLUSH_INTERVAL} turns to avoid per-turn file I/O.
 */
export class UnitSnapshotService {
	private static instance: UnitSnapshotService;

	/** All serialised lines accumulated since the match started. */
	private allLines: string[] = [];

	/** Number of lines added since the last flush. */
	private pendingCount = 0;

	/** How many turns between disk writes. */
	private static readonly FLUSH_INTERVAL = 5;

	private constructor() {
		print(`[UnitSnapshot] Service created. File path: ${this.getFilePath()}`);
	}

	public static getInstance(): UnitSnapshotService {
		return this.instance || (this.instance = new UnitSnapshotService());
	}

	public static resetInstance(): void {
		this.instance = undefined as unknown as UnitSnapshotService;
	}

	/**
	 * Capture a snapshot for the given turn and buffer it.
	 * Call this from the end-of-turn hook.
	 */
	public capture(turn: number): void {
		print(`[UnitSnapshot] capture() called for turn ${turn}`);
		const units = this.collectUnits();
		print(`[UnitSnapshot] Collected ${units.length} units`);
		const snap: TurnSnapshot = { turn, units };
		const line = serialiseSnapshot(snap);
		this.allLines.push(line);
		this.pendingCount++;
		print(`[UnitSnapshot] Pending: ${this.pendingCount}/${UnitSnapshotService.FLUSH_INTERVAL}, total lines: ${this.allLines.length}`);

		if (this.pendingCount >= UnitSnapshotService.FLUSH_INTERVAL) {
			this.flush();
		}
	}

	/** Write any remaining buffered lines to disk. */
	public flush(): void {
		if (this.pendingCount === 0) {
			print(`[UnitSnapshot] flush() called but nothing pending, skipping`);
			return;
		}

		const data = this.allLines.join('\n');
		const path = this.getFilePath();
		print(`[UnitSnapshot] Flushing all ${this.allLines.length} lines to: ${path}`);
		this.pendingCount = 0;

		File.writeRaw(path, data + '\n', false);
		print(`[UnitSnapshot] writeRaw() completed`);
	}

	// -----------------------------------------------------------------------
	// Internals
	// -----------------------------------------------------------------------

	/**
	 * Convert a FourCC integer back to its 4-character string.
	 * In TSTL this compiles to Lua's string.char for each byte.
	 */
	private static fourccToString(id: number): string {
		return string.char((id >>> 24) & 0xff, (id >>> 16) & 0xff, (id >>> 8) & 0xff, id & 0xff);
	}

	private collectUnits(): UnitEntry[] {
		const entries: UnitEntry[] = [];
		const players = PlayerManager.getInstance().players;
		let totalPlayers = 0;
		let totalTrackedUnits = 0;

		players.forEach((activePlayer) => {
			totalPlayers++;
			const ownerIndex = GetPlayerId(activePlayer.getPlayer());
			let playerUnitCount = 0;

			activePlayer.trackedData.units.forEach((u) => {
				totalTrackedUnits++;
				if (!IsUnitAliveBJ(u)) return;
				if (IsUnitType(u, UNIT_TYPE_STRUCTURE)) return;
				playerUnitCount++;

				entries.push({
					id: GetHandleId(u),
					type: UnitSnapshotService.fourccToString(GetUnitTypeId(u)),
					owner: ownerIndex,
					x: Math.round(GetUnitX(u)),
					y: Math.round(GetUnitY(u)),
				});
			});

			if (playerUnitCount > 0) {
				print(`[UnitSnapshot]   Player ${ownerIndex}: ${playerUnitCount} field units`);
			}
		});

		print(`[UnitSnapshot] collectUnits: ${totalPlayers} players, ${totalTrackedUnits} tracked, ${entries.length} alive non-structure`);
		return entries;
	}

	private getFilePath(): string {
		return `${CUSTOM_MAP_DATA_MATCH_DIRECTORY}/unit_snapshots.${CUSTOM_MAP_DATA_MINE_TYPE_TXT}`;
	}
}
