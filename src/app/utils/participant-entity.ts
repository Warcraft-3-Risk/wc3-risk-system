import { ActivePlayer } from '../player/types/active-player';
import { Team } from '../teams/team';

export type ParticipantEntity = ActivePlayer | Team;

export function getCityCount(entity: ParticipantEntity) {
	if (entity instanceof Team) {
		return entity.getCities();
	} else {
		return entity.trackedData.cities.cities.length;
	}
}
