import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { SettingsContext } from '../settings/settings-context';
import { Team } from '../teams/team';
import { TeamManager } from '../teams/team-manager';
import { HexColors } from './hex-colors';

export type ParticipantEntity = ActivePlayer | Team;

export function getCityCount(entity: ParticipantEntity): number {
	if (entity instanceof Team) {
		return entity.getCities();
	} else {
		return entity.trackedData.cities.cities.length;
	}
}

export function getDisplayName(entity: ParticipantEntity): string {
	if (entity instanceof Team) {
		return `${HexColors.WHITE}Team ${entity.getNumber()}|r`;
	} else {
		return NameManager.getInstance().getDisplayName(entity.getPlayer());
	}
}

export function getHighestPriorityParticipant(entity: ParticipantEntity): ActivePlayer | undefined {
	if (!entity) {
		return undefined;
	}

	return entity instanceof ActivePlayer ? (entity as ActivePlayer) : (entity as Team).getMemberWithHighestIncome();
}

export function getParticipantByActivePlayer(activePlayer: ActivePlayer): ParticipantEntity {
	if (SettingsContext.getInstance().isFFA()) {
		return activePlayer;
	} else {
		return TeamManager.getInstance().getTeamFromPlayer(activePlayer.getPlayer());
	}
}

export function getParticipantNamePrefixedWithTeamNumber(player: player): string {
	if (SettingsContext.getInstance().isFFA()) {
		return NameManager.getInstance().getDisplayName(player);
	} else {
		return `${HexColors.WHITE}[${TeamManager.getInstance().getTeamFromPlayer(player).getNumber()}]|r ${NameManager.getInstance().getDisplayName(player)}|r`;
	}
}

export function getWinnerParticipantName(player: player): string {
	if (SettingsContext.getInstance().isFFA()) {
		return NameManager.getInstance().getDisplayName(player);
	} else {
		return `${HexColors.WHITE}Team ${TeamManager.getInstance().getTeamFromPlayer(player).getNumber()}|r`;
	}
}
