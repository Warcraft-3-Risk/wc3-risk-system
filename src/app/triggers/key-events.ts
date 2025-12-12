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
}
