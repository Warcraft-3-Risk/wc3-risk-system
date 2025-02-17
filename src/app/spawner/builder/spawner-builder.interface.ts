import { Resetable } from 'src/app/interfaces/resettable';
import { Spawner } from '../spawner';
import { ISpawnerData } from './spawner-data.interface';

export interface ISpawnerBuilder extends Resetable {
	setData(data: ISpawnerData, country: string): void;
	build(): Spawner;
}
