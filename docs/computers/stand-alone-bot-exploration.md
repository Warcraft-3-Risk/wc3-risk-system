# Stand Alone Bot System — Exploration Notes

> **Source:** ChatGPT conversation shared by the Stand Alone project developers.
> They uploaded their Unreal Engine 5.6 ECS-based Risk bot code and walked through
> how the entire computer player system works. These notes distill the key design
> decisions and architecture so we can learn from their approach when building our
> own WC3 Risk computer players.

---

## Overview

The Stand Alone project implements computer players as a **strategic layer on top
of a deterministic ECS simulation**. Bots do not micromanage individual units
with behavior trees. Instead, they periodically "think" at a coarse interval,
read the world state from ECS storage, make high-level strategic decisions, and
issue intentions that the ECS systems then carry out.

---

## Architecture — Three Layers

The system is split into three distinct layers:

### 1. ECS World Subsystem

- Owns the ECS manager and the full simulation loop.
- Handles networking, rollback, authority changes, and host migration.
- Keeps track of bot team IDs alongside human player team IDs.
- Bots do **not** own gameplay state — the ECS simulation is always authoritative.

### 2. Bot Manager Subsystem (Global Scheduler)

- A world-level subsystem that acts as the **central coordinator** for all bots.
- Registers all bot controllers.
- Assigns initial HQs once fortresses are ready.
- Triggers each bot's think cycle on a **jittered interval** (not every frame).
- Builds and distributes a **cached terrain map** for land/water pathfinding checks.

### 3. Bot Player Controller (Per-Bot Brain)

- One controller per computer player.
- Reads ECS storages directly (fortresses, movement, AI, health, transport, spatial grid, gold).
- Maintains bot-local strategic state: HQ, owned fortresses, invasions, landmasses, target assignments, defensive fronts, and naval invasion state.
- Intentionally skips input setup — bots are not wired like human controllers.

---

## Bot Lifecycle

### Entering the Game

1. Bot grabs the ECS world subsystem.
2. Fills an "excluded countries" set.
3. Registers itself with the Bot Manager.
4. Receives the cached terrain data (if already built).
5. Reads tuning values from the game mode (max spawns per think, max attack groups per think, etc.).

### HQ Assignment

The Bot Manager assigns initial HQs only once all bots are ready **and** fortresses exist.

HQ selection logic:

- Groups owned fortresses by country.
- Only considers **small countries** (roughly 2–4 fortresses) as opening HQ candidates.
- Computes a centroid of all candidate positions.
- Distributes HQs across map quadrants to **maximize separation** between bots.
- Falls back to any owned fortress if no ideal candidate exists.

When a bot receives an HQ:

- Stores HQ fortress ID, position, and country name.
- Scans for all currently owned fortresses.
- Records HQ-country fortresses as "initial fortresses."
- Seeds the connected-territory landmass tracker.

---

## The Think Cycle

Each think tick, the bot runs a fixed sequence of strategic steps:

| #   | Step                             | Purpose                                      |
| --- | -------------------------------- | -------------------------------------------- |
| 1   | **Find My Assets**               | Rebuild current ownership snapshot from ECS  |
| 2   | **Swap Naval Harbor Guards**     | Fix guards incorrectly assigned as ships     |
| 3   | **Verify HQ Assigned**           | Ensure HQ exists before planning             |
| 4   | **Build Per-Think Caches**       | Pre-compute data used by later steps         |
| 5   | **Update Territory Tracking**    | Refresh connected-territory / landmass model |
| 6   | **Check Large Player Threats**   | Watch for dominant opponents                 |
| 7   | **Reselect HQ**                  | If old HQ was lost, pick a new one           |
| 8   | **Build Invasion Candidates**    | Discover, score, and plan campaigns          |
| 9   | **Redirect Stranded Units**      | Move orphaned units somewhere useful         |
| 10  | **Purchase Units at Fortresses** | Spend gold in controlled batches             |
| 11  | **Send Idle Units to Attack**    | Assign idle forces to active campaigns       |
| 12  | **Process Naval Invasions**      | Run the naval logistics pipeline             |
| 13  | **Gather Idle Attack Ships**     | Collect unused naval assets                  |

This is a **strategic planner**, not per-unit behavior. Each cycle it: refreshes world state → updates territory understanding → chooses campaigns → buys units → assigns forces → manages naval logistics.

---

## Territory Model

One of the most important design decisions: the bot reasons in terms of **connected territory**, not just raw ownership.

### Key concepts

- **Initial Fortresses** — Starting HQ-country forts.
- **Captured Fortresses** — Newly conquered forts.
- **Fortress Landmass** — Maps each fortress to a named landmass.
- **Mainland Name** — The bot's main territorial identity.
- **Lost Territory** — Captured territory that was later recaptured by an enemy.

### Territory Tracking Updates

Each think, the bot:

1. Detects newly captured forts.
2. Distinguishes "initial/mainland" from "captured expansion."
3. Assigns new forts to a landmass using invasion context first, then nearest adjacent owned landmass (with no water barrier), falling back to the country name for isolated island captures.
4. **Merges landmasses** when adjacent friendly territories connect.
5. Removes lost forts from tracking.
6. Can register a defensive front if previously lost territory is recaptured.

This gives the bot a strong territorial model for deciding where expansion is connected and where naval transport is needed.

---

## HQ Recovery

HQ is **not cosmetic** — it is the anchor for the entire strategic model.

If the bot loses its HQ fortress:

1. Clears all HQ state.
2. Selects a new HQ from the smallest country where it still owns forts.
3. Performs a **major reset**: clears captured territory, invasions, and assignments.
4. Rebuilds initial territory from the new HQ country.
5. Reconstructs landmasses from scratch.

