import { ABILITY_ID } from 'src/configs/ability-id';
import { UnitToCity } from '../city/city-map';
import { PlayerManager } from '../player/player-manager';
import { ActivePlayer } from '../player/types/active-player';
import { PLAYER_SLOTS } from '../utils/utils';
import { EventEmitter } from '../utils/events/event-emitter';
import { EVENT_ON_SWAP_GUARD } from '../utils/events/event-constants';
import { AnnounceOnLocationObserverOnly, AnnounceOnUnitObserverOnly } from '../game/announcer/announce';
import { debugPrint } from '../utils/debug-print';

export function SpellEffectEvent() {
	const tSpellEffect: trigger = CreateTrigger();
	const tSpellCast: trigger = CreateTrigger();

	for (let i = 0; i < PLAYER_SLOTS; i++) {
		debugPrint(`Registering spell effect event for player ${i}`);
		TriggerRegisterPlayerUnitEvent(tSpellEffect, Player(i), EVENT_PLAYER_UNIT_SPELL_EFFECT, null);
		debugPrint(`Registered spell effect event for player ${i}`);
		debugPrint(`Registering spell cast event for player ${i}`);
		TriggerRegisterPlayerUnitEvent(tSpellCast, Player(i), EVENT_PLAYER_UNIT_SPELL_CAST, null);
		debugPrint(`Registered spell cast event for player ${i}`);
	}

	onSpellEffect(tSpellEffect);
	onSpellCast(tSpellCast);
}

function onSpellEffect(trigger: trigger) {
	TriggerAddCondition(
		trigger,
		Condition(() => {
			const player: ActivePlayer = PlayerManager.getInstance().players.get(GetTriggerPlayer());
			const x: number = GetSpellTargetX();
			const y: number = GetSpellTargetY();

			switch (GetSpellAbilityId()) {
				case ABILITY_ID.SWAP:
					EventEmitter.getInstance().emit(EVENT_ON_SWAP_GUARD, GetSpellTargetUnit(), UnitToCity.get(GetTriggerUnit()), player);
					AnnounceOnLocationObserverOnly('Swapped', x + 140, y + 20, 1.0, 2.0, GetTriggerPlayer());
					// AnnounceOnUnitObserverOnly('Swaped', GetSpellTargetUnit(), 2.0, 3.0);
					break;
				// case ABILITY_ID.LOW_HEALTH_DEFENDER:
				// 	player.options.health = false;
				// 	swapAbilities(GetTriggerUnit(), ABILITY_ID.LOW_HEALTH_DEFENDER, ABILITY_ID.HIGH_HEALTH_DEFENDER);
				// 	break;
				// case ABILITY_ID.HIGH_HEALTH_DEFENDER:
				// 	player.options.health = true;
				// 	swapAbilities(GetTriggerUnit(), ABILITY_ID.HIGH_HEALTH_DEFENDER, ABILITY_ID.LOW_HEALTH_DEFENDER);
				// 	break;
				// case ABILITY_ID.LOW_VALUE_DEFENDER:
				// 	player.options.value = false;
				// 	swapAbilities(GetTriggerUnit(), ABILITY_ID.LOW_VALUE_DEFENDER, ABILITY_ID.HIGH_VALUE_DEFENDER);
				// 	break;
				// case ABILITY_ID.HIGH_VALUE_DEFENDER:
				// 	player.options.value = true;
				// 	swapAbilities(GetTriggerUnit(), ABILITY_ID.HIGH_VALUE_DEFENDER, ABILITY_ID.LOW_VALUE_DEFENDER);
				// 	break;
				case ABILITY_ID.SPWN_3000:
				case ABILITY_ID.SPWN_6000:
					const radius: number = GetSpellAbilityId() == ABILITY_ID.SPWN_3000 ? 3000 : 6000;

					player.trackedData.countries.forEach((val, country) => {
						if (country.getOwner() == player.getPlayer()) {
							const spawner: unit = country.getSpawn().unit;

							if (IsUnitInRangeXY(spawner, GetUnitX(GetTriggerUnit()), GetUnitY(GetTriggerUnit()), radius)) {
								IssuePointOrder(spawner, 'setrally', x, y);

								if (player.getPlayer() == GetLocalPlayer()) {
									SelectUnit(spawner, true);
								}
							}
						}
					});
					break;
				case ABILITY_ID.SPWN_ALL:
					player.trackedData.countries.forEach((val, country) => {
						if (country.getOwner() == player.getPlayer()) {
							const spawner: unit = country.getSpawn().unit;

							IssuePointOrder(spawner, 'setrally', x, y);

							if (player.getPlayer() == GetLocalPlayer()) {
								SelectUnit(spawner, true);
							}
						}
					});
					break;
				case ABILITY_ID.SPWN_RESET:
					player.trackedData.countries.forEach((val, country) => {
						if (country.getOwner() == player.getPlayer()) {
							const spawner: unit = country.getSpawn().unit;
							IssuePointOrder(spawner, 'setrally', GetUnitX(spawner), GetUnitY(spawner));
						}
					});
					break;
				default:
					break;
			}
		})
	);
}

function onSpellCast(trigger: trigger) {
	TriggerAddCondition(
		trigger,
		Condition(() => {
			switch (GetSpellAbilityId()) {
				case ABILITY_ID.ROAR:
					AnnounceOnUnitObserverOnly('ROAR', GetSpellAbilityUnit(), 2.0, 3.0, true, 0, 20);
					break;
				case ABILITY_ID.DISPEL_MAGIC:
					AnnounceOnUnitObserverOnly('DISPELLING', GetSpellAbilityUnit(), 2.0, 3.0, true, 0, 20);
					break;
				default:
					break;
			}
		})
	);
}

// function swapAbilities(castingUnit: unit, castedAbility: number, swapAbility: number) {
// 	UnitRemoveAbility(castingUnit, castedAbility);
// 	UnitAddAbility(castingUnit, swapAbility);
// 	BlzStartUnitAbilityCooldown(castingUnit, castedAbility, 1);
// }
