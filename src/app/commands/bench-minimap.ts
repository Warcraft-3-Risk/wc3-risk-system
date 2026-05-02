import { ChatManager } from '../managers/chat-manager';
import { MinimapIconManager } from '../managers/minimap-icon-manager';
import { UNIT_TYPE } from '../utils/unit-types';

export function BenchMinimapCommand(chatManager: ChatManager) {
	chatManager.addCmd(['-benchminimap'], () => {
		runMinimapBenchmark();
	});
}

function runMinimapBenchmark(): void {
	const owner = Player(23);
	const unitType = FourCC('hpea');
	const units: unit[] = [];
	const manager = MinimapIconManager.getInstance();
	const unitCount = 2000;
	const warmupTicks = 10;
	const measuredTicks = 300;
	const samples: number[] = [];

	for (let i = 0; i < unitCount; i++) {
		const u = CreateUnit(owner, unitType, 0, 0, 0);
		UnitAddType(u, UNIT_TYPE.SPAWN);
		manager.registerTrackedUnit(u);
		units.push(u);
	}

	for (let i = 0; i < warmupTicks; i++) {
		manager.debugRunUpdateAllIconsForBenchmark();
	}

	for (let i = 0; i < measuredTicks; i++) {
		const sample = manager.debugRunUpdateAllIconsForBenchmark();
		samples.push(sample.elapsedMs);
	}

	samples.sort((a, b) => a - b);
	const min = samples[0];
	const max = samples[samples.length - 1];
	const p95 = samples[Math.floor(samples.length * 0.95)];
	let total = 0;
	for (let i = 0; i < samples.length; i++) total += samples[i];
	const avg = total / samples.length;

	print(
		`[MinimapBench] units=${unitCount} min=${string.format('%.2f', min)} avg=${string.format('%.2f', avg)} p95=${string.format('%.2f', p95)} max=${string.format('%.2f', max)}`
	);

	for (let i = 0; i < units.length; i++) {
		manager.unregisterTrackedUnit(units[i]);
		RemoveUnit(units[i]);
	}
}
