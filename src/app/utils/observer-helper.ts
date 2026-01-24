/**
 * Observers are not capable of clicking or interacting with buttons in a normal way.
 * This hotfixes allows them to hover a button with the mouse to "click" it.
 */
export function CreateObserverButton(button: framehandle, isObserver: boolean, action: () => void) {
	if (GetLocalPlayer() === GetLocalPlayer()) {
		const t = CreateTimer();
		TimerStart(t, 1, true, () => {
			if (BlzFrameIsVisible(BlzFrameGetChild(button, 5))) {
				if (isObserver) {
					action();
				}
			}
		});
	}
}
