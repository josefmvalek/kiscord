# Group A: Core Daily Features

> Modules focused on daily well-being, biometric health tracking, and shared time management.

---

## 1. Dashboard (`#dashboard`)
**File**: `js/modules/dashboard.js` (and submodules in `js/modules/dashboard/*`)

Serves as the primary landing hub and personal overview of the day.

### Key Capabilities:
- **Sunflower Sync**: Two animated SVG sunflowers reacting in real time to the current mood and sleep state of both users.
- **Fact of the Day**: Random interesting fact chosen daily from the built-in encyclopedia.
- **Quick Planning**: Actionable panel for accepting or declining date invitations from the partner.
- **Daily Question Card**: Compact preview of the daily prompt with inline answer submission.
- **Sunlight Pulse**: Interactive button sending a glowing particle beam and confetti animation to the partner's device.

---

## 2. Health & Biometrics (`#dashboard`)
**Files**: `js/modules/health.js`, `js/modules/dashboard/health_ui.js`

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

## 3. Calendar & Date Planner (`#kalendář`)
**Files**: `js/modules/calendar.js` (and submodules in `js/modules/calendar/*`)

Monthly grid calendar combining multiple data domains into a single timeline.

### Features:
- **Mood Heatmap**: Day cells shaded according to average daily mood logs.
- **Domain Filtering**: Toggle visibility of Health logs, Movie watches, Date invites, and University exams.
- **Day Detail Modal (`modals.js`)**:
  - Retroactively edit health and habit data.
  - Schedule new dates and checklists.
  - View media seen on that day.
