import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { Team } from '../teams/team';
import { TeamManager } from '../teams/team-manager';
import { GlobalGameData } from '../game/state/global-game-state';
import { TURN_DURATION_IN_SECONDS } from '../../configs/game-settings';
import { VictoryManager } from '../managers/victory-manager';
import { RatingManager } from '../rating/rating-manager';
import { isReplay, getReplayObservedPlayer } from '../utils/game-status';
import { sortPlayers, sortTeams } from '../utils/scoreboard-sort-logic';
import { calculateEffectiveCityCount } from '../managers/victory-point-logic';

export interface PlayerRow {
	playerId: number;
	randomSeed: number;
	player: ActivePlayer;
	handle: player;
	income: number;
	incomeDelta: number;
	gold: number;
	cities: number;
	victoryPoints: number;
	effectiveCities: number;
	cityDisplay: string;
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
	teamNumber: number;
	totalIncome: number;
	totalGold: number;
	totalCities: number;
	totalVictoryPoints: number;
	totalEffectiveCities: number;
	totalCitiesDisplay: string;
	totalKills: number;
	totalDeaths: number;
	members: PlayerRow[];
	isEliminated: boolean;
}

export class ScoreboardDataModel {
	private _players: PlayerRow[] = [];
	private _teams: TeamRow[] = [];
	private _effectiveLocal: player;
	private playerSeeds = new Map<player, number>();

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

		this._players = sortPlayers(this._players);

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
			teamRow.totalVictoryPoints = teamRow.team.getVictoryPoints();
			teamRow.totalEffectiveCities = calculateEffectiveCityCount(teamRow.totalCities, teamRow.totalVictoryPoints);
			teamRow.totalCitiesDisplay =
				teamRow.totalVictoryPoints > 0 ? `${teamRow.totalCities} (+${teamRow.totalVictoryPoints})` : `${teamRow.totalCities}`;
			teamRow.totalGold = teamRow.members.reduce((sum, m) => sum + m.gold, 0);
			teamRow.totalKills = teamRow.team.getKills();
			teamRow.totalDeaths = teamRow.team.getDeaths();
			teamRow.isEliminated = teamRow.members.every((m) => m.isEliminated);
		}
	}

	private buildPlayerRow(p: ActivePlayer): PlayerRow {
		const handle = p.getPlayer();

		if (!this.playerSeeds.has(handle)) {
			this.playerSeeds.set(handle, Math.random());
		}

		const data = p.trackedData;
		const nameManager = NameManager.getInstance();
		const kd = data.killsDeaths.get(handle);

		const gameTimeInSeconds = GlobalGameData.turnCount * TURN_DURATION_IN_SECONDS + (TURN_DURATION_IN_SECONDS - GlobalGameData.tickCounter);
		const isInCombat = gameTimeInSeconds > 15 && gameTimeInSeconds - data.lastCombat <= 15;

		const requiredCities = VictoryManager.getInstance().getCityCountWin();
		const cities = data.cities.cities.length;
		const victoryPoints = ((data as unknown) as { victoryPoints?: number }).victoryPoints ?? 0;
		const effectiveCities = calculateEffectiveCityCount(cities, victoryPoints);

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
			playerId: GetPlayerId(handle),
			randomSeed: this.playerSeeds.get(handle)!,
			player: p,
			handle,
			income: data.income.income,
			incomeDelta: data.income.delta,
			gold: GetPlayerState(handle, PLAYER_STATE_RESOURCE_GOLD),
			cities,
			victoryPoints,
			effectiveCities,
			cityDisplay: victoryPoints > 0 ? `${cities} (+${victoryPoints})` : `${cities}`,
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
			cityCountHighlighted: effectiveCities >= requiredCities,
		};
	}

	private buildTeamRows(): void {
		const teamManager = TeamManager.getInstance();

		// Construct initial unsorted array
		let teamsData: TeamRow[] = teamManager.getTeams().map((team) => ({
			team,
			teamNumber: team.getNumber(),
			totalIncome: team.getIncome(),
			totalGold: 0,
			totalCities: 0,
			totalVictoryPoints: 0,
			totalEffectiveCities: 0,
			totalCitiesDisplay: '0',
			totalKills: 0,
			totalDeaths: 0,
			members: [] as PlayerRow[],
			isEliminated: false,
		}));

		teamsData = sortTeams(teamsData);

		// Build a lookup from player handle to PlayerRow
		// Note: _players is already sorted by income at this point!
		const rowLookup = new Map<player, PlayerRow>();
		this._players.forEach((row) => rowLookup.set(row.handle, row));

		this._teams = teamsData.map((teamRow) => {
			// Because _players is already sorted, mapping from members will inherently preserve that sort! Wait actually, team.getMembers() uses native arrangement. Let's just sort members using sortPlayers.

			let members = teamRow.team
				.getMembers()
				.map((m) => rowLookup.get(m.getPlayer()))
				.filter((r): r is PlayerRow => r !== undefined);

			members = sortPlayers(members);

			const isEliminated = members.every((m) => m.isEliminated);

			return {
				team: teamRow.team,
				teamNumber: teamRow.teamNumber,
				totalIncome: teamRow.totalIncome,
				totalGold: members.reduce((sum, m) => sum + m.gold, 0),
				totalCities: teamRow.team.getCities(),
				totalVictoryPoints: teamRow.team.getVictoryPoints(),
				totalEffectiveCities: calculateEffectiveCityCount(teamRow.team.getCities(), teamRow.team.getVictoryPoints()),
				totalCitiesDisplay:
					teamRow.team.getVictoryPoints() > 0
						? `${teamRow.team.getCities()} (+${teamRow.team.getVictoryPoints()})`
						: `${teamRow.team.getCities()}`,
				totalKills: teamRow.team.getKills(),
				totalDeaths: teamRow.team.getDeaths(),
				members,
				isEliminated,
			};
		});
	}
}
