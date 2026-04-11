# 🌊 Naval System

> Ports and ships add a maritime dimension to WC3 Risk. Control port cities to build fleets, transport armies across water, and dominate naval chokepoints.

[← Back to Wiki Home](./README.md)

---

## Table of Contents

- [Port Cities](#port-cities)
- [Naval Units](#naval-units)
- [Ships](#ships)
- [Transport System](#transport-system)
- [Naval Strategy](#naval-strategy)

---

## Port Cities

Port cities are coastal territories that train naval units and ships instead of land units.

```mermaid
flowchart LR
    Port["⚓ Port City (h001)"]
    Port --> Marines["Marines<br/>(u008, u009, u010)"]
    Port --> Transport["Transport Ships<br/>(s000, s001)"]
    Port --> Warships["Warships<br/>(s002, s003, s004)"]
```

### Port Distribution

| Map | Total Cities | Port Cities | Port Percentage |
|-----|-------------|------------|-----------------|
| Europe | 233 | 46 | 19.7% |
| Asia | 229 | 32 | 14.0% |
| World | 555 | 74 | 13.3% |

### Notable Port Countries (Europe)

Some countries are fully naval (all cities are ports):

| Country | Cities | Ports | Naval Control |
|---------|--------|-------|---------------|
| Crete | 2 | 2 | 100% naval |
| Cyprus | 2 | 2 | 100% naval |
| Iceland | 2 | 2 | 100% naval |
| Corsica | 1 | 1 | 100% naval |
| Malta | 1 | 1 | 100% naval |
| Sardinia | 1 | 1 | 100% naval |
| Kaliningrad | 1 | 1 | 100% naval |

---

## Naval Units

Naval infantry units are trained at port cities and fight on water.

| | Unit | ID | HP | Damage | Tier | Role |
|---|------|----|-----|--------|------|------|
| ![](../../assets/icons/small-icons/marine-icon.webp) | **Marine** | `u008` | 215 | 14 | Basic | Entry-level naval unit |
| ![](../../assets/icons/small-icons/major-icon.webp) | **Major** | `u009` | 900 | 48 | Mid | Experienced naval combatant |
| ![](../../assets/icons/small-icons/admiral-icon.webp) | **Admiral** | `u010` | 900 | 48 | Elite | Top-tier naval commander |

### Naval Unit Details

| | Unit | Description |
|---|------|-------------|
| ![](../../assets/icons/characters/marine-unit.webp) | **Marine** | Basic naval ground combat unit with standard damage and range. Most effective when deployed in groups. Vulnerable to fast or diving units. |
| ![](../../assets/icons/characters/major-unit.webp) | **Major** | Melee naval unit with high damage and Frenzy ability (attack + movement speed). Ideal for aggressive pushes and chasing down enemy ships. |
| ![](../../assets/icons/characters/admiral-unit.webp) | **Admiral** | Strongest melee naval unit with Berserk ability. Powerful choice for leading naval assaults. Buffs nearby sea units. |

---

## Ships

Ships are vessel units with unique naval capabilities.

| | Ship | ID | HP | Damage | Type | Key Feature |
|---|------|----|-----|--------|------|-------------|
| ![](../../assets/icons/small-icons/TransportShip.webp) | **Transport Ship** | `s000` | 300 | 0 | Transport | Carries land units across water |
| ![](../../assets/icons/small-icons/ATS-icon.webp) | **Armored Transport** | `s001` | 800 | 0 | Transport | Tougher transport with more cargo |
| ![](../../assets/icons/small-icons/WarshipA.webp) | **Warship A** | `s002` | 550 | 38 | Combat | Naval combat vessel |
| ![](../../assets/icons/small-icons/WarshipB.webp) | **Warship B** | `s003` | 2000 | 98 | Combat | Advanced naval combat |
| ![](../../assets/icons/small-icons/WarshipSS.webp) | **Battleship SS** | `s004` | 5000 | 138 | Capital | Strongest naval unit in the game |

### Ship Details

| | Ship | Description |
|---|------|-------------|
| ![](../../assets/icons/characters/TransportShip_icon.webp) | **Transport Ship** | Carries up to 10 land units across water. Lightly armored and fast, suitable for quick troop movement but vulnerable to attacks. |
| ![](../../assets/icons/characters/Armoured_Transport_Ship_image.webp) | **Armored Transport** | Upgraded transport with significantly higher HP and speed, still carries 10 units. Better protection for troop transport. |
| | **Warship A** | Early game naval unit with decent range and splash damage. Useful against early enemy ships or clustered groups, but vulnerable later. |
| | **Warship B** | Strong naval unit with high damage and shorter range. Attacks cannot be dodged. Excels at chasing down enemy ships including Battleships. |
| | **Battleship SS** | Most powerful naval unit. Very long range, high damage, significant HP with splash damage. Dominates late-game naval battles. |

### Ship Hierarchy

```mermaid
flowchart TD
    subgraph Transport ["Transport Class"]
        TS["Transport Ship (s000)<br/>300 HP, No attack"]
        ATS["Armored Transport (s001)<br/>800 HP, No attack"]
    end

    subgraph Combat ["Combat Class"]
        WA["Warship A (s002)<br/>550 HP, 38 dmg"]
        WB["Warship B (s003)<br/>2000 HP, 98 dmg"]
        BS["Battleship SS (s004)<br/>5000 HP, 138 dmg"]
    end

    TS --> ATS
    WA --> WB --> BS
```

---

## Transport System

Transport ships allow moving land armies across water — a critical strategic capability.

### Transport Abilities

| Ability | ID | Description |
|---------|----|-------------|
| **Cargo Hold** | `a009` | Determines transport capacity |
| **Load** | `a010` | Manually load nearby land units |
| **Unload** | `a011` | Unload carried units at destination |
| **Autoload On** | `a013` | Automatically load nearby units |
| **Autoload Off** | `a014` | Disable automatic loading |
| **Transport Patrol** | `A008` | Set up automatic patrol route |

### Transport Flow

```mermaid
sequenceDiagram
    participant P as Player
    participant T as Transport Ship
    participant U as Land Units
    participant D as Destination

    P->>T: Select transport
    P->>U: Order: Load units
    U->>T: Units board transport
    P->>T: Move to destination
    T->>D: Arrive at port/coast
    P->>T: Unload
    T->>U: Units disembark
    U->>D: Units ready to fight
```

### Autoload

With **Autoload On**, transport ships automatically pick up nearby land units:
- Useful for quickly loading armies
- Toggle off to prevent accidental loading
- Controlled via `a013` (on) and `a014` (off) abilities

### Patrol Routes

**Transport Patrol** (`A008`) allows setting automatic patrol routes:
- Ship moves between two points automatically
- Useful for continuous reinforcement across water
- Can be combined with autoload for automated supply lines

---

## Naval Strategy

### Why Ports Matter

```mermaid
flowchart TD
    Port["Control Port Cities"]
    Port --> Fleet["Build Naval Fleet"]
    Port --> Block["Block Naval Routes"]
    Port --> Transport["Transport Armies"]

    Fleet --> Dominate["Naval Dominance"]
    Block --> Deny["Deny Enemy Movement"]
    Transport --> Invade["Amphibious Invasions"]

    Dominate --> Win["Control Island Nations"]
    Deny --> Protect["Protect Your Coastline"]
    Invade --> Expand["Expand Territory"]
```

### Key Naval Chokepoints (Europe)

| Route | Ports Involved | Strategic Value |
|-------|---------------|-----------------|
| North Sea | Norway, Scotland, Denmark | Controls Scandinavian access |
| Mediterranean | France, Northern Italy, Sicily, Sardinia | Central sea control |
| Baltic Sea | Sweden, Finland, Estonia, Latvia | Northern European waterway |
| English Channel | England, Normandy, Belgium | Cross-channel movement |
| Aegean Sea | Greece, Crete, Türkiye | Eastern Mediterranean |
| Black Sea | Crimea, Southern Russia, Türkiye | Eastern European naval zone |

### Tips

1. **Control nearby ports first** — They're your only naval production
2. **Use transports for surprise attacks** — Land armies can cross water with escort
3. **Patrol routes for automation** — Set up transport patrols for continuous reinforcement
4. **Island nations are defensible** — Malta, Iceland, Crete are easier to hold
5. **Mixed fleets are strongest** — Combine warships (combat) with transports (movement)

---

## Source Code Reference

| File | Purpose |
|------|---------|
| `src/configs/unit-id.ts` | Ship and naval unit IDs |
| `src/configs/ability-id.ts` | Transport abilities |
| `src/app/city/types/port-city.ts` | Port city implementation |
| `src/app/triggers/unit_death/` | Naval unit death handling |

---

[← Cities & Countries](./cities-countries.md) · [Back to Wiki Home](./README.md) · [Rating & Ranked →](./rating.md)
