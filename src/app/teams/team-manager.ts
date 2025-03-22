import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { SettingsContext } from '../settings/settings-context';
import { arrayRange, PLAYER_SLOTS, ShuffleArray } from '../utils/utils';
import { Team } from './team';

export class TeamManager {
	private teams: Map<number, Team>;
	private playersTeam: Map<player, Team>;
	private static instance: TeamManager;

	private constructor() {
		this.playersTeam = new Map<player, Team>();
		this.teams = new Map<number, Team>();
		const tempTeams: Map<number, ActivePlayer[]> = new Map<number, ActivePlayer[]>();

		for (let i = 0; i < PLAYER_SLOTS; i++) {
			const player = PlayerManager.getInstance().players.get(Player(i));

			if (!player) continue;

			const playerHandle: player = player.getPlayer();

			if (!IsPlayerSlotState(playerHandle, PLAYER_SLOT_STATE_PLAYING) || IsPlayerObserver(playerHandle)) {
				continue;
			}

			const teamNumber = GetPlayerTeam(playerHandle) + 1;

			if (!tempTeams.has(teamNumber)) {
				tempTeams.set(teamNumber, [player]);
			} else {
				tempTeams.get(teamNumber).push(player);
			}
		}

		let randomTeamNumber = arrayRange(0, PlayerManager.getInstance().players.size, 1);

		let playersInTeams = Array.from(tempTeams.values());
		ShuffleArray(playersInTeams);

		// Assign players to teams in random order
		playersInTeams.forEach((players) => {
			const rand = randomTeamNumber.shift() + 1;
			if (!this.teams.has(rand)) {
				const alliance = new Team(players, rand);
				this.teams.set(rand, alliance);

				players.forEach((player) => {
					this.playersTeam.set(player.getPlayer(), alliance);
				});
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
		return this.teams.get(teamNum);
	}

	public getTeamFromPlayer(player: player): Team {
		return this.playersTeam.get(player);
	}

	public getTeamNumberFromPlayer(player: player): number {
		return this.playersTeam.get(player).getNumber();
	}

	public allowFullSharedControl() {
		this.teams.forEach((team) => {
			team.giveTeamFullControl();
		});
	}

	public getActiveTeams(): Team[] {
		return this.getTeams().filter((team) => team.getMembers().find(x => x.status.isActive()));
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