---

## Target Selection & Invasions

The bot's main offensive abstraction is the **Invasion Candidate**.

An invasion stores:

- Target country & priority
- Target fortresses & staging fortresses
- Committed units & progress/stall counters
- Whether it is a naval invasion
- Naval transport and escort claims, source/target harbors
- Original landmass identity

### Building Invasion Candidates

| Phase                       | What Happens                                                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Build staging set**    | Forms usable staging fortresses from HQ-connected and captured-connected territory                                                                                    |
| **B. Prune old invasions**  | Removes completed, fully-lost, or stalled-too-long invasions                                                                                                          |
| **C. Refresh staging**      | Recomputes border-adjacent staging for land invasions; adds beachhead forts for naval invasions                                                                       |
| **D. Discover new targets** | Searches outward from connected territory; distinguishes land-accessible from water-separated; allows naval candidates when harbors exist                             |
| **E. Score targets**        | Considers country size, partial completion ratio, single-enemy ownership, "unclaimed" status, dominant enemy strength, distance from HQ, bot's current fortress count |

Bots are **not picking random enemy forts** — they select **country-level campaigns**.

### Campaign Commitment

- Bots commit to an invasion for a sustained period.
- If an attack stalls too long without progress, they abandon it and move on.
- They prefer achievable targets over attractive but impractical ones.

---

## Land vs. Naval Invasions

Naval invasions have their own **logistics pipeline**, not just "move units over water."

### Naval Invasion States

1. **None**
2. **Spawning Transport**
3. **Loading**
4. **In Transit**
5. **Unloading**

A naval invasion tracks: source harbor, target harbor, claimed transport IDs, escort IDs, delivered unit totals, departure timers, transport request tick, and max transport/escort counts.

### Naval Processing

- Validates harbors.
- Cleans dead transports and escorts.
- Loads units into transports.
- Uses immediate departure thresholds and stale-timer forced departure.
- Manages escort usage.
- Tracks delivered units.
- Uses captured target forts as beachhead staging for continued attack.

---

## Economy & Production

- Gold is read directly from the ECS gold system using the bot's team ID.
- Purchasing happens in **controlled batches** during the think cycle, not every frame.
- Spawn caps are read from the game mode configuration.
- Bots spend resources steadily, not recklessly — they respect per-think limits on spawns and attack groups.

---

## The Bot's Unwritten Rulebook

Abstracted away from code, the Stand Alone bots follow these principles:

1. **Know what you still own.** Rebuild your picture of the world every think.
2. **Keep a home center and defend it.** HQ is the strategic anchor.
3. **Treat connected land as your real power base.** Disconnected territory is secondary.
4. **Expand in an organized direction.** Not random; outward from your core.
5. **Choose targets that are achievable.** Practical over attractive.
6. **Commit to campaigns, but give up on dead ends.** Persistence with a timeout.
7. **Use ships only when water makes them necessary.** Naval is a logistics mode, not default.
8. **Keep units busy and in sensible roles.** Redirect idle/stranded units; fix bad guard assignments.
9. **Spend resources steadily, not recklessly.** Batch purchasing with caps.
10. **Rebuild your strategy when the map changes.** HQ loss triggers a full strategic reset.

---

## Key Takeaways for Our WC3 Risk AI

### What We Can Directly Apply

- **Coarse strategic thinking on a timer** — WC3 Lua already has periodic timer callbacks; we don't need per-frame AI.
- **Territory connectivity model** — Track which regions are connected to the bot's "homeland" vs. isolated holdings.
- **Country-level campaign planning** — Don't attack random regions; pick a target country/continent and commit.
- **Invasion stall detection** — If a campaign makes no progress for N cycles, abandon it and pick a new target.
- **Batch purchasing with caps** — Avoid overwhelming the unit count by limiting spawns per think cycle.

### What We Need to Adapt

- **No ECS** — We don't have an ECS; our game state lives in WC3's native object model plus our Lua tracking tables. The bot will query our existing data structures instead.
- **No transport entities** — WC3 Risk handles naval movement differently (boat paths between harbors). We need to map their transport/escort model to our boat system.
- **Simpler terrain queries** — We already have region adjacency graphs and harbor connections in our map JSON data. No need to build a separate terrain cache.
- **Networking is handled by WC3** — We don't need to worry about host migration or authority transfer for bots.

### Architecture Sketch

```
┌──────────────────────────────────────────┐
│           Bot Manager (Timer)            │
│  - Registers computer players            │
│  - Assigns starting HQs                 │
│  - Fires think cycle on jittered timer   │
└──────────────┬───────────────────────────┘
               │  triggers
               ▼
┌──────────────────────────────────────────┐
│       Bot Brain (Per Computer Player)    │
│                                          │
│  1. Scan assets (regions, units, gold)   │
│  2. Update territory tracking            │
│  3. Check threats                        │
│  4. Pick/refresh invasion targets        │
│  5. Purchase units                       │
│  6. Assign idle units to campaigns       │
│  7. Manage naval transport               │
└──────────────┬───────────────────────────┘
               │  issues commands via
               ▼
┌──────────────────────────────────────────┐
│        Game Systems (Existing)           │
│  - Movement, combat, gold, spawning     │
│  - Authoritative game state             │
└──────────────────────────────────────────┘
```

---

## Open Questions

- How aggressive/passive should different difficulty levels make the bot? (Stand Alone uses tuning values from the game mode — we could do the same.)
- Should bots ally or coordinate? (Not covered in the Stand Alone system — each bot is independent.)
- How do we handle the diplomacy layer (truces, alliances) that human players use?
- What is the right think interval for WC3? (Stand Alone uses jittered timers — we need to test what feels responsive without causing lag.)
