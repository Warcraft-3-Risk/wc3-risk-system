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
}
