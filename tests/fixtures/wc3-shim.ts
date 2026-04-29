/**
 * WC3 global shim for test environments.
 *
 * Provides fake implementations of commonly used WC3 engine globals so
 * that game modules which call `GetUnitName()`, `GetPlayerId()`, etc.
 * can be exercised under Vitest without the WC3 runtime.
 *
 * Usage:
 *   - Import at the top of an integration test file:
 *       `import './fixtures/wc3-shim';`
 *   - Or add to `vitest.config.ts` `setupFiles` for a test workspace.
 *
 * Every shim function operates on `FakeUnitHandle` / `FakePlayerHandle`
 * objects cast to the opaque WC3 handle types.
 */
import type { FakeUnitHandle } from './fake-unit';
import type { FakePlayerHandle } from './fake-player';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Unit API ───────────────────────────────────────────────────────
(globalThis as any).GetUnitName = (u: FakeUnitHandle) => u.name;
(globalThis as any).GetUnitTypeId = (u: FakeUnitHandle) => u.typeId;
(globalThis as any).GetUnitX = (u: FakeUnitHandle) => u.x;
(globalThis as any).GetUnitY = (u: FakeUnitHandle) => u.y;
(globalThis as any).SetUnitX = (u: FakeUnitHandle, x: number) => {
	u.x = x;
};
(globalThis as any).SetUnitY = (u: FakeUnitHandle, y: number) => {
	u.y = y;
};
(globalThis as any).GetWidgetLife = (u: FakeUnitHandle) => u.hp;
(globalThis as any).SetWidgetLife = (u: FakeUnitHandle, hp: number) => {
	u.hp = hp;
	u.alive = hp > 0;
};
(globalThis as any).GetUnitState = (u: FakeUnitHandle, _state: any) => u.maxHp;
(globalThis as any).IsUnitAliveBJ = (u: FakeUnitHandle) => u.alive;
(globalThis as any).IsUnitType = (_u: FakeUnitHandle, _unitType: any) => false;
(globalThis as any).GetOwningPlayer = (u: FakeUnitHandle) => u.owner;
(globalThis as any).SetUnitOwner = (u: FakeUnitHandle, p: FakePlayerHandle, _changeColor: boolean) => {
	u.owner = p;
};

// ─── Player API ─────────────────────────────────────────────────────
const playerSlots: FakePlayerHandle[] = [];
(globalThis as any).Player = (id: number): FakePlayerHandle => {
	if (!playerSlots[id]) {
		playerSlots[id] = { id, name: `Player ${id + 1}`, slotState: 'playing', controller: 'user', gold: 0, lumber: 0 };
	}
	return playerSlots[id];
};
(globalThis as any).GetPlayerId = (p: FakePlayerHandle) => p.id;
(globalThis as any).GetPlayerName = (p: FakePlayerHandle) => p.name;
(globalThis as any).GetPlayerState = (p: FakePlayerHandle, _state: any) => p.gold;
(globalThis as any).SetPlayerState = (p: FakePlayerHandle, _state: any, value: number) => {
	p.gold = value;
};
(globalThis as any).GetPlayerSlotState = (p: FakePlayerHandle) => p.slotState;
(globalThis as any).GetPlayerController = (p: FakePlayerHandle) => p.controller;
(globalThis as any).IsPlayerObserver = (_p: FakePlayerHandle) => false;

// ─── FourCC ─────────────────────────────────────────────────────────
(globalThis as any).FourCC = (s: string): number => {
	return ((s.charCodeAt(0) << 24) | (s.charCodeAt(1) << 16) | (s.charCodeAt(2) << 8) | s.charCodeAt(3)) >>> 0;
};

// ─── Misc globals that game code may reference ──────────────────────
(globalThis as any).print = (...args: any[]) => console.log('[WC3]', ...args);
(globalThis as any).bj_MAX_PLAYERS = 24;
(globalThis as any).PLAYER_SLOT_STATE_PLAYING = 'playing';
(globalThis as any).PLAYER_SLOT_STATE_EMPTY = 'empty';
(globalThis as any).PLAYER_SLOT_STATE_LEFT = 'left';
(globalThis as any).MAP_CONTROL_USER = 'user';
(globalThis as any).MAP_CONTROL_COMPUTER = 'computer';
(globalThis as any).MAP_CONTROL_NONE = 'none';
(globalThis as any).UNIT_STATE_MAX_LIFE = 'max_life';
(globalThis as any).UNIT_TYPE_STRUCTURE = 'structure';
(globalThis as any).UNIT_TYPE_DEAD = 'dead';
(globalThis as any).PLAYER_STATE_RESOURCE_GOLD = 'gold';
(globalThis as any).PLAYER_STATE_RESOURCE_LUMBER = 'lumber';
