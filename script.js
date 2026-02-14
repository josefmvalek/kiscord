let hasUserInteracted = false;

// Sledování interakce uživatele (nutné pro audio/haptiku)
['click', 'touchstart', 'keydown'].forEach(evt =>
  document.addEventListener(evt, () => hasUserInteracted = true, { once: true })
);

function triggerHaptic(type = "light") {
  // Haptika funguje jen po interakci a na podporovaných zařízeních
  if (!navigator.vibrate || !hasUserInteracted) return;

  if (type === "light")
    navigator.vibrate(5); // Jemné ťuknutí
  else if (type === "medium")
    navigator.vibrate(15); // Potvrzení
  else if (type === "heavy")
    navigator.vibrate(30); // Chyba/Důležité
  else if (type === "success") navigator.vibrate([10, 30, 10]); // Dvojité
}

// --- BOTTOM SHEET LOGIC (Snap Points) ---
// --- BOTTOM SHEET LOGIC (Snap Points) ---
var sheetState = window.sheetState || {
  startY: 0,
  currentY: 0,
  isDragging: false,
  panelHeight: 0,
  startTime: 0,
};

function initBottomSheetGestures() {
  const panel = document.getElementById("detail-panel");
  const handle = document.getElementById("sheet-handle");

  if (!panel || !handle) return;

  // Dotyk začal
  handle.addEventListener(
    "touchstart",
    (e) => {
      sheetState.isDragging = true;
      sheetState.startY = e.touches[0].clientY;
      // Získáme aktuální transform hodnotu (pokud nějaká je)
      const style = window.getComputedStyle(panel);
      const matrix = new WebKitCSSMatrix(style.transform);
      sheetState.currentY = matrix.m42;
      sheetState.panelHeight = panel.offsetHeight;
      sheetState.startTime = Date.now();

      // Vypneme animace pro okamžitou reakci na prst
      panel.classList.remove("sheet-transition");
    },
    { passive: false },
  );

  // Dotyk se hýbe
  document.addEventListener(
    "touchmove",
    (e) => {
      if (!sheetState.isDragging) return;

      const deltaY = e.touches[0].clientY - sheetState.startY;
      let newY = sheetState.currentY + deltaY;

      // Omezení (nemůžeme táhnout výš než top obrazovky)
      if (newY < 0) newY = 0; // Top stop

      panel.style.transform = `translateY(${newY}px)`;

      // Zabráníme scrollování stránky na pozadí
      if (e.cancelable) e.preventDefault();
    },
    { passive: false },
  );

  // Dotyk skončil - Snap Logic
  document.addEventListener("touchend", (e) => {
    if (!sheetState.isDragging) return;
    sheetState.isDragging = false;

    // Zapneme zpět animaci pro hladké dojetí
    panel.classList.add("sheet-transition");
    panel.style.transform = ""; // Vyčistíme inline style, použijeme třídy nebo JS logiku

    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - sheetState.startY;
    const time = Date.now() - sheetState.startTime;
    const velocity = Math.abs(deltaY / time);
    const windowHeight = window.innerHeight;

    // Kde se prst pustil? (Relativně k oknu)
    const releasePoint = endY;

    // --- SNAP POINT LOGIC ---
    // Definice bodů (v pixelech od shora)
    const pointFull = windowHeight * 0.1; // 90% výšky panelu (10% odshora)
    const pointHalf = windowHeight * 0.5; // 50% výšky
    const pointClosed = windowHeight; // Zavřeno

    // Rychlý švih (Swipe)
    if (velocity > 0.5) {
      if (deltaY > 0) {
        // Švih dolů -> Zavřít
        closeDetailPanel();
      } else {
        // Švih nahoru -> Fullscreen
        setPanelPosition("full");
      }
    } else {
      // Pomalé tažení -> Najít nejbližší bod
      if (releasePoint < windowHeight * 0.35) {
        setPanelPosition("full");
      } else if (releasePoint > windowHeight * 0.75) {
        closeDetailPanel();
      } else {
        setPanelPosition("half");
      }
    }
  });
}

function setPanelPosition(mode) {
  const panel = document.getElementById("detail-panel");
  const content = document.getElementById("detail-content"); // Obsahová část
  const handle = document.getElementById("sheet-handle"); // Horní lišta pro tažení

  if (!panel || !content) return;

  // Zapneme animaci
  panel.style.transition = "transform 0.4s cubic-bezier(0.1, 0.7, 0.1, 1)";

  // Získáme rozměry
  const panelTotalHeight = panel.offsetHeight; // Celková fyzická výška panelu (85vh)
  const windowH = window.innerHeight;

  if (mode === "full") {
    // FULL: Panel vyjede úplně nahoru
    panel.style.transform = `translateY(0px)`;
  } else if (mode === "half") {
    // --- UPRAVENÁ LOGIKA (Desktop vs Mobil) ---

    // 1. DESKTOP (šířka nad 768px):
    // Na PC chceme panel zobrazit normálně (translateY 0),
    // protože jsme v CSS nastavili 'height: auto', takže se výška přizpůsobí obsahu sama.
    if (window.innerWidth > 768) {
      panel.style.transform = `translateY(0px)`;
    }
    // 2. MOBIL:
    // Tady musíme počítat posun (translateY), protože panel má fixní výšku (85vh)
    // a my ho chceme vysunout jen kousek.
    else {
      const handleHeight = handle ? handle.offsetHeight : 40;
      const realContentHeight = content.scrollHeight + handleHeight + 20; // +20px rezerva

      // Stanovíme maximální povolenou výšku (např. 55 % obrazovky)
      const maxAllowedHeight = windowH * 0.55;

      // Vybereme to menší číslo (buď podle obsahu, nebo max povolenou výšku)
      const targetVisibleHeight = Math.min(realContentHeight, maxAllowedHeight);

      // Výpočet posunu: Celková výška panelu mínus to, co chceme vidět
      let translation = panelTotalHeight - targetVisibleHeight;

      // Aplikace posunu
      panel.style.transform = `translateY(${Math.max(0, translation)}px)`;
    }
  } else {
    // CLOSE: Schovat dolů
    panel.style.transform = `translateY(100%)`;
  }

  triggerHaptic("light");
}

// Upravená funkce selectLocation pro inicializaci na "Half" snap
// Tuto funkci musíš zavolat uvnitř své existující selectLocation na konci
function snapToHalf() {
  const panel = document.getElementById("detail-panel");
  if (panel) {
    panel.classList.add("sheet-transition");
    setPanelPosition("half");
  }
}

// --- SIDEBAR SWIPE GESTURES ---
// --- GESTURES STATE FLAGS ---
var isSidebarGesturesInit = window.isSidebarGesturesInit || false;
// Poznámka: BottomSheet se inicializuje pokaždé znovu, protože jeho DOM se maže,
// ale Sidebar je v DOMu trvale, ten nesmíme inicializovat víckrát!

function initSidebarGestures() {
  if (isSidebarGesturesInit) return; // UŽ BĚŽÍ -> STOP

  let touchStartX = 0;
  const triggerZone = 40;

  document.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  });

  document.addEventListener("touchend", (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX;
    const sidebar = document.getElementById("sidebar-wrapper");
    const overlay = document.getElementById("mobile-overlay");

    // Swipe Doprava
    if (diff > 80 && touchStartX < triggerZone) {
      if (sidebar && sidebar.classList.contains("-translate-x-full")) {
        sidebar.classList.remove("-translate-x-full");
        if (overlay) overlay.classList.remove("hidden");
        triggerHaptic("medium");
      }
    }

    // Swipe Doleva
    if (diff < -80) {
      if (sidebar && !sidebar.classList.contains("-translate-x-full")) {
        sidebar.classList.add("-translate-x-full");
        if (overlay) overlay.classList.add("hidden");
        triggerHaptic("light");
      }
    }
  });

  isSidebarGesturesInit = true; // Značka: Hotovo
  console.log("Sidebar gestures initialized.");
}

// Pomocná funkce na odstranění diakritiky (aby "čaj" našel "caj")
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// --- SMART SEARCH LOGIC ---

function expandSearchQuery(query) {
  const normQuery = normalizeText(query);
  let terms = [normQuery];

  // Projdi synonyma a pokud najdeš shodu, přidej klíčovou kategorii
  for (const [category, words] of Object.entries(searchSynonyms)) {
    if (
      words.some((w) => normalizeText(w).includes(normQuery)) ||
      category.includes(normQuery)
    ) {
      terms.push(category);
    }
  }
  return terms;
}

function highlightText(text, query) {
  if (!query) return text;
  const normText = normalizeText(text);
  const normQuery = normalizeText(query);

  // Jednoduchý highlight - najde index a obalí originální text
  const index = normText.indexOf(normQuery);
  if (index >= 0) {
    const originalPart = text.substring(index, index + query.length);
    return (
      text.substring(0, index) +
      `<span class="bg-[#faa61a] text-black font-bold px-0.5 rounded">${originalPart}</span>` +
      text.substring(index + query.length)
    );
  }
  return text;
}

