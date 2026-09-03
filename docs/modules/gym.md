# Group C: Fitness & Gym Tracker

> The **Gym Tracker** is a comprehensive fitness tracking ecosystem designed for logging workout routines, estimating one-rep maximums (1RM PRs), tracking body measurements, and gamifying workouts.

---

## 1. Gym Architecture (`js/domains/fitness/gym/`)

The module is modularized into specialized submodules:

| File | Responsibility |
|---|---|
| `index.js` / `main.js` | Module entry point, tab navigation, and lifecycle management |
| `active-workout/` | Floating active workout HUD, set logging, and rest timer |
| `templates/` | Workout routine templates (Push/Pull/Legs, Upper/Lower, Fullbody) and builder |
| `exercises.js` | Registry of 100+ exercises with animated GIFs, instructions, and muscle tags |
| `prs.js` | 1RM progression charts, load volume analytics, and PR celebrations |
| `muscleMap.js` | Interactive anatomical muscle volume heatmap |
| `bodyTracker.js` | Body measurement logs (weight, waist, arms, chest) and photo gallery |
| `coupleGym.js` | Couple gym streak counter and shared milestone tracker |
| `annualWrapped.js` | Annual fitness wrap-up (total tonnage lifted, workouts completed) |
| `feed.js` | Activity stream of workouts completed by both partners with cheering reactions |
| `tools.js` | Barbell plate loading calculator and warmup set generator |

---

## 2. Key Capabilities

### A. Floating Active Workout HUD & Rest Timer
- Runs in a persistent floating bottom bar (`updateGlobalWorkoutMiniBar()`), allowing users to browse Kiscord freely between sets.
- Features automated audio chimes and haptic pulses upon rest timer expiration.

### B. Personal Records (1RM PRs) & Progression
- Automated 1RM calculation using validated Epley and Brzycki formulas.
- Live PR notifications triggered directly upon entering a record-breaking set.

### C. Recovery, Biometrics & Habits
- **Nutrition (`js/domains/fitness/nutrition/`)**: TDEE calculator, IF timer, macro tracking.
- **Body Metrics (`js/domains/fitness/body-metrics/`)**: Weight trend smoothing, circumferences, FFMI index.
- **Habits (`js/domains/lifestyle/habits.js`)**: Daily routines rewarded with Love Coins.
- **Recovery (`js/domains/fitness/regenerace.js`)**: Evidence-based guide covering supplementation (Creatine, Magnesium, Whey Protein, Omega-3).
