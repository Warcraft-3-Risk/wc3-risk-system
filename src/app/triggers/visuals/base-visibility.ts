import { RegionToCity } from '../../city/city-map';
import { PlayerManager } from '../../player/player-manager';
import { debugPrint } from '../../utils/debug-print';

export function BaseVisibility() {
	const tDown: trigger = CreateTrigger();
	const tUp: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
        // Register for all possible meta-key combinations (0-15) to ensure we catch the event
        // This handles cases where other keys (Shift, Ctrl) might be held, or if the game considers Alt "active" during the press
        for (let meta = 0; meta < 16; meta++) {
            BlzTriggerRegisterPlayerKeyEvent(tDown, Player(i), OSKEY_LALT, meta, true);
            BlzTriggerRegisterPlayerKeyEvent(tUp, Player(i), OSKEY_LALT, meta, false);

            BlzTriggerRegisterPlayerKeyEvent(tDown, Player(i), OSKEY_RALT, meta, true);
            BlzTriggerRegisterPlayerKeyEvent(tUp, Player(i), OSKEY_RALT, meta, false);
        }
	}

	const playerEffects = new Map<player, effect[]>();
	const visibleModel = 'war3mapImported\\TargetIndicatorThinner_TC_100.mdx';

	TriggerAddAction(tDown, () => {
		const player = GetTriggerPlayer();

		if (PlayerManager.getInstance().isObserver(player)) return;
		if (playerEffects.has(player)) return;

		debugPrint(`Key Down Event: Player ${GetPlayerName(player)}`);

		debugPrint(`Creating visual effects for ${GetPlayerName(player)}`);
		const effects: effect[] = [];

		for (const city of RegionToCity.values()) {
			const x = GetUnitX(city.barrack.unit);
			const y = GetUnitY(city.barrack.unit);

			const eff = AddSpecialEffect(visibleModel, x, y);
			BlzSetSpecialEffectColorByPlayer(eff, Player(19));
			BlzSetSpecialEffectScale(eff, 7.5);
			BlzSetSpecialEffectAlpha(eff, 0);

			if (GetLocalPlayer() == player) {
				BlzSetSpecialEffectAlpha(eff, 25);
			}

			effects.push(eff);
		}

		playerEffects.set(player, effects);
		debugPrint(`Visual effects added for ${GetPlayerName(player)}`);
	});

	TriggerAddAction(tUp, () => {
		const player = GetTriggerPlayer();

		if (PlayerManager.getInstance().isObserver(player)) return;

		const effects = playerEffects.get(player);

		if (effects) {
			debugPrint(`Key Up Event: Player ${GetPlayerName(player)}`);
			debugPrint(`Destroying visual effects for ${GetPlayerName(player)}`);
			for (const eff of effects) {
				DestroyEffect(eff);
			}

			playerEffects.delete(player);
			debugPrint(`Visual effects cleaned up for ${GetPlayerName(player)}`);
		}
	});
}