function renderGlobalSearch(rawValue) {
  const container = document.getElementById("messages-container");
  const query = rawValue.trim();

  if (!query) {
    // Pokud smažeš hledání, vrať se na aktuální kanál
    switchChannel(state.currentChannel);
    return;
  }

  const terms = expandSearchQuery(query); // Rozšíříme o synonyma
  const searchRegex = new RegExp(terms.join("|"), "i"); // Regex pro hledání
  const normalize = (str) => normalizeText(str || "");

  // 1. HLEDÁNÍ V KANÁLECH
  const channels = [
    { id: "welcome", name: "Uvítání", icon: "fa-door-open" },
    { id: "timeline", name: "Timeline", icon: "fa-history" },
    {
      id: "dateplanner",
      name: "Plánovač rande",
      icon: "fa-map-marked-alt",
    },
    { id: "movies", name: "Filmy", icon: "fa-film" },
    { id: "series", name: "Seriály", icon: "fa-tv" },
    { id: "games", name: "Hry", icon: "fa-gamepad" },
  ];
  const foundChannels = channels.filter((c) =>
    terms.some((t) => normalize(c.name).includes(t)),
  );

  // 2. HLEDÁNÍ V KNIHOVNĚ (Filmy, Hry...)
  let foundLibrary = [];
  Object.keys(library).forEach((cat) => {
    library[cat].forEach((item) => {
      // Hledáme v názvu, kategorii a synonymech kategorie
      if (
        terms.some(
          (t) =>
            normalize(item.title).includes(t) ||
            normalize(item.cat).includes(t),
        )
      ) {
        foundLibrary.push({ ...item, type: cat }); // Přidáme typ pro rozlišení
      }
    });
  });

  // 3. HLEDÁNÍ V MÍSTECH (Date Planner)
  const foundPlaces = dateLocations.filter((loc) =>
    terms.some(
      (t) =>
        normalize(loc.name).includes(t) ||
        normalize(loc.desc).includes(t) ||
        normalize(loc.cat).includes(t),
    ),
  );

  // --- VYKRESLENÍ VÝSLEDKŮ ---
  let html = `<div class="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">`;

  html += `<h2 class="text-2xl font-bold text-white mb-4 border-b border-gray-700 pb-2">
                              🔍 Výsledky pro: <span class="text-[#5865F2]">"${query}"</span>
                           </h2>`;

  if (
    foundChannels.length === 0 &&
    foundLibrary.length === 0 &&
    foundPlaces.length === 0
  ) {
    html += `<div class="text-center text-gray-500 py-10 text-lg">Nic jsme nenašli... zkus jiné slovo (třeba "hlad" nebo "les") 🤷‍♂️</div>`;
  }

  // A) KANÁLY
  if (foundChannels.length > 0) {
    html += `<div><h3 class="text-gray-400 font-bold uppercase text-xs mb-3">Kanály</h3><div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">`;
    foundChannels.forEach((c) => {
      html += `
                              <div onclick="switchChannel('${c.id
        }')" class="bg-[#2f3136] p-3 rounded flex items-center gap-3 cursor-pointer hover:bg-[#40444b] border border-[#202225] hover:border-[#5865F2] transition">
                                  <div class="w-8 h-8 rounded-full bg-[#202225] flex items-center justify-center text-[#b9bbbe]"><i class="fas ${c.icon
        }"></i></div>
                                  <span class="font-bold text-gray-200">${highlightText(
          c.name,
          query,
        )}</span>
                              </div>`;
    });
    html += `</div></div>`;
  }

  // B) MÍSTA (DATE PLANNER)
  if (foundPlaces.length > 0) {
    html += `<div><h3 class="text-gray-400 font-bold uppercase text-xs mb-3">Místa na rande</h3><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">`;
    foundPlaces.forEach((loc) => {
      // Trik: switchChannel na planner a pak selectLocation
      html += `
                              <div onclick="switchChannel('dateplanner'); setTimeout(() => selectLocation(${loc.id
        }), 100);" class="bg-[#2f3136] p-3 rounded flex gap-3 cursor-pointer hover:bg-[#40444b] border border-[#202225] hover:border-[#3ba55c] transition group">
                                  <div class="text-2xl pt-1">${loc.cat === "food"
          ? "🍔"
          : loc.cat === "view"
            ? "🔭"
            : "📍"
        }</div>
                                  <div>
                                      <div class="font-bold text-white group-hover:underline">${highlightText(
          loc.name,
          query,
        )}</div>
                                      <div class="text-xs text-gray-400">${highlightText(
          loc.desc,
          query,
        )}</div>
                                  </div>
                              </div>`;
    });
    html += `</div></div>`;
  }

  // C) KNIHOVNA (FILMY, HRY)
  if (foundLibrary.length > 0) {
    html += `<div><h3 class="text-gray-400 font-bold uppercase text-xs mb-3">Knihovna</h3><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">`;
    foundLibrary.forEach((item) => {
      html += `
                              <div onclick="switchChannel('${item.type === "games"
          ? "games"
          : item.type === "series"
            ? "series"
            : "movies"
        }')" class="bg-[#2f3136] rounded p-2 hover:bg-[#40444b] transition cursor-pointer border border-[#202225] hover:border-[#faa61a] flex flex-col items-center text-center">
                                  <div class="text-4xl mb-2">${item.icon}</div>
                                  <div class="font-bold text-white text-xs">${highlightText(
          item.title,
          query,
        )}</div>
                                  <div class="text-[10px] text-gray-500 mt-1">${item.cat
        }</div>
                              </div>`;
    });
    html += `</div></div>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function triggerConfetti() {
  var duration = 3 * 1000;
  var animationEnd = Date.now() + duration;
  var defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
  };

  function randomInOut(min, max) {
    return Math.random() * (max - min) + min;
  }

  var interval = setInterval(function () {
    var timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    var particleCount = 50 * (timeLeft / duration);

    // Konfety padají náhodně ze dvou stran
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInOut(0.1, 0.3), y: Math.random() - 0.2 },
      }),
    );
    confetti(
      Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInOut(0.7, 0.9), y: Math.random() - 0.2 },
      }),
    );
  }, 250);

  showNotification("🎉 LÁSKA DETEKOVÁNA! 🎉", "success");
}

// --- GLOBAL STATE ---
const state = {
  tetris: JSON.parse(localStorage.getItem('klarka_tetris_score')) || { myval: 0, sova: 0 },
  currentChannel: "welcome",
  topicProgress:
    JSON.parse(localStorage.getItem("klarka_topic_progress")) || {},
  topicBookmarks:
    JSON.parse(localStorage.getItem("klarka_topic_bookmarks")) || {},
  schoolEvents: JSON.parse(localStorage.getItem("klarka_school")) || {},
  calendarFilter: "all",
  isViewingBookmarks: false, // Přepínač, zda prohlížíme jen uložené
  currentTopicId: null,
  currentQuestionIndex: null,
  isViewingBookmarks: false,
  topicSessionHistory: [], // Ukládá indexy otázek v aktuálním sezení [1, 5, 12...]
  pendingResetId: null, // ID kategorie, kterou chceme resetovat
  currentDownload: null,
  startDate: "2025-12-24", // ⚠️ ZMĚŇ NA VAŠE SKUTEČNÉ DATUM (YYYY-MM-DD)
  healthData: JSON.parse(localStorage.getItem("klarka_health")) || {}, // Zde se budou ukládat trackery
  dateFilter: "all",
  mapInstance: null,
  quizAnswers: JSON.parse(localStorage.getItem("klarka_quiz")) || {
    score: 0,
    completed: false,
  },
  watchlist: JSON.parse(localStorage.getItem("klarka_watchlist")) || [],
  route: [],
  ratings: JSON.parse(localStorage.getItem("klarka_ratings")) || {},
  dateRatings: JSON.parse(localStorage.getItem("klarka_date_ratings")) || {},
  watchHistory: JSON.parse(localStorage.getItem("klarka_watch_history")) || {},
};



// DATA

// --- MOBILE MENU LOGIC ---
function toggleMobileMenu() {
  const sidebar = document.getElementById("sidebar-wrapper");
  const overlay = document.getElementById("mobile-overlay");

  // Zkontrolujeme, jestli je menu skryté
  const isClosed = sidebar.classList.contains("-translate-x-full");

  if (isClosed) {
    // Otevřít (odstraníme posunutí mimo obrazovku)
    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
  } else {
    // Zavřít (vrátíme posunutí mimo obrazovku)
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }
}

function toggleUserPopout() {
  const popout = document.getElementById("user-popout");
  popout.classList.toggle("active");

  if (popout.classList.contains("active")) {
    // Přidáme listener s malým zpožděním, aby se nezavřel hned tím samým kliknutím
    setTimeout(() => {
      document.addEventListener("click", closePopoutOutside);
    }, 100);
  }
}

function closePopoutOutside(e) {
  const popout = document.getElementById("user-popout");
  // Pokud kliknutí nebylo uvnitř popoutu a ani na spodní liště
  if (!e.target.closest(".user-popout") && !e.target.closest(".h-\\[52px\\]")) {
    popout.classList.remove("active");
    document.removeEventListener("click", closePopoutOutside);
  }
}

function verifyLocation() {
  const btn = document.getElementById("verify-btn");
  const status = document.getElementById("verify-status");
  const text = document.getElementById("verify-text");
  btn.disabled = true;
  btn.classList.add("opacity-75", "cursor-not-allowed");
  text.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Ověřování...';
  status.classList.remove("hidden");
  const steps = [
    "📡 Připojování k satelitu...",
    "📍 Triangulace pozice...",
    "❌ Podolí... 404 Not Found",
    "✅ Kunovice... NALEZENO",
  ];
  let i = 0;
  const interval = setInterval(() => {
    if (i < steps.length) {
      const div = document.createElement("div");
      div.className =
        i === 2
          ? "text-red-400"
          : i === 3
            ? "text-green-400 font-bold"
            : "text-gray-400";
      div.innerHTML = steps[i];
      status.appendChild(div);
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => {
        document.getElementById("login-screen").style.display = "none";
        showQuiz();
      }, 1000);
    }
  }, 800);
}

function changeTheme(theme) {
  const root = document.documentElement;
  const body = document.body;

  // Clear any existing inline styles or classes
  body.style.fontFamily = "";
  body.style.fontSize = "";
  body.classList.remove('theme-valentines');

  console.log(`[Theme] Switching to: ${theme}`);

  if (theme === "christmas") {
    root.style.setProperty("--bg-tertiary", "#420d0d");
    root.style.setProperty("--bg-secondary", "#5c1414");
    root.style.setProperty("--bg-primary", "#240a0a");
    root.style.setProperty("--blurple", "#c92a2a"); // Red
    root.style.setProperty("--green", "#ffd700"); // Gold
    root.style.setProperty("--text-header", "#ffffff");
    root.style.setProperty("--interactive-active", "#ffffff");
    root.style.setProperty("--interactive-normal", "#e8e8e8"); // Lighter text
    root.style.setProperty("--text-normal", "#f0f0f0");
  } else if (theme === "tetris") {
    root.style.setProperty("--bg-tertiary", "#0d0e15");
    root.style.setProperty("--bg-secondary", "#151620");
    root.style.setProperty("--bg-primary", "#1c1d29");
    root.style.setProperty("--blurple", "#00e5ff");
    root.style.setProperty("--green", "#69f0ae");
    root.style.setProperty("--red", "#ff5252");
    root.style.setProperty("--yellow", "#ffd740");
    root.style.setProperty("--pink", "#e040fb");
    root.style.setProperty("--text-normal", "#33ff00");
    root.style.setProperty("--interactive-normal", "#33ff00");
    body.style.fontFamily = "'Press Start 2P', cursive";
    body.style.fontSize = "0.8rem";
  } else if (theme === "valentines") {
    // Force CSS variables on root
    root.style.setProperty("--bg-tertiary", "#2d0a12");
    root.style.setProperty("--bg-secondary", "#4a101e");
    root.style.setProperty("--bg-primary", "#6d2232");
    root.style.setProperty("--blurple", "#ff69b4"); // Hot pink
    root.style.setProperty("--green", "#00ff00"); // Lime green (ironic)
    root.style.setProperty("--red", "#ff0000");
    root.style.setProperty("--yellow", "#ffff00");
    root.style.setProperty("--pink", "#ff1493");
    root.style.setProperty("--text-normal", "#ffd1dc");
    root.style.setProperty("--interactive-normal", "#fab1c6");

    // Force font family via style AND class for redundancy
    body.style.fontFamily = "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif";
    body.classList.add('theme-valentines');
  } else {
    // Default / Reset
    root.style.setProperty("--bg-tertiary", "#202225");
    root.style.setProperty("--bg-secondary", "#2f3136");
    root.style.setProperty("--bg-primary", "#36393f");
    root.style.setProperty("--blurple", "#5865F2");
    root.style.setProperty("--green", "#3ba55c");
    root.style.setProperty("--red", "#ed4245");
    root.style.setProperty("--yellow", "#faa61a");
    root.style.setProperty("--pink", "#eb459e");
    root.style.setProperty("--text-normal", "#dcddde");
    root.style.setProperty("--interactive-normal", "#b9bbbe");
  }
  showNotification(`Téma změněno: ${theme}`, "success");
}

// --- QUIZ ---
function showQuiz() {
  document.getElementById("quiz-screen").style.display = "flex";
  loadQuizQuestion(0);
}
function loadQuizQuestion(index) {
  const container = document.getElementById("quiz-container");
  const progress = (index / quizQuestions.length) * 100;
  document.getElementById("quiz-progress").style.width = `${progress}%`;
  document.getElementById("quiz-step-text").innerText = `${index + 1}/${quizQuestions.length
    }`;
  if (index >= quizQuestions.length) {
    finishQuiz();
    return;
  }
  const q = quizQuestions[index];
  container.innerHTML = `<div class="mb-10 text-center"><h3 class="text-white font-extrabold text-2xl leading-relaxed">${q.question}</h3></div><div id="quiz-options" class="flex flex-col gap-4"><button onclick="answerQuiz(${index}, true)" class="w-full bg-[#2f3136] hover:bg-[#3ba55c] text-left px-4 py-4 rounded border border-[#202225] hover:border-[#3ba55c] transition flex items-center group"><div class="w-6 h-6 rounded-full border-2 border-gray-500 group-hover:border-white mr-3 flex items-center justify-center"></div><span class="text-gray-300 group-hover:text-white font-medium text-lg">FAKT</span></button><button onclick="answerQuiz(${index}, false)" class="w-full bg-[#2f3136] hover:bg-[#ed4245] text-left px-4 py-4 rounded border border-[#202225] hover:border-[#ed4245] transition flex items-center group"><div class="w-6 h-6 rounded-full border-2 border-gray-500 group-hover:border-white mr-3 flex items-center justify-center"></div><span class="text-gray-300 group-hover:text-white font-medium text-lg">MÝTUS</span></button></div><div id="quiz-result-feedback" class="hidden mt-4 pt-4 border-t border-[#36393f]"></div>`;
  document.getElementById("fun-fact-container").style.display = "block";
  document.getElementById("fun-fact-text").innerText = getUniqueFunFact();
}
function answerQuiz(index, answer) {
  const q = quizQuestions[index];
  const correct = answer === q.correct;
  if (!state.quizAnswers.completed && correct) state.quizAnswers.score += 10;
  document.getElementById("quiz-options").style.display = "none";
  const feedback = document.getElementById("quiz-result-feedback");
  feedback.innerHTML = `
                      <div class="mb-6 p-4 bg-[#202225] rounded-lg border-l-4 ${correct ? "border-green-500" : "border-red-500"
    }">
                          <h4 class="${correct ? "text-green-400" : "text-red-400"
    } font-bold text-xl mb-2 flex items-center">
                              <i class="fas ${correct ? "fa-check-circle" : "fa-times-circle"
    } mr-2"></i>
                              ${correct ? "Správně!" : "Ups!"}
                          </h4>
                          <p class="text-white text-lg leading-relaxed mt-2">${q.explanation
    }</p>
                      </div>
                      <button onclick="loadQuizQuestion(${index + 1
    })" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-lg font-bold text-xl shadow-md transition transform hover:scale-[1.02]">
                          ${index + 1 < quizQuestions.length
      ? "Další otázka ➜"
      : "Dokončit 🎉"
    }
                      </button>
                  `;
  feedback.classList.remove("hidden");
}
function finishQuiz() {
  state.quizAnswers.completed = true;
  localStorage.setItem("klarka_quiz", JSON.stringify(state.quizAnswers));
  document.getElementById("quiz-screen").style.display = "none";
  document.getElementById("quiz-score").textContent =
    `${state.quizAnswers.score}%`;
  document.getElementById("cert-date").textContent =
    new Date().toLocaleDateString("cs-CZ");
  document.getElementById("certificate-screen").style.display = "flex";
}

// --- APP NAVIGATION ---
function showMainApp() {
  const app = document.getElementById("app-interface");
  app.classList.remove("hidden");
  setTimeout(() => app.classList.remove("opacity-0"), 10);

  renderChannels();
  switchChannel("dashboard");

  setTimeout(updateBookmarkCounter, 0);
  initSidebarGestures();
}

// --- HEALTH TRACKER LOGIC ---

// Získá klíč pro dnešní datum (formát YYYY-MM-DD podle lokálního času)
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

// Načte data pro dnešek (nebo vytvoří prázdná)
function getTodayData() {
  const key = getTodayKey();
  if (!state.healthData[key]) {
    state.healthData[key] = {
      water: 0,
      sleep: null,
      period: false,
      mood: null,
      movement: [], // NOVÉ: Pole pro typy pohybu (např. ['gym', 'walk'])
    };
  }
  // Fix pro starší data, která nemusí mít movement array
  if (!state.healthData[key].movement) state.healthData[key].movement = [];

  return state.healthData[key];
}

// Hlavní funkce pro aktualizaci (volá se při kliknutí na widget)
function updateHealth(type, value) {
  const key = getTodayKey();
  const data = getTodayData();

  // 1. LOGIKA DAT
  if (type === "water") {
    if (data.water === value) data.water = value - 1;
    else data.water = value;
  } else if (type === "period") {
    data.period = !data.period;
  } else if (type === "movement") {
    // Logika pro pole (Multi-select)
    if (data.movement.includes(value)) {
      data.movement = data.movement.filter((item) => item !== value); // Odebrat
    } else {
      data.movement.push(value); // Přidat
    }
  } else if (type === "mood") {
    if (data.mood === value) data.mood = null;
    else data.mood = value;
  } else {
    data.sleep = value;
  }

  // Uložení
  state.healthData[key] = data;
  localStorage.setItem("klarka_health", JSON.stringify(state.healthData));
  triggerHaptic("light");

  // 2. VISUAL UPDATE (Bez refreshe)
  if (type === "water") {
    const container = document.getElementById("water-container");
    const counter = document.getElementById("water-count");
    if (container) container.innerHTML = generateWaterIcons(data.water);
    if (counter) counter.innerText = `${data.water}/8`;
  } else if (type === "mood") {
    const container = document.getElementById("mood-container");
    if (container) container.innerHTML = generateMoodSlider(data.mood); // DONE: Použití nového slideru
  } else if (type === "sleep") {
    const container = document.getElementById("sleep-container");
    if (container) container.innerHTML = generateSleepButtons(data.sleep);
  } else if (type === "movement") {
    const container = document.getElementById("movement-container");
    if (container) container.innerHTML = generateMovementChips(data.movement);
  } else if (type === "period") {
    const btn = document.getElementById("period-btn");
    if (btn) {
      if (data.period) {
        btn.className =
          "w-20 bg-[#2f3136] rounded-xl shadow-xl border cursor-pointer transition-all flex flex-col items-center justify-center p-2 gap-1 group hover:bg-[#36393f] border-[#ed4245] bg-[#ed4245]/10";
        btn.querySelector("div").className =
          "text-2xl transition-transform group-hover:scale-110 text-[#ed4245] drop-shadow-[0_0_5px_rgba(237,66,69,0.5)]";
        btn.querySelector("span").className =
          "text-[9px] font-bold uppercase text-[#ed4245]";
        btn.querySelector("span").innerText = "On";
      } else {
        btn.className =
          "w-20 bg-[#2f3136] rounded-xl shadow-xl border cursor-pointer transition-all flex flex-col items-center justify-center p-2 gap-1 group hover:bg-[#36393f] border-[#202225]";
        btn.querySelector("div").className =
          "text-2xl transition-transform group-hover:scale-110 text-gray-600";
        btn.querySelector("span").className =
          "text-[9px] font-bold uppercase text-gray-500";
        btn.querySelector("span").innerText = "Off";
      }
    }
  }
}

// Funkce pro ukládání poznámky (volá se onblur)
function saveDailyNote(text) {
  const key = getTodayKey();
  const data = getTodayData();
  data.note = text;

  state.healthData[key] = data;
  localStorage.setItem("klarka_health", JSON.stringify(state.healthData));
  // Zde není třeba vizuální update, text už tam je
}

function getHealthWidgetsHTML() {
  const data = getTodayData();

  // --- 1. WIDGET: VODA (Kapky) ---
  let waterHtml =
    '<div class="flex justify-between items-center bg-[#202225] p-3 rounded-lg border border-[#2f3136] mb-3">';
  waterHtml +=
    '<div class="text-xs font-bold text-gray-400 uppercase mr-2"><i class="fas fa-tint text-[#00e5ff] mr-1"></i> Voda</div><div class="flex gap-1">';

  for (let i = 1; i <= 8; i++) {
    const isActive = i <= data.water;
    const colorClass = isActive
      ? "text-[#00e5ff] scale-110 drop-shadow-md"
      : "text-gray-600 hover:text-gray-500";

    waterHtml += `
                  <button onclick="updateHealth('water', ${i})" class="transition-all duration-200 ${colorClass} text-xl p-1">
                      <i class="${isActive ? "fas" : "far"} fa-tint"></i>
                  </button>
              `;
  }
  waterHtml += "</div></div>";

  // --- 2. WIDGET: SPÁNEK (Slider 0-12h) ---
  const sleepValue = typeof data.sleep === "number" ? data.sleep : 0; // Default 0 if undefined or old string
  const sleepColor = getSleepColor(sleepValue);
  const sleepText =
    sleepValue === 0
      ? "Kolik jsme toho naspali?"
      : `${sleepValue} hod <span class="text-xs opacity-70">(${sleepColor.label})</span>`;

  let sleepHtml = `
      <div class="mb-3 bg-[#202225] p-3 rounded-lg border border-[#2f3136] relative overflow-hidden">
          <div class="flex justify-between items-center mb-2">
               <div class="text-xs font-bold text-gray-400 uppercase"><i class="fas fa-bed text-[#9b59b6] mr-1"></i> Spánek</div>
               <div class="font-bold text-sm ${sleepColor.class
    }" id="sleep-value-text">${sleepText}</div>
          </div>
          
          <input type="range" min="0" max="12" step="0.5" value="${sleepValue}" 
              oninput="updateSleep(this.value)" 
              class="w-full h-2 bg-[#2f3136] rounded-lg appearance-none cursor-pointer slider-thumb-pink"
              style="background: linear-gradient(to right, ${sleepColor.hex
    } 0%, ${sleepColor.hex
    } ${(sleepValue / 12) * 100}%, #2f3136 ${(sleepValue / 12) * 100}%, #2f3136 100%);">
          
          <div class="flex justify-between text-[10px] text-gray-600 mt-1 font-mono">
              <span>0h</span><span>4h</span><span>8h</span><span>12h+</span>
          </div>

          <!-- BEDTIME INPUT -->
          <div class="mt-4 pt-3 border-t border-[#2f3136] flex items-center gap-2">
              <div class="flex-1">
                  <label class="text-[9px] uppercase font-bold text-gray-500 mb-1 block">V kolik jdu spát?</label>
                  <input type="time" value="${data.bedtime || ""
    }" onchange="updateBedtime(this.value)" class="bg-[#2f3136] text-white text-xs p-1.5 rounded border border-[#202225] w-full focus:border-[#9b59b6] outline-none">
              </div>
              <button onclick="setBedtimeNow()" class="mt-3 bg-[#2f3136] hover:bg-[#9b59b6] text-gray-400 hover:text-white p-2 rounded border border-[#202225] transition active:scale-95" title="Jdu spát TEĎ">
                  <i class="fas fa-moon"></i>
              </button>
          </div>
      </div>
  `;

  // --- 3. WIDGET: PERIODA & HLOUBKA ---
  const periodActive = data.period;
  let extraHtml = '<div class="grid grid-cols-2 gap-2">';

  // Tlačítko Perioda
  extraHtml += `
              <button onclick="updateHealth('period', null)" class="flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200 ${periodActive
      ? "bg-[#ed4245]/10 border-[#ed4245] text-[#ed4245]"
      : "bg-[#202225] border-transparent text-gray-400 hover:text-white"
    }">
                  <i class="fas fa-tint"></i>
                  <span class="text-xs font-bold uppercase">${periodActive ? "Své dny: ANO" : "Své dny"
    }</span>
              </button>
          `;

  // Tlačítko Hloubka
  extraHtml += `
              <button onclick="switchChannel('topics')" class="flex items-center justify-center gap-2 p-3 rounded-lg border border-transparent bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136] transition-all">
                  <i class="fas fa-heart"></i>
                  <span class="text-xs font-bold uppercase">Hloubka</span>
              </button>
          `;
  extraHtml += "</div>";

  // --- 4. WIDGET: NÁLADA ---
  let moodHtml =
    '<div class="mt-3 bg-[#202225] p-3 rounded-lg border border-[#2f3136]"><div class="text-xs font-bold text-gray-400 uppercase mb-2">Nálada</div><div class="flex justify-between px-2">';
  const moods = [
    { id: "happy", icon: "🥰" },
    { id: "tired", icon: "😴" },
    { id: "sad", icon: "😢" },
    { id: "angry", icon: "😡" },
    { id: "horny", icon: "😈" },
  ];

  moods.forEach((m) => {
    const isActive = data.mood === m.id;
    const style = isActive
      ? "scale-125 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      : "opacity-50 hover:opacity-100 hover:scale-110";
    moodHtml += `<button onclick="updateHealth('mood', '${m.id}')" class="text-2xl transition-all duration-200 ${style}">${m.icon}</button>`;
  });
  moodHtml += "</div></div>";

  // Teprve teď vrátíme vše dohromady
  return waterHtml + sleepHtml + extraHtml + moodHtml;
}

function renderChannels() {
  const container = document.getElementById("channels-container");
  container.innerHTML = `
          <div class="px-2 mb-2 mt-2">
              <div onclick="switchChannel('dashboard')" class="channel-item px-2 py-2 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-3 cursor-pointer group transition-all duration-200">
                  <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#eb459e] to-[#5865F2] flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
                      <i class="fas fa-heart"></i>
                  </div>
                  <div class="font-bold text-white group-hover:text-[#eb459e] transition-colors">Můj Den</div>
              </div>
          </div>

          <div class="px-2 mb-4">
               <div onclick="switchChannel('calendar')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-calendar-alt text-[#faa61a]"></i>
                  <span class="font-bold">Kalendář</span>
              </div>
          </div>

          <div class="px-2 mb-4">
              <div class="flex justify-between px-2 text-xs font-bold text-[var(--interactive-normal)] uppercase mb-1">Social</div>

              <div onclick="switchChannel('welcome')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-door-open text-gray-500"></i> uvítání
              </div>

              <div onclick="switchChannel('music')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-music text-[#1DB954]"></i> music-bot
              </div>
          </div>

          <div class="px-2 mb-4">
              <div class="flex justify-between px-2 text-xs font-bold text-[var(--interactive-normal)] uppercase mb-1">Rande</div>

              <div onclick="switchChannel('dateplanner')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-map-marked-alt text-[#3ba55c]"></i> plánovač
              </div>

              <div onclick="switchChannel('timeline')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-history text-[#eb459e]"></i> timeline
              </div>

              <div onclick="switchChannel('topics')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-comments text-[#faa61a]"></i> témata
              </div>
          </div>

          <div class="px-2 mb-4">
              <div class="flex justify-between px-2 text-xs font-bold text-[var(--interactive-normal)] uppercase mb-1">Knihovna</div>

              <div onclick="switchChannel('watchlist')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-heart text-[#eb459e]"></i> watchlist
              </div>

              <div onclick="switchChannel('movies')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-film text-[#5865F2]"></i> filmy
              </div>

              <div onclick="switchChannel('series')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-tv text-[#5865F2]"></i> seriály
              </div>

              <div onclick="switchChannel('games')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-gamepad text-[#5865F2]"></i> hry
              </div>

              <div onclick="switchChannel('puzzle')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-puzzle-piece text-[#ff69b4]"></i> Puzzle
              </div>

              <div onclick="switchChannel('tetris')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer group">
                  <i class="fas fa-shapes text-[#faa61a] group-hover:rotate-180 transition-transform duration-500"></i> <span class="group-hover:text-[#faa61a] transition-colors">tetris tracker</span>
              </div>
          </div>

          <div class="px-2 mb-4">
              <div class="flex justify-between px-2 text-xs font-bold text-[var(--interactive-normal)] uppercase mb-1">Info</div>

              <div onclick="switchChannel('manual')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-book text-gray-500"></i> návod
              </div>

              <div onclick="switchChannel('upgrade')" class="channel-item px-2 py-1.5 rounded mx-2 mb-1 text-gray-300 hover:bg-[#393c43] flex items-center gap-2 cursor-pointer">
                  <i class="fas fa-file-alt text-gray-500"></i> README.md
              </div>
          </div>
          `;
}

function switchChannel(channel) {
  // --- MOBILNÍ FIX: Zavřít menu ---
  const sidebar = document.getElementById("sidebar-wrapper");
  const overlay = document.getElementById("mobile-overlay");
  if (
    window.innerWidth < 768 &&
    sidebar &&
    !sidebar.classList.contains("-translate-x-full")
  ) {
    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
  }

  // --- CLEANUP MAP (Vylepšeno) ---
  // Pokud odcházíme z plánovače, musíme mapu okamžitě zničit
  if (state.currentChannel === "dateplanner" && channel !== "dateplanner") {
    if (state.mapInstance) {
      state.mapInstance.off(); // Vypne listenery mapy
      state.mapInstance.remove(); // Zničí DOM elementy mapy
      state.mapInstance = null; // Vymaže referenci
    }
  }

  // --- FIX SCROLLOVÁNÍ (Reset kontejneru) ---
  const container = document.getElementById("messages-container");
  // Tady je ta oprava: Vždy resetujeme třídy na "scrollovatelné" nastavení (overflow-y-auto)
  // Funkce renderWelcome() si to pak případně sama přepíše na hidden, pokud bude potřeba.
  container.className =
    "flex-1 overflow-y-auto px-0 py-0 custom-scrollbar flex flex-col bg-[#36393f] relative";
  container.innerHTML = "";

  // Podbarvení aktivního kanálu v menu
  document
    .querySelectorAll(".channel-item")
    .forEach((el) => el.classList.remove("bg-[#393c43]", "text-white"));
  const clicked = Array.from(document.querySelectorAll(".channel-item")).find(
    (el) => el.getAttribute("onclick").includes(channel),
  );
  if (clicked) clicked.classList.add("bg-[#393c43]", "text-white");
  state.currentChannel = channel;

  // Nastavení hlavičky a ikon
  const titles = {
    welcome: "uvítání",
    manual: "návod",
    timeline: "timeline",
    movies: "filmy",
    series: "seriály",
    games: "hry",
    upgrade: "README.md",
    dateplanner: "plánovač",
    topics: "témata k hovoru",
    music: "music-bot",
    puzzle: "Puzzle 🧩",
  };
  const icons = {
    welcome: "fa-door-open",
    manual: "fa-book",
    timeline: "fa-history",
    movies: "fa-film",
    series: "fa-tv",
    games: "fa-gamepad",
    upgrade: "fa-file-alt",
    dateplanner: "fa-map-marked-alt",
    topics: "fa-comments",
    music: "fa-music",
    puzzle: "fa-puzzle-piece",
  };

  const titleText = titles[channel] || channel;
  const iconClass = icons[channel] || "fa-hashtag";

  document.getElementById("channel-name").textContent = titleText;
  document.getElementById("channel-icon").className =
    `fas ${iconClass} text-gray-500 text-xl mr-2`;
  document.getElementById("user-status").textContent =
    channel === "upgrade" ? "Přemýšlí o upgradu" : "Online";

  // Vykreslení obsahu
  if (channel === "welcome") renderWelcome();
  else if (channel === "manual") renderManual();
  else if (channel === "timeline") renderTimeline();
  else if (channel === "dateplanner") renderDatePlanner();
  else if (channel === "tetris") renderTetrisTracker();
  else if (["movies", "series", "games"].includes(channel))
    renderLibrary(channel);
  else if (channel === "watchlist") renderWatchlist();
  else if (channel === "music") renderMusic();
  else if (channel === "topics") renderTopics();
  else if (channel === "puzzle") renderPuzzleGame();
  else if (channel === "upgrade") renderUpgrade();
  else if (channel === "dashboard") {
    // --- 0. INITIAL SETUP & STATE ---

    // Načtení dat aplikace z localStorage
    function loadData() {
      const storedData = localStorage.getItem("klarka_health");
      if (storedData) {
        state.healthData = JSON.parse(storedData);
      }

      const storedPlans = localStorage.getItem("klarka_plans");
      if (storedPlans) {
        state.plannedDates = JSON.parse(storedPlans);
      }

      const storedTimeline = localStorage.getItem("klarka_timeline");
      if (storedTimeline) {
        state.timelineEvents = JSON.parse(storedTimeline);
      }
    }

    // Načtení dat aplikace z localStorage
    loadData();

    // Load sleep session state
    const storedSession = localStorage.getItem('klarka_sleep_session');
    if (storedSession) {
      state.currentSleepSession = JSON.parse(storedSession);
    } else {
      state.currentSleepSession = { startTime: null, isSleeping: false };
    }

    // Vykreslení dashboardu (výchozí)
    renderDashboard();
  }
  else if (channel === "calendar") renderCalendar();

  // Scroll to top pro scrollovací stránky (aby uživatel nezačínal dole)
  if (
    [
      "movies",
      "series",
      "games",
      "manual",
      "timeline",
      "dateplanner",
      "music",
    ].includes(channel)
  ) {
    container.scrollTop = 0;
  }
}

function renderWatchlist() {
  const container = document.getElementById("messages-container");
  const watchlistIDs = state.watchlist || [];

  // Sesbíráme vše
  const allItems = [
    ...(library.movies || []),
    ...(library.series || []),
    ...(library.games || []),
  ];
  const savedItems = allItems.filter((item) =>
    watchlistIDs.some((w) =>
      typeof w === "object" ? w.id === item.id : w === item.id,
    ),
  );

  if (savedItems.length === 0) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500 animate-fade-in"><i class="far fa-heart text-6xl mb-4 opacity-30 text-[#eb459e]"></i><h2 class="text-xl font-bold text-gray-400">Prázdný Watchlist</h2></div>`;
    return;
  }

  let html = `<div class="p-6 pb-20 animate-fade-in"><h2 class="text-2xl font-bold text-white mb-6 border-b border-[#202225] pb-4"><span class="text-[#eb459e]">❤️</span> Watchlist</h2><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">`;

  savedItems.forEach((item) => {
    // Data & Safe Strings
    const safeTitle = (item.title || "").replace(/'/g, "\\'");
    const safeMagnet = (item.magnet || "").replace(/'/g, "\\'");
    const safeGdrive = (item.gdrive || "").replace(/'/g, "\\'");
    const safeTrailer = (item.trailer || "").replace(/'/g, "\\'");
    // Zjistíme typ (pokud má 'cat' a není tam 'game', tipneme film)
    const itemType =
      (item.cat && item.cat.includes("FPS")) || item.cat.includes("RPG")
        ? "game"
        : "movie";

    html += `
      <div id="watchlist-card-${item.id
      }" class="library-card group relative bg-[#2f3136] rounded-xl overflow-hidden border border-[#202225] hover:border-[#eb459e] transition-all duration-300 shadow-lg flex flex-col">

          <button onclick="event.stopPropagation(); toggleWatchlist(${item.id
      })" class="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-[#eb459e] text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition">
              <i class="fas fa-times"></i>
          </button>

          <div class="poster-area h-40 bg-[#202225] flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-500 relative cursor-pointer" onclick="openHistoryModal(${item.id
      })">
              ${item.icon}
          </div>

          <div class="p-3 flex flex-col flex-1">
              <h3 class="font-bold text-white text-sm leading-tight mb-1 truncate">${item.title
      }</h3>

              <div class="mt-auto pt-3 border-t border-[#202225] flex justify-between items-center gap-1">
                  ${item.trailer
        ? `<button onclick="event.stopPropagation(); openTrailer('${safeTrailer}')" class="text-gray-400 hover:text-[#ff0000] p-1.5 rounded transition"><i class="fab fa-youtube"></i></button>`
        : `<div class="w-6"></div>`
      }
                  <button onclick="event.stopPropagation(); openPlanningModal('${safeTitle}', '${itemType}')" class="text-gray-400 hover:text-[#5865F2] p-1.5 rounded transition"><i class="far fa-calendar-plus"></i></button>
                  <button onclick="event.stopPropagation(); openDownloadModal('${safeMagnet}', '${safeGdrive}')" class="text-gray-400 hover:text-[#3ba55c] p-1.5 rounded transition"><i class="fas fa-cloud-download-alt"></i></button>
                  <button onclick="event.stopPropagation(); openHistoryModal(${item.id
      })" class="text-gray-400 hover:text-white p-1.5 rounded transition"><i class="fas fa-info-circle"></i></button>
              </div>
          </div>
      </div>`;
  });
  html += `</div></div>`;
  container.innerHTML = html;
}

function renderWelcome() {
  const container = document.getElementById("messages-container");

  // Nastavíme kontejneru flex, aby se input držel dole
  container.className =
    "flex-1 flex flex-col bg-[#36393f] relative overflow-hidden";

  container.innerHTML = `
                      <div class="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar space-y-6" id="chat-scroller">

                          <div class="message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-1">
                              <div class="flex gap-4 items-start">
                                  <div class="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-sm font-bold mt-1 shadow-lg cursor-pointer hover:opacity-80 transition flex-shrink-0">
                                      <i class="fas fa-robot"></i>
                                  </div>
                                  <div class="flex-1 min-w-0">
                                      <div class="flex items-baseline gap-2">
                                          <span class="font-bold text-[var(--text-header)] cursor-pointer hover:underline">System Bot</span>
                                          <span class="text-[10px] bg-[#5865F2] text-white px-1 rounded uppercase font-bold flex-shrink-0">BOT</span>
                                          <span class="text-xs text-[var(--interactive-normal)]">Dnes v ${new Date().getHours()}:${String(
    new Date().getMinutes(),
  ).padStart(2, "0")}</span>
                                      </div>

                                      <div class="text-[var(--text-normal)] mt-1">
                                          <p class="font-bold text-white text-lg">Vítej zpět, Klárko! 👋</p>
                                          <p class="text-gray-300 text-sm">Server byl úspěšně aktualizován na verzi <code class="bg-[#202225] p-1 rounded text-xs">v2.6 - The Valentine Update</code>.</p>
                                      </div>

                                      <div class="mt-3 border-l-4 border-[#faa61a] bg-[#2f3136] rounded p-4 max-w-2xl shadow-sm">
                                          <h3 class="text-white font-bold text-sm mb-3 flex items-center gap-2">
                                              <i class="fas fa-sparkles text-[#faa61a]"></i> Co je nového?
                                          </h3>

                                          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                              <div class="flex gap-3">
                                                  <div class="text-2xl">📊</div>
                                                  <div>
                                                      <div class="font-bold text-gray-200 text-xs uppercase">Nový Dashboard</div>
                                                      <p class="text-xs text-gray-400">Vylepšený sledovač spánku, nálady a nový Tetris widget.</p>
                                                  </div>
                                              </div>

                                              <div class="flex gap-3">
                                                  <div class="text-2xl">🧩</div>
                                                  <div>
                                                      <div class="font-bold text-gray-200 text-xs uppercase">Hry & Zábava</div>
                                                      <p class="text-xs text-gray-400">Přidán Tetris Tracker a Love Puzzle minihra jako nové kanály.</p>
                                                  </div>
                                              </div>

                                              <div class="flex gap-3">
                                                  <div class="text-2xl">🗺️</div>
                                                  <div>
                                                      <div class="font-bold text-gray-200 text-xs uppercase">Vylepšený Plánovač</div>
                                                      <p class="text-xs text-gray-400">Mapka nyní ukazuje fotky z Timeline a vodítka pro Treasure Hunt.</p>
                                                  </div>
                                              </div>

                                              <div class="flex gap-3">
                                                  <div class="text-2xl">💖</div>
                                                  <div>
                                                      <div class="font-bold text-gray-200 text-xs uppercase">Valentýnský Mód</div>
                                                      <p class="text-xs text-gray-400">Speciální růžové téma s přepínačem nahoře v liště! 👆</p>
                                                  </div>
                                              </div>
                                          </div>

                                          <div class="mt-4 pt-3 border-t border-[#3f4147] flex justify-between items-center">
                                              <div class="text-[10px] text-gray-400">Patch ID: #ILOVEYOU-3000</div>
                                              <button onclick="switchChannel('dateplanner')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 py-1 rounded text-xs font-bold transition">
                                                  Vyzkoušet hned
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-1" style="animation-delay: 0.1s">
                               <div class="flex gap-4 items-start">
                                  <div class="w-10 h-10 rounded-full bg-[#faa61a] flex items-center justify-center text-white text-lg font-bold mt-1 shadow-lg cursor-pointer hover:opacity-80 transition flex-shrink-0">
                                      🦉
                                  </div>
                                  <div class="flex-1 min-w-0">
                                      <div class="flex items-baseline gap-2">
                                          <span class="font-bold text-[var(--text-header)] cursor-pointer hover:underline">Owl of Wisdom</span>
                                          <span class="text-[10px] bg-[#5865F2] text-white px-1 rounded uppercase font-bold flex-shrink-0">BOT</span>
                                          <span class="text-xs text-[var(--interactive-normal)]">Právě teď</span>
                                      </div>
                                      <div class="text-[var(--text-normal)] mt-1">
                                          <p class="text-sm">Klikni níže a získej náhodný fakt pro dnešní den. 👇</p>

                                          <div id="fact-display" class="mt-2 text-gray-300 italic transition-all duration-300 min-h-[20px]"></div>

                                          <button onclick="showNextFact()" class="mt-2 border border-[#4f545c] text-xs text-gray-300 hover:bg-[#4f545c] hover:text-white px-3 py-1 rounded transition flex items-center gap-2">
                                              <i class="fas fa-dice"></i> Náhodná zajímavost
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div class="message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-1" style="animation-delay: 0.2s">
                              <div class="flex gap-4 items-start">
                                  <img src="img/app/jozka_profilovka.jpg" alt="Jožka" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md cursor-pointer hover:opacity-80 transition flex-shrink-0" loading="lazy">
                                  <div class="flex-1 min-w-0">
                                      <div class="flex items-baseline gap-2">
                                          <span class="font-bold text-[var(--text-header)] hover:underline cursor-pointer">Jožka</span>
                                          <span class="text-xs text-[var(--interactive-normal)]">Právě teď</span>
                                      </div>
                                      <div class="text-[var(--text-normal)] mt-1">
                                          <p>Další verze Kiscordu. Přidal jsem pár secret commandů. Zkus napsat dolů do chatu třeba <code>/miluju</code> nebo <code>/sova</code>. 😉</p>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          <div id="new-messages-area"></div>
                          <div class="h-4"></div> </div>

                      <div class="px-4 pb-6 pt-2 bg-[#36393f] flex-shrink-0 z-10">
                          <div class="bg-[#40444b] rounded-lg flex items-center p-2.5 px-4 shadow-sm relative">
                              <div class="flex items-center gap-3 mr-4 text-[#b9bbbe]">
                                  <button class="hover:text-gray-200 transition bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-[10px]"><i class="fas fa-plus"></i></button>
                              </div>

                              <input type="text" id="welcome-chat-input" autocomplete="off" placeholder="Poslat zprávu do #uvítání"
                                  class="bg-transparent text-gray-200 placeholder-[#72767d] w-full outline-none font-light text-sm">

                              <div class="flex items-center gap-3 ml-4 text-[#b9bbbe]">
                                  <button class="hover:text-yellow-400 transition" title="Dárek"><i class="fas fa-gift"></i></button>
                                  <button class="hover:text-gray-200 transition font-bold text-[10px] bg-[#b9bbbe] text-[#40444b] px-1 rounded-sm">GIF</button>
                                  <button class="hover:text-yellow-400 transition"><i class="far fa-smile"></i></button>
                              </div>
                          </div>

                          <div id="typing-indicator" class="absolute bottom-1 left-4 text-[10px] text-gray-400 font-bold hidden flex items-center gap-1">
                              <span class="animate-bounce">●</span><span class="animate-bounce" style="animation-delay:0.1s">●</span><span class="animate-bounce" style="animation-delay:0.2s">●</span> System Bot píše...
                          </div>
                      </div>
                  `;

  // Připojení logiky k inputu
  setTimeout(() => {
    const input = document.getElementById("welcome-chat-input");
    if (input) {
      input.addEventListener("keypress", handleWelcomeChat);
      input.focus();
    }
  }, 100);
}

function getDaysTogether() {
  const start = new Date(state.startDate);
  const now = new Date();
  const diff = now - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function renderDashboard() {
  const container = document.getElementById("messages-container");
  const data = getTodayData();

  // 1. Data a čas
  const dateOptions = { weekday: "long", day: "numeric", month: "long" };
  const niceDate = new Date().toLocaleDateString("cs-CZ", dateOptions);
  const hour = new Date().getHours();
  let greeting = "Dobré ráno";
  if (hour >= 11) greeting = "Ahoj"; // Kratší pozdrav šetří místo na mobilu
  if (hour >= 18) greeting = "Krásný večer";
  const daysTogether = getDaysTogether();

  // 2. Fakta a Plány
  // 2. Fakta a Plány (Persist Fact to avoid flicker)
  if (!state.dashboardSessionFact) {
    const allFacts = factsLibrary.raccoon.map((f) => `${f.icon} ${f.text}`);
    state.dashboardSessionFact = allFacts[Math.floor(Math.random() * allFacts.length)];
  }
  const randomFact = state.dashboardSessionFact;

  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingDates = Object.entries(state.plannedDates)
    .filter(([date, plan]) => date >= todayStr)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

  // --- HTML GENERACE ---
  container.innerHTML = `
          <div class="flex-1 overflow-y-auto no-scrollbar bg-[#36393f] relative w-full h-full pb-20">

              <div class="relative bg-gradient-to-br from-[#5865F2] to-[#eb459e] shadow-lg overflow-hidden flex-shrink-0 pt-6 pb-0 rounded-b-3xl">
                  <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

                  <div class="relative z-10 px-6 mb-4 flex justify-between items-start">
                      <div>
                          <p class="text-[10px] font-bold uppercase tracking-wider opacity-80 text-white/90 mb-0.5">${niceDate}</p>
                          <h1 class="text-2xl font-black text-white drop-shadow-md leading-tight">${greeting},<br>Klárko 🌞</h1>
                      </div>

                      <div class="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-center shadow-sm border border-white/10">
                          <span class="block text-[8px] uppercase font-bold tracking-widest opacity-90 text-white">Spolu</span>
                          <span class="block text-sm font-black text-white">${daysTogether} dní</span>
                      </div>
                  </div>

                  <div class="bg-black/20 backdrop-blur-md border-t border-white/10 px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-black/30 transition"
                       onclick="${nextDate
      ? `showDayDetail('${nextDate[0]}')`
      : `switchChannel('dateplanner')`
    }">

                      ${nextDate
      ? `
                          <div class="flex items-center gap-3 overflow-hidden">
                              <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                                  📅
                              </div>
                              <div class="min-w-0">
                                  <div class="text-[9px] font-bold text-white/70 uppercase tracking-wide flex items-center gap-1">
                                      Nejbližší akce <span class="w-1 h-1 bg-[#3ba55c] rounded-full animate-pulse"></span>
                                  </div>
                                  <div class="font-bold text-white text-sm truncate">${nextDate[1].name
      }</div>
                              </div>
                          </div>
                          <div class="text-white/80 text-xs font-medium whitespace-nowrap pl-2">
                              ${new Date(nextDate[0]).getDate()}.${new Date(nextDate[0]).getMonth() + 1
      }. <i class="fas fa-chevron-right text-[10px] ml-1 opacity-50"></i>
                          </div>
                      `
      : `
                          <div class="flex items-center gap-3 w-full">
                              <div class="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center text-sm">❓</div>
                              <div class="text-white/90 text-sm font-medium">Zatím nic v plánu... <span class="font-bold underline decoration-[#faa61a]">Naplánovat?</span></div>
                          </div>
                      `
    }
                  </div>
              </div>

              <div class="max-w-3xl mx-auto px-3 mt-4 relative z-20 space-y-3">

                  <div class="space-y-3">
                      
                      <!-- 1. FULL WIDTH SLEEP -->
                      <div class="bg-[#2f3136] rounded-xl shadow border border-[#202225] p-3">
                          <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                              <i class="fas fa-bed text-[#faa61a]"></i> Jak ses vyspala?
                          </h3>
                           <div class="h-full" id="sleep-container">
                              ${generateSleepSlider(data)}
                          </div>
                      </div>

                      <!-- 2. FULL WIDTH WATER -->
                      <div class="bg-[#2f3136] rounded-xl shadow border border-[#202225] p-3">
                          <div class="flex justify-between items-center mb-2">
                              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                                  <i class="fas fa-tint text-[#00e5ff]"></i> Voda
                              </h3>
                              <span class="text-[10px] text-[#00e5ff] font-bold" id="water-count">${data.water
    }/8</span>
                          </div>
                          <div class="flex justify-between gap-0.5" id="water-container">
                              ${generateWaterIcons(data.water)}
                          </div>
                      </div>

                      <!-- 3. GRID PRO ZBYTEK -->
                      <!-- 3. GRID PRO ZBYTEK (Teď pod sebou - Full Width) -->
                      <div class="flex flex-col gap-2">
                          
                          <!-- MOOD -->
                          <div class="bg-[#2f3136] rounded-xl shadow border border-[#202225] p-3">
                              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Jak se cítíš?</h3>
                              <div class="flex justify-between px-1" id="mood-container">
                                  ${generateMoodSlider(data.mood)}
                              </div>
                          </div>

                          <!-- MOVEMENT -->
                          <div class="bg-[#2f3136] rounded-xl shadow border border-[#202225] p-3">
                              <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                                  <i class="fas fa-running text-[#3ba55c]"></i> Dnešní pohyb
                              </h3>
                              <div class="flex flex-wrap gap-2" id="movement-container">
                                  ${generateMovementChips(data.movement)}
                              </div>
                          </div>
                      </div>

                  </div>

                  <div class="bg-gradient-to-r from-[#202225] to-[#2f3136] rounded-xl shadow border border-[#202225] p-4 relative overflow-hidden group">
                      <div class="absolute top-0 right-0 p-3 opacity-5 text-5xl rotate-12 group-hover:rotate-0 transition-transform duration-500">💡</div>

                      <h3 class="text-[10px] font-bold text-[#eb459e] uppercase tracking-wide mb-1 flex items-center gap-2">
                         Věděla jsi, že...
                      </h3>

                      <p class="text-gray-300 text-xs font-medium leading-relaxed italic pr-4 min-h-[40px]" id="dashboard-fact-text">
                          ${randomFact}
                      </p>


                      <button onclick="refreshDashboardFact()" class="mt-2 text-[9px] bg-[#202225] hover:bg-[#40444b] text-gray-500 hover:text-white px-2 py-1 rounded border border-gray-700 transition flex items-center gap-1 ml-auto">
                          <i class="fas fa-sync-alt"></i> Další
                      </button>
                  </div>


                  <!-- TETRIS WIDGET (Compact) -->
                  ${(() => {
      const tScore = getTetrisScore();
      const tLeader = tScore.jose > tScore.klarka ? 'jose' : (tScore.jose < tScore.klarka ? 'klarka' : 'draw');

      return `
                      <div onclick="switchChannel('tetris')" 
                           class="bg-[#2f3136] rounded-xl p-3 border border-gray-700 cursor-pointer hover:border-[#faa61a] transition group relative overflow-hidden mt-4 shadow-md">
                        
                        <div class="absolute right-[-10px] top-[-10px] opacity-10 text-6xl text-[#faa61a] rotate-12 group-hover:rotate-45 transition duration-500">
                          <i class="fas fa-shapes"></i>
                        </div>

                        <div class="flex justify-between items-center relative z-10">
                          <!-- JOZKA -->
                          <div class="flex items-center gap-3 ${tLeader === 'jose' ? 'text-green-400 font-bold' : 'text-gray-400'}">
                            <div class="relative">
                              <img src="img/app/jozka_profilovka.jpg" class="w-10 h-10 rounded-full border-2 border-gray-600 object-cover" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Jose'">
                              ${tLeader === 'jose' ? '<span class="absolute -top-2 -right-1 text-xs animate-bounce">👑</span>' : ''}
                            </div>
                            <span class="font-mono text-xl tracking-tight">${tScore.jose}</span>
                          </div>

                          <div class="flex flex-col items-center">
                              <div class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Tetris War</div>
                              <div class="text-[9px] bg-[#202225] text-gray-500 px-1 rounded">SEASON 1</div>
                          </div>

                          <!-- KLARKA -->
                          <div class="flex items-center gap-3 flex-row-reverse ${tLeader === 'klarka' ? 'text-[#eb459e] font-bold' : 'text-gray-400'}">
                            <div class="relative">
                              <img src="img/app/klarka_profilovka.webp" class="w-10 h-10 rounded-full border-2 border-gray-600 object-cover" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=Klarka'">
                              ${tLeader === 'klarka' ? '<span class="absolute -top-2 -left-1 text-xs animate-bounce">👑</span>' : ''}
                            </div>
                            <span class="font-mono text-xl tracking-tight">${tScore.klarka}</span>
                          </div>
                        </div>
                      </div>
                      `;
    })()}

              </div>
          </div>`;

  // Pokud spíme, nastartujeme timer pro live update
  if (state.currentSleepSession && state.currentSleepSession.isSleeping) {
    startSleepTimer();
  }
}

// Přidej tuto malou pomocnou funkci někde pod renderDashboard,
// aby fungovalo tlačítko "Další zajímavost"
function refreshDashboardFact() {
  const allFacts = factsLibrary.raccoon.map((f) => `${f.icon} ${f.text}`);

  const randomFact = allFacts[Math.floor(Math.random() * allFacts.length)];
  const el = document.getElementById("dashboard-fact-text");
  if (el) {
    el.style.opacity = "0";
    setTimeout(() => {
      el.innerText = randomFact;
      el.style.opacity = "1";
    }, 200);
  }
}

// --- POMOCNÉ GENERÁTORY HTML (aby se kód neopakoval) ---

// --- 2. Czippel-Mood Slider (Blind Variant) ---
function generateMoodSlider(currentMood) {
  // Pokud je mood string (stará data), převedeme na null nebo default
  let value = typeof currentMood === 'number' ? currentMood : 5;
  // Pokud je nálada "null" (nevyplněno), dáme 5 jako střed, ale vizuálně to může být "vypnuté"
  // Pro tento design je lepší, když slider vždy "někde" je.

  const isSet = currentMood !== null && currentMood !== undefined;

  const bubbleImage = `img/mood/${value}.jpg`;

  return `
    <div class="mood-slider-container" id="mood-slider-wrapper">
        
        <!-- Bublina s fotkou (Dynamická) -->
        <div class="mood-bubble-wrapper" id="mood-bubble">
            <div class="mood-bubble">
                <img src="${bubbleImage}" id="mood-bubble-img" alt="Mood" onerror="this.src='img/app/czippel2_kytka.jpg'">
            </div>
            <div class="mood-rating-value" id="mood-bubble-value">${value}/10</div>
        </div>

        <!-- Slider -->
        <input type="range" min="1" max="10" step="1" value="${value}"
            oninput="updateMoodVisuals(this.value)"
            onchange="updateHealth('mood', parseInt(this.value))"
            onmousedown="document.querySelector('.mood-slider-container').classList.add('dragging')"
            onmouseup="document.querySelector('.mood-slider-container').classList.remove('dragging')"
            ontouchstart="document.querySelector('.mood-slider-container').classList.add('dragging')"
            ontouchend="document.querySelector('.mood-slider-container').classList.remove('dragging')"
            class="mood-range"
            id="mood-range-input">

        <!-- Číselná škála pod sliderem -->
        <div class="flex justify-between w-full px-1 mt-2">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
    `<span class="text-[10px] font-bold text-gray-500 mood-number ${n === value ? 'active' : ''}" 
                       id="mood-num-${n}" 
                       onclick="updateMoodVisuals(${n}); document.getElementById('mood-range-input').value=${n}; updateHealth('mood', ${n})">
                    ${n}
                </span>`
  ).join('')}
        </div>
        
    </div>
  `;
}

// Funkce pro dynamickou změnu vizuálu při posouvání
function updateMoodVisuals(val) {
  const value = parseInt(val);
  const bubbleWrapper = document.getElementById('mood-bubble');
  const bubbleImg = document.getElementById('mood-bubble-img');
  const bubbleVal = document.getElementById('mood-bubble-value');
  const textLabel = document.getElementById('mood-text-label');

  const moodTexts = [
    "Dneska na mě nemluv 🤬",
    "Všechno je na h... 💩",
    "Nevidím, neslyším 🙈",
    "Korporátní nuda 😐",
    "Jde to... 🫤",
    "Chill & Relax 🚬",
    "Kouzelná nálada 🧙‍♀️",
    "Jede bomby! 🕺",
    "Cítím se milovaně 🥰",
    "Jsem absolutní klenot! 💎"
  ];

  // 1. Změna obrázku
  if (bubbleImg) bubbleImg.src = `img/mood/${value}.jpg`;

  // 2. Změna textu v bublině
  if (bubbleVal) bubbleVal.innerText = `${value}/10`;

  // 3. Změna textového popisu
  // 3. Změna textového popisu (ZRUŠENO)
  if (textLabel) {
    textLabel.style.display = 'none';
  }

  // 4. Pozice bubliny (následuje palec)
  // Slider má šířku 100%. Palec je uvnitř.
  // Musíme vypočítat % pozici.
  // min=1, max=10. Rozsah = 9.
  // 4. Pozice bubliny (následuje palec)
  // Slider má šířku 100%. Palec má 28px.
  // Musíme kompenzovat offset palce (od kraje ke kraji).
  // Formula: calc(Percent% + (14px - (Percent / 100 * 28px)))
  // Zjednodušeně: 14 - (percent * 0.28)

  const percent = ((value - 1) / 9) * 100;
  const offset = 14 - (percent * 0.28);

  if (bubbleWrapper) {
    bubbleWrapper.style.left = `calc(${percent}% + ${offset}px)`;
    bubbleWrapper.classList.add('active');
  }

  // 5. Glowing Numbers efekt
  for (let i = 1; i <= 10; i++) {
    const span = document.getElementById(`mood-num-${i}`);
    if (span) {
      if (i === value) {
        span.classList.add('active');
        // Barva podle hodnoty (červená -> žlutá -> zelená)
        if (i <= 3) span.style.textShadow = "0 0 10px rgba(239, 68, 68, 0.8)";
        else if (i <= 7) span.style.textShadow = "0 0 10px rgba(245, 158, 11, 0.8)";
        else span.style.textShadow = "0 0 10px rgba(16, 185, 129, 0.8)";
      } else {
        span.classList.remove('active');
        span.style.textShadow = "none";
      }
    }
  }

  // 6. Haptika při změně (pokud se hodnota změnila)
  // Musíme si pamatovat poslední hodnotu, abychom nevibrovali pořád při jemném posunu
  // Ale 'val' je integer z range vstupu (step=1), takže se mění jen při skoku.
  // TriggerHaptic voláme jen pokud to není prvotní render (což tady asi nepoznáme snadno, ale oninput je user action)
  triggerHaptic("light");
}

// Přidáme listener pro skrytí bubliny po uložení (ale to se překreslí celé)


function generateWaterIcons(count) {
  let html = "";
  for (let i = 1; i <= 8; i++) {
    const isFull = i <= count;
    // Používáme stejnou ikonu, ale měníme styl
    const colorClass = isFull
      ? "text-[#00e5ff] scale-110 drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" // Plná
      : "text-[#202225] hover:text-[#40444b]"; // Prázdná (tmavá šedá)

    // Přidáme i border pro prázdnou sklenici, aby byla vidět "obrys"
    const borderStyle = isFull ? "" : "filter: drop-shadow(0 0 1px #555);";

    html += `
                  <button onclick="updateHealth('water', ${i})" class="text-2xl transition-all duration-200 p-1 transform active:scale-95 ${colorClass}" style="${borderStyle}">
                      <i class="fas fa-tint"></i>
                  </button>
              `;
  }
  return html;
}

// --- 3. SLEEP TRACKER HELPERS ---

function generateSleepSlider(data) {
  const sleepValue = typeof data.sleep === "number" ? data.sleep : 0;
  const sleepColor = getSleepColor(sleepValue);

  // Zjistíme, zda běží odpočet (spánek nebo šlofík)
  const isTracking = state.currentSleepSession && state.currentSleepSession.isSleeping;
  const disabledClass = isTracking ? "opacity-50 grayscale cursor-not-allowed pointer-events-none" : "";
  const disabledAttr = isTracking ? "disabled" : "";

  // Solid Color Logic: Red -> Orange -> Green -> Pink
  const trackGradient = `linear-gradient(to right, 
        #ed4245 0%, 
        #faa61a 45%, 
        #3ba55c 65%, 
        #eb459e 100%)`;

  return `
        <div class="flex flex-col justify-between">
            
            <!-- SLIDER CONTAINER -->
            <div class="relative w-full h-8 rounded-full bg-[#202225] overflow-hidden mb-2 shadow-inner border border-black/40 ${disabledClass}">
                 <!-- Pozadí slideru -->
                 <div class="absolute inset-0 opacity-10" style="background: ${trackGradient}"></div>
                 
                 <!-- Input slider -->
                 <input type="range" min="0" max="12" step="1" value="${sleepValue}" 
                    oninput="updateSleep(this.value)" 
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    title="${isTracking ? 'Slider je zamčený během spánku' : 'Posunutím změň délku spánku'}"
                    ${disabledAttr}>
                 
                 <!-- Vizualizace progressu (SOLID BAR) -->
                 <div class="absolute top-0 left-0 h-full transition-none pointer-events-none" 
                      id="sleep-progress-bar"
                      style="width: ${(sleepValue / 12) * 100}%; background-color: ${sleepColor.hex}; box-shadow: 0 0 15px ${sleepColor.hex}80;">
                 </div>

                 <!-- Marker -->
                 <div class="absolute top-0 h-full w-1 bg-white shadow-[0_0_5px_black] pointer-events-none transition-none backdrop-blur-sm z-10"
                      id="sleep-marker"
                      style="left: ${(sleepValue / 12) * 100}%; transform: translateX(-50%);">
                 </div>
            </div>

            <!-- TEXT HODNOTY POD SLIDEREM -->
            <div class="flex justify-between items-end px-1 mt-1">
                 <div class="flex items-baseline gap-1" id="sleep-value-wrapper">
                    <span class="font-black text-4xl ${sleepColor.class} transition-colors duration-200 leading-none drop-shadow-md filter brightness-110" id="sleep-value-text">${sleepValue}</span>
                    <span class="text-sm opacity-80 font-bold text-gray-500 uppercase">hod</span>
                 </div>
                 
                 <!-- SMART SLEEP CONTROLS -->
                 <div class="flex gap-2 items-center bg-[#202225] p-1.5 rounded-lg border border-[#36393f] shadow-sm">
                    ${generateSleepControls(data)}
                </div>
            </div>
            
        </div>
    `;
}

function getSleepColor(hours) {
  // 0 - 5 hodin: Červená (Zombie)
  if (hours < 5)
    return { class: "text-[#ed4245]", hex: "#ed4245", label: "Zombie 🧟‍♀️" };
  // 5 - 7 hodin: Oranžová (Ujde to)
  else if (hours < 7)
    return { class: "text-[#faa61a]", hex: "#faa61a", label: "Ujde to 😐" };
  // 7 - 9 hodin: Zelená (Ideál)
  else if (hours < 9)
    return { class: "text-[#3ba55c]", hex: "#3ba55c", label: "Ideál ✨" };
  // 9+ hodin: Růžová (Princezna)
  else
    return { class: "text-[#eb459e]", hex: "#eb459e", label: "Růženka 👸" };
}

function generateSleepControls(data) {
  if (state.currentSleepSession && state.currentSleepSession.isSleeping) {
    // SLEEPING STATE
    const startTime = new Date(state.currentSleepSession.startTime);
    const timeStr = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;

    const isNap = state.currentSleepSession.type === 'nap';
    const labelText = isNap ? "Dobíjení..." : "Spíš od";
    const labelClass = isNap ? "text-[#00e5ff]" : "text-[#faa61a]";
    const icon = isNap ? '<i class="fas fa-bolt"></i>' : '<i class="fas fa-sun"></i>';

    return `
            <span id="sleep-session-label" class="text-[10px] ${labelClass} font-bold uppercase ml-1 animate-pulse">${labelText} ${timeStr}</span>
            <button onclick="wakeUp()" class="bg-[#faa61a]/10 hover:bg-[#faa61a] text-[#faa61a] hover:text-black px-3 py-1 rounded border border-[#faa61a] transition flex items-center justify-center gap-2 shadow-sm active:scale-95 h-8 font-bold text-xs" title="Vstávat!">
                 ${icon} Vstávat
            </button>
        `;
  } else {
    // AWAKE STATE
    return `
            <span class="text-[10px] text-gray-400 font-bold uppercase ml-1">Usínání:</span>
            <input type="time" value="${data.bedtime || ""}" onchange="updateBedtime(this.value)" class="bg-transparent text-white text-sm p-1 rounded focus:bg-[#2f3136] outline-none h-8 w-20 text-center font-mono font-bold">
            <button onclick="startSleep()" class="bg-[#2f3136] hover:bg-[#9b59b6] text-gray-400 hover:text-white w-8 h-8 rounded border border-[#36393f] transition flex items-center justify-center shadow-sm active:scale-95" title="Jdu spát TEĎ">
                 <i class="fas fa-moon"></i>
            </button>
        `;
  }
}

function startSleep() {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // 1. Update Bedtime Input (visual)
  updateBedtime(timeStr);

  // 1.5 DETECT NAP MODE (10:00 - 20:00)
  const hour = now.getHours();
  const isNap = hour >= 10 && hour < 20;

  // 2. Set Session State
  state.currentSleepSession = {
    startTime: now.getTime(),
    isSleeping: true,
    type: isNap ? 'nap' : 'sleep' // Nový flag
  };
  localStorage.setItem('klarka_sleep_session', JSON.stringify(state.currentSleepSession));

  // 3. Trigger Overlay
  if (isNap) {
    triggerNapOverlay();
  } else {
    triggerGoodnightOverlay();
  }

  // 4. Start Timer & Re-render
  startSleepTimer();
  renderDashboard(getTodayData());
}

function triggerNapOverlay() {
  // Vytvoříme overlay element (podobný jako Goodnight)
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/90 text-white flex-col transition-opacity duration-1000 opacity-0';
  overlay.id = 'nap-overlay';

  overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-bounce">⚡</div>
        <h1 class="text-3xl font-black text-[#00e5ff] mb-2 drop-shadow-[0_0_15px_rgba(0,229,255,0.8)]">Dobíjení energie...</h1>
        <p class="text-gray-400 text-sm font-bold uppercase tracking-widest">Režim Šlofík aktivován</p>
    `;

  document.body.appendChild(overlay);

  // Fade in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  // Remove automatically
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 1000);
  }, 2500);
}

function wakeUp() {
  if (!state.currentSleepSession || !state.currentSleepSession.startTime) return;

  // Stop the timer
  stopSleepTimer();

  const now = new Date();
  const startTime = new Date(state.currentSleepSession.startTime);

  // Calculate difference in hours
  const diffMs = now - startTime;
  const diffHours = diffMs / (1000 * 60 * 60);

  // Round to 1 decimal place (e.g. 7.5) instead of integer
  // This allows tracking short naps or more precise sleep
  const roundedHours = Math.round(diffHours * 10) / 10;

  // Clamp between 0 and 12
  // POZOR: Pokud je to šlofík, PŘIČÍTÁME k existujícímu spánku
  const currentData = getTodayData();
  const previousSleep = typeof currentData.sleep === 'number' ? currentData.sleep : 0;

  let totalSleep = previousSleep;

  // Logic: Day sleep (Nap) adds to total. Night sleep usually resets/sets the base.
  // Pro zjednodušení: Vždy přičítáme, pokud je to tentýž den.
  // Ale pokud "spíme" (v noci), tak to většinou chceme nastavit jako hlavní hodnotu.

  const isNap = state.currentSleepSession.type === 'nap';

  if (isNap) {
    totalSleep = previousSleep + roundedHours;
  } else {
    // Pokud je to noční spánek, přepíšeme hodnotu (nebo taky přičteme? 
    // Většinou, když jdeš spát večer, tak ráno vstaneš a to je JE TVŮJ spánek pro ten den).
    // Pokud se vzbudíš, něco děláš a jdeš spát znovu, tak se to přepíše.
    // Abychom podpořili "více fází", budeme taky přičítat, ale s resetem pokud je hodnota 0.
    if (previousSleep > 12) totalSleep = roundedHours; // Reset only if weird value
    else totalSleep = roundedHours;

    // KOREKCE: Většina lidí chce, aby ranní "Vstávat" nastavilo hlavní spánek.
    // Pokud už tam něco je (třeba šlofík z předchozího dne? Ne, data jsou pro DEN).

    // Rozhodnutí: Noční spánek (resetuje a nastaví hlavní), Šlofík (přičítá).
    // Ale co když se probudím v noci (3:00) a pak jdu zase spát?
    // Pak by to mělo přičíst.

    // Zkusíme chytřejší logiku: Pokud je 'previousSleep' malý (např < 3h), tak přičteme.
    // Pokud je velký, tak asi uživatel zadává nový den?
    // Ne, nechme to jednoduše: Noční spánek PŘEPISUJE (protože to je ten hlavní).
    // A šlofík PŘIČÍTÁ.

    // Ale co přerušovaný spánek?
    // OK: Pro MVP: Noční spánek = Nastavit hodnotu. Šlofík = Přičíst.
    totalSleep = roundedHours;
  }

  const finalHours = Math.max(0, Math.min(12, totalSleep));

  // 1. Update Sleep Slider
  updateSleep(finalHours);

  // 2. Clear Session
  const wasNap = state.currentSleepSession.type === 'nap'; // Uložíme si typ pro overlay
  state.currentSleepSession = { startTime: null, isSleeping: false };
  localStorage.setItem('klarka_sleep_session', JSON.stringify(state.currentSleepSession));

  // 3. Trigger Appropriate Overlay
  if (wasNap) {
    triggerRechargedOverlay();
  } else {
    triggerGoodMorningOverlay();
  }

  // 4. Re-render
  renderDashboard(getTodayData());
}

function triggerRechargedOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-[#00e5ff]/20 backdrop-blur-sm flex-col transition-opacity duration-1000 opacity-0';
  overlay.id = 'recharged-overlay';

  overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-bounce">🔋</div>
        <h1 class="text-4xl font-black text-[#00e5ff] mb-2 drop-shadow-md text-center">Dobito!</h1>
        <p class="text-white text-lg font-bold text-center drop-shadow-md">Tvá energie je zpět.</p>
    `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  });

  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 1000);
  }, 3000);
}

