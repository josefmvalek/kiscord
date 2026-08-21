# Group B: VUT FIT & Koleje Brno

> Tools for university studies at **VUT FIT** and shared student life in the dormitories of Brno.

---

## 1. Timetable & Schedule (`#rozvrh`)
- **File:** `/js/modules/schedule.js`
- **Capabilities:**
  - Weekly visual timetable color-coded by lecture, lab, and exercise sessions.
  - VUT FIT campus building navigation hints (`FIT_ROOM_HINTS`).
  - Automated joint free window detector for planning lunch or study breaks together (`calculateDayFreeSlots`).

---

## 2. Study Planner & WIS Tracker (`#studijní-plán`)
- **File:** `/js/modules/studyPlanner.js`
- **Capabilities:**
  - Overview of enrolled university subjects, credit totals, and real-time WIS points.
  - Course pass probability calculator with dynamic status indicators.
  - Assignment deadlines and exam date countdowns.

---

## 3. Dorm Life Hub (`#koleje-brno`)
- **File:** `/js/modules/dormHub.js`
- **Capabilities:**
  - **Laundry Tracker:** Live machine booking and timer tracker for floor washing machines with notifications.
  - **Dorm Checklist:** Comprehensive room packing checklist categorized by packed and purchased states.
  - **Cafeteria Radar:** Direct links and daily menus for VUT campus cafeterias (Menza Kolejní, Purkyňova).

---

## 4. Personal Finance Tracker (`#finance`)
- **File:** `/js/modules/financeTracker.js`
- **Architecture:**
  - **Tab 1: Brno Personal Budget:**
    - Income and expense tracking across categories (Cafeteria, Housing/Dorm, Groceries, Transit, Leisure).
    - Monthly balances and spending breakdowns.
    - Strictly private personal records per user.
  - **Tab 2: Savings Piggy Bank (*Kasička*):**
    - Personal savings goals (e.g. *Summer Vacation*, *New Monitor*, *Emergency Fund*).
    - Visual progress meters, quick deposit buttons (+100, +500, +1000 CZK), and completion confetti.

---

## 5. Laptop Comparison & Guide (`#počítač`)
- **File:** `/js/modules/laptopComparison.js`
- **Capabilities:**
  - Specification matrix (performance, battery life, weight, display quality) for selecting laptops for CS engineering studies.
  - Personal evaluation notes and candidate rankings.
