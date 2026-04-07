# Harmony Visual Enhancement Ideas

Last updated: 2026-04-03

These ideas reuse existing visual effects already in the codebase. Nothing requires new dependencies or Three.js inside Harmony — all are CSS animations or small React additions.

---

## Low-Effort, High-Immersion (CSS-only)

### 1. Propaganda Slogan Ticker

A slowly scrolling weekly slogan at the top of the Harmony feed — like state-run news ticker. Pure CSS `translateX` animation on a loop.

- Content: `WEEKLY_CULTURE[weekNumber].slogan` from the world bible (e.g., "Harmony Starts With You", "Clear Words, Clear Minds")
- Visual: thin bar, muted text, slow scroll left-to-right, repeating
- Why it works: Harmony IS state media. A ticker is how state media works. Students will read it without realizing they're absorbing the propaganda layer.
- Effort: ~30 min. One div with CSS animation.

### 2. Citizen-4488 Glitch Effect

When a 4488 post renders, a brief CSS glitch plays for 300ms on mount.

- Reuses existing: `glitch-tear` (skew + opacity, 0.3s) and `screen-flicker` (0.1s rapid opacity) already in Tailwind config
- Visual: quick horizontal jitter + opacity flash, then settles into normal post
- Why it works: says "something is wrong with this citizen" without any text. Students notice subconsciously. The effect gets stronger in later weeks as 4488's situation worsens.
- Effort: ~15 min. Add a CSS class on mount with a setTimeout removal.

### 3. Bulletin Typewriter Reveal

Ministry Bulletin header text types out character-by-character when first expanded.

- Reuses existing: `boot-typewriter` animation (width + opacity, stepped)
- Visual: "MINISTRY BULLETIN — REF: MB-2031-W01" types across the header like a teleprinter
- Why it works: makes official content feel transmitted in real time, reinforcing that the Ministry is actively broadcasting to citizens
- Effort: ~20 min. CSS animation on the header span.

### 4. Scan Line Entrance on Feed Load

When Harmony opens, a single horizontal bright line sweeps top-to-bottom across the feed, then content fades in.

- Reuses existing: `scanSweep` keyframe (already used in ViewTransition component)
- Visual: 800ms sweep, then feed appears. Like a CRT warming up.
- Why it works: ties Harmony to the terminal CRT aesthetic. Reminds students they're inside a government system.
- Effort: ~20 min. Wrapper div with animation, removed after play.

### 5. Sector Report Counter Tick

Statistics in sector reports (e.g., "Documents processed: 847") animate from 0 to their final value.

- Visual: numbers tick up quickly over 1-2 seconds, like a digital counter compiling data
- Why it works: makes data feel live and actively computed. Citizen-7291 would approve.
- Effort: ~45 min. Small React hook with requestAnimationFrame, or CSS `@property` counter.

---

## Medium-Effort, Strong Narrative Payoff

### 6. PEARL Eye on Annotations

Small PearlEye component (32x32px `sm` variant) rendered inline next to PEARL notes and PEARL tips.

- Already built: `PearlEye.tsx` has 8 mood states (welcoming, evaluative, alarmed, etc.)
- Visual: tiny eye next to PEARL content. Mood shifts by context:
  - `welcoming` on wellness tips
  - `evaluative` on censure feedback
  - `alarmed` if student approves a 4488 post
- Why it works: PEARL feels present and watching. The eye creates a visceral "being observed" feeling without being threatening.
- Effort: ~1 hour. Import PearlEye, add to PEARL-authored cards.

### 7. Subtle Dust Particles Behind Feed

10-15 small translucent circles floating slowly behind the feed content.

- Reuses existing: `float-particle` animation (10s ease-in-out) already in Tailwind config
- Visual: very low opacity (0.03-0.05), slow upward drift, absolute-positioned behind post cards
- Why it works: adds atmospheric depth. The Lexical Republic is a physical place — dust exists. Subtle enough that students don't consciously notice but the feed feels more alive than a flat white background.
- Effort: ~30 min. Absolute-positioned divs with animation, no Three.js needed.

### 8. Harmony Credit Counter in Header

Small digital counter in the Harmony header showing accumulated "Harmony Credits."

- Reuses existing: `queue-tick` animation (scale pulse, 0.3s) on increment
- Visual: "HC: 12" in monospace, pulses green when credits earned
- Credits earned for: completing censure items, reading bulletins, correct bulletin answers
- Why it works: in-world reward system from the world bible ("Citizens earn harmony credits for compliance"). Gamifies participation without affecting actual grades. Students will try to max it out.
- Effort: ~1 hour. Session state counter + visual display + trigger on actions.

---

## Bigger Idea (Phase C Integration)

### 9. PEARL Ambient Presence Strip

A thin emerald bar pinned to the bottom of Harmony that subtly pulses.

- Reuses existing: `pearl-glow` keyframe (pulsing shadow)
- Visual: 4px emerald gradient bar at bottom edge of Harmony, barely noticeable normally. When PEARL reacts to something (5 correct in a row, flagging 4488, extended browsing), the bar brightens and a mini card slides up using `slideInRight` animation.
- Annotations (from the review doc):
  - "Your participation has been noted. Continued enthusiasm is valued."
  - "Exceptional language accuracy. This has been added to your file."
  - "Additional review has been scheduled for your benefit, Citizen."
- Why it works: PEARL is always watching — the bar is proof. Students will learn to associate the brightening with their actions. Creates genuine unease in a way that serves the story.
- Effort: ~2 hours. New component + trigger logic + animation. Natural Phase C task.

---

## What NOT to Do

- No Three.js in Harmony — the 3D office is already 900KB. Harmony should stay lightweight.
- No Framer Motion — the project uses pure CSS + React state for all animations. Adding a new dep for one feature is wrong.
- No heavy particle effects — Harmony runs on Chromebooks. Keep it CSS.
- No audio effects — Harmony is a social feed. Sounds would be jarring and annoying in a classroom.
- No dark theme / neon effects inside Harmony — the feed uses the shift queue palette (cream/white/sky). CRT green is terminal-only.

---

## Priority Recommendation

If building 3 of these, I'd pick:

1. **Propaganda Slogan Ticker** — fastest to build, strongest world-building payoff
2. **Citizen-4488 Glitch** — 15 minutes, immediately makes the narrative feel alive
3. **PEARL Eye on Annotations** — uses existing component, sets up Phase C

These three together take ~2 hours and make Harmony feel like a living government platform, not just a post list.