function updateSleep(value) {
  const hours = parseFloat(value);
  const key = getTodayKey();
  const data = getTodayData();

  data.sleep = hours;
  state.healthData[key] = data;
  localStorage.setItem("klarka_health", JSON.stringify(state.healthData));

  // Visual Update (Slider + Text)
  const color = getSleepColor(hours);
  const textEl = document.getElementById("sleep-value-text");
  if (textEl) {
    textEl.innerHTML = `${hours} <span class="text-sm opacity-80 font-bold text-gray-400">hod</span>`;
    textEl.className = `font-black text-4xl ${color.class} transition-colors duration-200 leading-none drop-shadow-md filter brightness-110`;
  }

  // Update slider visualizations (Custom HTML structure)
  // Protože jsme změnili HTML slideru na custom divy, musíme aktualizovat šířku progress baru
  const container = document.getElementById("sleep-container"); // Hledáme kontejner
  if (container) {
    const progressBar = container.querySelector('#sleep-progress-bar'); // Najdeme progress bar podle ID
    const marker = container.querySelector('#sleep-marker'); // Najdeme marker podle ID

    if (progressBar) {
      progressBar.style.width = `${(hours / 12) * 100}%`;
      progressBar.style.backgroundColor = color.hex;
      progressBar.style.boxShadow = `0 0 15px ${color.hex}80`;
    }
    if (marker) marker.style.left = `${(hours / 12) * 100}%`;
  }
}

function updateBedtime(timeStr) {
  const key = getTodayKey();
  const data = getTodayData();

  if (data.bedtime !== timeStr) {
    data.bedtime = timeStr;
    state.healthData[key] = data;
    localStorage.setItem("klarka_health", JSON.stringify(state.healthData));

    // Note: manual bedtime change doesn't necessarily trigger sleep mode now
  }
}

function setBedtimeNow() {
  // This function is now effectively replaced by startSleep for the button,
  // but we check if we should still support manual only setting?
  // The UI now calls startSleep() for the button.
  // This can be kept as a helper if needed, but startSleep covers it.
  startSleep();
}

