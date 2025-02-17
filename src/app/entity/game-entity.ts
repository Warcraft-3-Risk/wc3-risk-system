import { Resetable } from '../interfaces/resettable';
import { EntityActions } from './entity-actions';
import { EntityData } from './entity-data';

export interface GameEntity<T> extends EntityActions, Resetable {
	getData(): EntityData<T>;
}
