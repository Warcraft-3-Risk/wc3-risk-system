export function KeyEvents() {
	const t: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		BlzTriggerRegisterPlayerKeyEvent(t, Player(i), OSKEY_F7, 0, false);
	}

	TriggerAddCondition(
		t,
		Condition(() => {
			//const player: ActivePlayer = PlayerManager.getInstance().players.get(GetTriggerPlayer());
		})
	);

	const t2: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		BlzTriggerRegisterPlayerKeyEvent(t2, Player(i), OSKEY_F2, 0, false);
	}

	TriggerAddCondition(
		t2,
		Condition(() => {
			//const player: ActivePlayer = PlayerManager.getInstance().players.get(GetTriggerPlayer());
		})
	);

	const t3: trigger = CreateTrigger();

	for (let i = 0; i < bj_MAX_PLAYERS; i++) {
		BlzTriggerRegisterPlayerKeyEvent(t3, Player(i), OSKEY_F6, 0, false);
	}

	TriggerAddCondition(
		t3,
		Condition(() => {
			//const player: ActivePlayer = PlayerManager.getInstance().players.get(GetTriggerPlayer());
		})
	);
}