function triggerGoodMorningOverlay() {
  // 1. Vytvoříme overlay element
  const overlay = document.createElement("div");
  overlay.id = "good-morning-overlay";
  overlay.className = "fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-1000";

  // 2. Náhodná zpráva
  const messages = [
    "Dobré ráno, princezno! ☀️",
    "Krásné probuzení! 💖",
    "Nový den, nové možnosti! ✨",
    "Vstávat a zářit! 🌟",
    "Dneska ti to bude slušet! 💃"
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  overlay.innerHTML = `
        <div class="sun-rays"></div>
        <div class="sun-core">☀️</div>
        <h1 class="text-white text-4xl font-black mt-8 text-center drop-shadow-lg px-4 animate-bounce relative z-20">
            ${msg}
        </h1>
    `;

  document.body.appendChild(overlay);

  // 3. Zmizení po čase
  setTimeout(() => {
    overlay.style.opacity = "0";
    setTimeout(() => {
      overlay.remove();
    }, 1000);
  }, 3500);
}

function triggerGoodnightOverlay() {
  // 1. Vybereme náhodnou zprávu
  const messages = [
    "Dobrou noc, lásko. Nech si zdát něco hezkého (třeba o mně). ❤️",
    "Pšššt. Odlož telefon a zavři oči. Miluju tě. 🌙",
    "Zítra je taky den. Teď je čas na sny. ✨",
    "Jdi spát, ať jsi zítra krásná (jako vždycky). 🌹",
    "Sladké sny, princezno. 👸",
    "Ať tě blechy neštípou! (Pokud ano, jsou to mývalové). 🦝",
    "Vypínám světla... 3... 2... 1... 🔦",
    "Užij si peřinu, závidím jí. 😉",
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  // 2. Vytvoříme overlay element (pokud neexistuje)
  let overlay = document.getElementById("goodnight-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "goodnight-overlay";
    overlay.className = "fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center flex-col opacity-0 pointer-events-none transition-opacity duration-1000";
    overlay.innerHTML = `
        <div class="text-6xl mb-4 animate-bounce">🌙</div>
        <h2 class="text-white text-xl md:text-3xl font-bold text-center px-4 leading-relaxed" id="goodnight-text"></h2>
        <div class="absolute inset-0 z-[-1] overflow-hidden" id="stars-container"></div>
    `;
    document.body.appendChild(overlay);
  }

  // 3. Nastavíme text a zobrazíme
  document.getElementById("goodnight-text").innerText = msg;
  overlay.classList.remove("opacity-0", "pointer-events-none");

  // 4. Efekt hvězd (jednoduché CSS/JS)
  // ... (pro jednoduchost vynecháme složitou animaci hvězd, stačí tmavé pozadí s textem)

  // 5. Skryjeme po 3.5 sekundách
  setTimeout(() => {
    overlay.classList.add("opacity-0", "pointer-events-none");
  }, 3500);
}


function generateMovementChips(currentMovements) {
  // Definice aktivit
  const activities = [
    { id: "gym", label: "Fitko", icon: "💪" },
    { id: "walk", label: "Procházka", icon: "🌲" },
    { id: "sex", label: "Tulení", icon: "😏" }, // Nejdůležitější cardio
  ];

  return activities
    .map((act) => {
      // Kontrola, zda je aktivita v poli vybraných
      const isActive = currentMovements.includes(act.id);

      const style = isActive
        ? "bg-[#3ba55c] text-white border-[#3ba55c] shadow-md"
        : "bg-[#202225] text-gray-400 border-[#202225] hover:border-gray-500";

      return `
                  <button onclick="updateHealth('movement', '${act.id}')"
                      class="px-3 py-2 rounded-lg text-xs font-bold border transition-all transform active:scale-95 flex items-center gap-2 ${style}">
                      <span>${act.icon}</span> ${act.label}
                  </button>
              `;
    })
    .join("");
}

// --- CALENDAR LOGIC ---

// Globální pomocné proměnné pro kalendář, abychom nemuseli vše přepočítávat
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();

function renderCalendar(year = null, month = null) {
  const container = document.getElementById("messages-container");

  // Pokud nejsou parametry, použijeme aktuální (nebo poslední uložené)
  if (year === null) year = currentCalYear;
  if (month === null) month = currentCalMonth;

  // Ošetření přechodu přes rok
  if (month < 0) {
    month = 11;
    year--;
  } else if (month > 11) {
    month = 0;
    year++;
  }

  // Uložíme si aktuální stav pro filtry
  currentCalYear = year;
  currentCalMonth = month;

  const monthNames = [
    "Leden",
    "Únor",
    "Březen",
    "Duben",
    "Květen",
    "Červen",
    "Červenec",
    "Srpen",
    "Září",
    "Říjen",
    "Listopad",
    "Prosinec",
  ];

  // Výpočet navigace
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  container.innerHTML = `
          <div class="flex flex-col h-full bg-[#36393f]">

              <div class="px-4 py-3 flex justify-between items-center bg-[#2f3136] shadow-sm z-10 flex-shrink-0 border-b border-[#202225]">
                  <h2 class="text-2xl font-extrabold text-white flex items-center gap-2">
                      ${monthNames[month]
    } <span class="text-gray-500 font-light text-xl">${year}</span>
                  </h2>
                  <div class="flex gap-1">
                      <button onclick="renderCalendar(${prevYear}, ${prevMonth})" class="w-8 h-8 rounded-lg bg-[#202225] hover:bg-[#40444b] text-gray-300 flex items-center justify-center transition border border-[#202225] hover:border-gray-500">
                          <i class="fas fa-chevron-left text-sm"></i>
                      </button>
                      <button onclick="renderCalendar(${nextYear}, ${nextMonth})" class="w-8 h-8 rounded-lg bg-[#202225] hover:bg-[#40444b] text-gray-300 flex items-center justify-center transition border border-[#202225] hover:border-gray-500">
                          <i class="fas fa-chevron-right text-sm"></i>
                      </button>
                  </div>
              </div>

              <div id="calendar-filters" class="flex items-center gap-2 px-4 py-2 bg-[#36393f] flex-shrink-0 overflow-x-auto no-scrollbar border-b border-[#202225]">
                  ${generateFilterButtons()}
              </div>

              <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
                  <div class="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <div>Po</div><div>Út</div><div>St</div><div>Čt</div><div>Pá</div><div>So</div><div>Ne</div>
                  </div>

                  <div id="calendar-grid" class="grid grid-cols-7 gap-1 pb-20 auto-rows-fr">
                      ${generateCalendarGrid(year, month)}
                  </div>
              </div>
          </div>`;
}

function setCalendarFilter(filterId) {
  // 1. Aktualizujeme stav
  state.calendarFilter = filterId;
  triggerHaptic("light");

  // 2. Aktualizujeme tlačítka filtrů (aktivní stav)
  const filterContainer = document.getElementById("calendar-filters");
  if (filterContainer) {
    filterContainer.innerHTML = generateFilterButtons();
  }

  // 3. Aktualizujeme POUZE grid (žádné blikání hlavičky)
  const gridContainer = document.getElementById("calendar-grid");
  if (gridContainer) {
    // Jemná animace pro přechod
    gridContainer.style.opacity = "0";
    setTimeout(() => {
      gridContainer.innerHTML = generateCalendarGrid(
        currentCalYear,
        currentCalMonth,
      );
      gridContainer.style.opacity = "1";
    }, 150); // Velmi krátká prodleva pro efekt
  }
}

// Generuje HTML tlačítek filtrů
function generateFilterButtons() {
  const views = [
    {
      id: "all",
      label: "",
      icon: "fa-calendar-alt",
      color: "bg-[#5865F2]",
    }, // Label prázdný = jen ikona
    {
      id: "sleep",
      label: "Spánek",
      icon: "fa-bed",
      color: "bg-[#9b59b6]",
    },
    {
      id: "water",
      label: "Voda",
      icon: "fa-tint",
      color: "bg-[#00e5ff]",
    },
    {
      id: "health",
      label: "Zdraví",
      icon: "fa-heart",
      color: "bg-[#ed4245]",
    },
  ];

  if (!state.calendarFilter) state.calendarFilter = "all";

  return views
    .map((v) => {
      const isActive = state.calendarFilter === v.id;
      // Aktivní: Barva. Neaktivní: Tmavá šedá.
      const style = isActive
        ? `${v.color} text-white shadow-md border-transparent`
        : "bg-[#202225] text-gray-400 border-gray-700 hover:text-gray-200 hover:bg-[#2f3136]";

      // Pokud má label, přidáme margin. Pokud ne, je to čtverec (pro Plánovač).
      const content = v.label
        ? `<i class="fas ${v.icon}"></i> ${v.label}`
        : `<i class="fas ${v.icon} text-lg"></i>`;
      const padding = v.label
        ? "px-3 py-1.5"
        : "w-9 h-9 flex items-center justify-center p-0";

      return `<button onclick="setCalendarFilter('${v.id}')" class="${padding} rounded-lg text-xs font-bold border transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${style}">
                          ${content}
                      </button>`;
    })
    .join("");
}

// Generuje HTML mřížky dnů (To složité jádro)
function generateCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDayIndex = firstDay.getDay() - 1;
  if (startDayIndex === -1) startDayIndex = 6;

  const anniversaryDay = new Date(state.startDate).getDate();
  let html = "";

  // Prázdné buňky
  for (let i = 0; i < startDayIndex; i++) {
    html += `<div class="bg-transparent"></div>`;
  }

  // Dny
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(
      2,
      "0",
    )}-${String(d).padStart(2, "0")}`;

    // Data
    const dayData = state.healthData[dateKey] || {};
    const plannedDate = state.plannedDates[dateKey];
    const schoolEvent = state.schoolEvents[dateKey];
    const timelineEvent = timelineEvents.find((e) => e.date === dateKey);

    const isToday = dateKey === getTodayKey();
    const isAnniversary = d === anniversaryDay;

    // Styly - Změna: gap-1 vyžaduje, aby buňky neměly velké marginy
    let cellContent = "";
    // aspect-[4/5] udělá buňky mírně vyšší než širší, což je lepší pro obsah
    let cellClasses =
      "relative aspect-[4/5] rounded-lg border p-1 transition cursor-pointer flex flex-col justify-between overflow-hidden group hover:brightness-110";
    let bgStyle = "bg-[#2f3136]";
    let borderStyle = "border-[#202225]";
    let textStyle = "text-gray-500 font-medium";

    if (isToday) {
      borderStyle =
        "border-[#5865F2] border-2 shadow-[0_0_10px_rgba(88,101,242,0.2)] z-10";
      textStyle = "text-white font-bold";
    }

    // --- RENDER LOGIKA PODLE FILTRU ---

    if (state.calendarFilter === "all") {
      if (isAnniversary)
        cellContent += `<div class="absolute top-1 right-1 text-[8px] text-[#ed4245] animate-pulse">❤️</div>`;

      let iconsHtml = "";

      if (schoolEvent) {
        // Decentnější zobrazení školy
        cellContent += `<div class="absolute top-0 right-0 w-2 h-2 bg-[#faa61a] rounded-bl-lg"></div>`;
        iconsHtml += `<span class="text-[10px]">📚</span>`;
      }
      if (timelineEvent) {
        borderStyle = "border-[#faa61a] border-dashed";
        iconsHtml += `<span class="text-[10px]">📜</span>`;
      }

      if (plannedDate) {
        bgStyle = "bg-[#5865F2]/20";
        borderStyle = "border-[#5865F2]/50";

        // ROZŠÍŘENÉ MAPOVÁNÍ IKON
        const iconsMap = {
          food: "🍔",
          view: "🔭",
          walk: "🌲",
          fun: "⚡", // Staré
          movie: "🎬",
          game: "🎮",
          discord: "🎧",
          date: "📍", // Nové
        };
        const icon = iconsMap[plannedDate.cat] || "📍";

        cellContent += `
                          <div class="w-full h-full flex flex-col items-center justify-center pt-2">
                              <div class="text-lg drop-shadow-sm transform group-hover:scale-110 transition">${icon}</div>
                              <div class="text-[7px] text-gray-300 leading-tight text-center truncate w-full px-0.5 mt-1">${plannedDate.name}</div>
                          </div>
                      `;
      } else {
        cellContent += `<div class="flex items-center justify-center gap-0.5 w-full pb-0.5 mt-auto">${iconsHtml}</div>`;
      }
    } else if (state.calendarFilter === "sleep") {
      if (dayData.sleep) {
        borderStyle = "border-transparent";

        // --- PROPOJENÍ STARÝCH A NOVÝCH DAT ---

        // A) Nová data (číslo)
        if (typeof dayData.sleep === 'number') {
          const hours = dayData.sleep;
          const color = getSleepColor(hours);

          // Určíme barvu pozadí podle helperu
          bgStyle = `bg-[${color.hex}]`;
          // Tailwind nepodporuje dynamické hodnoty v hranatých závorkách takto jednoduše v JS bez JIT, 
          // takže to musíme udělat inline stylem nebo mapou klasických barev.
          // Pro jednoduchost použijeme mapování na existující classy nebo hex.

          let hexBg = color.hex;

          let icon = "😐";
          if (hours < 5) icon = "🧟‍♀️";
          else if (hours >= 9) icon = "👸";
          else if (hours >= 7) icon = "✨";

          // Formatování: Pokud je to celé číslo, bez desetin. Jinak 1 desetinné.
          const formattedHours = hours % 1 === 0 ? hours : hours.toFixed(1);

          cellContent += `
               <div class="w-full h-full flex flex-col items-center justify-center text-white" style="background-color: ${hexBg}AA; border-radius: 6px;">
                   <div class="text-lg leading-none">${icon}</div>
                   <div class="text-[8px] font-bold mt-0.5">${formattedHours}h</div>
               </div>
           `;
        }
        // B) Stará data (string)
        else {
          if (dayData.sleep === "good") {
            bgStyle = "bg-[#9b59b6]";
            cellContent += `<div class="w-full h-full flex items-center justify-center text-xl text-white opacity-90">👸</div>`;
          } else if (dayData.sleep === "ok") {
            bgStyle = "bg-[#faa61a]";
            cellContent += `<div class="w-full h-full flex items-center justify-center text-xl text-white opacity-90">😐</div>`;
          } else if (dayData.sleep === "zombie") {
            bgStyle = "bg-[#ed4245]";
            cellContent += `<div class="w-full h-full flex items-center justify-center text-xl text-white opacity-90">🧟‍♀️</div>`;
          }
        }
        textStyle = "text-white/80";
      } else {
        cellContent += `<div class="w-full h-full flex items-center justify-center text-gray-700 text-[10px]">-</div>`;
      }
    } else if (state.calendarFilter === "water") {
      const waterCount = dayData.water || 0;
      const percentage = Math.min((waterCount / 8) * 100, 100);

      cellContent += `
                      <div class="absolute bottom-0 left-0 w-full bg-[#00e5ff] transition-all duration-500 opacity-30" style="height: ${percentage}%"></div>
                      <div class="relative z-10 w-full h-full flex flex-col items-center justify-center mt-1">
                          <span class="text-lg font-bold ${waterCount >= 6 ? "text-[#00e5ff]" : "text-gray-500"
        }">${waterCount}</span>
                      </div>
                  `;
      if (waterCount >= 8) borderStyle = "border-[#00e5ff]";
    } else if (state.calendarFilter === "health") {
      if (dayData.period) {
        bgStyle = "bg-[#ed4245]/20";
        borderStyle =
          "border-[#ed4245] border shadow-[inset_0_0_10px_rgba(237,66,69,0.2)]";
        textStyle = "text-[#ed4245] font-bold";
        cellContent += `<div class="absolute top-1 right-1 text-[8px]">🩸</div>`;
      }

      if (dayData.mood) {

        // 1. NOVÁ DATA (1-10)
        if (typeof dayData.mood === 'number') {
          const val = dayData.mood;
          let iconResult = "😐";

          // Mapování podle Czippelometru
          if (val === 1) iconResult = "🤬";
          else if (val === 2) iconResult = "💩";
          else if (val === 3) iconResult = "🙈";
          else if (val === 4) iconResult = "😐";
          else if (val === 5) iconResult = "oxu"; // 5 je "Jde to -> oxu?" Ne, 5=Jde to 🫤
          else if (val === 5) iconResult = "🫤";
          else if (val === 6) iconResult = "🚬";
          else if (val === 7) iconResult = "🧙‍♀️";
          else if (val === 8) iconResult = "🕺";
          else if (val === 9) iconResult = "🥰";
          else if (val === 10) iconResult = "💎";

          cellContent += `<div class="w-full h-full flex items-center justify-center text-2xl pt-2">${iconResult}</div>`;

          // Můžeme přidat i malinké číslo do rohu?
          cellContent += `<div class="absolute bottom-1 right-1 text-[8px] font-bold opacity-50 text-white">${val}/10</div>`;

        }
        // 2. STARÁ DATA (String)
        else {
          const moodIcons = {
            happy: "🥰",
            tired: "😴",
            sad: "😢",
            angry: "😡",
            horny: "😈",
          };
          cellContent += `<div class="w-full h-full flex items-center justify-center text-2xl pt-2">${moodIcons[dayData.mood] || ""
            }</div>`;
        }
      }

      if (dayData.movement && dayData.movement.length > 0) {
        const moveIconMap = {
          gym: "💪",
          walk: "🌲",
          run: "🏃‍♀️",
          yoga: "🧘‍♀️",
          sex: "🔥",
          clean: "🧹",
        };
        // Zobrazíme jen první pohyb, ať to není přeplácané
        cellContent += `<div class="absolute bottom-1 right-1 text-[10px]">${moveIconMap[dayData.movement[0]] || "👟"
          }</div>`;
      }
    }

    html += `
                  <div onclick="showDayDetail('${dateKey}')" class="${cellClasses} ${bgStyle} ${borderStyle} calendar-fade">
                      <span class="absolute top-0.5 left-1.5 text-[10px] ${textStyle}">${d}</span>
                      ${cellContent}
                  </div>
              `;
  }
  return html;
}

// Smazání naplánovaného dne (Rande/Film/Discord)
function deletePlannedDate(dateKey) {
  delete state.plannedDates[dateKey];
  localStorage.setItem(
    "klarka_planned_dates",
    JSON.stringify(state.plannedDates),
  );

  showDayDetail(dateKey); // Refresh modalu
  renderCalendar(); // Refresh kalendáře
  triggerHaptic("medium");

  showNotification("Plán smazán 🗑️", "info");
}

// Přidání vlastní aktivity přes Modal
function addCustomPlan() {
  const type = document.getElementById("plan-type").value;
  const name = document.getElementById("plan-name").value;
  const time = document.getElementById("plan-time").value;

  if (!name) return;

  state.plannedDates[currentModalDateKey] = {
    id: "custom-" + Date.now(),
    name: name,
    cat: type, // 'discord', 'game', 'movie', 'date'
    time: time,
    note: "Vlastní plán",
  };

  localStorage.setItem(
    "klarka_planned_dates",
    JSON.stringify(state.plannedDates),
  );

  showDayDetail(currentModalDateKey);
  renderCalendar();
  triggerHaptic("success");
  triggerConfetti();
}

// Globální proměnná pro modal
let currentModalDateKey = null;

function showDayDetail(dateKey) {
  currentModalDateKey = dateKey;
  const dateObj = new Date(dateKey);

  // --- 0. Definice dneška (pro porovnávání) ---
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isPast = dateKey < todayKey;

  // --- 1. Hlavička modalu ---
  document.getElementById("modal-date-title").innerText =
    dateObj.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
    });
  document.getElementById("modal-date-subtitle").innerText =
    dateObj.toLocaleDateString("cs-CZ", {
      weekday: "long",
      year: "numeric",
    });

  // --- 2. Načtení dat ---
  const health = state.healthData[dateKey];
  const plannedDate = state.plannedDates[dateKey];
  const schoolEvent = state.schoolEvents[dateKey];
  const timelineEvent = timelineEvents.find((e) => e.date === dateKey);

  // --- 3. Elementy sekcí ---
  const dateSection = document.getElementById("modal-section-date");
  const schoolSection = document.getElementById("modal-section-school");
  const healthSection = document.getElementById("modal-section-health");

  // =========================================================
  // --- A) PLÁNY & VZPOMÍNKY (Upravená logika) ---
  // =========================================================

  // Zobrazit sekci, POKUD:
  // 1. Je to v budoucnosti nebo dnes (!isPast)
  // 2. NEBO tam už něco je (timelineEvent nebo plannedDate)
  const showDateSection = !isPast || timelineEvent || plannedDate;

  if (showDateSection) {
    let plansHtml = `<h4 class="text-xs font-bold text-[#eb459e] uppercase mb-2 flex items-center gap-2"><i class="fas fa-calendar-day"></i> Plány & Vzpomínky</h4>`;

    if (timelineEvent) {
      // 1. VZPOMÍNKA (Priorita)
      plansHtml += `
                <div class="bg-gradient-to-r from-[#5865F2]/20 to-[#eb459e]/20 border border-[#5865F2]/50 rounded-lg p-3 relative group">
                    <div class="font-bold text-white text-sm flex items-center gap-2">
                        <i class="fas ${timelineEvent.icon || "fa-star"
        } text-[#eb459e]"></i>
                        ${timelineEvent.title}
                    </div>
                    <div class="text-xs text-gray-300 mt-2 leading-relaxed italic">
                        "${timelineEvent.desc}"
                    </div>
                    ${timelineEvent.images && timelineEvent.images.length > 0
          ? `<button onclick="closeModal('day-modal'); switchChannel('timeline');" class="mt-3 text-[10px] bg-[#202225] hover:bg-[#eb459e] text-white px-2 py-1 rounded transition border border-gray-600 w-full">
                            <i class="fas fa-images mr-1"></i> Zobrazit fotky v Timeline
                           </button>`
          : ""
        }
                </div>`;
    } else if (plannedDate) {
      // 2. NAPLÁNOVANÁ AKCE
      let icon = "📍";
      if (plannedDate.cat === "movie") icon = "🎬";
      else if (plannedDate.cat === "game") icon = "🎮";
      else if (plannedDate.cat === "discord") icon = "🎧";
      else if (plannedDate.cat === "food") icon = "🍔";

      plansHtml += `
                <div class="bg-[#eb459e]/10 border border-[#eb459e]/30 rounded-lg p-3 relative group">
                    <div class="font-bold text-white text-sm flex items-center gap-2">
                        <span>${icon}</span> ${plannedDate.name}
                    </div>
                    <div class="text-xs text-gray-300 mt-1">Čas: ${plannedDate.time || "Neurčeno"
        }</div>
                    <div class="text-xs text-gray-400 mt-1 italic">${plannedDate.note || ""
        }</div>
                    <button onclick="deletePlannedDate('${dateKey}')" class="absolute top-2 right-2 text-red-400 hover:text-red-200 p-2 transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>`;
    } else {
      // 3. PRÁZDNO -> FORMULÁŘ (Zobrazí se jen pokud !isPast, díky podmínce showDateSection)
      plansHtml += `
                <div class="flex flex-col gap-2">
                    <div class="flex gap-2">
                        <select id="plan-type" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none flex-1">
                            <option value="discord">🎧 Discord</option>
                            <option value="game">🎮 Hra</option>
                            <option value="movie">🎬 Film</option>
                            <option value="date">📍 Rande</option>
                        </select>
                        <input type="time" id="plan-time" class="bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none w-20">
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="plan-name" placeholder="Co podnikneme?" class="flex-1 bg-[#202225] text-white text-xs p-2 rounded border border-[#2f3136] outline-none">
                        <button onclick="addCustomPlan()" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 rounded transition"><i class="fas fa-plus"></i></button>
                    </div>
                </div>`;
    }
    dateSection.innerHTML = plansHtml;
    dateSection.classList.remove("hidden");
  } else {
    // Pokud je minulost A zároveň tam nic není -> Skrýt
    dateSection.classList.add("hidden");
  }

  // =========================================================
  // --- B) ŠKOLA & POVINNOSTI ---
  // =========================================================

  if (isPast) {
    schoolSection.classList.add("hidden");
  } else {
    schoolSection.classList.remove("hidden");
    const schoolDisplay = document.getElementById("school-event-display");
    const schoolForm = document.getElementById("school-add-form");

    if (schoolEvent) {
      schoolDisplay.classList.remove("hidden");
      schoolForm.classList.add("hidden");
      document.getElementById("school-event-text").innerText =
        schoolEvent.title;

      const delBtn = schoolDisplay.querySelector("button");
      if (delBtn)
        delBtn.className =
          "absolute top-2 right-2 text-red-400 opacity-60 hover:opacity-100 transition px-2";
    } else {
      schoolDisplay.classList.add("hidden");
      schoolForm.classList.remove("hidden");
      document.getElementById("school-input").value = "";
    }
  }

  // =========================================================
  // --- C) ZDRAVÍ & POHYB (Zobrazujeme vždy, i zpětně) ---
  // =========================================================
  if (health) {
    healthSection.classList.remove("hidden");
    document.getElementById("modal-health-water").innerText =
      `${health.water}/8`;

    let sleepText = "-";

    if (typeof health.sleep === 'number') {
      const h = health.sleep;
      let icon = "😐";
      if (h < 5) icon = "🧟‍♀️";
      else if (h >= 9) icon = "👸";
      else if (h >= 7) icon = "✨";

      sleepText = `${h}h ${icon}`;
    } else {
      const sleepMap = {
        zombie: "Zombie 🧟‍♀️",
        ok: "Ujde to 😐",
        good: "Růženka 👸",
      };
      sleepText = sleepMap[health.sleep] || "-";
    }

    document.getElementById("modal-health-sleep").innerText = sleepText;
    document.getElementById("modal-health-period").innerText = health.period
      ? "Své dny 🩸"
      : "V klidu";

    const moveContainer = document.getElementById("modal-health-movement");
    if (moveContainer) {
      const moveIconMap = {
        gym: "💪 Fitko",
        walk: "🌲 Procházka",
        run: "🏃‍♀️ Běh",
        yoga: "🧘‍♀️ Jóga",
        sex: "🔥 Love",
        clean: "🧹 Úklid",
      };
      const moves = health.movement || [];
      if (moves.length > 0) {
        moveContainer.innerHTML = moves
          .map(
            (m) =>
              `<span class="bg-[#202225] px-2 py-1 rounded text-[10px] border border-gray-700">${moveIconMap[m] || m
              }</span>`,
          )
          .join("");
      } else {
        moveContainer.innerHTML =
          '<span class="text-gray-500 italic text-[10px]">Žádný pohyb</span>';
      }
    }
  } else {
    healthSection.classList.add("hidden");
  }

  // Zobrazit Modal
  document.getElementById("day-modal").style.display = "flex";
}

// Funkce pro aktualizaci UI školy uvnitř modalu
function updateSchoolUI(eventData) {
  const display = document.getElementById("school-event-display");
  const form = document.getElementById("school-add-form");
  const text = document.getElementById("school-event-text");
  const input = document.getElementById("school-input");

  if (eventData) {
    // Zobrazit událost, skrýt formulář
    display.classList.remove("hidden");
    form.classList.add("hidden");
    text.innerText = eventData.title;
  } else {
    // Zobrazit formulář, skrýt událost
    display.classList.add("hidden");
    form.classList.remove("hidden");
    input.value = ""; // Vyčistit input
  }
}

// Přidání školní události
function addSchoolEvent() {
  const input = document.getElementById("school-input");
  const title = input.value.trim();

  if (!title || !currentModalDateKey) return;

  state.schoolEvents[currentModalDateKey] = {
    title: title,
    type: "exam", // Můžeš rozšířit o typy
  };

  localStorage.setItem("klarka_school", JSON.stringify(state.schoolEvents));

  updateSchoolUI(state.schoolEvents[currentModalDateKey]);
  renderCalendar(); // Překreslit kalendář (aby se objevila tečka)
  triggerHaptic("success");
}

// Smazání školní události
function deleteSchoolEvent() {
  if (!currentModalDateKey) return;

  delete state.schoolEvents[currentModalDateKey];
  localStorage.setItem("klarka_school", JSON.stringify(state.schoolEvents));

  updateSchoolUI(null);
  renderCalendar();
}

// --- FUNKCE PRO ZPRACOVÁNÍ CHATU ---
function handleWelcomeChat(e) {
  if (e.key === "Enter") {
    const text = e.target.value.trim();
    if (!text) return;

    // 1. Přidat zprávu uživatele (Klárky)
    addMessageToChat("Klárka", "klarka_profilovka.webp", text);
    e.target.value = ""; // Vyčistit input

    // 2. Zpracovat příkazy (Easter Eggs)
    processCommand(text);
  }
}

function addMessageToChat(name, avatar, text, isBot = false) {
  const container = document.getElementById("new-messages-area");
  const scroller = document.getElementById("chat-scroller");

  const div = document.createElement("div");
  div.className =
    "message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-1 mt-1";

  const badge = isBot
    ? `<span class="text-[10px] bg-[#5865F2] text-white px-1 rounded uppercase font-bold flex-shrink-0 ml-1">BOT</span>`
    : "";
  const colorClass = isBot ? "text-[#5865F2]" : "text-white";

  div.innerHTML = `
                      <div class="flex gap-4 items-start">
                          <img src="${avatar}" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md flex-shrink-0" loading="lazy">
                          <div class="flex-1 min-w-0">
                              <div class="flex items-baseline gap-2">
                                  <span class="font-bold text-[var(--text-header)] hover:underline cursor-pointer">${name}</span>
                                  ${badge}
                                  <span class="text-xs text-[var(--interactive-normal)]">Právě teď</span>
                              </div>
                              <div class="text-[var(--text-normal)] mt-1 ${colorClass}">
                                  <p>${text}</p>
                              </div>
                          </div>
                      </div>
                  `;

  container.appendChild(div);
  // Automaticky skrolovat dolů
  scroller.scrollTop = scroller.scrollHeight;
}

function processCommand(text) {
  const lower = text.toLowerCase();
  const indicator = document.getElementById("typing-indicator");

  // Funkce pro simulaci psaní bota
  const botReply = (msg, delay = 1000) => {
    if (indicator) indicator.style.display = "flex"; // Zobrazit "System Bot píše..."
    setTimeout(() => {
      if (indicator) indicator.style.display = "none";
      addMessageToChat(
        "System Bot",
        "img/app/czippel2_kytka-modified.png",
        msg,
        true,
      ); // Použijeme tvé logo nebo random
    }, delay);
  };

  // --- LOGIKA PŘÍKAZŮ (UPDATED) ---

  // 1. LÁSKA & ROMANTIKA
  if (
    lower.startsWith("/miluju") ||
    lower.includes("laska") ||
    lower.includes("láska")
  ) {
    botReply(
      "❤️ Alert: Hladina lásky překročila kritickou mez! Systém se roztéká... ❤️",
      1000,
    );
    if (typeof triggerConfetti === "function") triggerConfetti();
  }

  // 2. ZVÍŘATA (Sovy, Chobotnice & Mývalové)
  else if (
    lower.includes("sova") ||
    lower.includes("sovy") ||
    lower.includes("hou")
  ) {
    // Náhodný fakt jen o SOVÁCH
    const fact =
      factsLibrary.owl[Math.floor(Math.random() * factsLibrary.owl.length)];
    botReply(`🦉 ${fact.text}`, 1000);
  } else if (lower.includes("chobotnice") || lower.includes("octopus")) {
    // Náhodný fakt jen o CHOBOTNICÍCH
    const fact =
      factsLibrary.octopus[
      Math.floor(Math.random() * factsLibrary.octopus.length)
      ];
    botReply(`🐙 ${fact.text}`, 1000);
  } else if (
    lower.includes("mýval") ||
    lower.includes("myval") ||
    lower.includes("raccoon")
  ) {
    // Náhodný fakt jen o MÝVALECH
    const fact =
      factsLibrary.raccoon[
      Math.floor(Math.random() * factsLibrary.raccoon.length)
      ];
    botReply(`🦝 ${fact.text}`, 1000);
  }

  // 3. GAMING (Tetris, Clash, Geoguessr)
  else if (lower.includes("tetris")) {
    botReply(
      "🧩 Padá to tam! Jsi připravena na další 1v1? (Jsem ve formě!)",
      1000,
    );
  } else if (lower.includes("clash") || lower.includes("royale")) {
    botReply("⚔️ Ten deck si fakt už změň... ale stejně si dáme 1v1? 👑", 1000);
  } else if (
    lower.includes("geo") ||
    lower.includes("guessr") ||
    lower.includes("mapa")
  ) {
    botReply(
      "🌍 To je na 100% Brazílie. Nebo Rusko. Nebo to křoví za barákem. Jsem ztracen bez tvé navigace!",
      1500,
    );
  }

  // 4. INSIDE JOKES (Podolí, Casio, Nero)
  else if (lower.includes("podolí") || lower.includes("podoli")) {
    botReply(
      "📍 Error 404: Location 'Podolí' not found. Did you mean: 'Kunovice - Předměstí'?",
      1000,
    );
  } else if (lower.includes("casio") || lower.includes("kalkulačka")) {
    botReply(
      "🧮 Nejlepší investice života! Plyšová kalkulačka > Bitcoin.",
      1000,
    );
  } else if (
    lower.includes("nero") ||
    lower.includes("požár") ||
    lower.includes("oheň")
  ) {
    botReply(
      "🔥 Já vím, já vím... Nero v Římě nebyl a na lyru nehrál. Díky za fact-check, paní učitelko! 🤓",
      1200,
    );
  }

  // 5. JÍDLO (Vafle, Popcorn)
  else if (
    lower.includes("hlad") ||
    lower.includes("jídlo") ||
    lower.includes("jidlo")
  ) {
    botReply(
      "🍔 Co takhle Kafec u Komína? Nebo pizzu v Mařaticích? Mrkni do Plánovače!",
      1000,
    );
    setTimeout(() => switchChannel("dateplanner"), 2500); // Přepne ji to tam
  } else if (lower.includes("popcorn") || lower.includes("zuby")) {
    botReply(
      "🍿 Popcorn je nástroj ďábla na ničení zubů! Gumídci jsou superior snack. 🐻",
      1000,
    );
  }

  // 6. SYSTÉMOVÉ VĚCI
  else if (lower.includes("heslo") || lower.includes("password")) {
    botReply("🔐 Tajné heslo je: 'Podolí neexistuje'. (Ale pššt!)", 1000);
  } else if (
    lower.startsWith("/help") ||
    lower.includes("pomoc") ||
    lower.includes("příkazy")
  ) {
    botReply(
      "🤖 **Dostupné příkazy:**\n`/miluju` - Vyznání lásky\n`/sova` - Moudrost\n`/chobotnice` - Biology fact\n`podolí` - Reality check\n`tetris` - Výzva\n`nero` - Historické okénko\n`hlad` - Pomoc s výběrem",
      500,
    );
  }

  // 7. DEFAULT
  else if (lower.startsWith("/")) {
    botReply(
      "❌ Neznámý příkaz. Zkus napsat `/help` pro seznam tajných kódů.",
      800,
    );
  } else {
    // Pokud napíše jen běžný text, občas může bot zareagovat obecně (volitelné)
    // botReply("👀 Zapisuji do deníku...", 2000);
  }
}



function showNextFact() {
  const display = document.getElementById("fact-display");

  // Efekt zmizení
  display.style.opacity = "0";
  display.style.transform = "translateY(5px)";

  setTimeout(() => {
    // Vybrat náhodný fakt
    const randomFact =
      animalFacts[Math.floor(Math.random() * animalFacts.length)];

    display.innerHTML = `
                          <div class="text-center">
                              <div class="text-3xl mb-2">${randomFact.icon}</div>
                              <span>${randomFact.text}</span>
                          </div>
                      `;

    // Efekt zobrazení
    display.style.opacity = "1";
    display.style.transform = "translateY(0)";
  }, 300);
}

function renderManual() {
  const container = document.getElementById("messages-container");
  container.innerHTML = `
                      <div class="flex gap-4 items-start"><img src="img/app/jozka_profilovka.jpg"
                       alt="Jožka"
                       class="w-10 h-10 rounded-full object-cover mt-1 shadow-md"><div class="flex-1"><div class="flex items-baseline gap-2"><span class="font-bold text-[var(--text-header)]">Jožka</span><span class="text-xs text-[var(--interactive-normal)]">Pinned</span></div><div class="bg-gradient-to-br from-[#2f3136] to-[#202225] border-l-4 border-[#faa61a] p-4 rounded-r-lg mt-3"><h3 class="font-bold text-white text-lg mb-3 flex items-center gap-2"><i class="fas fa-graduation-cap text-[#faa61a]"></i> Návod na stahování</h3><div class="space-y-4"><div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">1</div><div><p class="font-bold text-white">Instalace qBittorrent</p><p class="text-[var(--text-normal)] text-sm">Stáhni si z <a href="https://www.qbittorrent.org/download.php" target="_blank" class="text-[#5865F2] hover:underline font-bold">qbittorrent.org/download</a>. Neboj, není to virus.</p></div></div><div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">2</div><div><p class="font-bold text-white">Magnet Link 🧲</p><p class="text-[var(--text-normal)] text-sm">V knihovně klikni na ikonu stahování u položky. Otevře se ti to přímo v klientovi.</p></div></div><div class="flex gap-3"><div class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white flex-shrink-0">3</div><div><p class="font-bold text-white">HDMI kabel (ten 5m)</p><p class="text-[var(--text-normal)] text-sm">Připoj notebook k TV, zmáčkni <code class="bg-black px-1 rounded text-white">Win + P</code> a vyber "Duplicate" nebo "Extend".</p></div></div></div></div></div></div>`;
}

// --- TIMELINE DATA & GALLERY LOGIC ---

// --- GALERIE STATE ---
let currentGalleryImages = [];
let currentImageIndex = 0;
let currentGalleryTitle = "";

function openGallery(eventIndex) {
  const event = timelineEvents[eventIndex];
  if (!event.images || event.images.length === 0) return;

  currentGalleryImages = event.images;
  currentImageIndex = 0;
  currentGalleryTitle = event.title;

  updateGalleryUI();
  document.getElementById("gallery-modal").style.display = "flex";

  // Klávesové zkratky
  document.addEventListener("keydown", handleGalleryKeys);

  // --- NOVÉ: Aktivace swipe gest ---
  initGalleryGestures();
}

function closeGallery() {
  document.getElementById("gallery-modal").style.display = "none";
  document.removeEventListener("keydown", handleGalleryKeys);
}

function changeGalleryImage(direction) {
  currentImageIndex += direction;
  // Cyklování (když dojde na konec, skočí na začátek)
  if (currentImageIndex >= currentGalleryImages.length) currentImageIndex = 0;
  if (currentImageIndex < 0)
    currentImageIndex = currentGalleryImages.length - 1;

  updateGalleryUI();
}

function updateGalleryUI() {
  const img = document.getElementById("gallery-image");
  const title = document.getElementById("gallery-title");
  const counter = document.getElementById("gallery-counter");

  // Reset animace pro efekt přechodu
  img.classList.remove("animate-fade-in");
  void img.offsetWidth; // Trigger reflow
  img.classList.add("animate-fade-in");

  img.src = currentGalleryImages[currentImageIndex];
  title.textContent = currentGalleryTitle;
  counter.textContent = `${currentImageIndex + 1} z ${currentGalleryImages.length
    }`;
}

function handleGalleryKeys(e) {
  if (e.key === "Escape") closeGallery();
  if (e.key === "ArrowRight") changeGalleryImage(1);
  if (e.key === "ArrowLeft") changeGalleryImage(-1);
}

// --- OPRAVA: SWIPE GESTA PRO GALERII (S ochranou proti vícenásobnému spuštění) ---
let galleryTouchStartX = 0;
let galleryTouchEndX = 0;
let isGalleryGesturesInit = false; // Nová pojistka

function initGalleryGestures() {
  // Pokud už jsou gesta zapnutá, ukončíme funkci, abychom je nepřidali znovu
  if (isGalleryGesturesInit) return;

  const modal = document.getElementById("gallery-modal");

  // Zachytíme začátek dotyku
  modal.addEventListener(
    "touchstart",
    (e) => {
      galleryTouchStartX = e.changedTouches[0].screenX;
    },
    { passive: true },
  );

  // Zachytíme konec dotyku a vyhodnotíme směr
  modal.addEventListener(
    "touchend",
    (e) => {
      galleryTouchEndX = e.changedTouches[0].screenX;
      handleGallerySwipe();
    },
    { passive: true },
  );

  // Nastavíme pojistku na TRUE -> příště už se tento kód neprovede
  isGalleryGesturesInit = true;
  console.log("Gallery gestures initialized.");
}

function handleGallerySwipe() {
  const threshold = 50; // Minimální vzdálenost v px pro swipe
  const diff = galleryTouchStartX - galleryTouchEndX;

  if (Math.abs(diff) > threshold) {
    if (diff > 0) {
      // Swipe DOLEVA (prst jde doleva -> chceme DALŠÍ fotku)
      changeGalleryImage(1);
    } else {
      // Swipe DOPRAVA (prst jde doprava -> chceme PŘEDCHOZÍ fotku)
      changeGalleryImage(-1);
    }
  }
}

