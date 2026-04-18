# FFA Random Events (Every 5 Turns)

## Motivation

FFA games can stagnate when players turtle behind country bonuses and avoid risky fights. Periodic random events inject strategic disruption that forces adaptation, rewards flexibility, and creates memorable moments — without arbitrarily punishing or gifting any single player.

## Design Principles

1. **Symmetry** — Events affect all players equally, or scale proportionally (percentages, not flat amounts).
2. **Telegraphing** — Announce the event 1 turn before it activates so players can prepare.
3. **Bounded Impact** — Events last 1–3 turns max. No permanent map-altering changes.
4. **No Kingmaking** — Events must not single out a specific player or position. Global effects or location-based triggers only.
5. **Deterministic** — Event selection uses the synced random seed, keeping all clients consistent.
6. **Complementary** — Events interact with existing mechanics (income, fog, spawners, naval, combat) rather than introducing parallel systems.

---

## Event Pool

### Economic Events

#### 1. Trade Boom
- **Effect:** All players receive +50% country bonus income for 2 turns.
- **Why it's fair:** Percentage-based; benefits players proportionally to territory held. Encourages aggression to grab countries before the boom hits.

#### 2. Famine
- **Effect:** All country bonus income is reduced by 50% for 2 turns. Base income unchanged.
- **Why it's fair:** Hurts large empires more than small ones in absolute terms, creating a natural catch-up window. Players with fight bonus income or bounty-heavy playstyles are less affected.

#### 3. War Profiteering
- **Effect:** Bounty increased from 25% to 50% of unit value for 2 turns.
- **Why it's fair:** Rewards aggression equally for everyone. Turtling players get nothing extra; fighting players on all sides benefit.

#### 4. Arms Dealer
- **Effect:** All unit training costs reduced by 25% for 2 turns.
- **Why it's fair:** Every player benefits equally per gold spent. Encourages spending reserves and creates a burst of military buildup across the map.

#### 5. Scorched Earth Tax
- **Effect:** Every player loses 1 gold per city they own at the start of each affected turn (2 turns).
- **Why it's fair:** Proportional to territory. Large empires pay more; small players barely feel it. Creates tension around holding too many cities you can't defend.

---

### Combat Events

#### 6. Fog of War Descends (Solar Eclipse)
- **Effect:** Fog of war is enabled globally for 2 turns (if not already on via day/night). All shared vision between FFA allies is temporarily revoked.
- **Why it's fair:** Affects all players equally. Rewards scouting, punishes overextension, and creates surprise attack opportunities on every front.

#### 7. Veteran Surge
- **Effect:** All units currently on the map gain +15% damage for 1 turn.
- **Why it's fair:** Benefits players proportionally to their existing army size. Favors players who've been fighting (kept units alive) over those who just trained fresh.

#### 8. Fortification
- **Effect:** All guard units gain +100% HP for 2 turns.
- **Why it's fair:** Every city's guard becomes harder to kill. Benefits defenders on all sides equally. Makes reckless attacks costly and rewards players who plan assaults carefully.

#### 9. Mercenary Influx
- **Effect:** Every player receives 1 free Rifleman at each of their barracks cities (max 5 cities). Units appear instantly.
- **Why it's fair:** Capped so large empires don't snowball. Every player with at least 1 city benefits. Small players get proportionally more value relative to their army size.

#### 10. Shattered Morale
- **Effect:** All units take 10% of their max HP as damage (non-lethal, minimum 1 HP remaining). Lasts 1 turn (applied once at event start).
- **Why it's fair:** Proportional to unit HP. Expensive high-HP units (Tanks, Generals) suffer more absolute damage. Creates vulnerability windows across the entire map simultaneously.

#### 11. Plague
- **Effect:** Announced 1 turn early. When the event activates, all units that are not above 90% HP are killed. Medics auto-cast heal during the preview turn, giving players time to heal their armies.
- **Why it's fair:** Every player's army is threatened equally. The counterplay is clear and available to everyone: keep Medics in your army composition, or pull damaged units back to be healed before the plague hits. Rewards players who invested in Medics (an otherwise undervalued support unit) and punishes players who run pure damage stacks with no sustain. The 1-turn warning ensures no one is blindsided — you either have the infrastructure to heal or you don't.
- **Design notes:** Creates a dramatic map-wide moment where players scramble to heal. Damaged frontline units are most at risk, so players at war on multiple fronts suffer more — but that's a consequence of their own overextension, not randomness. Units at full HP (e.g., freshly trained reserves, garrisoned armies) are completely safe.

