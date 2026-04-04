import { state, ensureMaturaData } from '../core/state.js';

/**
 * MaturitaHub 2026 - Dashboard Module
 */

export async function renderDashboard(container) {
    if (!container) return;
    
    // Ensure we have data
    await ensureMaturaData();
    
    const user = state.currentUser;
    if (!user) return;
    
    // Calculate Stats (Simplified for Multi-User)
    const maturityDate = new Date('2026-05-19T08:00:00');
    const now = new Date();
    const diff = maturityDate - now;
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    
    // Overall Stats for ME
    let totalItems = 0;
    let completedItems = 0;
    
    Object.values(state.maturaTopics).flat().forEach(item => {
        totalItems++;
        if (state.maturaProgress[item.id]?.status === 'done') completedItems++;
    });
    
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    container.innerHTML = `
        <div id="matura-hub-dashboard" class="space-y-8 animate-fade-in relative">
            
            <div class="flex flex-col md:flex-row gap-6 mb-12">
                 <!-- Hello Card -->
                 <div class="flex-1 card bg-gradient-to-br from-blurple to-[#34373c] p-10 flex flex-col justify-center">
                    <h1 class="text-4xl font-extrabold mb-2 italic">Ahoj, <span class="text-white">${user.email.split('@')[0]}</span>! 👋</h1>
                    <p class="text-white/80 font-bold uppercase tracking-widest text-xs">Už jen ${days} dní do maturity. Máme co dělat!</p>
                 </div>
                 
                 <!-- Quick Stats Row -->
                 <div class="grid grid-cols-2 md:grid-cols-2 gap-4 flex-shrink-0 w-full md:w-80">
                    <div class="card flex flex-col items-center justify-center p-6 bg-darkSecondary/50">
                        <div class="text-5xl font-black mb-1">${days}</div>
                        <div class="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] text-center">Dní do Dne D</div>
                    </div>
                    <div class="card flex flex-col items-center justify-center p-6 bg-darkSecondary/50">
                        <div class="text-5xl font-black mb-1">${progressPercent}%</div>
                        <div class="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em] text-center">Připravenost</div>
                    </div>
                 </div>
            </div>

            <!-- Main Sections Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Latest Activity/Study Room Hub -->
                <div class="lg:col-span-1 space-y-6">
                    <h3 class="text-sm font-black uppercase tracking-widest text-gray-400 mb-2 px-2">Kdo se učí? 🧠</h3>
                    <div id="study-room-list" class="space-y-3">
                        ${renderStudyRoomPlaceholder()}
                    </div>
                    
                    <button onclick="window.location.hash = '#study-room'" class="w-full py-4 text-xs font-black uppercase tracking-widest bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition">
                        Vstoupit do studovny &rarr;
                    </button>
                </div>
                
                <!-- Priorities & Tasks -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">Tvoje priority</h3>
                        <a href="#library" class="text-xs text-blurple font-bold">Zobrazit vše</a>
                    </div>
                    
                    <div id="priority-topics-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${renderPriorityTopics()}
                    </div>
                    
                    <!-- Pomodoro Focus Card -->
                    <div class="card bg-darkSecondary h-48 flex items-center justify-between p-8 overflow-hidden group">
                        <div class="absolute -right-10 -bottom-10 text-9xl transform rotate-12 opacity-5 scale-150 group-hover:scale-125 transition-transform"><i class="fas fa-brain"></i></div>
                        <div>
                             <h2 class="text-2xl font-black italic mb-1 uppercase tracking-tighter leading-none">Focus Hub</h2>
                             <p class="text-gray-500 text-sm">Hluboké studium bez vyrušení.</p>
                             <button class="btn-primary mt-4">Start 25:00 🧠</button>
                        </div>
                        <div id="dashboard-pomodoro-timer" class="text-6xl font-black text-white tabular-nums opacity-20">25:00</div>
                    </div>
                </div>

            </div>

        </div>
    `;
    
    // Injected async loading for actual data
    initDashboardSocials();
}

function renderStudyRoomPlaceholder() {
    return [1,2,3].map(() => `
        <div class="user-status-pill animate-pulse">
            <div class="w-8 h-8 rounded-full bg-white/5"></div>
            <div class="space-y-1">
                <div class="w-20 h-2 bg-white/10 rounded"></div>
                <div class="w-12 h-1 bg-white/5 rounded"></div>
            </div>
        </div>
    `).join('');
}

function renderPriorityTopics() {
    // Collect some topics user hasn't finished
    const priorities = [];
    Object.values(state.maturaTopics).flat().forEach(t => {
        if (state.maturaProgress[t.id]?.status !== 'done' && priorities.length < 4) {
            priorities.push(t);
        }
    });
    
    if (priorities.length === 0) return '<div class="text-gray-500 italic p-6 text-sm">Nemáte žádné prioritní resty. Skvělá práce! 🎓</div>';

    return priorities.map(t => `
        <div class="card p-4 flex items-center gap-4 group cursor-pointer hover:border-blurple/50">
            <div class="text-3xl group-hover:scale-110 transition">${t.icon || '📚'}</div>
            <div class="flex-1 min-w-0">
                <div class="text-[8px] font-black uppercase text-blurple mb-0.5">${t.category}</div>
                <div class="font-bold text-sm truncate">${t.title}</div>
            </div>
            <i class="fas fa-chevron-right text-gray-700 text-xs"></i>
        </div>
    `).join('');
}

async function initDashboardSocials() {
    // Fetch live activity or profiles
}