// --- JUMP TO TIMELINE (Navigace z mapy) ---
function jumpToTimeline(index) {
  // 1. Přepnout kanál
  switchChannel('timeline');

  // 2. Počkat na vykreslení a scrollovat
  setTimeout(() => {
    const element = document.getElementById(`timeline-event-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 3. Efekt zvýraznění
      element.classList.add('ring-4', 'ring-[#eb459e]', 'scale-105', 'transition-transform');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-[#eb459e]', 'scale-105');
      }, 1500);
    }
  }, 100);
}

function renderTimeline() {
  const container = document.getElementById("messages-container");

  let html = `
                      <div class="p-4 md:p-8 max-w-4xl mx-auto">
                          <h3 class="text-white font-bold text-2xl mb-8 pl-4 border-l-4 border-[#5865F2] animate-fade-in">
                              Naše Společná Cesta
                          </h3>
                          <div class="relative pl-8 sm:pl-12 border-l-2 border-[#2f3136] ml-2 md:ml-0 space-y-12 pb-10">
                  `;

  timelineEvents.forEach((event, index) => {
    // Rozlišení stylů pro barvy vs gradient
    const isGradient = event.color === "gradient";
    const circleBg = isGradient
      ? "bg-gradient-to-r from-[#5865F2] to-[#eb459e]"
      : `bg-[${event.color}]`;
    // Pro Tailwind musíme použít inline style pro dynamické barvy, pokud nejsou v safelistu,
    // ale zde použijeme raději inline style pro jistotu.
    const circleStyle = isGradient ? "" : `background-color: ${event.color}`;

    // Tlačítko galerie (zobrazí se jen pokud jsou fotky)
    let galleryBtn = "";
    if (event.images && event.images.length > 0) {
      galleryBtn = `
                              <button onclick="openGallery(${index})" class="mt-3 flex items-center gap-2 bg-[#202225] hover:bg-[#292b2f] text-gray-300 hover:text-white px-3 py-2 rounded transition border border-gray-700 hover:border-gray-500 group/btn">
                                  <i class="fas fa-images text-[#5865F2] group-hover/btn:scale-110 transition-transform"></i>
                                  <span class="text-xs font-bold uppercase tracking-wide">Zobrazit vzpomínky (${event.images.length})</span>
                              </button>
                          `;
    }

    // NOVÉ: Přidáno ID pro scrollování a locationId info
    let locationBadge = "";
    if (event.locationId) {
      // Můžeme přidat malý odkaz zpět na mapu, ale zatím stačí ID
    }

    html += `
                          <div id="timeline-event-${index}" class="relative group animate-fade-in transition-all duration-500" style="animation-delay: ${index * 100}ms">
                              <div class="absolute -left-[45px] sm:-left-[61px] top-0 w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-[#36393f] shadow-lg transition transform group-hover:scale-110" style="${circleStyle}" class="${isGradient
        ? "bg-gradient-to-r from-[#5865F2] to-[#eb459e]"
        : ""
      }">
                                  <i class="fas ${event.icon
      } text-white text-sm"></i>
                              </div>

                              <div class="bg-[#2f3136] p-5 rounded-lg border border-[#202225] hover:border-[#5865F2]/50 transition shadow-md hover:shadow-xl relative overflow-hidden">
                                  ${isGradient
        ? '<div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#5865F2] to-[#eb459e]"></div>'
        : ""
      }
                                  
                                  <div class="flex justify-between items-start mb-2">
                                      <h4 class="font-bold text-white text-lg flex items-center gap-2">
                                          ${event.title}
                                      </h4>
                                      ${event.date ? `<span class="text-xs text-gray-500 bg-[#202225] px-2 py-1 rounded">${event.date}</span>` : ''}
                                  </div>

                                  <p class="text-gray-300 text-sm leading-relaxed opacity-90">
                                      ${event.desc}
                                  </p>

                                  ${galleryBtn}
                              </div>
                          </div>
                      `;
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

function renderLibrary(category) {
  const container = document.getElementById("messages-container");
  const items = library[category] || [];

  if (items.length === 0) {
    container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-500"><i class="fas fa-ghost text-4xl mb-4 opacity-50"></i><p>Nic tu není...</p></div>`;
    return;
  }

  // Grouping & Sorting
  const groups = {};
  items.forEach((item) => {
    const catName = item.cat || "Ostatní";
    if (!groups[catName]) groups[catName] = [];
    groups[catName].push(item);
  });

  // Pořadí kategorií
  const categoryOrder = [
    "Akční",
    "Sci-Fi",
    "Komedie",
    "Animovaný",
    "Fantasy",
    "Drama",
    "Horor",
    "Romantický",
    "Dobrodružný",
    "RPG",
    "FPS",
    "Strategie",
    "Simulátor",
    "Závodní",
  ];
  const sortedCategories = Object.keys(groups).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  let html = `<div class="p-6 pb-20 animate-fade-in space-y-10">`;

  sortedCategories.forEach((catName) => {
    const groupItems = groups[catName];
    groupItems.sort((a, b) => a.title.localeCompare(b.title));

    html += `
              <div>
                  <h2 class="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-[#202225] pb-2 sticky top-0 bg-[#36393f] z-30 pt-2">
                      <span class="text-[#eb459e]">#</span> ${catName}
                      <span class="text-xs text-gray-500 font-normal ml-auto bg-[#202225] px-2 py-1 rounded-full">${groupItems.length}</span>
                  </h2>
                  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">`;

    groupItems.forEach((item) => {
      const historyData = state.watchHistory[item.id] || {};
      const status = historyData.status || "unseen";
      const userRating = historyData.rating || 0;
      const watchlist = state.watchlist || [];
      const isBookmarked = watchlist.some((w) =>
        typeof w === "object" ? w.id === item.id : w === item.id,
      );

      // Escapování
      const safeTitle = (item.title || "").replace(/'/g, "\\'");
      const safeMagnet = (item.magnet || "").replace(/'/g, "\\'");
      const safeGdrive = (item.gdrive || "").replace(/'/g, "\\'");
      const safeTrailer = (item.trailer || "").replace(/'/g, "\\'");
      const itemType = category === "games" ? "game" : "movie";

      let statusBadge = "";
      if (status === "seen")
        statusBadge =
          '<span class="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md z-10"><i class="fas fa-check"></i> VIDĚNO</span>';
      else if (status === "watching")
        statusBadge =
          '<span class="absolute top-2 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-bold shadow-md z-10"><i class="fas fa-play"></i> ROZKOUKÁNO</span>';

      html += `
                  <div class="library-card group relative bg-[#2f3136] rounded-xl overflow-hidden border border-[#202225] hover:border-[#5865F2] transition-all shadow-lg flex flex-col">
                      ${statusBadge}

                      <button onclick="event.stopPropagation(); toggleWatchlist(${item.id
        })" class="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur hover:bg-[#eb459e] flex items-center justify-center transition ${isBookmarked
          ? "text-[#eb459e] bg-white/10"
          : "text-gray-400"
        }"><i class="${isBookmarked ? "fas" : "far"} fa-heart"></i></button>

                      <div class="poster-area h-40 bg-[#202225] flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-500 relative cursor-pointer" onclick="openHistoryModal(${item.id
        })">
                          ${item.icon}
                          ${item.trailer
          ? '<div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fas fa-play text-white/80 text-3xl drop-shadow-lg"></i></div>'
          : ""
        }
                      </div>

                      <div class="p-3 flex flex-col flex-1">
                          <h3 class="font-bold text-white text-sm leading-tight mb-1 group-hover:text-[#5865F2] transition line-clamp-2" title="${item.title
        }">${item.title}</h3>
                          <div class="mt-auto pt-3 border-t border-[#202225] flex justify-between items-center gap-1">

                              ${item.trailer
          ? `<button onclick="event.stopPropagation(); openTrailer('${safeTrailer}')" class="text-gray-400 hover:text-[#ff0000] p-1.5 rounded transition"><i class="fab fa-youtube"></i></button>`
          : `<div class="w-6"></div>`
        }

                              <button onclick="event.stopPropagation(); openPlanningModal('${safeTitle}', '${itemType}')" class="text-gray-400 hover:text-[#5865F2] p-1.5 rounded transition" title="Naplánovat"><i class="far fa-calendar-plus"></i></button>

                              <button onclick="event.stopPropagation(); openDownloadModal('${safeMagnet}', '${safeGdrive}')" class="text-gray-400 hover:text-[#3ba55c] p-1.5 rounded transition"><i class="fas fa-cloud-download-alt"></i></button>

                              <button onclick="event.stopPropagation(); openHistoryModal(${item.id
        })" class="${userRating > 0
          ? "text-[#faa61a]"
          : "text-gray-400"
        } hover:text-white p-1.5 rounded transition"><i class="${userRating > 0 ? "fas" : "far"
        } fa-star"></i></button>
                          </div>
                      </div>
                  </div>`;
    });
    html += `</div></div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// --- PLÁNOVÁNÍ (Kalendář) ---
// Globální proměnné pro uchování dat během otevřeného modalu
let currentPlanData = { title: "", type: "" };

// 1. Otevření modalu (volá se tlačítkem z knihovny)
function openPlanningModal(title, type) {
  currentPlanData = { title, type };

  // Nastavení textů v modalu
  document.getElementById("plan-item-title").innerText = title;
  document.getElementById("plan-item-type").innerText =
    type === "game" ? "HRA" : "FILM / SERIÁL";

  // Předvyplnění data (dnešek)
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("lib-plan-date").value = today;
  document.getElementById("lib-plan-note").value = ""; // Reset poznámky

  // Zobrazení
  document.getElementById("library-plan-modal").style.display = "flex";
}

// 2. Potvrzení a uložení (volá se tlačítkem v modalu)
function confirmLibraryPlan() {
  const dateStr = document.getElementById("lib-plan-date").value;
  const timeStr = document.getElementById("lib-plan-time").value;
  const noteStr = document.getElementById("lib-plan-note").value;

  if (!dateStr) {
    showNotification("Musíš vybrat datum!", "error");
    return;
  }

  if (!state.plannedDates) state.plannedDates = {};

  // Uložení do kalendáře
  state.plannedDates[dateStr] = {
    id: "lib-" + Date.now(),
    name: currentPlanData.title,
    cat: currentPlanData.type, // 'movie' nebo 'game'
    time: timeStr,
    note: noteStr || "Z knihovny",
  };

  localStorage.setItem(
    "klarka_planned_dates",
    JSON.stringify(state.plannedDates),
  );

  // Zavřít modal a informovat
  closeModal("library-plan-modal");
  showNotification(`📅 Naplánováno: ${currentPlanData.title}`, "success");
  triggerConfetti();
}

// Funkce pro naplánování položky z knihovny
function planLibraryItem(title, type) {
  // Získáme dnešní datum jako výchozí pro prompt
  const today = new Date().toISOString().split("T")[0];

  const dateStr = prompt(
    `Na kdy chceš naplánovat "${title}"? (formát RRRR-MM-DD)`,
    today,
  );

  if (dateStr) {
    // Jednoduchá validace formátu data
    if (!dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      alert("Špatný formát data! Použij RRRR-MM-DD (např. 2026-01-15)");
      return;
    }

    // Uložení do state.plannedDates
    // ID generujeme unikátní, abychom nepřepsali jiné plány
    state.plannedDates[dateStr] = {
      id: "lib-" + Date.now(),
      name: title,
      cat: type, // 'movie' nebo 'game'
      time: "20:00", // Default čas
      note: "Z knihovny",
    };

    // Uložení do localStorage
    localStorage.setItem(
      "klarka_planned_dates",
      JSON.stringify(state.plannedDates),
    );

    showNotification(`📅 Naplánováno: ${title}`, "success");
    triggerConfetti();
  }
}

// --- NOVÉ FUNKCE PRO HODNOCENÍ A TRAILER ---

function rateItem(id, rating) {
  // Pokud klikne znovu na stejné hodnocení, zruší ho (na 0)
  triggerHaptic("medium");
  if (state.ratings[id] === rating) {
    delete state.ratings[id];
  } else {
    state.ratings[id] = rating;
  }

  // Uložit do localStorage
  localStorage.setItem("klarka_ratings", JSON.stringify(state.ratings));

  // Překreslit, aby se změna hned projevila
  renderLibrary(state.currentChannel);
}

// --- WATCH HISTORY LOGIC ---
let currentHistoryStatus = "unseen";

function openHistoryModal(id) {
  const item = state.watchHistory[id] || {
    status: "unseen",
    date: "",
    reaction: "",
  };

  document.getElementById("history-item-id").value = id;
  document.getElementById("history-modal").style.display = "flex";

  // Nastavit uložené hodnoty
  if (item.date) document.getElementById("history-date").value = item.date;
  else document.getElementById("history-date").valueAsDate = new Date(); // Default dnešek

  document.getElementById("history-reaction").value = item.reaction || "";

  setHistoryStatus(item.status);
}

function setHistoryStatus(status) {
  currentHistoryStatus = status;

  // Visual update tlačítek
  document.querySelectorAll(".status-btn").forEach((btn) => {
    btn.classList.add("opacity-50", "border-gray-600");
    btn.classList.remove("opacity-100", "border-[#eb459e]", "bg-[#2f3136]");
  });

  const activeBtn = document.getElementById(`status-${status}`);
  if (activeBtn) {
    activeBtn.classList.remove("opacity-50", "border-gray-600");
    activeBtn.classList.add("opacity-100", "border-[#eb459e]", "bg-[#2f3136]");
  }

  // Show/Hide inputs based on status
  const dateWrapper = document.getElementById("history-date-wrapper");
  const reactionWrapper = document.getElementById("history-reaction-wrapper");

  if (status === "unseen") {
    dateWrapper.classList.add("hidden");
    reactionWrapper.classList.add("hidden");
  } else if (status === "watching") {
    dateWrapper.classList.remove("hidden");
    reactionWrapper.classList.add("hidden");
  } else if (status === "seen") {
    dateWrapper.classList.remove("hidden");
    reactionWrapper.classList.remove("hidden");
  }
}

function setReactionInput(emoji) {
  const input = document.getElementById("history-reaction");
  input.value = emoji;
}

function saveHistory() {
  const id = document.getElementById("history-item-id").value;
  const date = document.getElementById("history-date").value;
  const reaction = document.getElementById("history-reaction").value;

  // Pokud je unseen, smažeme data, jinak uložíme
  if (currentHistoryStatus === "unseen") {
    delete state.watchHistory[id];
  } else {
    state.watchHistory[id] = {
      status: currentHistoryStatus,
      date: date,
      reaction: reaction,
    };
  }

  localStorage.setItem(
    "klarka_watch_history",
    JSON.stringify(state.watchHistory),
  );
  closeModal("history-modal");
  showNotification("Deníček aktualizován! 📝", "success");

  // Překreslit knihovnu
  renderLibrary(state.currentChannel);
}

function rateDate(id, rating) {
  triggerHaptic("medium");
  // Logika: Kliknutí na stejné číslo hodnocení zruší
  if (state.dateRatings[id] === rating) {
    delete state.dateRatings[id];
    showNotification("Hodnocení rande zrušeno", "info");
  } else {
    state.dateRatings[id] = rating;
    showNotification("Rande ohodnoceno! ❤️", "success");
  }

  // Uložit do localStorage
  localStorage.setItem(
    "klarka_date_ratings",
    JSON.stringify(state.dateRatings),
  );

  // Překreslit seznam i markery, aby se hvězdy hned ukázaly
  // Zjistíme aktuální filtr, abychom ho udrželi
  const currentFilter =
    document.querySelector(".filter-btn.bg-\\[\\#5865F2\\]")?.dataset.filter ||
    "all";

  // Re-render seznamu
  const searchVal =
    document.getElementById("planner-search-desktop")?.value || "";
  if (searchVal) searchLocations(searchVal);
  else filterMap(currentFilter);

  // Re-render detailu (aby se aktualizovaly barvy hvězd v panelu)
  selectLocation(id);
}

function playTrailer(title) {
  // Otevře YouTube vyhledávání v novém okně
  const query = encodeURIComponent(`${title} trailer`);
  const url = `https://www.youtube.com/results?search_query=${query}`;
  window.open(url, "_blank");
}

function renderUpgrade() {
  const container = document.getElementById("messages-container");
  container.innerHTML = `
                  <div class="message-group">
                      <div class="message-actions">
                          <i class="fas fa-download text-gray-400 hover:text-white cursor-pointer p-1" data-tooltip="Rychlé stažení"></i>
                      </div>
                      <div class="flex gap-4 items-start">
                          <img src="img/app/jozka_profilovka.jpg" alt="Jožka" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md" loading="lazy">
                          <div class="flex-1">
                              <div class="flex items-baseline gap-2">
                                  <span class="font-bold text-[var(--text-header)]">Jožka</span>
                                  <span class="text-xs text-[var(--interactive-normal)]">Pinned</span>
                              </div>
                              <div onclick="startConfession()" class="mt-4 bg-[#2f3136] border border-[#292b2f] rounded p-3 flex items-center gap-3 w-full max-w-sm cursor-pointer hover:bg-[#36393f] transition group">
                                  <div class="file-icon-wrapper w-10 h-10 flex items-center justify-center text-4xl text-[#5865F2]">
                                      <i class="fas fa-file-code"></i>
                                  </div>
                                  <div class="flex-1 min-w-0">
                                      <div class="text-[#5865F2] font-medium truncate group-hover:underline text-sm">system_patch_v2.0.exe</div>
                                      <div class="text-xs text-[#b9bbbe]">1.2 MB • Executable</div>
                                  </div>
                                  <div class="text-[#b9bbbe] hover:text-white transition text-lg">
                                      <i class="fas fa-download"></i>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>`;
}

function renderDatePlanner() {
  const container = document.getElementById("messages-container");

  container.innerHTML = `
              <div class="relative w-full h-full flex flex-col md:flex-row overflow-hidden bg-[#36393f]">

                  <div class="md:hidden absolute top-4 left-4 right-4 z-[1000] flex gap-2">
                      <div class="flex-1 bg-[#202225]/90 backdrop-blur shadow-lg rounded-lg flex items-center px-3 py-2 border border-gray-700">
                          <i class="fas fa-search text-gray-400 mr-2"></i>
                          <input type="text" id="planner-search-mobile" oninput="searchLocations(this.value)" placeholder="Kam vyrazíme?" class="bg-transparent text-white text-sm w-full outline-none placeholder-gray-500">
                      </div>

                      <button onclick="pickRandomLocation()" class="bg-[#eb459e] text-white w-10 h-10 rounded-lg shadow-lg flex items-center justify-center flex-shrink-0 active:scale-95 transition" title="Zkusit štěstí">
                          <i class="fas fa-dice"></i>
                      </button>

                      <button onclick="toggleMobileList()" class="bg-[#5865F2] text-white w-10 h-10 rounded-lg shadow-lg flex items-center justify-center flex-shrink-0 active:scale-95 transition">
                          <i class="fas fa-list"></i>
                      </button>
                  </div>

                  <div class="md:hidden absolute top-16 left-0 right-0 z-[1000] px-1 overflow-x-auto hide-scrollbar flex gap-1 pb-2 justify-center">
                       <button onclick="filterMap('all')" data-filter="all" class="filter-btn px-2.5 py-1.5 bg-[#202225]/90 backdrop-blur text-gray-300 rounded-full text-xs shadow-md border border-gray-700 whitespace-nowrap transition-all duration-200">Vše</button>
                       <button onclick="filterMap('walk')" data-filter="walk" class="filter-btn px-2.5 py-1.5 bg-[#202225]/90 backdrop-blur text-gray-300 rounded-full text-xs shadow-md border border-gray-700 whitespace-nowrap transition-all duration-200"><i class="fas fa-tree mr-1"></i> Procházky</button>
                       <button onclick="triggerHaptic('light');filterMap('view')" data-filter="view" class="filter-btn px-2.5 py-1.5 bg-[#202225]/90 backdrop-blur text-gray-300 rounded-full text-xs shadow-md border border-gray-700 whitespace-nowrap transition-all duration-200"><i class="fas fa-binoculars mr-1"></i> Výhledy</button>
                       <button onclick="filterMap('fun')" data-filter="fun" class="filter-btn px-2.5 py-1.5 bg-[#202225]/90 backdrop-blur text-gray-300 rounded-full text-xs shadow-md border border-gray-700 whitespace-nowrap transition-all duration-200"><i class="fas fa-bolt mr-1"></i> Zábava</button>
                       <button onclick="filterMap('food')" data-filter="food" class="filter-btn px-2.5 py-1.5 bg-[#202225]/90 backdrop-blur text-gray-300 rounded-full text-xs shadow-md border border-gray-700 whitespace-nowrap transition-all duration-200"><i class="fas fa-utensils mr-1"></i> Jídlo</button>
                  </div>

                  <div id="planner-sidebar" class="w-full md:w-80 bg-[#2f3136] border-r border-[#202225] flex-col flex-shrink-0 z-30 shadow-lg mobile-list-overlay md:flex md:relative pt-[120px] md:pt-0">

                      <div class="hidden md:block p-4 border-b border-[#202225] bg-[#2f3136]">
                          <h2 class="text-white font-bold flex items-center gap-2 mb-3 w-full">
                              <span class="flex items-center gap-2"><i class="fas fa-map-marked-alt text-[#eb459e]"></i> Kam vyrazíme?</span>

                              <button onclick="pickRandomLocation()" class="ml-auto text-xs bg-[#202225] hover:bg-[#eb459e] border border-gray-600 hover:border-[#eb459e] text-gray-300 hover:text-white px-2 py-1 rounded transition flex items-center gap-1 group">
                                  <i class="fas fa-dice group-hover:rotate-180 transition-transform duration-500"></i>
                                  <span>Zkusit štěstí</span>
                              </button>
                          </h2>
                          <div class="flex gap-1 overflow-x-auto custom-scrollbar pb-2 mb-2">
                              <button onclick="filterMap('all')" data-filter="all" class="filter-btn px-3 py-1 bg-[#202225] text-gray-300 rounded text-xs whitespace-nowrap hover:bg-[#40444b] transition-colors">Vše</button>
                              <button onclick="filterMap('walk')" data-filter="walk" class="filter-btn px-3 py-1 bg-[#202225] text-gray-300 rounded text-xs whitespace-nowrap hover:bg-[#40444b] transition-colors">Procházky</button>
                              <button onclick="triggerHaptic('light');filterMap('view')" data-filter="view" class="filter-btn px-3 py-1 bg-[#202225] text-gray-300 rounded text-xs whitespace-nowrap hover:bg-[#40444b] transition-colors">Výhledy</button>
                              <button onclick="filterMap('fun')" data-filter="fun" class="filter-btn px-3 py-1 bg-[#202225] text-gray-300 rounded text-xs whitespace-nowrap hover:bg-[#40444b] transition-colors">Zábava</button>
                              <button onclick="filterMap('food')" data-filter="food" class="filter-btn px-3 py-1 bg-[#202225] text-gray-300 rounded text-xs whitespace-nowrap hover:bg-[#40444b] transition-colors">Jídlo</button>
                          </div>
                          <div class="relative group">
                              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><i class="fas fa-search text-gray-500"></i></div>
                              <input type="text" id="planner-search-desktop" oninput="searchLocations(this.value)" placeholder="Hledat místo..." class="w-full bg-[#202225] text-white text-xs rounded pl-8 pr-2 py-2 border border-[#202225] focus:border-[#5865F2] focus:outline-none transition">
                          </div>
                      </div>

                      <div class="px-4 py-3 bg-[#292b2f] border-b border-[#202225] flex-shrink-0">
                          <div class="flex justify-between items-center mb-2">
                              <h3 class="text-[var(--pink)] font-bold text-xs uppercase tracking-wide">🗺️ Trasa (<span id="route-count">0</span>)</h3>
                              <button onclick="toggleMobileList()" class="md:hidden text-gray-400"><i class="fas fa-times"></i></button>
                              <button onclick="clearRoute()" class="hidden md:block text-[10px] text-gray-400 hover:text-white underline">Smazat</button>
                          </div>
                          <div id="route-list" class="space-y-1 mb-2 text-gray-400 text-xs italic max-h-20 overflow-y-auto">Zatím žádné zastávky...</div>
                          <button onclick="openRouteInGoogle()" id="open-route-btn" class="w-full bg-[#202225] text-gray-500 py-2 rounded text-xs font-bold cursor-not-allowed transition" disabled>Otevřít v Google Maps</button>
                      </div>

                      <div id="location-list" class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 pb-20 md:pb-2"></div>
                  </div>

                  <div class="flex-1 flex flex-col relative bg-[#36393f] w-full h-full">
                      <div id="map-container" class="absolute inset-0 z-0">
                          <div id="leaflet-map"></div>
                      </div>

                      <div id="detail-panel" class="absolute bottom-0 left-0 right-0 p-0 transition-transform duration-300 z-[500] transform translate-y-full mobile-map-overlay">

                          <div id="sheet-handle" class="sheet-handle-area touch-none bg-[#2f3136] rounded-t-2xl border-b border-[#202225] flex-shrink-0 cursor-grab active:cursor-grabbing py-3">
                              <div class="sheet-handle-bar bg-gray-600 w-12 h-1.5 rounded-full mx-auto"></div>
                          </div>

                          <button onclick="closeDetailPanel()" class="absolute top-3 right-4 text-gray-400 p-2 hover:text-white z-50 bg-[#2f3136]/50 rounded-full"><i class="fas fa-times"></i></button>

                          <div id="detail-content" class="flex-1 overflow-y-auto p-4 pt-2 bg-[#2f3136]">
                                  <div>
                                      <h3 class="text-xl font-bold text-white flex items-center gap-2 flex-wrap">
                                          <span id="detail-title">Název</span>
                                          <span id="detail-cat" class="text-[10px] px-2 py-0.5 rounded bg-[#5865F2] text-white uppercase tracking-wider">KAT</span>
                                          <span id="detail-weather-badge"></span> </h3>
                                      <p id="detail-desc" class="text-gray-400 text-sm mt-1">Popis...</p>
                                      <div id="detail-rating-container"></div>
                                  </div>

                                  <div class="flex gap-2 mb-4 mt-4">
                                      <button id="add-to-route-btn" onclick="triggerHaptic('success'); addToRoute()" class="flex-1 text-xs bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 py-3 rounded transition font-bold shadow-md">
                                          <i class="fas fa-plus"></i> Přidat
                                      </button>
                                      <a id="detail-google" href="#" target="_blank" class="flex-1 text-center text-xs bg-[#202225] hover:bg-[#eb459e] text-gray-300 hover:text-white px-3 py-3 rounded transition font-bold border border-gray-600">
                                          <i class="fas fa-external-link-alt"></i> Mapa
                                      </a>
                                  </div>

                                  <div class="grid grid-cols-1 gap-3 bg-[#202225] p-3 rounded-lg border border-[#202225]">
                                      <div>
                                          <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-1">Kdy to vidíš?</label>
                                          <div class="flex gap-2">
                                              <input type="datetime-local" id="date-input" class="flex-1 bg-[#2f3136] text-white p-2 rounded border border-[#40444b] outline-none text-sm">
                                              <button onclick="saveDateToCalendar()" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-3 rounded font-bold transition" title="Uložit do kalendáře">
                                                  <i class="fas fa-calendar-plus"></i>
                                              </button>
                                          </div>
                                      </div>
                                      <div>
                                          <label class="block text-[#b9bbbe] text-[10px] font-bold uppercase mb-1">Poznámka</label>
                                          <div class="flex gap-2">
                                              <input type="text" id="note-input" placeholder="Dáme pak kafe?" class="flex-1 bg-[#2f3136] text-white p-2 rounded border border-[#40444b] outline-none text-sm">
                                              <button onclick="copyDateInvite()" class="bg-[#3ba55c] hover:bg-[#2d7d46] text-white px-3 rounded font-bold transition flex items-center gap-2 text-sm" title="Zkopírovat pozvánku">
                                                  <i class="fas fa-copy"></i>
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                          </div>
                      </div>
                  </div>
              </div>
          `;

  filterMap("all"); // Initialize
  updateRouteUI();

  setTimeout(() => {
    initMap();
    setTimeout(() => {
      initBottomSheetGestures();
    }, 500);
    if (state.mapInstance) state.mapInstance.invalidateSize();
  }, 100);
}

// --- WEATHER UTILS ---
function getWeatherInfo(code) {
  // WMO Weather interpretation codes (WW)
  const map = {
    0: { icon: "☀️", text: "Jasno" },
    1: { icon: "🌤️", text: "Skoro jasno" },
    2: { icon: "⛅", text: "Polojasno" },
    3: { icon: "☁️", text: "Zataženo" },
    45: { icon: "🌫️", text: "Mlha" },
    48: { icon: "🌫️", text: "Mlha" },
    51: { icon: "🌦️", text: "Mrholení" },
    53: { icon: "🌦️", text: "Mrholení" },
    55: { icon: "🌧️", text: "Husté mrholení" },
    61: { icon: "🌧️", text: "Slabý déšť" },
    63: { icon: "🌧️", text: "Déšť" },
    65: { icon: "🌧️", text: "Silný déšť" },
    71: { icon: "❄️", text: "Slabý sníh" },
    73: { icon: "❄️", text: "Sníh" },
    75: { icon: "❄️", text: "Silný sníh" },
    77: { icon: "❄️", text: "Sněhové zrna" },
    80: { icon: "🌧️", text: "Přeháňky" },
    81: { icon: "🌧️", text: "Silné přeháňky" },
    82: { icon: "⛈️", text: "Průtrž mračen" },
    95: { icon: "⛈️", text: "Bouřka" },
    96: { icon: "⛈️", text: "Bouřka s kroupami" },
    99: { icon: "⛈️", text: "Silná bouřka" },
  };
  return map[code] || { icon: "🌡️", text: "Neznámé" };
}

async function fetchLocationWeather(lat, lng) {
  const weatherContainer = document.getElementById("detail-weather-badge");

  // Loading stav
  if (weatherContainer) {
    weatherContainer.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Načítám počasí...`;
    weatherContainer.className =
      "text-[10px] px-2 py-0.5 rounded bg-[#202225] text-gray-400 border border-gray-700 flex items-center gap-1";
  }

  try {
    // Volání Open-Meteo API
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
    );
    const data = await response.json();

    const weather = data.current_weather;
    const info = getWeatherInfo(weather.weathercode);

    // Update UI
    if (weatherContainer) {
      weatherContainer.innerHTML = `${info.icon} ${Math.round(
        weather.temperature,
      )}°C • ${info.text}`;
      // Změníme barvu podle teploty (pro efekt)
      if (weather.temperature < 5)
        weatherContainer.className =
          "text-[10px] px-2 py-0.5 rounded bg-[#2f3136] text-blue-300 border border-blue-900/50 font-bold animate-fade-in";
      else if (weather.temperature > 25)
        weatherContainer.className =
          "text-[10px] px-2 py-0.5 rounded bg-[#2f3136] text-orange-400 border border-orange-900/50 font-bold animate-fade-in";
      else
        weatherContainer.className =
          "text-[10px] px-2 py-0.5 rounded bg-[#2f3136] text-white border border-gray-600 font-bold animate-fade-in";
    }
  } catch (error) {
    console.error("Weather error:", error);
    if (weatherContainer) weatherContainer.innerHTML = "⚠️ Počasí nedostupné";
  }
}

// --- MOBILE PLANNER LOGIC ---

function toggleMobileList() {
  const sidebar = document.getElementById("planner-sidebar");
  sidebar.classList.toggle("active");
}

function closeDetailPanel() {
  const panel = document.getElementById("detail-panel");

  // Zavřeme panel posunutím dolů (funguje teď na mobilu i PC)
  if (panel) {
    panel.style.transform = "translateY(100%)";
  }

  // Zrušíme výběr
  selectedDateLocation = null;
}

// --- ROUTE PLANNER LOGIC ---
function addToRoute() {
  if (!selectedDateLocation) return;

  // Kontrola, jestli už místo v trase není
  if (state.route.some((loc) => loc.id === selectedDateLocation.id)) {
    showNotification("Už je v trase!", "info");
    return;
  }

  // Přidání do pole a aktualizace UI
  state.route.push(selectedDateLocation);
  updateRouteUI();
  showNotification(`Přidáno: ${selectedDateLocation.name}`, "success");

  // --- MOBILNÍ FIX: Automaticky ukázat plánovač ---
  if (window.innerWidth < 768) {
    // 1. Zavřeme detail panel (to okno dole)
    closeDetailPanel();

    // 2. Otevřeme sidebar (seznam tras), aby viděla, že se to tam přidalo
    const sidebar = document.getElementById("planner-sidebar");
    if (sidebar) {
      sidebar.classList.add("active");
      // Pro jistotu vyrolujeme nahoru, kde je sekce "Trasa"
      sidebar.scrollTop = 0;
    }
  }
}

function removeFromRoute(id) {
  state.route = state.route.filter((loc) => loc.id !== id);
  updateRouteUI();
}

function clearRoute() {
  state.route = [];
  updateRouteUI();
}

function updateRouteUI() {
  const list = document.getElementById("route-list");
  const count = document.getElementById("route-count");
  const btn = document.getElementById("open-route-btn");

  if (!list) return; // Guard clause if not rendered

  count.innerText = state.route.length;

  if (state.route.length === 0) {
    list.innerHTML =
      '<span class="text-gray-500 italic pl-1">Vyber místa a klikni na "+ Přidat do trasy"</span>';
    btn.classList.add("bg-[#202225]", "text-gray-500", "cursor-not-allowed");
    btn.classList.remove("bg-[#5865F2]", "text-white", "hover:bg-[#4752c4]");
    btn.disabled = true;
  } else {
    list.innerHTML = "";
    state.route.forEach((loc, index) => {
      list.innerHTML += `
                              <div class="flex justify-between items-center bg-[#202225] p-1.5 rounded border border-gray-700 animate-fade-in">
                                  <div class="flex items-center gap-2 overflow-hidden">
                                      <div class="bg-[#5865F2] w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0">${index + 1
        }</div>
                                      <span class="text-white text-xs truncate">${loc.name
        }</span>
                                  </div>
                                  <button onclick="removeFromRoute(${loc.id
        })" class="text-red-400 hover:text-red-200 px-1"><i class="fas fa-times"></i></button>
                              </div>
                          `;
    });
    btn.classList.remove("bg-[#202225]", "text-gray-500", "cursor-not-allowed");
    btn.classList.add("bg-[#5865F2]", "text-white", "hover:bg-[#4752c4]");
    btn.disabled = false;
  }
}

function openRouteInGoogle() {
  if (state.route.length === 0) return;

  // Začneme základní URL pro trasy
  let url = "https://www.google.com/maps/dir/";

  // Přidáme souřadnice všech bodů v trase
  state.route.forEach((loc) => {
    url += `${loc.lat},${loc.lng}/`;
  });

  window.open(url, "_blank");
}

function filterDates(filter) {
  state.dateFilter = filter;
  renderDatePlanner();
}

function openMap(query) {
  // Použijeme oficiální URL pro vyhledávání v Google Mapách
  const url =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(query);
  window.open(url, "_blank");
}

function renderMusic() {
  const container = document.getElementById("messages-container");
  // Vlož Embed kód ze Spotify - Full Screen verze
  container.innerHTML = `
                      <div class="flex flex-col h-full w-full p-4">
                          <div class="flex items-center gap-4 mb-4 flex-shrink-0">
                              <div class="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center text-white text-2xl animate-pulse shadow-lg flex-shrink-0">
                                  <i class="fab fa-spotify"></i>
                              </div>
                              <div>
                                  <h2 class="text-xl font-bold text-white">Music Bot 🤖</h2>
                                  <p class="text-gray-400 text-sm">Playlist: <span class="text-[#1DB954]">Our Vibe</span> • Přehrává se...</p>
                              </div>
                          </div>

                          <div class="flex-1 w-full bg-[#202225] rounded-xl overflow-hidden relative shadow-2xl border border-[#202225]">
                              <iframe style="border-radius:12px"
                                  src="https://open.spotify.com/embed/playlist/2zUVrUmI3NHhIPtiboRE9O?utm_source=generator"
                                  width="100%" height="100%" frameBorder="0" allowfullscreen=""
                                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                  loading="lazy" class="absolute inset-0">
                              </iframe>
                          </div>

                          <p class="text-xs text-gray-600 mt-2 text-center select-none flex-shrink-0">
                              <i class="fas fa-info-circle mr-1"></i> Pro přehrání celých skladeb bez limitu se přihlaš do Spotify v tomto okně.
                          </p>
                      </div>
                  `;
}

function inviteToDate(title) {
  const message = `📅 **POZVÁNKA NA RANDE**\n\n📍 **Kam:** ${title}\n❓ **Kdy:** (Doplň datum)\n\n*Odesláno z Plánovače*`;

  // Create a temporary modal for confirmation
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in";
  modal.innerHTML = `
                      <div class="bg-[#36393f] p-6 rounded-xl border border-[#5865F2] max-w-sm text-center shadow-2xl">
                          <div class="text-4xl mb-2">💌</div>
                          <h3 class="text-xl font-bold text-white mb-2">Skvělá volba!</h3>
                          <p class="text-gray-300 text-sm mb-6">Mám ti připravit pozvánku na <strong>${title}</strong> do schránky?</p>
                          <div class="flex gap-2">
                              <button id="copy-invite-btn" class="flex-1 bg-[#5865F2] hover:bg-[#4752c4] text-white py-2 rounded font-bold transition">Ano, zkopírovat</button>
                              <button onclick="this.closest('.fixed').remove()" class="flex-1 bg-[#202225] hover:bg-[#2f3136] text-gray-400 hover:text-white py-2 rounded font-bold transition">Zrušit</button>
                          </div>
                      </div>
                   `;
  document.body.appendChild(modal);

  document.getElementById("copy-invite-btn").onclick = function () {
    navigator.clipboard.writeText(message).then(() => {
      showNotification(
        "Pozvánka zkopírována! Pošli mi ji na Discordu.",
        "success",
      );
      modal.remove();
    });
  };
}

// --- WATCHLIST LOGIC ---
function toggleBookmark(id, type) {
  let item;
  for (let k in library) {
    item = library[k].find((i) => i.id === id);
    if (item) {
      item.type = type;
      break;
    }
  }
  const idx = state.watchlist.findIndex((w) => w.id === id);
  if (idx === -1) {
    state.watchlist.push(item);
    showNotification("Přidáno", "success");
  } else {
    state.watchlist.splice(idx, 1);
    showNotification("Odebráno", "info");
  }
  localStorage.setItem("klarka_watchlist", JSON.stringify(state.watchlist));
  updateBookmarkCounter();
  if (["movies", "series", "games"].includes(state.currentChannel))
    renderLibrary(state.currentChannel);
}

function toggleWatchlist(id) {
  // Inicializace pole, pokud neexistuje
  if (!state.watchlist) state.watchlist = [];

  // Zjistíme, zda už položka ve watchlistu je
  // (Ošetřujeme, že tam mohou být uložena jen ID nebo celé objekty)
  const index = state.watchlist.findIndex((w) =>
    typeof w === "object" ? w.id === id : w === id,
  );

  if (index !== -1) {
    // --- ODSTRANĚNÍ ---

    // 1. Nejprve odstraníme vizuálně, pokud jsme přímo ve Watchlist kanálu
    if (state.currentChannel === "watchlist") {
      const card = document.getElementById(`watchlist-card-${id}`);
      if (card) {
        // Animace zmizení
        card.style.opacity = "0";
        card.style.transform = "scale(0.9)";

        // Počkáme na animaci (300ms) a pak smažeme z DOMu a z Dat
        setTimeout(() => {
          card.remove();

          // Pokud to byla poslední karta, zobrazíme hlášku "Prázdno"
          const container = document.getElementById("messages-container");
          // Hledáme, zda zbyl nějaký element s třídou library-card
          if (!container.querySelector(".library-card")) {
            renderWatchlist(); // Překreslí na "Prázdný watchlist"
          }
        }, 300);
      }
    }

    // 2. Odstraníme z dat
    state.watchlist.splice(index, 1);
    showNotification("Odebráno z Watchlistu", "info");
  } else {
    // --- PŘIDÁNÍ ---
    state.watchlist.push(id);
    showNotification("Přidáno do Watchlistu ❤️", "success");
    triggerHaptic("success"); // Pokud máš funkci triggerHaptic
  }

  // Uložíme do localStorage
  localStorage.setItem("klarka_watchlist", JSON.stringify(state.watchlist));

  // Aktualizujeme počítadlo v menu (pokud ho používáš)
  if (typeof updateBookmarkCounter === "function") updateBookmarkCounter();

  // Pokud jsme v knihovně (Filmy/Hry), musíme překreslit ikonu srdíčka
  if (["movies", "series", "games"].includes(state.currentChannel)) {
    renderLibrary(state.currentChannel);
  }
}

function updateBookmarkCounter() {
  const count = state.watchlist.length;
  const counter = document.getElementById("bookmark-count");
  const counterContainer = document.getElementById("bookmark-counter");

  // Only update if the elements exist in the DOM
  if (counter && counterContainer) {
    counter.textContent = count;
    counterContainer.style.display = count > 0 ? "flex" : "none";
  }
}
function showWatchlist() {
  document.getElementById("watchlist-modal").style.display = "flex";
  const container = document.getElementById("watchlist-items");
  document.getElementById("watchlist-total").textContent =
    state.watchlist.length;
  if (state.watchlist.length === 0)
    container.innerHTML =
      '<div class="text-center text-gray-500 py-10">Prázdno.</div>';
  else
    container.innerHTML = state.watchlist
      .map(
        (i) =>
          `<div class="bg-[#2f3136] p-3 rounded flex justify-between items-center mb-2"><div class="flex items-center gap-3"><span class="text-xl">${i.icon}</span><span class="text-white">${i.title}</span></div><button onclick="toggleBookmark(${i.id},'${i.type}');showWatchlist()" class="text-[#ed4245]"><i class="fas fa-trash"></i></button></div>`,
      )
      .join("");
}
function clearWatchlist() {
  if (confirm("Vyčistit?")) {
    state.watchlist = [];
    localStorage.setItem("klarka_watchlist", "[]");
    showWatchlist();
    updateBookmarkCounter();
    if (["movies", "series", "games"].includes(state.currentChannel))
      renderLibrary(state.currentChannel);
    showNotification("Watchlist vyčištěn", "info");
  }
}
function exportWatchlist() {
  if (state.watchlist.length === 0) {
    showNotification("Watchlist je prázdný!", "warning");
    return;
  }
  const listText = state.watchlist
    .map(
      (item) =>
        `• ${item.title} (${item.type === "movies"
          ? "Film"
          : item.type === "series"
            ? "Seriál"
            : "Hra"
        })`,
    )
    .join("\n");
  const fullText = `🧾 NÁŠ SPOLEČNÝ WATCHLIST\n\n${listText}\n\n📅 Vytvořeno: ${new Date().toLocaleDateString(
    "cs-CZ",
  )}\n❤️ Těším se na společné sledování!`;
  const fallbackCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      showNotification("Watchlist zkopírován do schránky!", "success");
    } catch (err) {
      showNotification("Nepodařilo se zkopírovat text", "error");
    }
    document.body.removeChild(textArea);
  };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard
      .writeText(fullText)
      .then(() =>
        showNotification("Watchlist zkopírován do schránky!", "success"),
      )
      .catch(() => fallbackCopy(fullText));
  else fallbackCopy(fullText);
}
function showNotification(msg, type) {
  const div = document.createElement("div");
  div.className = `fixed top-4 right-4 text-white px-4 py-2 rounded shadow-lg z-[100] ${type === "success" ? "bg-[#3ba55c]" : "bg-[#5865F2]"
    }`;
  div.innerHTML = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

// --- DOWNLOAD ---

function openDownloadModal(magnet, gdrive) {
  // 1. Uložíme aktuální odkazy do globálního stavu
  // Tlačítka uvnitř modalu (Otevřít v qBittorrent / Google Drive) čtou právě z state.currentDownload
  state.currentDownload = {
    magnet: magnet,
    gdrive: gdrive,
  };

  // 2. Nastavíme text v modalu (protože neznáme název filmu z parametrů, dáme obecný text)
  const msg = document.getElementById("download-message");
  if (msg) msg.textContent = "Vyber způsob stahování:";

  // 3. Otevřeme modal
  document.getElementById("download-modal").style.display = "flex";
}

function initiateDownload(id) {
  let item = null;
  for (const category in library) {
    const found = library[category].find((i) => i.id === id);
    if (found) {
      item = found;
      break;
    }
  }
  if (!item) return;
  state.currentDownload = item;
  document.getElementById("download-message").textContent =
    `Stáhnout "${item.title}"?`;
  document.getElementById("download-modal").style.display = "flex";
}

function openMagnetLink() {
  if (state.currentDownload && state.currentDownload.magnet) {
    // Tímto řádkem skutečně "proklikneš" magnet link
    window.location.href = state.currentDownload.magnet;
    showNotification("Spouštím qBittorrent...", "success");
  } else {
    showNotification("Magnet link nenalezen.", "error");
  }
  closeModal("download-modal");
}
function openGoogleDrive() {
  if (
    state.currentDownload &&
    state.currentDownload.gdrive &&
    state.currentDownload.gdrive !== ""
  ) {
    // Otevře odkaz na Google Drive v novém okně/panelu
    window.open(state.currentDownload.gdrive, "_blank");
    showNotification("Otevírám Google Drive...", "success");
  } else {
    // Pokud odkaz v datech chybí, upozorníme uživatele
    showNotification("Odkaz na Google Drive není k dispozici.", "info");
  }
  closeModal("download-modal");
}

// --- CONFESSION ---
function startConfession() {
  // Play music 1
  const music1 = document.getElementById("audio-final-countdown");
  if (music1) {
    music1.currentTime = 0;
    music1.volume = 0.5;
    music1.play().catch((e) => console.log("Audio play failed:", e));
  }

  const modal = document.getElementById("confession-modal");
  const output = document.getElementById("terminal-output");
  const typingArea = document.getElementById("typing-area");
  const promptText = document.getElementById("prompt-text");
  const cmdCursor = document.getElementById("cmd-cursor");

  // Reset CMD window
  modal.style.display = "flex";
  output.innerHTML = `<div>Microsoft Windows [Version 10.0.19045]</div><div>(c) Microsoft Corporation. All rights reserved.</div><br>`;
  typingArea.textContent = "";
  promptText.textContent = "C:\\Users\\Klárka\\Heart>";
  cmdCursor.style.display = "inline-block";

  const command = " system_patch_v2.0.exe";
  let charIndex = 0;
  const lines = [
    "Loading shared memory database...",
    "✓ Discord logs... OK",
    "✓ Co-op games... OK",
    "✓ Inside jokes... OK",
    "Running compatibility analysis...",
    ">> Humor: MATCH",
    ">> Values: SYNCED",
    "Tetris Logic: Perfect fit detected.",
    "Analysis complete.",
    "Decrypting final message...",
  ];

  function typeCommand() {
    if (charIndex < command.length) {
      typingArea.textContent += command.charAt(charIndex);
      charIndex++;
      setTimeout(typeCommand, Math.random() * 50 + 50);
    } else {
      setTimeout(runLogs, 500);
    }
  }

  function runLogs() {
    const cmdLine = document.createElement("div");
    cmdLine.innerHTML = `C:\\Users\\Klárka\\Heart>${command}`;
    output.appendChild(cmdLine);
    typingArea.textContent = "";
    promptText.textContent = "";
    cmdCursor.style.display = "none";

    let lineIndex = 0;
    function printLine() {
      if (lineIndex < lines.length) {
        const div = document.createElement("div");
        div.textContent = lines[lineIndex];
        output.appendChild(div);
        document.getElementById("terminal-body").scrollTop =
          document.getElementById("terminal-body").scrollHeight;
        lineIndex++;

        if (lineIndex === lines.length) {
          // Konec logů - čekáme na kliknutí
          const cursorSpan = document.createElement("span");
          cursorSpan.className = "cmd-cursor";
          cursorSpan.innerText = " ";
          const pressKey = document.createElement("span");
          pressKey.className = "animate-pulse text-gray-500 ml-2";
          pressKey.innerText = "Press any key to continue...";

          const lastLine = document.createElement("div");
          lastLine.appendChild(pressKey);
          lastLine.appendChild(cursorSpan);
          output.appendChild(lastLine);

          const proceed = () => {
            document.removeEventListener("keydown", proceed);
            document.removeEventListener("click", proceed);
            document.getElementById("confession-modal").style.display = "none";

            // Switch Music
            const music1 = document.getElementById("audio-final-countdown");
            const music2 = document.getElementById("audio-divka");
            if (music1) music1.pause();
            if (music2) {
              music2.currentTime = 0;
              music2.volume = 0.5;
              music2
                .play()
                .catch((e) => console.log("Audio 2 play failed:", e));
            }

            const finalModal = document.getElementById(
              "final-confession-modal",
            );
            const modalBox = document.getElementById("final-modal-box");
            const finalModalContent = document.getElementById(
              "final-modal-content",
            );

            // --- OPRAVA: TADY VŽDY RESETUJEME OBSAH OKNA ---
            // Vrátíme tam původní HTML pro psaní textu a tlačítka,
            // i když to Klárka minule přepsala kliknutím na "Ano".
            finalModalContent.innerHTML = `
                                          <div id="typing-container" class="text-gray-300 mb-8 text-left space-y-4 leading-relaxed min-h-[200px] mt-8"></div>
                                          <div id="confession-buttons" class="space-y-3 hidden">
                                              <button onclick="responseYes()" class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-4 rounded-lg font-bold text-lg transition shadow-lg">Ano, pojďme to zkusit <i class="fas fa-heart ml-2"></i></button>
                                              <button onclick="responseNo()" class="w-full bg-[#4f545c] hover:bg-[#5d6269] text-white py-3 rounded-lg transition">Zůstaňme kamarádi</button>
                                          </div>
                                      `;
            // -----------------------------------------------

            finalModal.style.display = "flex";

            setTimeout(() => {
              modalBox.classList.remove("opacity-0", "scale-95");
              modalBox.classList.add("opacity-100", "scale-100");
              setTimeout(typeFinalMessage, 500);
            }, 50);
          };

          setTimeout(() => {
            document.addEventListener("keydown", proceed);
            document.addEventListener("click", proceed);
          }, 500);
        } else {
          setTimeout(printLine, 400 + Math.random() * 400);
        }
      }
    }
    printLine();
  }
  typeCommand();
}

function typeFinalMessage() {
  const container = document.getElementById("typing-container");
  container.innerHTML = "";
  document.getElementById("confession-buttons").classList.add("hidden");

  const textParts = [
    { text: "Klárko,", bold: true },
    {
      text: "hrozně si vážím toho, co mezi sebou máme. Máme podobné hodnoty, ve všem si rozumíme a jsi neuvěřitelně inteligentní a klidná.",
    },
    {
      text: "Hlavně jsi ale člověk, se kterým můžu být naprosto sám sebou, protože vím, že mě bereš přesně takového, jaký jsem.",
    },
    { text: "Mám tě hrozně rád.", highlight: true },
    {
      text: "Naše přátelství pro mě znamená strašně moc a nikdy o něj nechci přijít. Zároveň ale cítím, že k tobě mám mnohem blíž, a byl bych moc rád, kdybychom to spolu zkusili i jako pár.",
    },
    { text: "Nechtěla bys to se mnou zkusit?", bold: true, center: true },
  ];

  let partIndex = 0;
  let charIndex = 0;
  let currentP = null;

  function typeChar() {
    if (partIndex >= textParts.length) {
      setTimeout(() => {
        const btns = document.getElementById("confession-buttons");
        btns.classList.remove("hidden");
        btns.classList.add("animate-fade-in");
      }, 500);
      return;
    }

    const part = textParts[partIndex];

    if (!currentP) {
      currentP = document.createElement("p");
      if (part.bold) currentP.className = "font-bold text-white text-lg";
      if (part.highlight)
        currentP.className =
          "text-[#eb459e] font-bold text-center text-xl my-2";
      if (part.center)
        currentP.className = "font-bold text-white text-center mt-4 text-lg";
      currentP.classList.add("typing-cursor");
      container.appendChild(currentP);
    }

    if (charIndex < part.text.length) {
      currentP.textContent = part.text.substring(0, charIndex + 1);
      charIndex++;
      setTimeout(typeChar, 60); // Faster typing speed per char
    } else {
      currentP.classList.remove("typing-cursor");
      currentP = null;
      charIndex = 0;
      partIndex++;
      setTimeout(typeChar, 600); // Shorter pause between lines
    }
  }

  typeChar();
}

function responseYes() {
  document.getElementById("final-modal-content").innerHTML = `
                      <div class="animate-fade-in">
                          <h2 class="text-3xl font-bold text-[#eb459e] mb-2">❤️ CONNECTION ESTABLISHED! ❤️</h2>
                          <p class="text-gray-300 text-lg leading-relaxed mb-6">
                              Děkuju, že jsi mi dala šanci. Jsi moje kotva v celém tom mém chaosu a slibuju, že si toho budu vážit každý den.
                              <br><br>
                              Těším se na všechno, co nás čeká.
                          </p>
                          <div class="mt-8">
                              <button onclick="closeModal('final-confession-modal'); switchChannel('dateplanner');" class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-4 rounded-lg font-bold text-xl shadow-lg transition transform hover:scale-105">
                                  Jít na rande
                              </button>
                          </div>
                      </div>
                  `;
}
function responseNo() {
  document.getElementById("final-modal-content").innerHTML = `
                      <div class="animate-fade-in">
                          <h2 class="text-2xl font-bold text-white mb-4">Díky za upřímnost, Klárko.</h2>
                          <p class="text-gray-300 text-lg mb-6 leading-relaxed">
                              Moc si tě vážím a jsem rád, že si můžeme dál zůstat blízcí tak, jak jsme.
                              <br><br>
                              Nic se nemění – dál budeme yappovat o teoriích a hrát Tetris. 😊
                          </p>
                          <button onclick="closeModal('final-confession-modal')" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-lg font-bold transition">
                              Zpět na server
                          </button>
                      </div>
                  `;
}

function planDate() {
  const modal = document.getElementById("final-confession-modal");
  const modalBox = document.getElementById("final-modal-box"); // Use the inner box for content replacement

  // Create content HTML
  const content = `
                      <div class="animate-fade-in">
                          <div class="text-4xl mb-2">📅</div>
                          <h2 class="text-xl font-bold text-white mb-4">Plánovač Rande v2.0</h2>
                          <div class="space-y-4 text-left">
                              <div>
                                  <label class="block text-[#b9bbbe] text-xs font-bold uppercase mb-1">Kdy máš čas?</label>
                                  <select id="date-select" class="w-full bg-[#202225] text-white p-2.5 rounded border border-[#202225] focus:border-[#5865F2] focus:outline-none transition">
                                      <option value="Co nejdříve">Co nejdříve! 🚀</option>
                                      <option value="Tento víkend">Tento víkend</option>
                                      <option value="Příští týden">Příští týden</option>
                                      <option value="Po zkouškách">Až po zkouškách</option>
                                      <option value="Jindy">Jindy (napišu ti)</option>
                                  </select>
                              </div>
                              <div>
                                  <label class="block text-[#b9bbbe] text-xs font-bold uppercase mb-1">Co podnikneme?</label>
                                  <div class="grid grid-cols-2 gap-2">
                                      <button type="button" onclick="selectActivity(this, 'Kino')" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Kino 🍿</button>
                                      <button type="button" onclick="selectActivity(this, 'Kavárna')" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Kavárna ☕</button>
                                      <button type="button" onclick="selectActivity(this, 'Procházka')" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Procházka 🌲</button>
                                      <button type="button" onclick="selectActivity(this, 'Chill')" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Chill u mě 🎮</button>
                                  </div>
                              </div>
                              <div>
                                  <label class="block text-[#b9bbbe] text-xs font-bold uppercase mb-1">Detaily / Poznámka</label>
                                  <textarea id="custom-note" class="w-full bg-[#202225] text-white p-2.5 rounded border border-[#202225] focus:border-[#5865F2] focus:outline-none transition text-sm h-20 resize-none" placeholder="Např. na co máš chuť, jaký film..."></textarea>
                              </div>
                          </div>
                          <button onclick="confirmDate()" class="mt-6 w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded font-bold transition transform active:scale-95 shadow-md"><i class="fas fa-paper-plane mr-2"></i> Odeslat návrh</button>
                      </div>
                  `;

  // Replace only content inside the box
  document.getElementById("final-modal-content").innerHTML = content;
}
function selectActivity(btn, act) {
  document.querySelectorAll(".activity-btn").forEach((b) => {
    b.classList.remove("bg-[#5865F2]", "border-[#5865F2]", "selected");
    b.classList.add("bg-[#2f3136]");
  });
  btn.classList.remove("bg-[#2f3136]");
  btn.classList.add("bg-[#5865F2]", "selected");
  btn.dataset.value = act;
}
function confirmDate() {
  const date = document.getElementById("date-select").value;
  const actBtn = document.querySelector(".activity-btn.selected");
  const activity = actBtn ? actBtn.dataset.value : "Něco vymyslíme";
  const note = document.getElementById("custom-note").value;
  const message = `📅 **NÁVRH RANDE**\n\n🕒 **Kdy:** ${date}\n🎭 **Co:** ${activity}\n📝 **Poznámka:** ${note || "Bez poznámky"
    }\n\n*Odesláno z Kiscordu*`;
  const fallbackCopy = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      showRedirect();
    } catch (err) {
      showNotification("Chyba", "error");
    }
    document.body.removeChild(textArea);
  };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard
      .writeText(message)
      .then(showRedirect)
      .catch(() => fallbackCopy(message));
  else fallbackCopy(message);
}
function showRedirect() {
  document.getElementById("final-confession-modal").style.display = "none";
  document.getElementById("redirect-modal").style.display = "flex";
}
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}
function showNotification(msg, type) {
  const div = document.createElement("div");
  div.className = `fixed top-4 right-4 text-white px-4 py-2 rounded shadow-lg z-[100] ${type === "success" ? "bg-[#3ba55c]" : "bg-[#5865F2]"
    }`;
  div.innerHTML = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// --- SEARCH INPUT LISTENER (Global Smart Search) ---
const searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const val = e.target.value;

    // Pokud je prázdno, obnovíme aktuální kanál
    if (!val) {
      switchChannel(state.currentChannel);
    } else {
      // Jinak spustíme globální vyhledávání
      renderGlobalSearch(val);
    }
  });

  // Easter egg příkazy
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && e.target.value.startsWith("/")) {
      const cmd = e.target.value.trim();
      if (cmd === "/sova")
        showNotification("🦉 Sovy otočí hlavu o 270°!", "info");
      else if (cmd === "/chobotnice")
        showNotification("🐙 Chobotnice mají modrou krev.", "info");
      else if (cmd === "/miluju")
        showNotification("❤️ Taky tě miluju!", "success");
      e.target.value = "";
      switchChannel(state.currentChannel); // Reset
    }
  });
}

// --- MAP LOGIC FUNCTIONS ---

function initMap() {
  // 1. Bezpečnostní kontrola: Existuje kontejner?
  // Pokud uživatel rychle přepnul jinam, 'leaflet-map' už v DOMu není.
  if (!document.getElementById("leaflet-map")) {
    console.warn("Map container not found, skipping init.");
    return;
  }

  // 2. Úklid staré mapy (pro jistotu)
  if (state.mapInstance) {
    state.mapInstance.remove();
    state.mapInstance = null;
  }

  // 3. Vytvoření nové mapy
  const map = L.map("leaflet-map").setView([49.069, 17.464], 13);
  state.mapInstance = map;

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      attribution: "© OpenStreetMap © CARTO",
      subdomains: "abcd",
      maxZoom: 19,
    },
  ).addTo(map);

  renderMarkers(dateLocations);
}

function renderMarkers(locations) {
  if (!state.mapInstance) return;

  state.mapInstance.eachLayer((layer) => {
    if (layer instanceof L.Marker) {
      state.mapInstance.removeLayer(layer);
    }
  });

  locations.forEach((loc) => {
    let color = "#5865F2";
    let iconClass = "fa-map-marker-alt";
    if (loc.cat === "food") {
      color = "#faa61a";
      iconClass = "fa-utensils";
    }
    if (loc.cat === "view") {
      color = "#eb459e";
      iconClass = "fa-binoculars";
    }
    if (loc.cat === "walk") {
      color = "#3ba55c";
      iconClass = "fa-tree";
    }
    if (loc.cat === "fun") {
      color = "#ed4245";
      iconClass = "fa-bolt";
    }

    // Zjistit hodnocení
    const rating = state.dateRatings[loc.id] || 0;

    // Pokud je to "Top Tier" (5 hvězd), dáme mu speciální zlatý marker
    if (rating === 5) {
      color = "#ffd700";
      iconClass = "fa-heart";
    }


    // --- INTEGRACE VZPOMÍNEK (TIMELINE) ---
    // Najdeme událost v timeline, která má shodné locationId
    const memoryIndex = timelineEvents ? timelineEvents.findIndex(e => e.locationId === loc.id) : -1;
    const memory = memoryIndex !== -1 ? timelineEvents[memoryIndex] : null;

    let markerColor = color;
    let markerHtml = `<div class="marker-pin" style="background-color: ${color};">
                          <i class="fas ${iconClass}"></i>
                      </div>`;

    // Pokud je tam vzpomínka, přidáme srdíčko k markeru
    if (memory) {
      markerHtml = `<div class="marker-pin" style="background-color: ${color}; box-shadow: 0 0 10px #eb459e;">
                          <i class="fas fa-heart text-white animate-pulse"></i>
                      </div>`;
    }

    const customIcon = L.divIcon({
      className: "custom-div-icon",
      html: markerHtml,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -35],
    });

    const marker = L.marker([loc.lat, loc.lng], {
      icon: customIcon,
    }).addTo(state.mapInstance);

    const starStr =
      rating > 0
        ? `<br><span style="color:#faa61a; font-size:14px; letter-spacing:2px;">${"★".repeat(
          rating,
        )}</span>`
        : "";

    // --- POPUP OBSAH ---
    let popupContent = `
        <div style="text-align:center; min-width: 150px;">
            <b style="color:#fff;font-size:14px">${loc.name}</b>
            ${starStr}<br>
            <span style="font-size:11px;color:#b9bbbe; display:block; margin-bottom: 5px;">${loc.desc}</span>
    `;

    // Pokud máme vzpomínku, přidáme ji do popupu
    if (memory) {
      popupContent += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #4f545c;">
                <div style="color:#eb459e; font-weight:bold; font-size:10px; text-transform:uppercase; margin-bottom:2px;">
                    <i class="fas fa-history"></i> Naše Vzpomínka
                </div>
                <div style="color:#fff; font-size:12px; font-weight:bold;">${memory.date || ''}</div>
                <div style="color:#dcddde; font-size:11px; font-style:italic;">"${memory.title}"</div>
                
                <button onclick="jumpToTimeline(${memoryIndex})" style="
                    margin-top: 5px;
                    background: #eb459e;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    font-size: 10px;
                    cursor: pointer;
                    width: 100%;
                ">
                    <i class="fas fa-external-link-alt"></i> Přejít na vzpomínku
                </button>
            </div>
        `;
    }

    popupContent += `</div>`;

    marker.bindPopup(popupContent);
    marker.on("click", () => selectLocation(loc.id));
  });

  // --- SCAVENGER HUNT MARKERS ---
  const huntLocations = [
    { id: 'hunt1', lat: 49.124389, lng: 17.431, clue: "1. stopa: Hledej tam, kde vítr pohání lopatky... (Jalubí) 🌬️", order: 1 },
    { id: 'hunt2', lat: 49.1035, lng: 17.3958, clue: "2. stopa: Pokračuj k místu svatému... (Velehrad) ⛪", order: 2 },
    { id: 'hunt3', lat: 49.090215, lng: 17.429537, clue: "3. stopa: Tady je poklad! Gratulejšn! 🎁", order: 3 }
  ];

  if (typeof state.scavengerStage === 'undefined') state.scavengerStage = 0;

  huntLocations.forEach(loc => {
    const isRevealed = state.scavengerStage >= loc.order;
    const isNext = state.scavengerStage === loc.order - 1;
    const color = isRevealed ? "#3ba55c" : (isNext ? "#faa61a" : "#2f3136");
    const icon = isRevealed ? "fa-check" : "fa-question";
    const animate = isNext ? "animate-bounce" : "";

    const customIcon = L.divIcon({
      className: "custom-div-icon",
      html: `
            <div class="marker-pin ${animate}" style="background-color: ${color}; box-shadow: 0 0 10px ${color}">
                <i class="fas ${icon}"></i>
            </div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -35],
    });

    const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(state.mapInstance);

    marker.on('click', () => {
      if (state.scavengerStage === loc.order - 1) {
        state.scavengerStage = loc.order;
        if (typeof triggerHaptic === 'function') triggerHaptic('success');
        marker.bindPopup(`<b style="color:#faa61a">${loc.clue}</b>`).openPopup();
        if (loc.order === 3) {
          if (typeof triggerConfetti === 'function') triggerConfetti();
          showNotification("🎉 NAŠLA JSI POKLAD! 🎉", "success");
        } else {
          renderMarkers(locations);
          showNotification("Správná stopa! Pokračuj... 🕵️‍♀️", "info");
        }
      } else if (state.scavengerStage >= loc.order) {
        marker.bindPopup(`<b style="color:#3ba55c">${loc.clue}</b>`).openPopup();
      } else {
        showNotification("Tuhle stopu ještě nemůžeš otevřít! Najdi předchozí. 🔒", "error");
      }
    });
  });
}

// --- VYLEPŠENÉ FUNKCE MAPY A HLEDÁNÍ ---

// 1. Společná funkce pro vykreslení seznamu (aby se kód neopakoval)
function renderLocationList(locations) {
  const listContainer = document.getElementById("location-list");
  listContainer.innerHTML = "";

  // Seřadíme: Nejdřív ta ohodnocená (proběhlá rande), pak zbytek
  const sortedLocs = [...locations].sort((a, b) => {
    const rateA = state.dateRatings[a.id] || 0;
    const rateB = state.dateRatings[b.id] || 0;
    return rateB - rateA; // Vyšší hodnocení nahoře
  });

  if (sortedLocs.length === 0) {
    listContainer.innerHTML =
      '<div class="text-gray-500 text-xs text-center p-4">Nic nenalezeno... 🔍</div>';
    return;
  }

  sortedLocs.forEach((loc) => {
    const icons = { view: "⛰️", food: "🍔", fun: "⚡", walk: "🌲" };
    let icon = icons[loc.cat] || "📍";

    // Zjistit hodnocení
    const rating = state.dateRatings[loc.id] || 0;
    let ratingHtml = "";
    if (rating > 0) {
      ratingHtml = `<div class="text-[#faa61a] text-[10px] mt-0.5">${"★".repeat(
        rating,
      )}</div>`;
    }

    // Pokud je ohodnoceno, dáme mu zlatý okraj
    const borderClass = rating > 0 ? "border-[#faa61a]/50" : "border-[#202225]";

    listContainer.innerHTML += `
                          <div onclick="selectLocation(${loc.id
      })" class="p-3 bg-[#36393f] hover:bg-[#40444b] rounded cursor-pointer transition flex items-center gap-3 border ${borderClass} group mb-1 relative overflow-hidden">
                              ${rating > 0
        ? '<div class="absolute top-0 right-0 w-3 h-3 bg-[#faa61a] rounded-bl-lg"></div>'
        : ""
      }
                              <div class="text-lg group-hover:scale-110 transition">${icon}</div>
                              <div class="min-w-0">
                                  <div class="font-bold text-gray-200 text-sm truncate">${loc.name
      }</div>
                                  <div class="text-[10px] text-gray-500 truncate">${loc.desc
      }</div>
                                  ${ratingHtml}
                              </div>
                          </div>
                      `;
  });
}

// 2. Upravená filtrace podle kategorií
function filterMap(category) {
  // 1. Vyčistit vyhledávací pole při změně filtru
  const mobileSearch = document.getElementById("planner-search-mobile");
  const desktopSearch = document.getElementById("planner-search-desktop");
  if (mobileSearch) mobileSearch.value = "";
  if (desktopSearch) desktopSearch.value = "";

  // 2. Filtrovat data
  const filtered =
    category === "all"
      ? dateLocations
      : dateLocations.filter((l) => l.cat === category);
  renderLocationList(filtered);
  renderMarkers(filtered);

  // 3. AKTUALIZACE TLAČÍTEK (Visual)
  const buttons = document.querySelectorAll(".filter-btn");

  // Definice barev pro aktivní stav
  const activeColors = {
    all: "bg-[#5865F2]", // Modrá
    view: "bg-[#eb459e]", // Růžová
    fun: "bg-[#ed4245]", // Červená
    food: "bg-[#faa61a]", // Oranžová
    walk: "bg-[#3ba55c]", // Zelená
  };

  buttons.forEach((btn) => {
    const btnCat = btn.getAttribute("data-filter");
    const isActive = btnCat === category;

    // Reset: Odstraníme všechny barvy a "active" classy
    btn.className = btn.className
      .replace(/bg-\[#\w+\]/g, "") // Pryč s hex barvami pozadí
      .replace("text-white", "")
      .replace("text-gray-300", "")
      .replace("shadow-lg", "")
      .replace("scale-105", "");

    if (isActive) {
      // AKTIVNÍ: Správná barva, bílý text, stín
      btn.classList.add(
        activeColors[btnCat],
        "text-white",
        "shadow-lg",
        "scale-105",
      );
      // Na mobilu zrušíme průhlednost, ať to svítí
      btn.classList.remove("bg-[#202225]/90");
    } else {
      // NEAKTIVNÍ: Tmavé pozadí, šedý text
      btn.classList.add("text-gray-400"); // Neaktivní text

      // Pozadí podle toho, jestli je to mobil (backdrop) nebo desktop
      if (btn.classList.contains("backdrop-blur")) {
        btn.classList.add("bg-[#202225]/90");
      } else {
        btn.classList.add("bg-[#202225]");
      }
    }
  });
}

// --- NOVÁ FUNKCE: JÁ MÁM ŠTĚSTÍ (Random Picker) ---
function pickRandomLocation() {
  // 1. Zjistíme, jaký je aktivní filtr (uložený v state.dateFilter, nebo 'all')
  // Pokud state.dateFilter nemáš nastavený přesně, vezmeme to z DOMu tlačítka
  const activeBtn =
    document.querySelector(".filter-btn.bg-\\[\\#5865F2\\]") ||
    document.querySelector(".filter-btn.bg-\\[\\#eb459e\\]") || // Výhledy
    document.querySelector(".filter-btn.bg-\\[\\#ed4245\\]") || // Zábava
    document.querySelector(".filter-btn.bg-\\[\\#faa61a\\]") || // Jídlo
    document.querySelector(".filter-btn.bg-\\[\\#3ba55c\\]"); // Procházky

  const currentFilter = activeBtn ? activeBtn.dataset.filter : "all";

  // 2. Vyfiltrujeme dostupná místa
  const candidates =
    currentFilter === "all"
      ? dateLocations
      : dateLocations.filter((loc) => loc.cat === currentFilter);

  if (candidates.length === 0) {
    showNotification("Žádná místa k výběru!", "info");
    return;
  }

  // 3. Efekt "míchání" (dobrovolné - jen vizuální sranda)
  triggerHaptic("medium");

  // 4. Vybereme náhodné místo
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const winner = candidates[randomIndex];

  // 5. Otevřeme ho
  selectLocation(winner.id);

  // 6. Oznámení
  showNotification(`🎲 Kostka vybrala: ${winner.name}`, "success");
}

// 3. NOVÁ FUNKCE: Vyhledávání
function searchLocations(query) {
  const term = query.toLowerCase();
  const filtered = dateLocations.filter(
    (l) =>
      l.name.toLowerCase().includes(term) ||
      l.desc.toLowerCase().includes(term),
  );

  renderLocationList(filtered);
  renderMarkers(filtered);
}

function selectLocation(id) {
  const loc = dateLocations.find((l) => l.id === id);
  if (!loc) return;

  selectedDateLocation = loc;

  // 1. Zavřít seznam míst (pro mobilní zobrazení)
  const sidebar = document.getElementById("planner-sidebar");
  if (sidebar) sidebar.classList.remove("active");

  // 2. UI UPDATE - Zobrazení obsahu
  const emptyState = document.getElementById("detail-empty");
  const contentState = document.getElementById("detail-content");
  if (emptyState) emptyState.classList.add("hidden");
  if (contentState) contentState.classList.remove("hidden");

  // 3. VYPLNĚNÍ ZÁKLADNÍCH DAT
  document.getElementById("detail-title").innerText = loc.name;
  document.getElementById("detail-desc").innerText = loc.desc;

  // Kategorie
  const catEl = document.getElementById("detail-cat");
  catEl.innerText = loc.cat.toUpperCase();

  // --- OPRAVA: POČASÍ (Weather Badge) ---
  // Zkontrolujeme, jestli element pro počasí existuje, pokud ne, vytvoříme ho hned za kategorií
  let weatherBadge = document.getElementById("detail-weather-badge");
  // Pokud tam badge není, nebo jsme přepli na jiné místo (pro jistotu ho resetujeme/vytvoříme znovu v DOMu)
  if (!weatherBadge) {
    weatherBadge = document.createElement("span");
    weatherBadge.id = "detail-weather-badge";
    // Výchozí styl
    weatherBadge.className =
      "ml-2 text-[10px] px-2 py-0.5 rounded bg-[#202225] text-gray-400";
    // Vložíme ho za kategorii
    catEl.parentNode.insertBefore(weatherBadge, catEl.nextSibling);
  }
  // Zavoláme API pro získání aktuálního počasí
  // Ujisti se, že máš v kódu i funkci fetchLocationWeather!
  if (typeof fetchLocationWeather === "function") {
    fetchLocationWeather(loc.lat, loc.lng);
  } else {
    console.error("Chybí funkce fetchLocationWeather!");
  }
  // -------------------------------------

  // 4. HODNOCENÍ (Hvězdičky)
  let ratingContainer = document.getElementById("detail-rating-container");
  if (!ratingContainer) {
    ratingContainer = document.createElement("div");
    ratingContainer.id = "detail-rating-container";
    ratingContainer.className =
      "mt-3 mb-4 p-3 bg-[#202225] rounded border border-[#2f3136]";
    const descEl = document.getElementById("detail-desc");
    descEl.parentNode.insertBefore(ratingContainer, descEl.nextSibling);
  }

  // --- OPRAVA: Vše na jeden řádek, aby panel neskákal ---
  const currentRating = state.dateRatings[loc.id] || 0;
  const notes = [
    "Nic moc 😕",
    "Ušlo to 🙂",
    "Dobrý! 😃",
    "Super rande! 😍",
    "Best date ever! 💍",
  ];
  const noteText = currentRating > 0 ? notes[currentRating - 1] : "";

  // Obalovací kontejner s fixní výškou (h-6), items-center zarovná vše na střed řádku
  let starsHtml = `<div class="flex items-center h-6 overflow-hidden whitespace-nowrap">`;

  // 1. TEXT "HODNOCENÍ RANDE"
  starsHtml += `<span class="text-xs font-bold text-gray-400 uppercase mr-2">Hodnocení:</span>`;

  // 2. HVĚZDIČKY
  starsHtml += `<div class="star-rating-group flex mr-3">`;
  for (let i = 5; i >= 1; i--) {
    const activeClass = i <= currentRating ? "active" : "";
    // Zmenšil jsem text-xl na text-lg, aby se to lépe vešlo
    starsHtml += `<button onclick="rateDate(${loc.id}, ${i})" class="star-btn ${activeClass} text-lg px-0.5">★</button>`;
  }
  starsHtml += `</div>`;

  // 3. TEXT HODNOCENÍ (Hned vedle hvězd)
  if (noteText) {
    starsHtml += `<span class="text-[10px] text-[#faa61a] font-bold italic animate-fade-in">${noteText}</span>`;
  }

  starsHtml += `</div>`;

  ratingContainer.innerHTML = starsHtml;

  // 5. ODKAZ NA GOOGLE MAPS
  let mapsUrl = loc.url
    ? loc.url
    : "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(loc.name + " Česká republika");
  const googleLink = document.getElementById("detail-google");
  if (googleLink) googleLink.href = mapsUrl;

  // --- 6. NOVÉ: TLAČÍTKO PRO FOTKY (Vzpomínka) ---
  const btnContainer = document.getElementById("add-to-route-btn")?.parentNode;

  // Odstraníme staré tlačítko fotek, pokud existuje
  const oldPhotoBtn = document.getElementById("detail-photo-btn");
  if (oldPhotoBtn) oldPhotoBtn.remove();

  // Zjistíme, zda existuje propojená vzpomínka s fotkami
  const memoryIndex = timelineEvents ? timelineEvents.findIndex(e => e.locationId === loc.id) : -1;
  if (memoryIndex !== -1 && timelineEvents[memoryIndex].images && timelineEvents[memoryIndex].images.length > 0) {
    const photoBtn = document.createElement("button");
    photoBtn.id = "detail-photo-btn";
    photoBtn.className = "flex-1 text-xs bg-[#2f3136] hover:bg-[#eb459e] text-white px-3 py-3 rounded transition font-bold border border-gray-600 hover:border-[#eb459e] shadow-lg animate-fade-in flex items-center justify-center gap-2";
    photoBtn.innerHTML = `<i class="fas fa-images text-[#eb459e]"></i> Fotky (${timelineEvents[memoryIndex].images.length})`;
    photoBtn.onclick = () => openGallery(memoryIndex);

    // Vložíme ho mezi "Přidat" a "Mapa" (nebo za ně)
    if (btnContainer) {
      btnContainer.insertBefore(photoBtn, googleLink);
    }
  }

  // 7. MAPA - PŘELET (FlyTo) S OFFSETEM
  if (state.mapInstance) {
    const targetZoom = 16;

    // A) Vypočítáme offset (posun)
    // Chceme marker dostat do horní části obrazovky (cca v 25 % odshora)
    // Proto musíme střed mapy posunout DOLŮ o 25 % výšky mapy.

    // Převedeme GPS markeru na pixely (v rámci mapy)
    const targetPoint = state.mapInstance.project(
      [loc.lat, loc.lng],
      targetZoom,
    );

    // Získáme výšku mapy
    const mapHeight = state.mapInstance.getSize().y;

    // Posuneme cílový bod o 1/4 výšky mapy dolů (pixely)
    // Tím pádem, až se mapa vycentruje na tento "falešný střed",
    // náš marker bude vizuálně v horní čtvrtině.
    const offsetY = mapHeight * 0.15;

    const newCenterPoint = targetPoint.add([0, offsetY]);

    // Převedeme pixely zpět na GPS souřadnice pro Leaflet
    const newCenterLatLng = state.mapInstance.unproject(
      newCenterPoint,
      targetZoom,
    );

    // Provedeme let na nové souřadnice
    state.mapInstance.flyTo(newCenterLatLng, targetZoom, {
      animate: true,
      duration: 1.0,
    });

    // Otevření bubliny (Popup)
    state.mapInstance.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer.getLatLng().lat === loc.lat) {
        const rating = state.dateRatings[loc.id] || 0;
        const starStr =
          rating > 0
            ? `<br><span style="color:#faa61a">${"★".repeat(rating)}</span>`
            : "";

        layer.bindPopup(`
                                  <div style="text-align:center">
                                      <b style="color:#fff;font-size:14px">${loc.name}</b>
                                      ${starStr}<br>
                                      <span style="font-size:11px;color:#b9bbbe">${loc.desc}</span>
                                  </div>
                              `);
        // Otevřeme popup s malým zpožděním, až tam mapa doletí
        setTimeout(() => layer.openPopup(), 500);
      }
    });

    //7. OTEVŘENÍ PANELU (Half mode)
    // Použijeme malý timeout, aby se stihl vykreslit obsah a spočítat výška
    setTimeout(() => {
      setPanelPosition("half");
    }, 50);
  }
}

function copyDateInvite() {
  if (!selectedDateLocation) return;

  const dateVal = document.getElementById("date-input").value;
  const noteVal = document.getElementById("note-input").value;

  let dateStr = "Co nejdříve";
  if (dateVal) {
    const d = new Date(dateVal);
    dateStr = d.toLocaleString("cs-CZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const text = `💌 **POZVÁNKA NA RANDE** 💌\n\n📍 **Místo:** ${selectedDateLocation.name
    }\n📝 **Popis:** ${selectedDateLocation.desc
    }\n⏰ **Kdy:** ${dateStr}\n💬 **Poznámka:** ${noteVal || "Těším se!"
    }\n\n*Vygenerováno v Kiscord Planneru*`;

  navigator.clipboard
    .writeText(text)
    .then(() => {
      showNotification("Zkopírováno! Teď mi to pošli (Ctrl+V).", "success");
    })
    .catch(() => {
      alert("Nešlo zkopírovat automaticky, tady je text:\n" + text);
    });
}

// --- TOPICS LOGIC ---

// --- FINALNÍ OPRAVENÁ LOGIKA TÉMAT (Vlož toto místo starých funkcí) ---

// --- FINALNÍ LOGIKA TÉMAT S MASTER KARTOU OBLÍBENÝCH ---

// Pomocná proměnná pro aktivní objekt tématu (aby fungovala virtuální kategorie)
let activeTopicObject = null;

function renderTopics() {
  const container = document.getElementById("messages-container");
  let html = `<div class="p-6 max-w-7xl mx-auto animate-fade-in space-y-6">`;

  // Spočítáme celkový počet uložených otázek
  let totalBookmarks = 0;
  Object.values(state.topicBookmarks).forEach((indices) => {
    totalBookmarks += indices.length;
  });

  // Header
  html += `
              <div class="flex justify-between items-end border-b border-gray-700 pb-4">
                  <div>
                      <h2 class="text-3xl font-extrabold text-white mb-1">Knihovna Témat</h2>
                      <p class="text-gray-400 text-sm">Hluboké otázky, abychom se poznali ještě líp.</p>
                  </div>
                  <button onclick="openRandomTopic()" class="bg-[#2f3136] hover:bg-[#eb459e] text-white px-4 py-2 rounded-lg font-bold transition border border-gray-600 hover:border-[#eb459e] shadow-lg flex items-center gap-2 group">
                      <i class="fas fa-random group-hover:rotate-180 transition-transform duration-500"></i>
                      <span class="hidden sm:inline">Náhodná otázka</span>
                  </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              `;

  // 1. SPECIÁLNÍ KARTA: ULOŽENÉ (Zobrazí se vždy první)
  // NOVÉ: Tlačítko pro vymazání všech bookmarků (Koš)
  const resetBookmarksBtn =
    totalBookmarks > 0
      ? `<button onclick="event.stopPropagation(); requestResetBookmarks()" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Vymazat všechny oblíbené">
                       <i class="fas fa-undo-alt"></i>
                     </button>`
      : "";

  html += `
                  <div onclick="openTopic('bookmarks')" class="bg-gradient-to-br from-[#2f3136] to-[#202225] rounded-xl p-6 cursor-pointer border border-[#faa61a]/50 hover:border-[#faa61a] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
                      ${resetBookmarksBtn}
                      <div class="absolute -right-6 -bottom-6 text-9xl opacity-10 group-hover:opacity-20 transition-opacity rotate-12 select-none pointer-events-none grayscale-0">
                          💖
                      </div>
                      <div class="flex items-start justify-between mb-4">
                          <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#202225] group-hover:scale-110 transition-transform duration-300 shadow-md text-[#faa61a] border border-[#faa61a]/30">
                              💖
                          </div>
                          </div>
                      <h3 class="text-xl font-bold text-white mb-2 group-hover:text-[#faa61a] transition-colors">Moje Oblíbené</h3>
                      <p class="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow pr-6">Všechny otázky, které sis uložila na později, hezky pohromadě.</p>
                      <div class="mt-auto">
                          <div class="flex justify-between text-xs font-bold text-[#faa61a] mb-1">
                              <span>Uloženo</span>
                              <span>${totalBookmarks} otázek</span>
                          </div>
                          <div class="w-full bg-[#202225] h-2 rounded-full overflow-hidden">
                              <div class="h-full bg-[#faa61a]" style="width: ${totalBookmarks > 0 ? "100%" : "0%"
    }"></div>
                          </div>
                      </div>
                  </div>
              `;

  // 2. STANDARDNÍ KATEGORIE
  conversationTopics.forEach((topic) => {
    const doneCount = state.topicProgress[topic.id]
      ? state.topicProgress[topic.id].length
      : 0;
    const totalCount = topic.questions.length;
    const percent = Math.round((doneCount / totalCount) * 100);
    const progressColor = percent === 100 ? "#3ba55c" : topic.color;

    const resetButton =
      doneCount > 0
        ? `<button onclick="event.stopPropagation(); requestResetTopic('${topic.id}')" class="absolute top-3 right-3 text-gray-600 hover:text-red-400 p-2 transition z-20 hover:bg-[#202225] rounded-full" title="Resetovat postup">
                       <i class="fas fa-undo-alt"></i>
                     </button>`
        : "";

    html += `
                  <div onclick="openTopic('${topic.id}')" class="bg-[#2f3136] rounded-xl p-6 cursor-pointer border border-[#202225] hover:border-[${topic.color}] hover:-translate-y-1 transition-all duration-300 shadow-lg group relative overflow-hidden flex flex-col h-full">
                      ${resetButton}
                      <div class="absolute -right-6 -bottom-6 text-9xl opacity-5 group-hover:opacity-10 transition-opacity grayscale group-hover:grayscale-0 rotate-12 select-none pointer-events-none">
                          ${topic.icon}
                      </div>
                      <div class="flex items-start justify-between mb-4">
                          <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#202225] group-hover:scale-110 transition-transform duration-300 shadow-md" style="color: ${topic.color}">
                              ${topic.icon}
                          </div>
                      </div>
                      <h3 class="text-xl font-bold text-white mb-2 group-hover:text-[${topic.color}] transition-colors">${topic.title}</h3>
                      <p class="text-gray-400 text-sm mb-6 line-clamp-2 flex-grow pr-6">${topic.desc}</p>
                      <div class="mt-auto">
                          <div class="flex justify-between text-xs font-bold text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>${doneCount} / ${totalCount}</span>
                          </div>
                          <div class="w-full bg-[#202225] h-2 rounded-full overflow-hidden">
                              <div class="h-full transition-all duration-1000 ease-out" style="width: ${percent}%; background-color: ${progressColor}"></div>
                          </div>
                      </div>
                  </div>
              `;
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

// --- OPEN & RESET LOGIC ---

function openTopic(id) {
  state.topicSessionHistory = []; // Reset historie
  state.isViewingBookmarks = false; // Reset filtru

  // LOGIKA PRO MASTER KARTU OBLÍBENÝCH
  if (id === "bookmarks") {
    // Vytvoříme "virtuální" téma, které obsahuje všechny uložené otázky
    let allBookmarkedQuestions = [];

    // Projdeme všechny kategorie a posbíráme texty uložených otázek
    conversationTopics.forEach((topic) => {
      const savedIndices = state.topicBookmarks[topic.id] || [];
      savedIndices.forEach((index) => {
        allBookmarkedQuestions.push(topic.questions[index]);
      });
    });

    if (allBookmarkedQuestions.length === 0) {
      showNotification("Zatím nemáš žádné uložené otázky! ❤️", "info");
      return;
    }

    // Vytvoření dočasného objektu pro logiku
    activeTopicObject = {
      id: "bookmarks",
      title: "Všechny oblíbené",
      icon: "💖",
      color: "#faa61a",
      questions: allBookmarkedQuestions,
    };
  }
  // LOGIKA PRO STANDARDNÍ KATEGORIE
  else {
    const topic = conversationTopics.find((t) => t.id === id);
    if (!topic) return;
    activeTopicObject = topic; // Nastavíme globální referenci
  }

  state.currentTopicId = activeTopicObject.id;

  // UI Setup - schováme přepínač "Zobrazit oblíbené", pokud jsme přímo v oblíbených
  const bookmarkToggleBtn = document.getElementById("btn-view-bookmarks");
  if (state.currentTopicId === "bookmarks") {
    bookmarkToggleBtn.style.display = "none";
  } else {
    bookmarkToggleBtn.style.display = "flex";
    updateBookmarkViewButton();
  }

  // Nastavení vzhledu Modálu
  document.getElementById("topic-modal-title").style.color =
    activeTopicObject.color;
  document.getElementById("topic-modal-name").innerText =
    activeTopicObject.title;
  document.getElementById("topic-modal-icon").innerText =
    activeTopicObject.icon;
  document.getElementById("topic-card-bar").style.background =
    `linear-gradient(to right, ${activeTopicObject.color}, #5865F2)`;

  document.getElementById("topic-modal").style.display = "flex";
  document.getElementById("topic-modal").classList.remove("opacity-0");

  nextQuestion(true);
}

function requestResetTopic(id) {
  state.pendingResetId = id;
  document.getElementById("reset-confirm-modal").style.display = "flex";
}

// NOVÉ: Funkce pro vymazání všech bookmarků
function requestResetBookmarks() {
  state.pendingResetId = "ALL_BOOKMARKS"; // Speciální flag
  document.getElementById("reset-confirm-modal").style.display = "flex";
}

function confirmResetTopic() {
  if (!state.pendingResetId) return;

  if (state.pendingResetId === "ALL_BOOKMARKS") {
    // Resetovat VŠECHNY bookmarky
    state.topicBookmarks = {};
    localStorage.setItem(
      "klarka_topic_bookmarks",
      JSON.stringify(state.topicBookmarks),
    );
    showNotification("Všechny oblíbené otázky smazány! 🗑️", "success");
  } else {
    // Resetovat jen progress konkrétní kategorie
    state.topicProgress[state.pendingResetId] = [];
    localStorage.setItem(
      "klarka_topic_progress",
      JSON.stringify(state.topicProgress),
    );
    showNotification("Postup resetován! 🔄", "success");
  }

  closeModal("reset-confirm-modal");
  renderTopics();
  state.pendingResetId = null;
}

function closeTopicModal() {
  const modal = document.getElementById("topic-modal");
  modal.classList.add("opacity-0");
  setTimeout(() => {
    modal.style.display = "none";
    if (state.currentChannel === "topics") renderTopics();
  }, 300);
}

function openRandomTopic() {
  const randomTopic =
    conversationTopics[Math.floor(Math.random() * conversationTopics.length)];
  openTopic(randomTopic.id);
}

// --- QUESTION LOGIC ---

function nextQuestion(firstLoad = false) {
  const topic = activeTopicObject;
  let availableIndices = [];

  // Pokud jsme ve speciální kategorii 'bookmarks', jsou VŠECHNY otázky dostupné (protože už jsou filtrované)
  if (state.currentTopicId === "bookmarks") {
    availableIndices = topic.questions.map((_, index) => index);
    document.getElementById("topic-remaining").innerText =
      `${availableIndices.length} celkem`;
  }
  // Standardní kategorie
  else {
    const doneIndices = state.topicProgress[state.currentTopicId] || [];
    const bookmarkedIndices = state.topicBookmarks[state.currentTopicId] || [];

    if (state.isViewingBookmarks) {
      availableIndices = bookmarkedIndices;
      document.getElementById("topic-remaining").innerText =
        `${availableIndices.length} (uloženo)`;
    } else {
      availableIndices = topic.questions
        .map((_, index) => index)
        .filter((index) => !doneIndices.includes(index));
      document.getElementById("topic-remaining").innerText =
        availableIndices.length;
    }
  }

  const card = document.getElementById("question-card");
  const textEl = document.getElementById("topic-question-text");
  const controls = document.getElementById("topic-controls");
  const bookmarkBtn = document.getElementById("topic-bookmark-btn");

  // UI pro prázdný stav
  if (availableIndices.length === 0) {
    if (state.currentTopicId === "bookmarks") {
      textEl.innerHTML = `<span class="text-gray-400">Nemáš žádné uložené otázky. <br>Přidej si je srdíčkem v kategoriích!</span>`;
    } else {
      textEl.innerHTML = state.isViewingBookmarks
        ? `<span class="text-gray-400">Zatím sis v této kategorii nic neuložila.</span>`
        : `<span class="text-[#3ba55c]">🎉 Všechny otázky z této kategorie jsou probrány!</span>`;
    }
    bookmarkBtn.style.display = "none";
    controls.style.visibility = "hidden";
    return;
  }

  bookmarkBtn.style.display = "block";
  controls.style.visibility = "visible";

  // Vybereme náhodnou otázku z dostupných
  const nextIndex =
    availableIndices[Math.floor(Math.random() * availableIndices.length)];

  const renderContent = () => {
    state.currentQuestionIndex = nextIndex;
    textEl.innerText = topic.questions[nextIndex];

    if (
      state.topicSessionHistory[state.topicSessionHistory.length - 1] !==
      nextIndex
    ) {
      state.topicSessionHistory.push(nextIndex);
    }

    updateBackButtonState();
    updateBookmarkIconState();
  };

  if (!firstLoad) {
    card.classList.remove("animate-fade-in");
    card.classList.add("scale-95", "opacity-50");
    setTimeout(() => {
      renderContent();
      card.classList.remove("scale-95", "opacity-50");
      card.classList.add("scale-100", "opacity-100");
    }, 200);
  } else {
    renderContent();
  }
}

function prevQuestion() {
  if (state.topicSessionHistory.length <= 1) return;
  state.topicSessionHistory.pop();
  const prevIndex =
    state.topicSessionHistory[state.topicSessionHistory.length - 1];
  state.currentQuestionIndex = prevIndex;

  const textEl = document.getElementById("topic-question-text");
  const card = document.getElementById("question-card");

  card.classList.add("scale-95", "opacity-50");
  setTimeout(() => {
    textEl.innerText = activeTopicObject.questions[prevIndex];
    updateBackButtonState();
    updateBookmarkIconState();
    card.classList.remove("scale-95", "opacity-50");
  }, 200);
}

function markQuestionDone() {
  // Pokud jsme v bookmark módu, tlačítko "Probráno" jen posune na další
  if (state.currentTopicId === "bookmarks") {
    nextQuestion(false);
    return;
  }

  if (state.currentTopicId === null || state.currentQuestionIndex === null)
    return;

  if (!state.topicProgress[state.currentTopicId]) {
    state.topicProgress[state.currentTopicId] = [];
  }

  if (
    !state.topicProgress[state.currentTopicId].includes(
      state.currentQuestionIndex,
    )
  ) {
    state.topicProgress[state.currentTopicId].push(state.currentQuestionIndex);
    localStorage.setItem(
      "klarka_topic_progress",
      JSON.stringify(state.topicProgress),
    );
    triggerHaptic("success");
    triggerConfetti();
  }
  nextQuestion(false);
}

// --- BOOKMARK LOGIC (SMART) ---

function updateBookmarkIconState() {
  const btn = document.getElementById("topic-bookmark-btn");

  // Pokud jsme v "Bookmarks" módu, otázka JE uložená.
  // Zobrazíme "svítící" (plnou) ikonu. Kliknutím se provede "unsave".
  if (state.currentTopicId === "bookmarks") {
    btn.innerHTML = `<i class="fas fa-bookmark text-[#eb459e] drop-shadow-md" title="Odebrat z oblíbených"></i>`;
    return;
  }

  // Standardní logika pro kategorie
  const bookmarks = state.topicBookmarks[state.currentTopicId] || [];
  if (bookmarks.includes(state.currentQuestionIndex)) {
    btn.innerHTML = `<i class="fas fa-bookmark text-[#eb459e] drop-shadow-md"></i>`;
  } else {
    btn.innerHTML = `<i class="far fa-bookmark text-gray-500"></i>`;
  }
}

function toggleQuestionBookmark() {
  const currentText = activeTopicObject.questions[state.currentQuestionIndex];

  // 1. ZJISTÍME ORIGINÁLNÍ UMÍSTĚNÍ OTÁZKY
  let originTopicId = null;
  let originIndex = -1;

  if (state.currentTopicId !== "bookmarks") {
    originTopicId = state.currentTopicId;
    originIndex = state.currentQuestionIndex;
  } else {
    // Jsme v mixu, musíme prohledat databázi podle textu
    for (const topic of conversationTopics) {
      const idx = topic.questions.indexOf(currentText);
      if (idx !== -1) {
        originTopicId = topic.id;
        originIndex = idx;
        break;
      }
    }
  }

  if (!originTopicId || originIndex === -1) return; // Chyba

  // 2. PŘIDAT NEBO ODEBRAT
  if (!state.topicBookmarks[originTopicId])
    state.topicBookmarks[originTopicId] = [];
  const bookmarks = state.topicBookmarks[originTopicId];

  if (bookmarks.includes(originIndex)) {
    // ODEBRAT (UNSAVE)
    state.topicBookmarks[originTopicId] = bookmarks.filter(
      (i) => i !== originIndex,
    );
    triggerHaptic("light");

    // Pokud jsme v "Bookmarks" módu, musíme ji vizuálně vyhodit
    if (state.currentTopicId === "bookmarks") {
      // Odebereme z virtuálního pole, aby se neopakovala
      activeTopicObject.questions.splice(state.currentQuestionIndex, 1);

      showNotification("Odstraněno z oblíbených", "info");
      // Hned přeskočit na další otázku
      nextQuestion(false);
      // Return, protože nextQuestion už si zavolá updateBookmarkIconState
      localStorage.setItem(
        "klarka_topic_bookmarks",
        JSON.stringify(state.topicBookmarks),
      );
      return;
    }
  } else {
    // PŘIDAT (SAVE)
    state.topicBookmarks[originTopicId].push(originIndex);
    triggerHaptic("medium");
  }

  localStorage.setItem(
    "klarka_topic_bookmarks",
    JSON.stringify(state.topicBookmarks),
  );
  updateBookmarkIconState();
}

function toggleViewBookmarks() {
  state.isViewingBookmarks = !state.isViewingBookmarks;
  updateBookmarkViewButton();
  nextQuestion(true);
}

function updateBookmarkViewButton() {
  const btn = document.getElementById("btn-view-bookmarks");
  if (state.isViewingBookmarks) {
    btn.innerHTML = `<i class="fas fa-heart text-[#eb459e]"></i> <span class="hidden sm:inline text-white">Zobrazit vše</span>`;
    btn.classList.add("border-[#eb459e]");
  } else {
    btn.innerHTML = `<i class="far fa-heart"></i> <span class="hidden sm:inline">Zobrazit oblíbené</span>`;
    btn.classList.remove("border-[#eb459e]");
  }
}

function updateBackButtonState() {
  const btn = document.getElementById("btn-prev-question");
  if (state.topicSessionHistory.length > 1) {
    btn.disabled = false;
    btn.classList.remove("opacity-30", "cursor-not-allowed");
  } else {
    btn.disabled = true;
    btn.classList.add("opacity-30", "cursor-not-allowed");
  }
}

// 3. OPRAVA BOOKMARKŮ
function updateBookmarkIconState() {
  const btn = document.getElementById("topic-bookmark-btn");
  const bookmarks = state.topicBookmarks[state.currentTopicId] || [];

  // Zkontrolujeme, zda je AKTUÁLNÍ index v poli bookmarků
  if (bookmarks.includes(state.currentQuestionIndex)) {
    btn.innerHTML = `<i class="fas fa-bookmark text-[#eb459e] drop-shadow-md"></i>`;
  } else {
    btn.innerHTML = `<i class="far fa-bookmark text-gray-500"></i>`;
  }
}

function toggleQuestionBookmark() {
  if (state.currentTopicId === null || state.currentQuestionIndex === null)
    return;

  if (!state.topicBookmarks[state.currentTopicId]) {
    state.topicBookmarks[state.currentTopicId] = [];
  }

  const bookmarks = state.topicBookmarks[state.currentTopicId];
  const qIndex = state.currentQuestionIndex;

  if (bookmarks.includes(qIndex)) {
    // Odebrat
    state.topicBookmarks[state.currentTopicId] = bookmarks.filter(
      (i) => i !== qIndex,
    );
    triggerHaptic("light");
  } else {
    // Přidat
    state.topicBookmarks[state.currentTopicId].push(qIndex);
    triggerHaptic("medium");
  }

  localStorage.setItem(
    "klarka_topic_bookmarks",
    JSON.stringify(state.topicBookmarks),
  );

  // Hned aktualizovat vzhled
  updateBookmarkIconState();
}

function changeTheme(theme) {
  const root = document.documentElement;
  // Clear inline styles first (font-family, font-size from Tetris)
  document.body.style.fontFamily = "";
  document.body.style.fontSize = "";

  if (theme === "christmas") {
    root.style.setProperty("--bg-tertiary", "#420d0d");
    root.style.setProperty("--bg-secondary", "#5c1414");
    root.style.setProperty("--bg-primary", "#240a0a");
    root.style.setProperty("--blurple", "#c92a2a"); // Red
    root.style.setProperty("--green", "#ffd700"); // Gold
    root.style.setProperty("--text-header", "#ffffff");
    root.style.setProperty("--interactive-active", "#ffffff");
    root.style.setProperty("--interactive-normal", "#e8e8e8"); // Lighter text
    root.style.setProperty("--text-normal", "#f0f0f0");
  } else if (theme === "tetris") {
    root.style.setProperty("--bg-tertiary", "#0d0e15");
    root.style.setProperty("--bg-secondary", "#151620");
    root.style.setProperty("--bg-primary", "#1c1d29");
    root.style.setProperty("--blurple", "#00e5ff");
    root.style.setProperty("--green", "#69f0ae");
    root.style.setProperty("--red", "#ff5252");
    root.style.setProperty("--yellow", "#ffd740");
    root.style.setProperty("--pink", "#e040fb");
    root.style.setProperty("--text-normal", "#33ff00");
    root.style.setProperty("--interactive-normal", "#33ff00");
    document.body.style.fontFamily = "'Press Start 2P', cursive";
    document.body.style.fontSize = "0.8rem";
  } else {
    // default
    root.style.setProperty("--bg-tertiary", "#202225");
    root.style.setProperty("--bg-secondary", "#2f3136");
    root.style.setProperty("--bg-primary", "#36393f");
    root.style.setProperty("--blurple", "#5865F2");
    root.style.setProperty("--green", "#3ba55c");
    root.style.setProperty("--red", "#ed4245");
    root.style.setProperty("--yellow", "#faa61a");
    root.style.setProperty("--pink", "#eb459e");
    root.style.setProperty("--text-normal", "#dcddde");
    root.style.setProperty("--interactive-normal", "#b9bbbe");
  }
  showNotification(`Téma změněno: ${theme}`, "success");
}

// Přidej do state.dates (nové úložiště pro naplánovaná rande)
// Struktura: { "2024-02-14": { locationId: 101, note: "Valentýn" } }
state.plannedDates =
  JSON.parse(localStorage.getItem("klarka_planned_dates")) || {};

function saveDateToCalendar() {
  const dateInput = document.getElementById("date-input").value; // YYYY-MM-DDTHH:mm
  if (!dateInput || !selectedDateLocation) {
    showNotification("Vyber datum a místo!", "error");
    return;
  }

  const dateKey = dateInput.split("T")[0]; // Získáme YYYY-MM-DD

  state.plannedDates[dateKey] = {
    id: selectedDateLocation.id,
    name: selectedDateLocation.name,
    cat: selectedDateLocation.cat,
    time: dateInput.split("T")[1],
  };

  localStorage.setItem(
    "klarka_planned_dates",
    JSON.stringify(state.plannedDates),
  );
  showNotification("Rande uloženo do kalendáře! 📅", "success");
  triggerConfetti();
}

function backupData() {
  const data = JSON.stringify(state);
  // Zkopírovat do schránky nebo stáhnout jako soubor
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `kiscord_backup_${new Date().toISOString().split("T")[0]}.json`;
  a.click();

  showNotification("Záloha stažena! Ulož si ji bezpečně.", "success");
}

// INIT
window.addEventListener("DOMContentLoaded", () => {
  showMainApp();
});
const search = document.getElementById("search-input");
if (search)
  search.addEventListener("input", () => {
    if (["movies", "series", "games"].includes(state.currentChannel))
      renderLibrary(state.currentChannel);
  });

// --- PWA: OFFLINE MODE REGISTRATION ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        console.log("Service Worker zaregistrován:", reg.scope);
      })
      .catch((err) => {
        console.log("Service Worker registrace selhala:", err);
      });
  });
}