#### 12. Zombie Outbreak
- **Effect:** Announced 1 turn early. When the event activates, 3–5 random neutral cities spawn a wave of zombie units. Zombies attack-move toward the nearest player-owned city. Units killed by these zombies convert into new zombies at the death location. The outbreak lasts 3 turns — after 3 turns, all remaining event-spawned zombies and their conversions die off.
- **Spawn count:** Each affected city spawns 3 zombies initially. Conversions during the 3-turn window can snowball if players don't contain them.
- **Why it's fair:** Outbreak cities are chosen randomly from neutral territory, not from any player's cities. Every player near the affected region faces the same threat. The conversion mechanic punishes players who throw cheap units at zombies without overwhelming force — losing units feeds the horde. Players far from the outbreak are unaffected, but the zombie attack-move AI will path toward the nearest player cities, so the threat spreads naturally toward whoever is closest. The 3-turn expiry prevents permanent map disruption.
- **Counterplay:** Concentration of force — zombies are individually weak (Riflemen-tier stats) but dangerous in numbers via conversion. Players should commit enough units to kill zombies without losing their own. Medics are valuable since healed units won't die and convert. Alternatively, let zombies walk into a rival's territory and deal with the problem for you.
- **Design notes:** Full implementation details in [zombie-outbreak](../events/zombie-mode.md). Outbreak cities are highlighted on the minimap during the preview turn.

#### 13. Meteor Shower
- **Effect:** 4–6 impact zones are randomly selected across the map. Each zone is marked on the minimap with a warning ping and a visible ground indicator (e.g., a red circle effect) for 60 seconds (1 full turn). When the timer expires, all units inside a large radius of each impact point are instantly killed — including guard units. Destructible trees within the radius are also destroyed. Cities and buildings survive, but guards die and must respawn normally.
- **Why it's fair:** Impact zones are random map positions, not targeted at any player. Every player can see the warnings and has a full turn to move units out. Players who are paying attention and micromanaging survive unscathed; players who are AFK or overcommitted in fights near impact zones get punished. The counterplay is pure awareness and reaction — no army composition or economy advantage matters, just move your units.
- **Counterplay:** Move units out of the marked zones during the 60-second warning window. Units in transit or mid-fight near an impact zone face a choice: disengage and retreat to safety, or gamble on finishing the fight before impact. Creates tense moments where two players fighting near a zone must both decide whether to pull back.
- **Design notes:** The warning pings should repeat every 10–15 seconds so players can't miss them. The ground indicator (a large translucent red circle or pulsing effect) should be clearly visible at any zoom level. Impact zones should have a minimum distance from each other to spread them across the map. On impact, play a dramatic visual/sound effect (explosion, screen shake). The large radius should be big enough to threaten armies but small enough that a turn of movement is sufficient to escape — roughly the size of a country's worth of territory.

---

### Naval Events

#### 11. Calm Seas
- **Effect:** All ship movement speed increased by 50% for 2 turns. Transport ship capacity increased to 15.
- **Why it's fair:** Benefits all naval players equally. Makes amphibious invasions more viable across the board, opening new fronts for everyone.

#### 12. Pirate Raid
- **Effect:** All port cities lose their guard unit for 1 turn (guard does not respawn until the event ends).
- **Why it's fair:** Every port on the map is affected. Rewards players who positioned naval units defensively. Creates simultaneous vulnerability at all coastal positions.

#### 13. Naval Blockade
- **Effect:** Transport ships cannot load or unload for 1 turn. Ships already at sea are unaffected in movement.
- **Why it's fair:** Freezes all amphibious operations equally. Players mid-invasion and players defending coasts are both affected. Rewards players who moved troops early.

#### 14. Rough Seas
- **Effect:** All ships have their movement speed reduced by 50% for 1–2 turns (duration chosen randomly at event start).
- **Why it's fair:** Affects every ship on the map regardless of owner. Players mid-crossing are slowed equally to players defending coastlines. Rewards players who already landed troops and punishes those relying on just-in-time naval reinforcements. The random 1–2 turn duration adds uncertainty that prevents gaming the exact timing.

