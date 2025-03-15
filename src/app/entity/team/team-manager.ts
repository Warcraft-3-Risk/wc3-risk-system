import { IsObserver } from 'src/app/utils/utils';
import { Team } from './team';

export class TeamManager {
	private teams: Set<Team>;
	private static instance: TeamManager;

	constructor() {
		this.teams = new Set<Team>();
	}

	public static getInstance(): TeamManager {
		if (this.instance == null) {
			this.instance = new TeamManager();
		}

		return this.instance;
	}

	public createTeam(): Team {
		const team = new Team();
		this.teams.add(team);

		return team;
	}

	public removeTeam(team: Team): void {
		this.teams.delete(team);
		// Handle logic for disbanding a team
	}

	public getTeams(): Set<Team> {
		return this.teams;
	}

	public static breakTeams() {
		for (let i = 0; i < bj_MAX_PLAYERS; i++) {
			const playerA: player = Player(i);

			for (let j = 0; j < bj_MAX_PLAYERS; j++) {
				const playerB: player = Player(j);

				SetPlayerAlliance(playerA, playerB, ALLIANCE_PASSIVE, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_REQUEST, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_RESPONSE, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_XP, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_SPELLS, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_VISION, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_CONTROL, false);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_ADVANCED_CONTROL, false);

				SetPlayerAlliance(playerB, playerA, ALLIANCE_PASSIVE, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_HELP_REQUEST, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_HELP_RESPONSE, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_XP, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_SPELLS, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_VISION, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_CONTROL, false);
				SetPlayerAlliance(playerB, playerA, ALLIANCE_SHARED_ADVANCED_CONTROL, false);
			}
		}
	}
}