// --- DETEKCE OFFLINE STAVU (Notifikace pro Klárku) ---
window.addEventListener("offline", () => {
  showNotification("📡 Ztráta spojení! Přepínám na offline režim.", "error");
  document.body.style.filter = "grayscale(0.5)"; // Vizuální efekt
});

window.addEventListener("online", () => {
  showNotification("🌐 Jsi zpět online!", "success");
  document.body.style.filter = "none";
  // Znovu načteme mapu, kdyby chyběly dlaždice
  if (state.mapInstance) {
    state.mapInstance.invalidateSize();
  }
});

// --- SLEEP TIMER LOGIC (Progressive) ---
var sleepTimerInterval = null;

function startSleepTimer() {
  if (sleepTimerInterval) clearInterval(sleepTimerInterval);

  // Update immediately then every minute
  updateSleepVisuals();
  sleepTimerInterval = setInterval(updateSleepVisuals, 60000); // 1 minuta
}

function stopSleepTimer() {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval);
    sleepTimerInterval = null;
  }
}

function updateSleepVisuals() {
  if (!state.currentSleepSession || !state.currentSleepSession.isSleeping) return;

  const now = new Date();
  const startTime = new Date(state.currentSleepSession.startTime);
  const diffMs = now - startTime;

  // Convert to decimal hours for slider width
  let diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours > 12) diffHours = 12; // Cap visual at 12h

  // Format text (Hours + Min)
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  // Get Elements
  const progressBar = document.getElementById('sleep-progress-bar');
  const marker = document.getElementById('sleep-marker');
  const textEl = document.getElementById('sleep-value-text');
  const labelEl = document.getElementById('sleep-session-label'); // New label in controls

  const color = getSleepColor(diffHours);

  // Update Slider (Visual only, no save)
  if (progressBar) {
    progressBar.style.width = `${(diffHours / 12) * 100}%`;
    progressBar.style.backgroundColor = color.hex;
    progressBar.style.boxShadow = `0 0 15px ${color.hex}80`;
  }
  if (marker) {
    marker.style.left = `${(diffHours / 12) * 100}%`;
  }

  // Update Main Text
  if (textEl) {
    textEl.innerHTML = `${hours} <span class="text-sm opacity-80 font-bold text-gray-400">hod</span> <span class="text-2xl opacity-60 font-bold text-gray-500">${mins} <span class="text-sm">min</span></span>`;
    textEl.className = `font-black text-4xl ${color.class} transition-colors duration-200 leading-none drop-shadow-md filter brightness-110 flex items-baseline gap-2`;
  }

  // Update Small Label
  if (labelEl) {
    labelEl.textContent = `Spíš ${hours}h ${mins}m`;
  }
}

