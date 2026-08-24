import { state } from '@core/state.js';
import { switchChannel } from '@core/router.js';
import { triggerHaptic } from '@core/utils.js';

let activeFilter = 'all'; // 'all', 'couple', 'logic', 'ranking'

const GAMES_LIST = [
    {
        id: 'game-draw',
        title: 'Draw Duel',
        badge: '🎨 KREATIVNÍ • REALTIME',
        icon: 'fa-palette',
        color: '#eb459e',
        gradient: 'from-[#eb459e]/20 via-[#f47fff]/10 to-transparent',
        borderHover: 'hover:border-[#eb459e]',
        btnBg: 'bg-[#eb459e] hover:bg-[#d83c8c]',
        desc: 'Společné plátno v reálném čase. Jeden kreslí a druhý hádá, nebo tvořte společná umělecká díla!',
        tags: ['couple', 'all'],
        channel: 'game-draw',
        statsBadge: '✏️ Kreslení pro dva'
    },
    {
        id: 'game-who',
        title: 'Kdo spíše?',
        badge: '🤔 ZÁBAVNÉ • PRO DVA',
        icon: 'fa-question-circle',
        color: '#faa61a',
        gradient: 'from-[#faa61a]/20 via-[#faa61a]/5 to-transparent',
        borderHover: 'hover:border-[#faa61a]',
        btnBg: 'bg-[#faa61a] hover:bg-[#e09415] text-black font-extrabold',
        desc: 'Rychlé hlasování na vtipné i záludné otázky o vašich zvycích. Shodnete se na odpovědích?',
        tags: ['couple', 'all'],
        channel: 'game-who',
        statsBadge: '⚡ Rychlé hlasování'
    },
    {
        id: 'quiz',
        title: 'Párové Kvízy',
        badge: '💖 VZTAHOVÉ • SHODA',
        icon: 'fa-brain',
        color: '#5865F2',
        gradient: 'from-[#5865F2]/20 via-[#5865F2]/5 to-transparent',
        borderHover: 'hover:border-[#5865F2]',
        btnBg: 'bg-[#5865F2] hover:bg-[#4752c4]',
        desc: 'Zodpovězte otázky o svých preferencích, snech a zvycích a zjistěte procento vzájemné shody!',
        tags: ['couple', 'all'],
        channel: 'quiz',
        statsBadge: '🧠 Kdo koho lépe zná'
    },
    {
        id: 'puzzle',
        title: 'Foto Puzzle',
        badge: '🧩 LOGICKÉ • VZPOMÍNKY',
        icon: 'fa-puzzle-piece',
        color: '#3ba55c',
        gradient: 'from-[#3ba55c]/20 via-[#3ba55c]/5 to-transparent',
        borderHover: 'hover:border-[#3ba55c]',
        btnBg: 'bg-[#3ba55c] hover:bg-[#2d7d46]',
        desc: 'Skládejte kousky vašich společných fotek z Timelinu na čas s volitelnou obtížností a mřížkou!',
        tags: ['logic', 'all'],
        channel: 'puzzle',
        statsBadge: '🖼️ Z našich fotek'
    },
    {
        id: 'tetris',
        title: 'Tetris War Tracker',
        badge: '🏆 VÝZVA • RETRO ARCADE',
        icon: 'fa-shapes',
        color: '#faa61a',
        gradient: 'from-[#faa61a]/20 via-purple-500/10 to-transparent',
        borderHover: 'hover:border-[#faa61a]',
        btnBg: 'bg-[#faa61a] hover:bg-[#e09415] text-black font-extrabold',
        desc: 'Hrajte klasický retro Tetris, překonávejte ligové rekordy a soupeřte o pozici šampiona!',
        tags: ['ranking', 'all'],
        channel: 'tetris',
        statsBadge: '🎮 Tetris liga'
    },
    {
        id: 'tierlist',
        title: 'Tier Listy',
        badge: '⭐ HODNOCENÍ • DRAG & DROP',
        icon: 'fa-layer-group',
        color: '#f47fff',
        gradient: 'from-[#f47fff]/20 via-[#5865F2]/10 to-transparent',
        borderHover: 'hover:border-[#f47fff]',
        btnBg: 'bg-gradient-to-r from-[#eb459e] to-[#f47fff] hover:from-[#d83c8c] hover:to-[#e06ee0]',
        desc: 'Sestavujte společné S-A-B-C-D žebříčky pro navštívená místa, oblíbená jídla, rande i filmy.',
        tags: ['ranking', 'all'],
        channel: 'tierlist',
        statsBadge: '🏆 S-A-B-C-D žebříčky'
    },
    {
        id: 'funfacts',
        title: 'Zajímavosti & Mývalové',
        badge: '🦝 FAKTA • ZVÍŘATA',
        icon: 'fa-lightbulb',
        color: '#00bcd4',
        gradient: 'from-[#00bcd4]/20 via-[#00bcd4]/5 to-transparent',
        borderHover: 'hover:border-[#00bcd4]',
        btnBg: 'bg-[#00bcd4] hover:bg-[#0097a7] text-black font-extrabold',
        desc: 'Objevujte fascinující fakta o mývalech, sovách, přírodě i světě doplněná o minikvízy!',
        tags: ['logic', 'all'],
        channel: 'funfacts',
        statsBadge: '💡 Věděli jste, že...'
    }
];

