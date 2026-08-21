# Group F: System, Progression & Gamification

> Core infrastructure and gamification modules that drive engagement, user customization, and relationship analytics.

---

## 1. Settings (`#nastavení`)
**File**: `js/modules/settings.js`

Comprehensive preference center controlling application visuals, audio, and data.

### Key Sections:
- **Themes**: Switch between 7 distinct visual styles (Kiscord Dark, Light, Valentines, Christmas, Tetris, Forest, Gold).
- **Appearance**: Controls for glassmorphism blur intensity and dashboard widget visibility.
- **Notification Engine**:
  - Fine-grained controls for reminders (Hydration, Pills, Bedtime).
  - Toggles for sound effects and haptic vibration feedback.
  - Browser push notification permissions.
- **Data Management**: Cache clearing and sign-out tools.

---

## 2. Hall of Fame & Achievements (`#achievementy`)
**File**: `js/modules/achievements.js`

Collection of trophies celebrating relationship milestones and wellness streaks.

### Capabilities:
- **Categories**: Grouped by Health, Relationship, Experiences, and Special Events.
- **Auto-Unlock Engine**: Background hooks evaluate conditions (e.g. *Hydration Master* upon logging 8 glasses, *Sleeping Beauty* after 7 consistent sleep logs).
- **Real-Time Sync**: When one partner unlocks an achievement, a celebration modal and confetti trigger instantly on the partner's phone.
- **Admin Management**: Interface for adding new custom achievements.

---

## 3. Levels & Relationship XP
**File**: `js/modules/levels.js`

Progression system measuring relationship activity over time.

### Mechanics:
- **XP Calculation**: Points aggregated from all actions (completed habits, logged workouts, bucket list check-offs) computed via Supabase RPC procedures.
- **Rank Titles**: Milestone ranks (e.g. *Treasure Hunters*, *Soulmates*).
- **Rewards**: Level milestones unlock special theme palettes and UI perks.
- **Sidebar Badge**: Dynamic XP progress bar in the sidebar footer with pulse animations on level-up.

---

## 4. Co-op Quests
**File**: `js/modules/quests.js`

Monthly cooperative missions requiring mutual participation.

### Overview:
- **Quest Types**: Combined hydration targets, synchronized sleep streaks, joint workout counts, or shared Tetris high scores.
- **Data Aggregation**: Real-time SQL aggregations comparing both partners' activities.
- **Visual Progress**: Gradient cards with live progress bars.