// --- MISSING DASHBOARD LOGIC (Added by Antigravity) ---

function getTodayData() {
  const todayKey = new Date().toISOString().split('T')[0];

  // Ensure healthData exists
  if (!state.healthData) state.healthData = {};

  if (!state.healthData[todayKey]) {
    state.healthData[todayKey] = {
      water: 0,
      mood: 50,
      sleep: 0,
      movement: [] // Array of IDs: 'gym', 'walk', 'sex'
    };
    // Save empty state immediately
    localStorage.setItem('klarka_health', JSON.stringify(state.healthData));
  }
  return state.healthData[todayKey];
}


function updateHealth(type, value) {
  const data = getTodayData();
  const todayKey = new Date().toISOString().split('T')[0];

  // --- LOGIC PER TYPE ---
  if (type === 'mood') {
    data.mood = value;
  }
  else if (type === 'water') {
    // Toggle logic for water buttons:
    // If clicking the current level, decrease by 1 (unfill).
    // Otherwise set to clicked level.
    if (data.water === value) data.water = value - 1;
    else data.water = value;
  }
  else if (type === 'movement') {
    // Val is ID (e.g. 'gym')
    const activityId = value;
    const index = data.movement.indexOf(activityId);

    if (index !== -1) {
      // Remove
      data.movement.splice(index, 1);
      triggerHaptic('light');
    } else {
      // Add
      data.movement.push(activityId);
      triggerHaptic('success');

      // Celebration Logic
      if (activityId === 'gym' || activityId === 'walk') {
        if (typeof triggerConfetti === 'function') triggerConfetti();
      }
    }
  }

  // --- SAVE ---
  state.healthData[todayKey] = data;
  localStorage.setItem('klarka_health', JSON.stringify(state.healthData));

  // --- RE-RENDER ---
  // Essential to update UI state (active classes, colors)
  if (state.currentChannel === 'dashboard') {
    renderDashboard();
  }
}

