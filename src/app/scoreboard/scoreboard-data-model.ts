import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { Team } from '../teams/team';
import { TeamManager } from '../teams/team-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { TURN_DURATION_IN_SECONDS } from '../../configs/game-settings';
import { VictoryManager } from '../managers/victory-manager';
import { RatingManager } from '../rating/rating-manager';
import { isReplay, getReplayObservedPlayer } from '../utils/game-status';

export interface PlayerRow {
	player: ActivePlayer;
	handle: player;
	income: number;
	incomeDelta: number;
	gold: number;
	cities: number;
	kills: number;
	deaths: number;
	status: string;
	statusDuration: number;
	isEliminated: boolean;
	isNomad: boolean;
	isSTFU: boolean;
	isAlive: boolean;
	turnDied: number;
	lastCombat: number;
	isInCombat: boolean;
	teamNumber: number;
	ratingChange: { effectiveChange: number; wasFloorProtected: boolean } | undefined;
	displayName: string;
	acctName: string;
	btag: string;
	originalColorCode: string;
	cityCountHighlighted: boolean;
}

export interface TeamRow {
	team: Team;
	number: number;
	totalIncome: number;
	totalCities: number;
	totalKills: number;
	totalDeaths: number;
	members: PlayerRow[];
	isEliminated: boolean;
}

export class ScoreboardDataModel {
	private _players: PlayerRow[] = [];
	private _teams: TeamRow[] = [];
	private _effectiveLocal: player;

	public get players(): PlayerRow[] {
		return this._players;
	}

	public get teams(): TeamRow[] {
		return this._teams;
	}

	public get effectiveLocal(): player {
		return this._effectiveLocal;
	}

	/**
	 * Full rebuild: reads all data from ActivePlayer instances, sorts, and caches.
	 * Called on updateFull (once per turn).
	 */
	public refresh(activePlayers: ActivePlayer[], isFFA: boolean): void {
		this._effectiveLocal = isReplay() ? getReplayObservedPlayer() : GetLocalPlayer();
		this._players = activePlayers.map((p) => this.buildPlayerRow(p));

		this._players.sort((a, b) => {
			if (!a.isEliminated && b.isEliminated) return -1;
			if (a.isEliminated && !b.isEliminated) return 1;

			if (a.isEliminated && b.isEliminated) {
				if (a.turnDied > b.turnDied) return -1;
				if (a.turnDied < b.turnDied) return 1;
				return GetPlayerId(a.handle) - GetPlayerId(b.handle);
			}

			if (a.income < b.income) return 1;
			if (a.income > b.income) return -1;
			return GetPlayerId(a.handle) - GetPlayerId(b.handle);
		});

		if (!isFFA) {
			this.buildTeamRows();
		}
	}

	/**
	 * Value-only rebuild: re-reads data without re-sorting.
	 * Called on updatePartial (every tick).
	 */
	public refreshValues(activePlayers: ActivePlayer[], isFFA: boolean): void {
		this._effectiveLocal = isReplay() ? getReplayObservedPlayer() : GetLocalPlayer();

		// Rebuild rows in the existing sorted order
		const playerMap = new Map<player, ActivePlayer>();
		activePlayers.forEach((p) => playerMap.set(p.getPlayer(), p));

		this._players = this._players.map((existing) => {
			const ap = playerMap.get(existing.handle);
			if (ap) {
				const row = this.buildPlayerRow(ap);
				// Preserve income from last full refresh — income only updates at turn boundaries
				row.income = existing.income;
				row.incomeDelta = existing.incomeDelta;
				return row;
			}
			return existing;
		});

		if (!isFFA) {
			this.refreshTeamValues();
		}
	}

	public refreshEffectiveLocal(): void {
		this._effectiveLocal = isReplay() ? getReplayObservedPlayer() : GetLocalPlayer();
	}

