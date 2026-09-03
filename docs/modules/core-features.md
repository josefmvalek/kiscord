# Group A: Core Daily Features

> Modules focused on daily well-being, biometric health tracking, and shared time management.

---

## 1. Dashboard (`#dashboard`)
**File**: `js/domains/lifestyle/dashboard/index.js` (and submodules in `js/domains/lifestyle/dashboard/*`)

Serves as the primary landing hub and personal overview of the day.

### Key Capabilities:
- **Sunflower Sync**: Two animated SVG sunflowers reacting in real time to the current mood and sleep state of both users.
- **Fact of the Day**: Random interesting fact chosen daily from the built-in encyclopedia.
- **Quick Planning**: Actionable panel for accepting or declining date invitations from the partner.
- **Daily Question Card**: Compact preview of the daily prompt with inline answer submission.
- **Sunlight Pulse**: Interactive button sending a glowing particle beam and confetti animation to the partner's device.

---

## 2. Health & Biometrics (`#dashboard`)
**Files**: `js/domains/fitness/health.js`, `js/domains/lifestyle/dashboard/health_ui.js`

Manages biometric data tracking and synchronization with the `health_data` table.

### Tracked Metrics:
- **Mood**: Slider from 1 to 10 with live emoji indicators and theme glow effects.
- **Hydration**: 8-droplet toggle system. Reaching 8 droplets unlocks achievements with confetti.
- **Sleep Tracker**:
  - Session tracking: "Go to Bed" and "Wake Up" timestamps.
  - Progressive Active Timer: Displays elapsed sleep duration and completion percentage.
  - Validation: Guards against invalid sessions (e.g. Epoch timestamp bugs).
- **Physical Activity & Supplements**: Tag chips for quick activity logging (Gym, Walking) and vitamin tracking (Iron, Zinc, Magnesium).

---

## 3. Calendar 3.0 (Spatial Zen & Glass Luxe) (`#kalendář`)
**Files**: `js/domains/lifestyle/calendar/index.js` (and submodules: `week-view.js`, `month-view.js`, `time-engine.js`, `quick-popover.js`, `weather.js`, `partner-radar.js`, `nlp-quick-add.js`, `daily-briefing.js`, `day-modal.js`)

Central planning and retrospective hub combining 24-hour weekly scheduling, fit-viewport month overview, habit tracking, and university timelines into one fluid interface.

### Key Capabilities:
- **Spatial Zen & Smart Event Hierarchy**: Maximum 1–2 Hero frosted chips in month cell with collapsible `+N další` chip to eliminate visual clutter.
- **Minimalist Vitality Dots**: Glowing micro-dots (💧 water, 😴 sleep, ⚡ mood, 💊 vitamins) replacing text labels.
- **Zen Peek HUD Popover**: Floating frosted-glass preview on hover with weather, full daily telemetry, agenda, and 1-click hydration logging.
- **Nightscape 24-Hour Week Time-Grid**: Circadian ambient gradient backdrop (Cosmic Night $\rightarrow$ Graphite Day $\rightarrow$ Warm Twilight).
- **Now Laser 3.0 & Time Spotlight**: Pulsing diamond beacon with live horizontal laser and vertical ambient column spotlight on today's day.
- **Romantic Gap In-Grid Zones**: Automatic detection of free evening windows ($\ge 90\text{ min}$) rendered as champagne-rose clickable slots.
- **AI Spotlight Command Bar (`Cmd+K` / `Ctrl+K` / `Space` / `N`)**: Natural language Czech parser (NLP) with real-time category detection and conflict checks.
- **Full Keyboard Navigation**: Fast switching with `W` (Week), `M` (Month), `A` (Agenda), `T` (Today), `G` (Gaps), `D` (Briefing), `E` (Export), `1–6` (Filters).
- **Comprehensive Spec**: See [`calendar-2.0.md`](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/docs/modules/calendar-2.0.md) / [calendar-2.0.html](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/docs/calendar-2.0.html) for full technical documentation.