// --- TETRIS TRACKER LOGIC ---
function getTetrisScore() {
  const defaultScore = { jose: 0, klarka: 0, history: [] };
  const stored = localStorage.getItem('klarka_tetris_score');
  return stored ? JSON.parse(stored) : defaultScore;
}

function updateTetrisScore(who, amount) {
  const data = getTetrisScore();

  if (who === 'reset') {
    if (confirm('Opravdu resetovat skóre?')) {
      data.jose = 0;
      data.klarka = 0;
      data.history = [];
    } else {
      return;
    }
  } else {
    data[who] += amount;
    data.history.push({
      winner: who,
      date: new Date().toISOString()
    });

    // Haptic & Visual Feedback
    if (typeof triggerHaptic === 'function') triggerHaptic('success');
    if (typeof triggerConfetti === 'function') triggerConfetti();
    showNotification(`${who === 'jose' ? 'Jožka' : 'Klárka'} vyhrává bod! 🧱`, 'success');
  }

  localStorage.setItem('klarka_tetris_score', JSON.stringify(data));

  // Re-render ONLY if on dashboard to avoid full reload glich, or just update DOM directly for performance
  if (state.currentChannel === 'dashboard') {
    // Re-render dashboard to update widget
    renderDashboard();
  } else if (state.currentChannel === 'tetris') {
    renderTetrisTracker();
  }
}



// --- VALENTINE'S UPDATE LOGIC ---
function showValentineBanner(force = false) {
  // Check if already shown this session (unless forced)
  if (!force && sessionStorage.getItem("valentine_banner_shown")) return;

  const modalHtml = `
  <div id="valentine-modal" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
    <div class="bg-gradient-to-br from-[#ff1493] to-[#ff0000] p-1 rounded-2xl shadow-2xl max-w-md w-full transform scale-100 transition-all">
      <div class="bg-[#2d0a12] rounded-xl p-6 text-center border border-[#ff69b4]/50 relative overflow-hidden">
        
        <!-- Confetti Canvas (optional, or just CSS animation) -->
        <div class="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/heart-pattern.png')]"></div>
        
        <div class="relative z-10">
          <div class="text-6xl mb-4 animate-bounce">💎</div>
          <h2 class="text-3xl font-black text-white mb-2" style="font-family: 'Comic Sans MS', cursive">GRATULUJEME!</h2>
          <p class="text-[#fab1c6] text-lg mb-6 font-bold">
            Byla vám zdarma prodloužena licence na <span class="text-white underline decoration-wavy decoration-[#ff0000]">Přítele v2.0</span> na další rok! 💖
          </p>
          
          <div class="space-y-3">
             <button onclick="activateValentineMode()" class="w-full bg-[#ff1493] hover:bg-[#ff0000] text-white font-bold py-4 rounded-xl shadow-lg transform transition hover:scale-105 active:scale-95 text-xl border-b-4 border-[#c71585]">
               Cool, beru! 😎
             </button>
             <button onclick="activateValentineMode()" class="w-full bg-[#4a101e] hover:bg-[#2d0a12] text-[#fab1c6] font-bold py-2 rounded-lg text-sm transition">
               Reklamovat (Zamítnuto)
             </button>
          </div>
          
          <p class="mt-4 text-[10px] text-[#ff69b4]/50 uppercase tracking-widest">
            *Licence je nevratná. Žádné reklamace. Láska je zdarma ale servery stojí peníze.
          </p>
        </div>
      </div>
    </div>
  </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  if (typeof triggerConfetti === 'function') triggerConfetti();
}

function activateValentineMode() {
  // Check if disabled by user
  if (localStorage.getItem("valentine_disabled") === "true") {
    console.log("Valentine Mode is disabled by user.");
    return;
  }

  const modal = document.getElementById("valentine-modal");
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }

  // FORCE THEME DIRECTLY
  console.log("Activating Valentine Mode - Force Style");

  const root = document.documentElement;
  const body = document.body;

  // 1. Force CSS Variables inline (LIGHTER PINK PALETTE)
  root.style.setProperty("--bg-tertiary", "#5e1e2e"); // Lighter Burgundy
  root.style.setProperty("--bg-secondary", "#852d48"); // Rosy Pink
  root.style.setProperty("--bg-primary", "#a33e5d"); // Light Rose
  root.style.setProperty("--blurple", "#ff69b4"); // Hot pink
  root.style.setProperty("--green", "#00ff00"); // Lime Green
  root.style.setProperty("--red", "#ffffff"); // White text for contrast on dark pink
  root.style.setProperty("--yellow", "#ffe4b5"); // Moccasin
  root.style.setProperty("--pink", "#ff1493");
  root.style.setProperty("--text-normal", "#ffe4e1");
  root.style.setProperty("--interactive-normal", "#fff0f5");
  root.style.setProperty("--channel-text-selected", "#ffffff !important"); // Force white

  // 2. Force Font Family (Important!)
  body.style.fontFamily = "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif";

  // 3. Add Class
  body.classList.add('theme-valentines');

  // 4. Save State
  sessionStorage.setItem("valentine_banner_shown", "true");
}

function deactivateValentineMode() {
  const root = document.documentElement;
  const body = document.body;

  // 1. Remove CSS Props
  const props = [
    "--bg-tertiary", "--bg-secondary", "--bg-primary",
    "--blurple", "--green", "--red", "--yellow", "--pink",
    "--text-normal", "--interactive-normal", "--channel-text-selected"
  ];
  props.forEach(p => root.style.removeProperty(p));

  // 2. Reset Font
  body.style.fontFamily = "";

  // 3. Remove Class
  body.classList.remove('theme-valentines');
}

function toggleValentineMode() {
  const isDisabled = localStorage.getItem("valentine_disabled") === "true";

  if (isDisabled) {
    // Zapnout
    localStorage.removeItem("valentine_disabled");
    activateValentineMode();
  } else {
    // Vypnout (Instantně)
    localStorage.setItem("valentine_disabled", "true");
    deactivateValentineMode();
  }
}

function renderPuzzleGame(selectedImage = null) {
  // --- CLEANUP OLD INSTANCE ---
  if (state.puzzleInstance) {
    state.puzzleInstance.destroy();
    state.puzzleInstance = null;
  }

  const container = document.getElementById("messages-container");

  // --- IMAGE LIBRARY ---
  // --- IMAGE LIBRARY ---
  const puzzleImages = [
    { src: "img/puzzle/puzzle_myval_sova_foto.jpg", name: "Sova & Mýval (Originál)" },
    { src: "img/puzzle/puzzle_myval_zaba_kreslene.jpg", name: "Žabák & Kamarádi (Kreslené)" },
    { src: "img/puzzle/crazy_fight_sova_myval.jpg", name: "Crazy Fight" }, // NEW
    { src: "img/puzzle/myval_zaba_ai.jpg", name: "AI Art: Mýval & Žába" }, // NEW
    { src: "img/puzzle/myval_zaba_medvidek.jpg", name: "Trio: Mýval, Žába, Medvídek" } // NEW
  ];

  // Default to first or selected
  const currentImageSrc = selectedImage || puzzleImages[0].src;

  // Generate Gallery HTML
  const galleryHtml = puzzleImages.map(img =>
    `<div onclick="renderPuzzleGame('${img.src}')" 
            class="cursor-pointer border-2 ${img.src === currentImageSrc ? 'border-[#ff69b4]' : 'border-transparent'} rounded overflow-hidden hover:scale-105 transition">
          <img src="${img.src}" class="w-16 h-16 object-cover opacity-80 hover:opacity-100">
       </div>`
  ).join('');

  container.innerHTML = `
      <div class="flex flex-col h-full bg-[#202225] p-4 items-center justify-center overflow-hidden relative">
          <!-- Background & Particles -->
          <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/hearts.png')] opacity-10 pointer-events-none"></div>
          
          <div class="z-10 text-center mb-2">
          <div class="z-10 text-center mb-2">
              <h1 class="text-3xl font-black text-[#ff69b4] drop-shadow-lg" style="font-family: 'Comic Sans MS', cursive">Puzzle 🧩</h1>
              <p class="text-[#fab1c6] text-sm font-bold">Vyber si fotku a poskládej ji!</p>
          </div>

          <!-- Gallery Selector -->
          <div class="flex gap-2 mb-4 overflow-x-auto max-w-full p-2 bg-black/30 rounded-xl backdrop-blur-sm z-20 custom-scrollbar">
              ${galleryHtml}
          </div>

          <!-- Puzzle Container -->
          <div id="puzzle-container" class="relative bg-black/50 p-2 rounded-xl shadow-2xl border-4 border-[#ff69b4] mb-4">
              <!-- Canvas will be injected here by PuzzleGame -->
          </div>

          <!-- Controls / Stats -->
          <div class="flex gap-8 text-white font-mono text-xl bg-black/30 p-4 rounded-xl backdrop-blur-sm border border-[#ff69b4]/30">
              <div class="flex flex-col items-center">
                  <span class="text-xs text-[#ff69b4] uppercase font-bold">Čas</span>
                  <span id="puzzle-timer">0:00</span>
              </div>
              <div class="flex flex-col items-center">
                  <span class="text-xs text-[#ff69b4] uppercase font-bold">tahy</span>
                  <span id="puzzle-moves">0</span>
              </div>
          </div>
          
          <div class="mt-4 flex gap-4">
             <button onclick="renderPuzzleGame('${currentImageSrc}')" class="bg-[#ff1493] hover:bg-[#ff0080] text-white px-6 py-2 rounded-full font-bold shadow-lg transition transform hover:scale-105">
                 Restartovat 🔄
             </button>
             <button onclick="switchChannel('dashboard')" class="bg-[#2f3136] hover:bg-[#40444b] text-gray-300 px-6 py-2 rounded-full font-bold transition">
                 Zpět
             </button>
          </div>
      </div>
  `;

  // Initialize Game
  if (typeof PuzzleGame === 'undefined') {
    const script = document.createElement('script');
    script.src = 'puzzle.js';
    script.onload = () => {
      state.puzzleInstance = new PuzzleGame('puzzle-container', currentImageSrc, 3);
    };
    document.body.appendChild(script);
  } else {
    state.puzzleInstance = new PuzzleGame('puzzle-container', currentImageSrc, 3);
  }
}

// --- INITIALIZATION CHECK ---
// Helper to manual trigger for user/testing
window.debugValentine = showValentineBanner;

// Auto-trigger on Feb 14
const today = new Date();
if (today.getMonth() === 1 && today.getDate() === 14) {
  setTimeout(showValentineBanner, 1500);
} else if (today.getMonth() === 1 && today.getDate() === 12) {
  // For testing today (Feb 12) - maybe don't auto trigger, let user decide via button
  // But user asked to implement it. I will leave it manual via button in renderWelcome for now.
}

// --- TETRIS PAGE RENDERER (Detailed Arena) ---
function renderTetrisTracker() {
  const container = document.getElementById("messages-container");
  const score = getTetrisScore();
  const leader = score.jose > score.klarka ? 'Jožka' : score.jose < score.klarka ? 'Klárka' : 'Remíza';
  const leaderColor = score.jose > score.klarka ? 'text-[#5865F2]' : score.jose < score.klarka ? 'text-[#eb459e]' : 'text-gray-400';

  container.innerHTML = `
    <div class="p-4 max-w-lg mx-auto space-y-6 animate-fade-in pb-24 pt-8">
       
       <!-- Header -->
       <div class="text-center mb-8">
          <h1 class="text-4xl font-black text-white mb-2 tracking-tight" style="font-family: 'Press Start 2P', cursive; text-shadow: 4px 4px #000;">TETRIS ARÉNA</h1>
          <p class="text-gray-400 text-sm font-bold uppercase tracking-widest">Nekonečná válka o čest</p>
       </div>

       <div class="bg-[#2f3136] rounded-xl shadow-2xl border border-[#202225] overflow-hidden relative">
            
            <!-- Background Pattern -->
            <div class="absolute inset-0 opacity-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

            <!-- Content (The Big Arena) -->
            <div class="p-8 relative z-10">
               <div class="flex items-center justify-between gap-6 mb-8">
                   <!-- JOZKA -->
                   <div class="flex-1 flex flex-col items-center group">
                       <div class="w-24 h-24 rounded-full bg-[#5865F2]/10 flex items-center justify-center border-4 border-[#5865F2] mb-4 relative cursor-pointer transition transform active:scale-95 hover:shadow-[0_0_20px_rgba(88,101,242,0.5)]" onclick="updateTetrisScore('jose', 1)">
                           <div class="text-6xl">🦝</div>
                           <div class="absolute -bottom-2 -right-2 bg-[#5865F2] w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold shadow-md group-hover:scale-110 transition">+1</div>
                       </div>
                       <div class="text-lg font-bold text-gray-300 mb-1">Jožka</div>
                       <div class="text-5xl font-black text-[#5865F2] tracking-tighter filter drop-shadow-lg" id="score-jose">${score.jose}</div>
                   </div>

                   <!-- VS -->
                   <div class="flex flex-col items-center opacity-30">
                       <div class="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">VS</div>
                       <div class="h-24 w-1 bg-white rounded-full"></div>
                   </div>

                   <!-- KLARKA -->
                   <div class="flex-1 flex flex-col items-center group">
                       <div class="w-24 h-24 rounded-full bg-[#eb459e]/10 flex items-center justify-center border-4 border-[#eb459e] mb-4 relative cursor-pointer transition transform active:scale-95 hover:shadow-[0_0_20px_rgba(235,69,158,0.5)]" onclick="updateTetrisScore('klarka', 1)">
                           <div class="text-6xl">🐸</div>
                           <div class="absolute -bottom-2 -right-2 bg-[#eb459e] w-8 h-8 rounded-full flex items-center justify-center text-sm text-white font-bold shadow-md group-hover:scale-110 transition">+1</div>
                       </div>
                       <div class="text-lg font-bold text-gray-300 mb-1">Klárka</div>
                       <div class="text-5xl font-black text-[#eb459e] tracking-tighter filter drop-shadow-lg" id="score-klarka">${score.klarka}</div>
                   </div>
               </div>

               <!-- Leader & Reset -->
               <div class="bg-[#202225]/80 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-gray-700">
                   <div class="flex flex-col">
                       <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wide">Aktuální lídr</span>
                       <span id="tetris-leader-text" class="text-xl font-bold ${leaderColor}">${leader}</span>
                   </div>
                   <button onclick="updateTetrisScore('reset')" class="text-xs bg-[#2f3136] hover:bg-red-500/20 text-gray-500 hover:text-red-400 border border-gray-600 hover:border-red-500/50 px-4 py-2 rounded transition uppercase font-bold">
                       Reset
                   </button>
               </div>
            </div>
       </div>

       <!-- Back to Dashboard -->
        <button onclick="switchChannel('dashboard')" class="w-full py-4 rounded-xl border border-[#202225] bg-[#2f3136] text-gray-400 hover:text-white hover:bg-[#36393f] transition font-bold text-sm uppercase tracking-wider">
            <i class="fas fa-arrow-left mr-2"></i> Zpět na dashboard
        </button>
    </div>
  `;
}
