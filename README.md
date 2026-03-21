# 🦝 Kiscord 🤍 🦉

**Kiscord** is a premium, private "Couple OS" designed for Josef and Klárka. It’s a unified dashboard for tracking health, planning shared adventures, celebrating memories, and staying connected in real-time.

---

## ✨ Key Features

### 🏡 Dashboard (Můj Den)
The heart of the app. A real-time hub for daily rituals and connectivity.
- **Mood Tracking**: Interactive slider with visual feedback (mood bubbles) and historical logging.
- **Hydration & Activity**: Quick-tap counters for water intake and physical activity (Fitko, Procházka).
- **Sunlight Broadcast**: Send instant, haptic "Sunlight" to your partner with custom confetti and aura effects.
- **Real-time Sync**: Watch your partner's health and mood update live on your screen.

### 📅 Shared Calendar
A collective planning tool for everything from school tests to romantic getaways.
- **Unified Views**: See planned dates, school events, and historical health data in one grid.
- **Detail Modals**: Click any day to see a full breakdown of shared activity and specific notes.
- **History Navigation**: Full browser "Back" button and gesture support for seamless transitions between months and sessions.

### 📜 Timeline (Memories)
A beautiful, scrollable journey through shared moments.
- **Photo Gallery**: High-performance image loading for shared memories.
- **Milestones**: Highlights for significant events in your relationship.
- **Quick Links**: Direct navigation from Calendar events to their corresponding Timeline stories.

### 🎈 Bucket List 2.0
A dynamic, categorized list of common dreams and goals.
- **Categorization**: Sort goals by type (Adventure, Food, Relax, etc.).
- **Hearting System**: Save items as "Favorites" to move them to the top.
- **Live Updates**: Items added or marked as completed update instantly for both users.

### 🎮 Games & Interaction
Custom-built mini-games designed for two.
- **Who is More Likely?**: Real-time voting game where you guess who fits a specific prompt best.
- **Draw Duel**: A synchronized whiteboard for drawing together in real-time.
- **Puzzle & Riddles**: Logic-based challenges to solve together.

### 🎬 Library & Watchlist
Collaborative database for entertainment.
- **Shared Watchlist**: Track movies and series you want to see together.
- **Ratings & Reviews**: Rate what you've watched and see your partner's reactions.
- **Game Library**: A shared catalog of games with direct links and instructions.

---

## 🛠️ Technical Stack

- **Frontend**: 
  - **Vanilla JavaScript (ES6+)**: No heavy frameworks, just pure, high-performance logic.
  - **HTML5 Semantic Structure**: SEO-friendly and accessible.
  - **Vanilla CSS3 + Tailwind (CDN)**: Modern, responsive design system with custom animations and glassmorphism.
- **Backend (BaaS)**: 
  - **Supabase**: Powering Authentication, PostgreSQL storage, and Realtime subscriptions.
  - **RLS (Row Level Security)**: Robust isolation for personal data (Health) and seamless sharing for joint data (Timelines, Games).
- **VFX & UX**: 
  - **Haptic API**: Native vibration feedback for interactions on mobile devices.
  - **History API**: Native-like navigation between application modules.
  - **Custom VFX**: CSS-based "Aura Reach" and confetti systems (no external libraries).

---

## 🚀 Setup & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/josefmvalek/kiscord.git
   ```
2. **Setup Supabase**:
   - Create a new project.
   - Run the initial SQL setup from `/supabase/database_setup.sql`.
   - Apply subsequent migrations from the `/supabase` directory.
3. **Environment Variables**:
   In `js/core/supabase.js`, configure your `SUPABASE_URL` and `SUPABASE_KEY`.
4. **Local Server**:
   Run via any local server (e.g., Live Server, Python http.server, or NPM start).

---

## 💎 Design Philosophy
Kiscord is built to feel like a **private, premium space**. It shuns generic UI in favor of custom-curated color palettes, smooth micro-animations, and deeply personalized details (like Czech name declension).

Created with ❤️ for **Klárka & Jožka**.