import { STARTING_INCOME } from 'src/configs/game-settings';
import { GamePlayer } from '../entity/player/game-player';

export class Team {
	private readonly teamNumber: number;
	private readonly teamMembers: GamePlayer[];
	private income: number;
	private cities: number;
	private kills: number;
	private deaths: number;

	public constructor(players: GamePlayer[]) {
		this.teamNumber = GetPlayerTeam(players[0].getPlayer()) + 1;
		this.teamMembers = [];

		players.forEach((player) => {
			this.teamMembers.push(player);
		});

		this.income = players.length * STARTING_INCOME;
		this.cities = 0;
		this.kills = 0;
		this.deaths = 0;
	}

	public getNumber() {
		return this.teamNumber;
	}

	public getMembers() {
		return this.teamMembers;
	}

	public updateIncome(delta: number) {
		this.income += delta;
	}

	public updateCityCount(delta: number) {
		this.cities += delta;
	}

	public updateKillCount(delta: number) {
		this.kills += delta;
	}

	public updateDeathCount(delta: number) {
		this.deaths += delta;
	}

	public getIncome() {
		return this.income;
	}

	public getCities() {
		return this.cities;
	}

	public getKills() {
		return this.kills;
	}

	public getDeaths() {
		return this.deaths;
	}

	public sortPlayersByIncome() {
		this.teamMembers.sort((pA, pB) => {
			const playerAIncome: number = pA.getData().getIncome().income;
			const playerBIncome: number = pB.getData().getIncome().income;

			if (playerAIncome < playerBIncome) return 1;
			if (playerAIncome > playerBIncome) return -1;

			return 0;
		});
	}

	public giveTeamFullControl() {
		for (let i = 0; i < this.teamMembers.length; i++) {
			const playerA = this.teamMembers[i].getPlayer();

			for (let j = 0; j < this.teamMembers.length; j++) {
				const playerB = this.teamMembers[j].getPlayer();

				if (playerA == playerB) continue;

				SetPlayerAlliance(playerA, playerB, ALLIANCE_PASSIVE, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_REQUEST, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_HELP_RESPONSE, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_XP, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_SPELLS, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_VISION, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_CONTROL, true);
				SetPlayerAlliance(playerA, playerB, ALLIANCE_SHARED_ADVANCED_CONTROL, true);
			}
		}
	}

	public reset() {
		this.income = this.teamMembers.length * STARTING_INCOME;
		this.cities = 0;
		this.kills = 0;
		this.deaths = 0;
	}
}