	/**
	 * Updates team row values in-place without re-sorting teams or members.
	 * Preserves the ordering established by the last buildTeamRows() call.
	 * Team income is preserved from the last full refresh — it only updates at turn boundaries.
	 */
	private refreshTeamValues(): void {
		const rowLookup = new Map<player, PlayerRow>();
		this._players.forEach((row) => rowLookup.set(row.handle, row));

		for (const teamRow of this._teams) {
			// Update member PlayerRow references to their rebuilt versions
			for (let i = 0; i < teamRow.members.length; i++) {
				const updated = rowLookup.get(teamRow.members[i].handle);
				if (updated) teamRow.members[i] = updated;
			}

			// Update team-level totals (income preserved from last full refresh)
			teamRow.totalCities = teamRow.team.getCities();
			teamRow.totalKills = teamRow.team.getKills();
			teamRow.totalDeaths = teamRow.team.getDeaths();
			teamRow.isEliminated = teamRow.members.every((m) => m.isEliminated);
		}
	}

	private buildPlayerRow(p: ActivePlayer): PlayerRow {
		const handle = p.getPlayer();
		const data = p.trackedData;
		const nameManager = NameManager.getInstance();
		const kd = data.killsDeaths.get(handle);

		const gameTimeInSeconds = GlobalGameData.turnCount * TURN_DURATION_IN_SECONDS + (TURN_DURATION_IN_SECONDS - GlobalGameData.tickCounter);
		const isInCombat = gameTimeInSeconds > 15 && gameTimeInSeconds - data.lastCombat <= 15;

		const requiredCities = VictoryManager.getCityCountWin();
		const cities = data.cities.cities.length;

		let ratingChange: PlayerRow['ratingChange'] = undefined;
		if (p.status.isEliminated()) {
			const ratingManager = RatingManager.getInstance();
			const btag = nameManager.getBtag(handle);
			const ratingResult = ratingManager.getRatingResults().get(btag);
			if (ratingResult && ratingManager.isRankedGame() && ratingManager.isRatingSystemEnabled()) {
				const effectiveChange = ratingResult.newRating - ratingResult.oldRating;
				const wasFloorProtected = effectiveChange === 0 && ratingResult.totalChange < 0;
				ratingChange = { effectiveChange, wasFloorProtected };
			}
		}

		let teamNumber = 0;
		try {
			teamNumber = TeamManager.getInstance().getTeamNumberFromPlayer(handle);
		} catch {
			// FFA mode — no team
		}

		return {
			player: p,
			handle,
			income: data.income.income,
			incomeDelta: data.income.delta,
			gold: GetPlayerState(handle, PLAYER_STATE_RESOURCE_GOLD),
			cities,
			kills: kd ? kd.killValue : 0,
			deaths: kd ? kd.deathValue : 0,
			status: p.status.status,
			statusDuration: p.status.statusDuration,
			isEliminated: p.status.isEliminated(),
			isNomad: p.status.isNomad(),
			isSTFU: p.status.isSTFU(),
			isAlive: p.status.isAlive(),
			turnDied: data.turnDied,
			lastCombat: data.lastCombat,
			isInCombat,
			teamNumber,
			ratingChange,
			displayName: nameManager.getDisplayName(handle),
			acctName: nameManager.getAcct(handle),
			btag: nameManager.getBtag(handle),
			originalColorCode: nameManager.getOriginalColorCode(handle),
			cityCountHighlighted: cities >= requiredCities,
		};
	}

	private buildTeamRows(): void {
		const teamManager = TeamManager.getInstance();
		const teams = [...teamManager.getTeams()];

		// Sort teams by income descending, tie-break by team number
		teams.sort((a, b) => {
			if (a.getIncome() < b.getIncome()) return 1;
			if (a.getIncome() > b.getIncome()) return -1;
			return a.getNumber() - b.getNumber();
		});

		// Build a lookup from player handle to PlayerRow
		const rowLookup = new Map<player, PlayerRow>();
		this._players.forEach((row) => rowLookup.set(row.handle, row));

		this._teams = teams.map((team) => {
			const members = team
				.getMembers()
				.map((m) => rowLookup.get(m.getPlayer()))
				.filter((r): r is PlayerRow => r !== undefined);

			// Sort members within each team by income descending, tie-break by playerID
			members.sort((a, b) => {
				if (a.income < b.income) return 1;
				if (a.income > b.income) return -1;
				return GetPlayerId(a.handle) - GetPlayerId(b.handle);
			});

			const isEliminated = members.every((m) => m.isEliminated);

			return {
				team,
				number: team.getNumber(),
				totalIncome: team.getIncome(),
				totalCities: team.getCities(),
				totalKills: team.getKills(),
				totalDeaths: team.getDeaths(),
				members,
				isEliminated,
			};
		});
	}
}