---

### Map / Territorial Events

#### 14. Disputed Territory
- **Effect:** A random country (announced 1 turn early) has its bonus doubled for 2 turns.
- **Why it's fair:** Any player can contest it. The announcement gives everyone time to position. Creates a localized conflict hotspot rather than gifting it to whoever already owns it.

#### 15. Spawner Resurgence
- **Effect:** All countries that have exhausted their 5-turn spawner limit get 1 additional free spawn this turn.
- **Why it's fair:** Applies globally to all exhausted spawners regardless of owner. Rewards players who held territory long enough to exhaust spawners — but also gives a small boost to recently conquered lands.

#### 16. Border Skirmish
- **Effect:** All guard units across the map attack the nearest enemy unit within range for 1 turn (guards become aggressive instead of passive).
- **Why it's fair:** Every border between players becomes active simultaneously. No single player is targeted — all frontlines heat up equally.

#### 17. Snowstorm
- **Effect:** Weather changes to heavy snow. All land unit movement speed reduced by 40% for 2 turns. Units not within range of a city take 5% max HP damage per turn (frostbite attrition). Visual snow effect applied to the map.
- **Why it's fair:** Every player's field armies suffer equally. Units garrisoned near cities are sheltered. Punishes players who have armies spread thin across open ground while rewarding compact defensive positions. The movement slow makes it harder to reinforce or retreat, so positioning *before* the storm matters. Players with Medics can offset the attrition.
- **Design notes:** Combines well with the 1-turn preview — players see the storm coming and must decide whether to push into cities for shelter or hold exposed positions. Creates natural pauses in aggression where the map "resets" momentum.

#### 18. Frozen Seas
- **Effect:** All water routes become impassable for 2 turns. Ships cannot move. Transport ships cannot load or unload. Naval units are frozen in place.
- **Why it's fair:** Completely shuts down naval operations for everyone simultaneously. Players who depend on naval supply lines are equally disrupted. Coastal empires lose reinforcement options, but so do their attackers. Rewards players who pre-positioned land armies and punishes over-reliance on naval mobility.
- **Design notes:** Distinct from Rough Seas (slow) and Naval Blockade (load/unload only) — this is a hard freeze on all naval activity. Creates a window where island nations and coastal territories are isolated, forcing land-only gameplay for 2 turns.

#### 19. Desertion
- **Effect:** All country spawners are disabled for 2 turns — no free units are generated. Additionally, when the event activates, each country that still has remaining spawns loses 1 of its existing spawned units (the most recent spawn deserts).
- **Why it's fair:** Hits every player proportionally to how many countries they hold. Large empires lose the most free units in absolute terms, creating a natural catch-up mechanic. Small players with fewer countries lose less. The spawner freeze means nobody gains free reinforcements for 2 turns, putting more weight on income and training decisions. Players who already exhausted their spawners (5/5 turns used) are unaffected by the desertion — only the spawn freeze matters to them.

#### 20. Rebellion
- **Effect:** 2–3 random countries are announced 1 turn early as "unrest zones." When the event activates: all cities in those countries switch to neutral hostile, their guard units turn aggressive, and all player-owned units within a set radius of those cities become neutral hostile rebels. The rebel units attack any nearby player units. Rebels persist for 2 turns, then die off. Players can reconquer rebel cities like normal — first to take them gets them.
- **Why it's fair:** Countries are chosen randomly, so no single player is targeted by design. Any player who happens to own cities in the affected countries loses them — but so does anyone else with troops nearby (their units defect too). The 1-turn warning gives everyone a chance to pull valuable units out of the radius before the rebellion fires. After the rebels spawn, every player has equal opportunity to reconquer the now-neutral cities. Large empires are statistically more likely to have territory in the affected countries, so this naturally pressures the leading player more often.
- **Design notes:** The rebellion radius should be visible on the minimap during the preview turn (highlighted danger zone). This is one of the highest-impact events — it can redraw borders and break country bonuses. Should be weighted lower in the selection pool or restricted to mid/late game (after turn 15). Rebels are neutral hostile to *everyone*, so two players near a rebellion zone might end up fighting rebels and each other simultaneously.

---

### Strategic / Information Events

