# Group E: Entertainment & Arcade Hub

> Encompasses the media entertainment hub and two-player interactive minigames.

---

## 1. Media Library (`#knihovna`)
- **File:** `/js/modules/library.js`
- **Key Features:**
  - **Media Catalogue:** Tabbed view `[ 🎬 Movies | 📺 Series | 🎮 Games ]` with filters for genre, duration, and completion status.
  - **Partner Wish Indicators:** Badges appear on media cards when hearted by the partner (e.g. *“Klárka wants 👸”*).
  - **Integrations:** Magnet links, Google Drive sources, YouTube trailers, and TMDB search.

---

## 2. Shared Watchlist Hub (`#watchlist`)
- **Files:** `/js/modules/watchlist.js`, `/js/modules/netflixMatcher.js`
- **Key Features:**
  - **💖 Together Mode (*Spolu-seznam*):** Mutually hearted titles with instant calendar scheduling.
  - **🤴 My Wishlist vs. 👸 Partner Wishlist:** Categorized lists with badge counters.
  - **🎲 Tinder Matcher:** Swipe right (like) and left (nope) for movies, series, and games with real-time match detection.
  - **🎲 Dice of Chance:** Random picker from mutually liked items with confetti.
  - **🍿 Reviews & Reactions:** Timeline of recent ratings with 5-star scores and quick reaction presets.

---

## 3. Music Bot (`#music-bot`)
- **File:** `/js/modules/static.js`
- **Description:** Integrated audio web player and shared playlist featuring favorite tracks.

---

## 4. Central Arcade Hub (`#gamesky`)
- **File:** `/js/modules/gamesHub.js`
- **Description:** Central two-player minigame lounge unifying:
  - **🎨 Draw Duel (`gameDraw.js`):** Real-time cooperative sketching and guessing canvas.
  - **❓ Who Is More Likely To? (`gameWho.js`):** Interactive voting on habits and funny scenarios with match detection.
  - **🧠 Couple Quizzes (`coupleQuiz.js`):** Create and take reciprocal quizzes with percentage affinity scoring.
  - **🧩 Memory Photo Puzzle (`games.js`):** Sliding tile puzzle using photos from the memory timeline.
  - **🕹️ Tetris War Tracker (`games.js`):** Retro Tetris game with dual high-score leaderboard.
  - **🏆 Tier Lists (`tierlist.js`):** Collaborative S-A-B-C-D tier rankers.
  - **💡 Fact Encyclopedia (`funfacts.js`):** Interactive knowledge cards and miniquizzes.
