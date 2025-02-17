import { Guard } from '../components/guard';
import { City } from '../city';

export type GuardFactory = (city: City) => Guard;