export function renderGamesHub(filter = activeFilter) {
    activeFilter = filter;

    window.GamesHub = {
        renderGamesHub,
        setFilter
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    const filteredGames = activeFilter === 'all' 
        ? GAMES_LIST 
        : GAMES_LIST.filter(g => g.tags.includes(activeFilter));

    container.innerHTML = `
        <div class="flex flex-col h-full bg-[#36393f] relative overflow-hidden text-white animate-fade-in select-none">
            <!-- Background Glow Decorations -->
            <div class="absolute top-0 right-0 w-96 h-96 bg-[#faa61a]/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div class="absolute bottom-0 left-0 w-96 h-96 bg-[#5865F2]/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div class="absolute top-1/2 left-1/3 w-80 h-80 bg-[#eb459e]/10 rounded-full blur-[140px] pointer-events-none"></div>

            <!-- HEADER -->
            <div class="relative bg-[#2f3136]/90 backdrop-blur-md border-b border-[#202225] p-5 lg:p-7 z-10 shadow-lg flex-shrink-0">
                <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div>
                        <div class="flex items-center gap-3">
                            <span class="text-3xl animate-bounce">🕹️</span>
                            <h1 class="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                Herní Doupě & Arcade
                            </h1>
                        </div>
                        <p class="text-gray-400 text-xs mt-1">Společné hry, kvízy, puzzle a výzvy pro dva hráče 🏆🎮</p>
                    </div>

                    <div class="flex items-center gap-2">
                        <div class="bg-[#202225] border border-white/5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 flex items-center gap-2 shadow-inner">
                            <i class="fas fa-gamepad text-[#faa61a]"></i>
                            <span>7 Miniher připraveno</span>
                        </div>
                    </div>
                </div>

                <!-- FILTER TABS -->
                <div class="max-w-7xl mx-auto flex items-center gap-2 mt-5 pt-3 border-t border-white/5 overflow-x-auto no-scrollbar">
                    <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mr-1 hidden sm:inline">Kategorie:</span>
                    
                    <button onclick="window.GamesHub.setFilter('all')" 
                        class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeFilter === 'all' ? 'bg-[#5865F2] text-white shadow-lg shadow-[#5865F2]/30 scale-105' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                        <span>🎮 Všechny hry</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === 'all' ? 'bg-white/20' : 'bg-black/30'}">7</span>
                    </button>

                    <button onclick="window.GamesHub.setFilter('couple')" 
                        class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeFilter === 'couple' ? 'bg-[#eb459e] text-white shadow-lg shadow-[#eb459e]/30 scale-105' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                        <span>💖 Pro dva</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === 'couple' ? 'bg-white/20' : 'bg-black/30'}">3</span>
                    </button>

                    <button onclick="window.GamesHub.setFilter('logic')" 
                        class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeFilter === 'logic' ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/30 scale-105' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                        <span>🧩 Logické</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === 'logic' ? 'bg-white/20' : 'bg-black/30'}">2</span>
                    </button>

                    <button onclick="window.GamesHub.setFilter('ranking')" 
                        class="px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeFilter === 'ranking' ? 'bg-[#faa61a] text-black shadow-lg shadow-[#faa61a]/30 scale-105 font-extrabold' : 'bg-[#202225] text-gray-400 hover:text-white hover:bg-[#2f3136]'}">
                        <span>🏆 Výzvy & Ranky</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full ${activeFilter === 'ranking' ? 'bg-black/20' : 'bg-black/30'}">2</span>
                    </button>
                </div>
            </div>

            <!-- GAMES GRID CONTENT -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-5 lg:p-8">
                <div class="max-w-7xl mx-auto">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-24">
                        ${filteredGames.map(game => `
                            <div onclick="switchChannel('${game.channel}'); triggerHaptic('medium')"
                                 class="group relative bg-[#2f3136] rounded-2xl border border-white/5 ${game.borderHover} transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-xl overflow-hidden flex flex-col justify-between p-5">
                                
                                <!-- Top Gradient Accent -->
                                <div class="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b ${game.gradient} pointer-events-none"></div>

                                <div>
                                    <!-- Badges & Icon Row -->
                                    <div class="flex items-center justify-between gap-3 mb-4 relative z-10">
                                        <div class="w-12 h-12 rounded-xl bg-[#202225] border border-white/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform"
                                             style="color: ${game.color}">
                                            <i class="fas ${game.icon}"></i>
                                        </div>
                                        <span class="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-gray-300">
                                            ${game.badge}
                                        </span>
                                    </div>

                                    <!-- Title & Description -->
                                    <div class="relative z-10 mb-4">
                                        <h3 class="text-xl font-black text-white group-hover:text-[${game.color}] transition-colors leading-tight mb-2">
                                            ${game.title}
                                        </h3>
                                        <p class="text-xs text-gray-400 leading-relaxed">
                                            ${game.desc}
                                        </p>
                                    </div>
                                </div>

                                <!-- Action Bottom Row -->
                                <div class="pt-4 border-t border-white/5 flex items-center justify-between gap-2 relative z-10">
                                    <span class="text-[10px] font-bold text-gray-500">
                                        ${game.statsBadge}
                                    </span>
                                    <button class="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${game.btnBg} text-white transition-all shadow-md flex items-center gap-1.5 group-hover:gap-2.5">
                                        <span>HRÁT</span>
                                        <i class="fas fa-arrow-right text-[10px]"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function setFilter(filter) {
    activeFilter = filter;
    triggerHaptic('light');
    renderGamesHub(filter);
}
