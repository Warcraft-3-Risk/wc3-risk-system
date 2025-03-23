import { STARTING_INCOME } from 'src/configs/game-settings';
import { ActivePlayer } from '../player/types/active-player';

export class Team {
	private teamNumber: number;
	private teamMembers: ActivePlayer[];
	private income: number;
	private cities: number;
	private kills: number;
	private deaths: number;

	public constructor(players: ActivePlayer[], teamNumber: number) {
		this.teamNumber = teamNumber;
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

	public playerIsInTeam(player: player) {
		return this.teamMembers.find((x) => x.getPlayer() == player) != undefined;
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
			const playerAIncome: number = pA.trackedData.income.income;
			const playerBIncome: number = pB.trackedData.income.income;

			if (playerAIncome < playerBIncome) return 1;
			if (playerAIncome > playerBIncome) return -1;

			return 0;
		});
	}

	public getMembersSortedByIncome(): ActivePlayer[] {
		return this.teamMembers.sort((pA, pB) => {
			const playerAIncome: number = pA.trackedData.income.income;
			const playerBIncome: number = pB.trackedData.income.income;

			if (playerAIncome < playerBIncome) return 1;
			if (playerAIncome > playerBIncome) return -1;

			return 0;
		});
	}

	public getMemberWithHighestIncome(): ActivePlayer {
		return this.getMembersSortedByIncome()[0];
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
