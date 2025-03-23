import { NameManager } from '../managers/names/name-manager';
import { ActivePlayer } from '../player/types/active-player';
import { Team } from '../teams/team';
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
