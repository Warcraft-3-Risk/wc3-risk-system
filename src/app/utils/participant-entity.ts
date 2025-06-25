import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { SettingsContext } from '../settings/settings-context';
import { Team } from '../teams/team';
import { TeamManager } from '../teams/team-manager';
import { HexColors } from './hex-colors';
import { LocalMessage } from './messages';

export type ParticipantEntity = ActivePlayer | Team;

export class ParticipantEntityManager {
	public static getCityCount(entity: ParticipantEntity): number {
		if (entity instanceof Team) {
			return entity.getCities();
		} else {
			return entity.trackedData.cities.cities.length;
		}
	}

	public static getDisplayName(entity: ParticipantEntity, preferNameIfOneTeamMember: boolean = false): string {
		if (entity instanceof Team) {
			return preferNameIfOneTeamMember && entity.getMembers().length === 1
				? NameManager.getInstance().getDisplayName(entity.getMembers()[0].getPlayer())
				: `${HexColors.WHITE}Team ${entity.getNumber()}|r`;
		} else {
			return NameManager.getInstance().getDisplayName(entity.getPlayer());
		}
	}

	public static getHighestPriorityParticipant(entity: ParticipantEntity): ActivePlayer | undefined {
		if (!entity) {
			return undefined;
		}

		return entity instanceof ActivePlayer ? (entity as ActivePlayer) : (entity as Team).getMemberWithHighestIncome();
	}

	public static getParticipantByActivePlayer(activePlayer: ActivePlayer): ParticipantEntity {
		if (SettingsContext.getInstance().isFFA()) {
			return activePlayer;
		} else {
			return TeamManager.getInstance().getTeamFromPlayer(activePlayer.getPlayer());
		}
	}

	public static getParticipantNamePrefixedWithOptionalTeamNumber(player: player): string {
		if (SettingsContext.getInstance().isFFA()) {
			return NameManager.getInstance().getDisplayName(player);
		} else {
			return `${HexColors.WHITE}[${TeamManager.getInstance().getTeamFromPlayer(player).getNumber()}]|r ${NameManager.getInstance().getDisplayName(player)}|r`;
		}
	}

	public static getParticipantColoredBTagPrefixedWithOptionalTeamNumber(player: player): string {
		if (SettingsContext.getInstance().isFFA()) {
			return `${NameManager.getInstance().getColorCode(player)}${NameManager.getInstance().getBtag(player)}|r`;
		} else {
			return `${HexColors.WHITE}[${TeamManager.getInstance().getTeamFromPlayer(player).getNumber()}]|r ${NameManager.getInstance().getColorCode(player)}${NameManager.getInstance().getBtag(player)}|r`;
		}
	}

	public static getWinnerParticipantName(player: player): string {
		if (SettingsContext.getInstance().isFFA()) {
			return NameManager.getInstance().getDisplayName(player);
		} else {
			return `${HexColors.WHITE}Team ${TeamManager.getInstance().getTeamFromPlayer(player).getNumber()}|r`;
		}
	}

	public static localMessage(participant: ParticipantEntity, msg: string, soundPath: string, duration: number = 3): void {
		if (participant instanceof ActivePlayer) {
			LocalMessage(participant.getPlayer(), msg, soundPath, duration);
		} else {
			participant.getMembers().forEach((member) => LocalMessage(member.getPlayer(), msg, soundPath, duration));
		}
	}
}