#### 17. Intelligence Report
- **Effect:** All players' income and city count are announced in chat. Minimap pings reveal all cities for 10 seconds.
- **Why it's fair:** Perfect information benefits everyone. Leading players are exposed; trailing players gain targeting data. Encourages coalition behavior naturally.

#### 18. Ceasefire Mandate
- **Effect:** All units deal 50% reduced damage for 1 turn.
- **Why it's fair:** Slows all combat equally. Rewards positioning and planning. Punishes committing to an all-in attack during the ceasefire turn. Players can still move and set up.

#### 19. Supply Lines
- **Effect:** Units more than 3 regions away from any city the player owns deal 25% less damage for 2 turns.
- **Why it's fair:** Punishes overextension proportionally. Every player's deep-strike armies are affected. Rewards compact, well-supplied empires and strategic positioning.

#### 20. The Grand Heist
- **Effect (Phase 1 — The Theft):** 20% of every player's current gold is stolen. The total stolen gold is pooled into a "Shadow Treasury" and its value is announced to all players.
- **Effect (Phase 2 — Nefarious Consequences):** 3–5 turns later, the Shadow Treasury triggers one of the following effects, chosen randomly based on the pool size:
  - **Small Pool (< 200 gold):** *Bribed Guards* — A random guard unit in every player's territory switches allegiance to neutral hostile for 1 turn, attacking its own city.
  - **Medium Pool (200–500 gold):** *Black Market Arms* — Neutral mercenary units (Riflemen) spawn at 3–5 random unoccupied border regions across the map. First player to reach them claims them. Count scales with pool size.
  - **Large Pool (500–1000 gold):** *Sabotage* — All players' highest-tier unit on the field takes 50% max HP damage (the "assassin" targets the most valuable asset). If a player has no units, they're skipped.
  - **Massive Pool (1000+ gold):** *Arms Race* — The stolen gold is redistributed equally to the bottom 3 players by city count. Announced as: "The underworld has chosen its champions."
- **Why it's fair:** The theft is percentage-based, so wealthy players lose more in absolute terms. The delayed consequence means players can't immediately predict or counter the second phase — they just know *something* is coming. Phase 2 effects range from minor chaos (bribed guards) to kingmaker-resistant catch-up (arms race redistribution to losing players). The pool size naturally scales consequences to match the game's economic state.
- **Design notes:** The delay between phases creates tension. Players see the gold vanish and know a consequence is coming but not which one. The Shadow Treasury total is public info, so players can roughly estimate which tier of consequence is coming and plan accordingly. This is the only two-phase event in the pool — it should feel special and ominous when it fires.

---

## Event Selection Rules

1. **Pool Draw:** Each 5-turn cycle, 1 event is drawn from the pool using the synced deterministic RNG.
2. **No Repeats:** An event cannot repeat until at least 3 other events have occurred.
3. **Category Balance:** No two consecutive events from the same category (Economic, Combat, Naval, Map, Strategic).
4. **Naval Skip:** If the map has fewer than 5 port cities, naval events are excluded from the pool.
5. **Late-Game Weighting:** After turn 30, economic and combat events are weighted 2x more likely than map/information events to keep pressure high.

## Announcement Format

- **Turn N-1 (Preview):** `⚡ EVENT INCOMING: [Event Name] activates next turn! [One-line description]`
- **Turn N (Activation):** `⚡ [Event Name] is now active! [Duration] turns remaining.`
- **Turn N+Duration (Expiry):** `⚡ [Event Name] has ended.`

## Interaction with Existing Systems

| System | Interaction |
|--------|-------------|
| Day/Night Cycle | Fog of War Descends stacks with night-phase fog. Does not override dawn/day clear. |
| Overtime | Events stop triggering once Overtime begins. Focus shifts to pure elimination. |
| Ranked Rating | Events are factored into the game — no rating adjustment. All players face the same event. |
| Spawners | Spawner Resurgence respects the same spawner logic, just resets the counter by 1. |
| Nomad Players | Nomad players are excluded from events that require city ownership (Scorched Earth Tax, Mercenary Influx). |

## Open Questions

- Should players vote on 1 of 2 randomly offered events, or is pure random better for FFA?
- Should event frequency scale with player count (e.g., every 4 turns with 16+ players)?
- Should there be a "no events" game mode toggle for purists?
- Could rare "double event" turns occur after turn 40 for dramatic finales?
