import { describe, it, expect, vi, beforeEach } from 'vitest';
import './fixtures/wc3-shim';

vi.mock('src/app/utils/hex-colors', () => ({ HexColors: {} }));
vi.mock('src/app/utils/player-colors', () => ({ PLAYER_COLORS: [], ACTIVE_PLAYER_COLORS: [] }));
vi.mock('w3ts', () => ({ File: class {} }));
vi.mock('w3ts/system/file', () => ({ File: class {} }));
vi.mock('src/app/utils/unit-types', () => ({ UNIT_TYPE: {} }));

import { GlobalGameData } from 'src/app/game/state/global-game-state';
import { UnitTrainStartEvent } from 'src/app/triggers/unit-train-start-event';
import { UnitTrainedEvent } from 'src/app/triggers/unit-trained-event';
import { ORDER_ID } from 'src/configs/order-id';

describe('Training Events postMatch Logic', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		GlobalGameData.resetInstance();
		GlobalGameData.prepareMatchData([]); // Initialize minimal state
	});

	it('should cancel training if the match state is postMatch during UnitTrainStartEvent', () => {
		const mockIssueOrder = vi.fn();
		const mockTriggerUnit = { id: 'trigger_unit' };

		global.IssueImmediateOrderById = mockIssueOrder;
		global.GetTriggerUnit = vi.fn(() => mockTriggerUnit);

		// Set the state to postMatch
		GlobalGameData.matchState = 'postMatch';

		UnitTrainStartEvent(); // Setup and run condition

		expect(mockIssueOrder).toHaveBeenCalledWith(mockTriggerUnit, ORDER_ID.CANCEL);
	});

	it('should NOT cancel training if the match state is NOT postMatch during UnitTrainStartEvent', () => {
		const mockIssueOrder = vi.fn();
		const mockTriggerUnit = { id: 'trigger_unit' };

		global.IssueImmediateOrderById = mockIssueOrder;
		global.GetTriggerUnit = vi.fn(() => mockTriggerUnit);

		// Set the state to inProgress
		GlobalGameData.matchState = 'inProgress';

		UnitTrainStartEvent(); // Setup and run condition

		expect(mockIssueOrder).not.toHaveBeenCalled();
	});

	it('should aggressively remove the unit if the match state is postMatch during UnitTrainedEvent', () => {
		const mockRemoveUnit = vi.fn();
		const mockTrainedUnit = { id: 'trained_unit' };

		global.RemoveUnit = mockRemoveUnit;
		global.GetTrainedUnit = vi.fn(() => mockTrainedUnit);

		// Set the state to postMatch
		GlobalGameData.matchState = 'postMatch';

		UnitTrainedEvent(); // Setup and run condition

		expect(mockRemoveUnit).toHaveBeenCalledWith(mockTrainedUnit);
	});
});
