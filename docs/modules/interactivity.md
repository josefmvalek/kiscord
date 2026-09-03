# Group E: Entertainment & Arcade Hub

> Encompasses the media entertainment hub and two-player interactive minigames.

---

## 1. Media Library (`#knihovna`)
- **File:** `js/domains/entertainment/library/index.js`
- **Key Features:**
  - **Media Catalogue:** Tabbed view `[ 🎬 Movies | 📺 Series | 🎮 Games ]` with filters for genre, duration, and completion status.
  - **Partner Wish Indicators:** Badges appear on media cards when hearted by the partner (e.g. *“Klárka wants 👸”*).
  - **Integrations:** Magnet links, Google Drive sources, YouTube trailers, and TMDB search.

---

## 2. Shared Watchlist Hub (`#watchlist`)
- **Files:** `js/domains/entertainment/watchlist.js`, `js/domains/entertainment/netflix-matcher.js`
- **Key Features:**
  - **💖 Together Mode (*Spolu-seznam*):** Mutually hearted titles with instant calendar scheduling.
  - **🤴 My Wishlist vs. 👸 Partner Wishlist:** Categorized lists with badge counters.
  - **🎲 Tinder Matcher:** Swipe right (like) and left (nope) for movies, series, and games with real-time match detection.
  - **🎲 Dice of Chance:** Random picker from mutually liked items with confetti.
  - **🍿 Reviews & Reactions:** Timeline of recent ratings with 5-star scores and quick reaction presets.

---

## 3. Music Bot (`#music-bot`)
- **File:** `js/domains/system/static.js`
- **Description:** Integrated audio web player and shared playlist featuring favorite tracks.

---

## 4. Central Arcade Hub (`#gamesky`)
- **File:** `js/domains/entertainment/games-hub.js`
- **Description:** Central two-player minigame lounge unifying:
  - **🎨 Draw Duel (`js/domains/entertainment/game-draw/`):** Real-time cooperative sketching and guessing canvas.
  - **❓ Who Is More Likely To? (`js/domains/entertainment/game-who.js`):** Interactive voting on habits and funny scenarios with match detection.
  - **🧠 Couple Quizzes (`js/domains/couple/couple-quiz.js`):** Reciprocal quizzes with percentage affinity scoring.
  - **🧩 Memory Photo Puzzle (`js/domains/entertainment/puzzle.js`):** Sliding tile puzzle using photos from the memory timeline.
  - **🕹️ Tetris War Tracker (`js/domains/entertainment/games.js`):** Retro Tetris game with dual high-score leaderboard.
  - **🏆 Tier Lists (`js/domains/entertainment/tierlist/`):** Collaborative S-A-B-C-D tier rankers.
  - **💡 Fact Encyclopedia (`js/domains/entertainment/funfacts.js`):** Interactive knowledge cards and miniquizzes.
