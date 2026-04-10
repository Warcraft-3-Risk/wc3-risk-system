/**
 * Pure minimap frame-pool logic extracted for testing.
 *
 * Models the frame pool lifecycle from `MinimapIconManager` without
 * WC3 engine dependencies.  All functions operate on plain numbers
 * and return deterministic results.
 */

// ---------------------------------------------------------------------------
// Pool expansion
// ---------------------------------------------------------------------------

/**
 * Determine whether the pool needs to expand.
 *
 * In production, `registerTrackedUnit()` pops a frame and, when the pool
 * hits zero, calls `expandPool(200)` synchronously.
 *
 * @param poolSize - Current number of free frames in the pool.
 * @param needed   - Number of frames needed right now.
 * @returns `true` if the pool is too small to satisfy `needed`.
 */
export function shouldExpandPool(poolSize: number, needed: number): boolean {
	return poolSize < needed;
}

/**
 * Calculate how many frames to add in an expansion, respecting a maximum cap.
 *
 * If the pool is already at or above `maxCap`, returns 0 (no expansion).
 * Otherwise returns `min(batchSize, maxCap - currentTotal)`.
 *
 * @param currentTotal - Total frames ever created (pool + tracked).
 * @param batchSize    - Desired expansion batch (e.g. 200).
 * @param maxCap       - Hard ceiling on total created frames.
 * @returns Number of frames to actually create (0 if at cap).
 */
export function calculateExpansionSize(currentTotal: number, batchSize: number, maxCap: number): number {
	if (currentTotal >= maxCap) return 0;
	return Math.min(batchSize, maxCap - currentTotal);
}

// ---------------------------------------------------------------------------
// High-water mark
// ---------------------------------------------------------------------------

/**
 * Track the high-water mark of concurrently tracked units.
 *
 * The high-water mark is the maximum number of units simultaneously tracked
 * at any point during the game.  Since the pool never shrinks, this number
 * determines the minimum pool size needed.
 *
 * @param currentTracked - Units currently tracked on the minimap.
 * @param previousHigh   - Previous high-water mark.
 * @returns Updated high-water mark.
 */
export function trackHighWaterMark(currentTracked: number, previousHigh: number): number {
	return Math.max(currentTracked, previousHigh);
}

// ---------------------------------------------------------------------------
// Frame leak detection
// ---------------------------------------------------------------------------

/**
 * Detect leaked frames.
 *
 * The pool invariant is: `totalCreated = poolSize + trackedCount`.
 * If `totalCreated > poolSize + trackedCount`, the difference is the
 * number of "ghost" frames that were allocated but never returned.
 *
 * This can happen when `registerTrackedUnit()` is called for a unit
 * that is already tracked — the old frame is overwritten in the Map
 * and never returned to the pool.
 *
 * @param poolSize     - Current free frames in the pool.
 * @param trackedCount - Units currently tracked (frames in use).
 * @param totalCreated - Total frames ever allocated.
 * @returns Number of leaked frames (0 = healthy).
 */
export function detectFrameLeak(poolSize: number, trackedCount: number, totalCreated: number): number {
	const accounted = poolSize + trackedCount;
	return Math.max(0, totalCreated - accounted);
}

// ---------------------------------------------------------------------------
// Pool shrinking
// ---------------------------------------------------------------------------

/**
 * Suggest how many excess frames could be released to reclaim memory.
 *
 * After a combat spike, many frames sit idle in the pool.  This function
 * returns the number of frames that exceed the `minPoolSize` reserve and
 * are not currently in use.
 *
 * @param poolSize     - Current free frames in the pool.
 * @param trackedCount - Units currently tracked.
 * @param minPoolSize  - Minimum pool headroom to maintain.
 * @returns Number of frames that could be destroyed (0 = nothing to trim).
 */
export function shouldShrinkPool(poolSize: number, _trackedCount: number, minPoolSize: number): number {
	const excess = poolSize - minPoolSize;
	return Math.max(0, excess);
}

// ---------------------------------------------------------------------------
// Combat simulation helpers
// ---------------------------------------------------------------------------

/**
 * Simulate the frame pool through a 5-minute intense combat scenario.
 *
 * @param initialPool     - Starting pool size.
 * @param batchSize       - Expansion batch size.
 * @param maxCap          - Hard cap on total frames.
 * @param spawnEvents     - Array of { tick, count } spawn bursts.
 * @param deathEvents     - Array of { tick, count } death bursts.
 * @returns Final state: { poolSize, trackedCount, totalCreated, highWaterMark, expansions }.
 */
export function simulateCombat(
	initialPool: number,
	batchSize: number,
	maxCap: number,
	spawnEvents: { tick: number; count: number }[],
	deathEvents: { tick: number; count: number }[]
): {
	poolSize: number;
	trackedCount: number;
	totalCreated: number;
	highWaterMark: number;
	expansions: number;
} {
	let poolSize = initialPool;
	let trackedCount = 0;
	let totalCreated = initialPool;
	let highWaterMark = 0;
	let expansions = 0;

	// Merge events into a timeline sorted by tick
	const events: { tick: number; spawns: number; deaths: number }[] = [];
	const allTicks = new Set<number>();
	for (const e of spawnEvents) allTicks.add(e.tick);
	for (const e of deathEvents) allTicks.add(e.tick);

	for (const tick of [...allTicks].sort((a, b) => a - b)) {
		const spawns = spawnEvents.filter((e) => e.tick === tick).reduce((sum, e) => sum + e.count, 0);
		const deaths = deathEvents.filter((e) => e.tick === tick).reduce((sum, e) => sum + e.count, 0);
		events.push({ tick, spawns, deaths });
	}

	for (const event of events) {
		// Process deaths first (return frames to pool)
		const actualDeaths = Math.min(event.deaths, trackedCount);
		poolSize += actualDeaths;
		trackedCount -= actualDeaths;

		// Process spawns (take frames from pool)
		for (let i = 0; i < event.spawns; i++) {
			if (poolSize <= 0) {
				// Need expansion
				const expansion = calculateExpansionSize(totalCreated, batchSize, maxCap);
				if (expansion > 0) {
					poolSize += expansion;
					totalCreated += expansion;
					expansions++;
				} else {
					// At cap, cannot expand further — unit won't get a frame
					break;
				}
			}
			poolSize--;
			trackedCount++;
		}

		highWaterMark = trackHighWaterMark(trackedCount, highWaterMark);
	}

	return { poolSize, trackedCount, totalCreated, highWaterMark, expansions };
}
