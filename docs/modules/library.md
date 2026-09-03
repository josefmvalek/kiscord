# Group E: Entertainment Hub (Library & Watchlist)

> Manages the shared digital entertainment catalog spanning movies, television series, and video games—including watch history, wishlists, and evening decision-making tools.

---

## 1. Media Library (`#knihovna`)
**File**: `js/domains/entertainment/library/index.js`

Unified media catalogue with tabs for Movies, Series, and Games, featuring live search and TMDB integration.

### Key Capabilities:
- **Categorization & Mood Tags**: Items organized by genres and enhanced with mood tags (e.g. *Tearjerker*, *Suspense*, *Chill*, *Staple*).
- **⚡ Game Modes & Decision Paralysis Solver**:
  - `⚡ Our Staples`: Regularly played games for quick evening picks.
  - `🌟 Planned Backlog`: Queue of new games for weekend discovery.
  - `🏆 Completed`: Archive of finished games.
  - One-click toggle between modes on every game card.
- **🔍 Real-Time Live Search**: Instant filtering by title, genre, and mood tag as you type, with a fallback button for direct TMDB query.
- **🎬 TMDB Integration**: Automated retrieval of posters, genres, runtimes, ratings, and release years.
- **Download & Streaming Integration**:
  - **Magnet Links**: Direct one-click integration with torrent clients (e.g. qBittorrent).
  - **Google Drive**: Alternate direct backup sources.
  - **Trailers**: Quick YouTube trailer preview modal.
- **Watch History & Reviews**:
  - **Status**: Watching, Seen, Planned.
  - **Rating**: 5-star rating scale.
  - **Reaction Presets**: Quick reaction badges (*All-Time Favorite*, *Deep*, *Boring*).

---

## 2. Watchlist Hub (`#watchlist`)
**File**: `js/domains/entertainment/watchlist.js`

Intelligent overview of both partners' entertainment wishlists and evening decision center.

### Key Capabilities:
- **💖 Mutual Matches (Together Mode / *Spolu-seznam*)**: Automatically detects overlapping interests. Media items hearted by both partners are prioritized at the top with a direct button to schedule a date in the calendar.
- **🙋‍♂️ My Wishlist vs. 👸 Partner Wishlist**: Split columns with category filters (`All`, `Movies`, `Series`, `Games`) and partner wish badges.
- **🗑️ 1-Click Removal**: Quick dismissal icon to remove items from personal lists on mobile and desktop.
- **🍿 Recent Experiences & Log**: Preview of the 6 most recent ratings and reviews across shared history.

---

## 3. Tinder Matcher & Decision Tools
**Files**: `js/domains/entertainment/netflix-matcher.js`, `js/domains/entertainment/watchlist.js`

Tools designed to eliminate decision paralysis:
1. **Dedicated Tinder Matchers**:
   - 🎬 **Movie Matcher**: Rapid movie swiping.
   - 📺 **Series Matcher**: Television show selection.
   - 🎮 **Game Matcher**: Quick game picker with `⚡ Our Staples` filter for under-30-second decisions.
2. **Realtime Match Detection**: When both partners swipe right, a celebratory confetti modal appears with a direct button to schedule into the calendar.
3. **🎲 Dice of Chance (`Watchlist.rollTheDice()`)**: Randomizes a selection from mutual matches with confetti.
