import { City } from '../city/city';
import { Resetable } from '../interfaces/resettable';
import { Spawner } from '../spawner/spawner';
import { HexColors } from '../utils/hex-colors';
import { LocalMessage } from '../utils/messages';
import { NEUTRAL_HOSTILE } from '../utils/utils';

export class Country implements Resetable {
	private readonly name: string;
	private readonly cities: City[];
	private readonly spawn: Spawner;
	private readonly text: texttag;
	private owner: player;

	constructor(name: string, cities: City[], spawn: Spawner) {
		this.name = name;
		this.cities = cities;
		this.spawn = spawn;

		const offsetX: number = GetUnitX(this.spawn.unit) - 100;
		const offsetY: number = GetUnitY(this.spawn.unit) - 300;
		const lengthCheck: number = this.name.length * 5.5 < 200 ? this.name.length * 5.5 : 200;

		this.text = CreateTextTag();
		SetTextTagText(this.text, `${HexColors.TANGERINE} ${this.name}`, 0.028);
		SetTextTagPos(this.text, offsetX - lengthCheck, offsetY, 16.0);
		SetTextTagVisibility(this.text, true);
		SetTextTagPermanent(this.text, true);
	}

	public reset(): void {
		this.cities.forEach((city) => {
			city.reset();
		});

		this.spawn.reset();
		this.owner = NEUTRAL_HOSTILE;
	}

	public getName(): string {
		return this.name;
	}

	public getCities(): City[] {
		return this.cities;
	}

	public getSpawn(): Spawner {
		return this.spawn;
	}

	public getOwner(): player {
		return this.owner;
	}

	public setOwner(player: player): void {
		if (player == null) player = NEUTRAL_HOSTILE;

		this.owner = player;
		this.spawn.setOwner(player);
		this.onOwnerChange();
	}

	private onOwnerChange() {
		if (this.owner == NEUTRAL_HOSTILE) return;

		this.cities.forEach((city) => {
			const effect = AddSpecialEffect(
				'Abilities\\Spells\\Human\\Resurrect\\ResurrectCaster.mdl',
				city.getBarrack().getDefaultX(),
				city.getBarrack().getDefaultY()
			);
			BlzSetSpecialEffectScale(effect, 1.1);
			DestroyEffect(effect);
		});

		LocalMessage(this.owner, `${this.name} ${HexColors.WHITE}has been conquered!|r`, 'Sound\\Interface\\Rescue.flac');
	}
}
