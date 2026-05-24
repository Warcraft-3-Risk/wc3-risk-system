/**
 * Test fixture barrel export.
 *
 * ```ts
 * import { loadMapObjectData, createFakeUnit, createFakePlayer } from './fixtures';
 * ```
 */
export { loadMapObjectData, getMapUnitIds } from './object-data-loader';
export { createFakeUnit, fourCCToInt } from './fake-unit';
export type { FakeUnitHandle } from './fake-unit';
export { createFakePlayer } from './fake-player';
export type { FakePlayerHandle } from './fake-player';
