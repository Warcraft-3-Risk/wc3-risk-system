import { describe, it, expect } from 'vitest';
import { TransportTooltipLogic } from 'src/app/utils/transport-tooltip-logic';

describe('TransportTooltipLogic', () => {
	it('generates the correct text strings for cargo capacity', () => {
		expect(TransportTooltipLogic.getTooltipText(0, 10)).toBe('0/10');
		expect(TransportTooltipLogic.getTooltipText(5, 10)).toBe('5/10');
	});

	it('determines visibility based on observer status, screen bounds, and UI overlap', () => {
		expect(TransportTooltipLogic.isVisible(true, true, 0.4, 2)).toBe(true);
		expect(TransportTooltipLogic.isVisible(false, true, 0.4, 2)).toBe(false); // not observer
		expect(TransportTooltipLogic.isVisible(true, false, 0.4, 2)).toBe(false); // off screen
		expect(TransportTooltipLogic.isVisible(true, true, 0.15, 2)).toBe(false); // overlaps bottom UI (sy < 0.16)
		expect(TransportTooltipLogic.isVisible(true, true, 0.4, 0)).toBe(false); // hides when empty
	});
});
