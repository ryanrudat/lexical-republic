# UI Design System — Dystopian Happy iOS

Last updated: 2026-02-12

## Design Philosophy

The Lexical Republic UI is a **happy totalitarian iOS system** — the visual language of a government that wants its citizens to feel calm, cared for, and completely surveilled. Think Apple's Control Center redesigned by a benevolent authoritarian state.

### Core Principles

1. **Forced Happiness** — Everything looks polished, welcoming, and cheerful. Nothing suggests danger. The oppression is in the subtext, not the surface.
2. **Pill-Shaped Everything** — All interactive elements and status displays use rounded-full pill shapes (border-radius: 9999px). No sharp corners. Sharp corners imply conflict.
3. **Frosted Glass (Glassmorphism)** — Semi-transparent backgrounds with `backdrop-blur`. The state can see through everything; so can you.
4. **Soft Light, Soft Shadows** — Gentle inner highlights (`inset 0 1px 0 rgba(255,255,255,0.1)`), diffuse outer shadows. Nothing harsh.
5. **Ambient Surveillance Cues** — Pulsing green dots ("on duty"), status labels, ever-present time displays. You are always being monitored, and that's a good thing.

## Color Language

| Role | Color | Usage |
|------|-------|-------|
| Primary action | Cyan `#00E5FF` | BEGIN SHIFT, active states, neon accents |
| Status/safe | Mint `#69F0AE` | Pulsing "on duty" dots, active indicators |
| Danger/exit | Pink `#FF4081` | LOG OFF hover tint — subtly discouraging |
| Text (on screen) | White 75-92% opacity | Monitor UI text, pill labels |
| Text glow | Cyan 40-50% opacity | `textShadow` on monitor elements |
| Glass fill | White 10-14% opacity | Pill background gradient base |
| Glass border | White 12-20% opacity | Pill border, separates from background |

## Component Patterns

### Frosted Glass Pill (Base Pattern)

All on-screen elements share this foundation:

```css
border-radius: 9999px;
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(0,229,255,0.06) 100%);
border: 1px solid rgba(255,255,255,0.15);
box-shadow: 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.1);
```

### Variant: Status Display (Clock)

- Uses DSEG7 digital font for retro-futurist clock feel
- Includes pulsing green "on duty" dot
- Cyan-tinted gradient background — feels informational, not interactive
- `pointer-events: none` — you can't stop time

### Variant: Action Button (LOG OFF, BEGIN SHIFT)

- Uses IBM Plex Mono with letter-spacing for clean authority
- Hover: background brightens, shadow gains color tint
- BEGIN SHIFT: cyan tint, scales up on hover (`group-hover:scale-105`)
- LOG OFF: pink tint on hover — cheerfully discouraging departure
- `pointer-events: auto` — The Party permits this action

### Variant: Hint Sign

- Elongated pill positioned in physical space (between monitor and keyboard)
- Lower opacity text (55%) and more transparent glass
- Non-interactive (`pointer-events: none`)
- Gentle ambient guidance — the system helps without demanding

## Typography on Monitor Screen

- **Clock**: `font-dseg7` — digital segment display, retro-futurist
- **Actions**: `font-ibm-mono` with `tracking-[2px]` to `tracking-[3px]` — clean bureaucratic
- **Font sizes scale with monitor rect** — `Math.max(minPx, rects.monitor.height * factor)`
- **No fixed pixel sizes** — everything adapts to the overlay positioning system

## Sizing Rules

- All monitor screen pills share the same width/height for visual consistency
- Pill width: `28%` of monitor width
- Pill height: `16%` of monitor height (min 20px)
- BEGIN SHIFT pill: `55%` of monitor width (primary action, larger)
- Font sizes: proportional to monitor height (`0.075` to `0.09` factor)

## Hover Behavior

- **Subtle, not flashy** — The Party doesn't need to shout
- Scale transforms: `scale(1.05)` max
- Background gradient shift: increase white opacity from 10% to 18%
- Box shadow: add color-tinted glow (cyan for positive, pink for exit)
- Transition: `200ms ease` — smooth but not lazy

## Layout on Monitor Screen

```
┌─────────────────────────────┐
│                             │
│      [ BEGIN SHIFT ]        │  ← centered, largest pill
│                             │
│  [● 21:30]      [LOG OFF]  │  ← bottom row, equal-sized pills
└─────────────────────────────┘
     [ click screen to begin shift ]  ← hint sign below monitor
```

## HUD Elements (Outside Monitor)

HUD elements use the existing `retro-card` utility class (warm wood tones, subtle borders) — these are the physical room's interface, not the computer's. They follow the warm retrofuturist palette, not the frosted glass system.

- Ministry title: `font-special-elite`, warm wood color
- Citizen badge: retro-card with green pulse dot
- Volume button: retro-card with cyan glow when active
- PEARL eye: chrome variant, always visible

## Future Application

When redesigning the Terminal view's app tiles and in-shift UI, this same iOS-dystopia pattern should apply:

- Shift step cards → frosted glass pills
- Navigation → pill-shaped buttons with tracking text
- Status indicators → mint pulse dots + DSEG7 readouts
- The tone is always: **helpful, monitored, mandatory**
