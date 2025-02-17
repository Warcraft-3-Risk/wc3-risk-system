import { GamePlayer } from '../entity/player/game-player';
import { PlayerManager } from '../entity/player/player-manager';
import { PLAYER_SLOTS } from '../utils/utils';
import { Team } from './team';

export class TeamManager {
	private teams: Map<number, Team>;
	private static instance: TeamManager;

	private constructor() {
		this.teams = new Map<number, Team>();
		const teams: Map<number, GamePlayer[]> = new Map<number, GamePlayer[]>();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
			const player = PlayerManager.getInstance().getPlayers().get(Player(i));

			if (!player) continue;

			const playerHandle: player = player.getPlayer();

			if (!IsPlayerSlotState(playerHandle, PLAYER_SLOT_STATE_PLAYING) || IsPlayerObserver(playerHandle)) {
				continue;
			}

			const teamNumber = GetPlayerTeam(playerHandle) + 1;

			if (!teams.has(teamNumber)) {
				teams.set(teamNumber, [player]);
			} else {
				teams.get(teamNumber).push(player);
			}
		}

		teams.forEach((players, teamNumber) => {
			if (!this.teams.has(teamNumber)) {
				const alliance = new Team(players);

				this.teams.set(teamNumber, alliance);
			}
		});
	}

	public static getInstance(): TeamManager {
		if (TeamManager.instance == null) {
			this.instance = new TeamManager();
		}

		return this.instance;
	}

	public getTeams(): Team[] {
		return [...this.teams.values()];
	}

	public getTeamFromNumber(teamNum: number): Team {
		return this.teams.get(teamNum + 1);
	}

	public getTeamFromPlayer(player: player): Team {
		return this.teams.get(GetPlayerTeam(player) + 1);
	}

	public allowFullSharedControl() {
		this.teams.forEach((team) => {
			team.giveTeamFullControl();
		});
	}

	public static breakTeams() {
		for (let i = 0; i < PLAYER_SLOTS; i++) {
			const playerA: player = Player(i);

			for (let j = 0; j < PLAYER_SLOTS; j++) {
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
