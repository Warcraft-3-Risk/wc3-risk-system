export class Wait {
	private constructor() {}

	public static forSeconds(seconds: number): Promise<void> {
		return new Promise((resolve) => {
			const waitTimer = CreateTimer();
			TimerStart(waitTimer, seconds, false, () => {
				PauseTimer(waitTimer);
				DestroyTimer(waitTimer);
				resolve();
			});
		});
	}
}
