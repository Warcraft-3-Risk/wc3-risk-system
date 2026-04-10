# WC3 Object Data Testing Plan

## Overview

This plan describes how to leverage the [`war3-objectdata`](https://github.com/cipherxof/war3-objectdata) library (already a dependency as `war3-objectdata-th@^0.2.8`) to create **fake WC3 objects** for integration-level testing — bridging the gap between pure logic tests and in-game testing.

### Inspiration

The C# WC3 modding community uses a `Unit.CreateFake(UnitType, rawcode)` pattern that lets tests create lightweight WC3 objects outside the game engine:

```csharp
var unit = Unit.CreateFake(UnitType.Farseer, UNIT_O00A_FAR_SEER_FROSTWOLF_ELITE);
Assert.Equal("Far Seer", unit.Name);
GameEventBus.Emit(CreateEnterRegionEvent(unit));
Assert.Contains(unit.Name, possibleNames[unit.Type]);
```

We can achieve the same in TypeScript by reading the actual `.w3u` / `.w3a` / `.w3h` files from the map source, parsing them with `war3-objectdata`, and using the resulting typed objects as test fixtures.

---

## Current State

| Aspect | Status |
|--------|--------|
| `war3-objectdata-th` dependency | ✅ Already in `devDependencies` |
| Map object data files | ✅ Available in `maps/risk_europe.w3x/war3map.w3u`, `.w3a`, `.w3h`, etc. |
| Unit ID constants | ✅ Defined in `src/configs/unit-id.ts` |
| Adapter interfaces | ✅ Defined in `src/app/interfaces/adapters.ts` (`IPlayerAdapter`, etc.) |
| Singleton `resetInstance()` | ✅ On 5 key managers |
| Pure logic extraction | ✅ Victory, income, distribution, rating |

**Gap:** Tests can only exercise pure logic. Anything touching `unit`, `player`, `timer`, or `framehandle` types is untestable because those are opaque WC3 engine handles with no Node.js representation.

---

## Architecture

### 1. Object Data Fixture Loader

Create a test utility that reads the real map's `.w3u` / `.w3a` / `.w3h` files and exposes typed unit/ability/buff data:

```
tests/
  fixtures/
    object-data-loader.ts    ← Reads map files, returns ObjectData
    fake-unit.ts             ← Lightweight unit stub with real stats
    fake-player.ts           ← Mock player handle with configurable state
```

```typescript
// tests/fixtures/object-data-loader.ts
import { readFileSync } from 'fs';
import War3Map from 'mdx-m3-viewer-th/dist/cjs/parsers/w3x/map';
import { ObjectData } from 'war3-objectdata-th';

let cached: ObjectData | null = null;

export function loadMapObjectData(): ObjectData {
  if (cached) return cached;

  const map = new War3Map();
  // Read the master terrain (europe is the canonical source)
  map.load(readFileSync('maps/risk_europe.w3x').buffer);  // or load individual files
  
  const objectData = new ObjectData();
  objectData.load(map.readModifications());
  
  cached = objectData;
  return objectData;
}
```

> **Note:** `war3-objectdata` expects to load from a `.w3m`/`.w3x` archive. Since the map source is an exploded directory, we may need to read the individual `.w3u` files directly using the lower-level `War3MapW3u` parser from `mdx-m3-viewer-th`. See [Phase 1 spike](#phase-1-spike--proof-of-concept) for details.

### 2. Fake Unit / Fake Player Stubs

Create lightweight stubs that implement just enough of the WC3 handle interface to be used in tests:

```typescript
// tests/fixtures/fake-unit.ts
import { Unit } from 'war3-objectdata-th';

interface FakeUnitHandle {
  typeId: number;
  name: string;
  owner: FakePlayerHandle;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export function createFakeUnit(unitData: Unit, owner: FakePlayerHandle): FakeUnitHandle {
  return {
    typeId: fourCCToInt(unitData.newId || unitData.oldId),
    name: unitData.name,
    owner,
    x: 0,
    y: 0,
    hp: unitData.hitPoints,
    maxHp: unitData.hitPoints,
    alive: true,
  };
}
```

```typescript
// tests/fixtures/fake-player.ts
export interface FakePlayerHandle {
  id: number;
  name: string;
  slotState: string;
  controller: string;
  gold: number;
}

export function createFakePlayer(id: number, name?: string): FakePlayerHandle {
  return {
    id,
    name: name ?? `Player ${id + 1}`,
    slotState: 'playing',
    controller: 'user',
    gold: 0,
  };
}
```

### 3. WC3 Global Shim Layer

Create a shim that maps WC3 engine globals to fake implementations, making it possible to test modules that call `GetUnitName()`, `GetPlayerId()`, etc.:

```typescript
// tests/fixtures/wc3-shim.ts
// Provides fake implementations of WC3 globals for test use.
// Install via Vitest's setupFiles or import in individual tests.

import { FakeUnitHandle } from './fake-unit';
import { FakePlayerHandle } from './fake-player';

(globalThis as any).GetUnitName = (u: FakeUnitHandle) => u.name;
(globalThis as any).GetUnitTypeId = (u: FakeUnitHandle) => u.typeId;
(globalThis as any).GetOwningPlayer = (u: FakeUnitHandle) => u.owner;
(globalThis as any).GetPlayerId = (p: FakePlayerHandle) => p.id;
(globalThis as any).GetPlayerName = (p: FakePlayerHandle) => p.name;
(globalThis as any).Player = (id: number) => ({ id, name: `Player ${id + 1}` });
(globalThis as any).IsUnitType = (u: FakeUnitHandle, unitType: any) => false;
(globalThis as any).FourCC = (s: string) => {
  return s.charCodeAt(0) << 24 | s.charCodeAt(1) << 16 | s.charCodeAt(2) << 8 | s.charCodeAt(3);
};
// ... extend as needed
```

### 4. Integration Test Example

With the above infrastructure, we can write tests like the C# example:

```typescript
// tests/spawner-logic.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { loadMapObjectData } from './fixtures/object-data-loader';
import { createFakeUnit } from './fixtures/fake-unit';
import { createFakePlayer } from './fixtures/fake-player';

describe('Spawner with real object data', () => {
  let objectData: ObjectData;

  beforeAll(() => {
    objectData = loadMapObjectData();
  });

  it('should have correct unit name for Riflemen', () => {
    const unitData = objectData.units.get('u000'); // UNIT_ID.RIFLEMEN
    expect(unitData).toBeDefined();
    expect(unitData!.name).toBeDefined();
  });

  it('should create a fake unit with real stats', () => {
    const unitData = objectData.units.get('u000')!;
    const player = createFakePlayer(0, 'TestPlayer');
    const fakeUnit = createFakeUnit(unitData, player);

    expect(fakeUnit.name).toBe(unitData.name);
    expect(fakeUnit.maxHp).toBe(unitData.hitPoints);
    expect(fakeUnit.owner.name).toBe('TestPlayer');
  });
});
```

---

## Execution Plan

### Phase 1: Spike / Proof of Concept ✅

**Goal:** Validate that `war3-objectdata-th` can read the exploded map files from `maps/risk_europe.w3x/`.

| Task | Status | Description |
|------|--------|-------------|
| Read `.w3u` directly | ✅ | Use `War3MapW3u` parser from `mdx-m3-viewer-th` to load `maps/risk_europe.w3x/war3map.w3u` |
| Parse unit data | ✅ | Load into `ObjectData`, verify we can read custom unit IDs (`h000`, `u000`, etc.) — 26 custom units found |
| Map to `UNIT_ID` constants | ✅ | Confirmed `objectData.units.get('u000')` returns Rifleman (hp=200, atk=19, speed=270) |
| Write spike test | ✅ | `tests/object-data.test.ts` — 26 tests covering loader, unit accuracy, fakes, and shim |

**Resolved risk:** The exploded directory layout does NOT work with `War3Map.load()`. Solution: use the lower-level `War3MapW3u` parser directly to read individual `.w3u` files. The ability/buff skin files (`war3mapSkin.w3a`) trigger parser errors in `war3-objectdata-th` so only `war3map.w3u` is loaded for now.

### Phase 2: Test Fixture Infrastructure ✅

| Task | Status | Description |
|------|--------|-------------|
| `object-data-loader.ts` | ✅ | Cached loader for map object data with lazy initialization |
| `fake-unit.ts` | ✅ | Unit stub factory using real object data stats, with `fourCCToInt()` helper |
| `fake-player.ts` | ✅ | Player stub factory with configurable id/name/gold/lumber |
| `wc3-shim.ts` | ✅ | Global shim for 20+ WC3 API functions (unit, player, FourCC, constants) |
| Barrel export | ✅ | `tests/fixtures/index.ts` for convenient imports |
| Vitest `setupFiles` | ⏭️ Deferred | Not needed yet — import `wc3-shim` per-test file for now |

### Phase 3: Integration Tests for Game Modules

Priority targets (modules closest to being testable with fakes):

| Module | WC3 Deps | What to Test |
|--------|----------|-------------|
| `Spawner` | `CreateUnit`, `GetUnitX/Y`, `IsUnitType` | Spawn count logic, multiplier, per-player limits |
| `City` (subclasses) | `SetUnitOwner`, `IsUnitType` | Ownership transfer, guard validation, reset behavior |
| `SharedSlotManager` | `Player()`, `SetUnitOwner` | Slot assignment, unit ownership transfer, group iteration |
| `UnitLagManager` | `IsUnitType`, `GetUnitName` | Track/untrack logic, guard exclusion, transport handling |
| `EventCoordinator` | `EventEmitter` + handlers | Full event flow with fake units/players triggering events |
| `Country / Region` | Mostly pure data | Country capture, city count, region bonus with real city references |

### Phase 4: Adapter Wiring

Connect the existing `IPlayerAdapter`, `ITimerAdapter`, `IUIAdapter`, `IFileAdapter` interfaces to production code:

| Task | Description |
|------|-------------|
| Create `WC3PlayerAdapter` | Wraps real WC3 globals, implements `IPlayerAdapter` |
| Create `FakePlayerAdapter` | Test implementation using `FakePlayerHandle` |
| Inject into `PlayerManager` | Accept adapter via constructor, fall back to real adapter in production |
| Repeat for Timer, UI, File | Same pattern: real adapter + fake adapter |

This completes the circuit from the adapter interfaces (already defined) to actual dependency injection.

### Phase 5: Game Event Flow Tests

The highest-value goal — testing event-driven gameplay flows end-to-end without the WC3 engine:

```typescript
describe('City capture flow', () => {
  it('should transfer ownership and update income when a city is captured', () => {
    const attacker = createFakePlayer(0);
    const defender = createFakePlayer(1);
    const city = createFakeCity('Paris', defender);

    emitter.emit(EVENT_ON_CITY_CAPTURE, city, defender, attacker);

    expect(city.owner).toBe(attacker);
    expect(getIncome(attacker).delta).toBeGreaterThan(0);
    expect(getIncome(defender).delta).toBeLessThan(0);
  });
});
```

---

## Priority Matrix

| Phase | Impact | Effort | Risk | Priority |
|-------|--------|--------|------|----------|
| Phase 1: Spike | 🟡 Medium | 🟢 Low | 🟡 Medium | **P0** |
| Phase 2: Fixtures | 🟢 High | 🟡 Medium | 🟢 Low | **P0** |
| Phase 3: Integration tests | 🟢 High | 🟡 Medium | 🟡 Medium | **P1** |
| Phase 4: Adapter wiring | 🟢 High | 🟡 Medium | 🟡 Medium | **P1** |
| Phase 5: Event flow tests | 🟢 High | 🔴 High | 🟡 Medium | **P2** |

---

## Dependencies

| Package | Version | Already Installed | Purpose |
|---------|---------|-------------------|---------|
| `war3-objectdata-th` | ^0.2.8 | ✅ Yes | Parse `.w3u`/`.w3a`/`.w3h` files into typed objects |
| `mdx-m3-viewer-th` | ^5.13.3 | ✅ Yes | Low-level WC3 file format parsers |
| `vitest` | ^4.1.4 | ✅ Yes | Test runner |

No new dependencies required for Phase 1–3.

---

## Open Questions (Resolved)

1. **Exploded map vs archive:** ✅ **Resolved.** `War3MapW3u` can parse individual `.w3u` files directly from disk using `readFileSync(path).buffer`. No archive needed.
2. **Custom IDs:** ✅ **Resolved.** Custom unit IDs (`h000`, `u000`, etc.) appear in `objectData.units.map` after loading. Base game units are in `objectData.units.game`. The `get(id)` method checks both.
3. **FourCC mapping:** ✅ **Resolved.** `fourCCToInt()` in `tests/fixtures/fake-unit.ts` converts string IDs to integers. The WC3 shim also provides a global `FourCC()` function. Both produce identical results.
4. **Test isolation:** ✅ **Resolved.** The WC3 shim is imported per-test-file (`import './fixtures/wc3-shim'`), not via `setupFiles`. Pure logic tests are unaffected since they don't import the shim.
