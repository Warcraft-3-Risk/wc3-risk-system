export class MinimapTrackedList<TUnit, TFrame, TPlayer> {
	public trackedUnitList: TUnit[] = [];
	public trackedFrameList: TFrame[] = [];
	public trackedRawOwnerList: TPlayer[] = [];
	public trackedUnitIndex: Map<TUnit, number> = new Map();

	public addTrackedUnit(unit: TUnit, frame: TFrame, owner: TPlayer): void {
		if (this.trackedUnitIndex.has(unit)) {
			return;
		}
		const index = this.trackedUnitList.length;
		this.trackedUnitList.push(unit);
		this.trackedFrameList.push(frame);
		this.trackedRawOwnerList.push(owner);
		this.trackedUnitIndex.set(unit, index);
	}

	public removeTrackedAt(index: number): TFrame | undefined {
		const lastIndex = this.trackedUnitList.length - 1;
		if (lastIndex < 0 || index > lastIndex || index < 0) return undefined;

		const unit = this.trackedUnitList[index];
		const frame = this.trackedFrameList[index];

		const lastUnit = this.trackedUnitList[lastIndex];
		const lastFrame = this.trackedFrameList[lastIndex];
		const lastRawOwner = this.trackedRawOwnerList[lastIndex];

		this.trackedUnitList[index] = lastUnit;
		this.trackedFrameList[index] = lastFrame;
		this.trackedRawOwnerList[index] = lastRawOwner;
		this.trackedUnitIndex.set(lastUnit, index);

		this.trackedUnitList.pop();
		this.trackedFrameList.pop();
		this.trackedRawOwnerList.pop();
		this.trackedUnitIndex.delete(unit);

		return frame;
	}

	public removeTrackedUnit(unit: TUnit): TFrame | undefined {
		const index = this.trackedUnitIndex.get(unit);
		if (index !== undefined) {
			return this.removeTrackedAt(index);
		}
		return undefined;
	}

	public clear(): void {
		this.trackedUnitList.length = 0;
		this.trackedFrameList.length = 0;
		this.trackedRawOwnerList.length = 0;
		this.trackedUnitIndex.clear();
	}
}
