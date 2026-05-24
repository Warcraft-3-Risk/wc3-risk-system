export type OvertimeSetting = 0 | 30 | 60 | undefined;

export function isOvertimeEnabled(setting: OvertimeSetting): boolean {
	return setting !== undefined;
}

export function isOvertimeActive(turnCount: number, setting: OvertimeSetting): boolean {
	if (!isOvertimeEnabled(setting)) return false;
	return turnCount >= (setting as number);
}

export function getTurnCountPostOvertime(turnCount: number, setting: OvertimeSetting): number {
	if (!isOvertimeEnabled(setting)) return 0;
	return turnCount - (setting as number);
}

export function getTurnsUntilOvertimeIsActivated(turnCount: number, setting: OvertimeSetting): number {
	if (!isOvertimeEnabled(setting)) return 999; // Default safety
	return (setting as number) - turnCount;
}
