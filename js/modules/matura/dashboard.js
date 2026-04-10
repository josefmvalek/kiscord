import { state, refreshMaturaTopics } from '../../core/state.js';
import { supabase } from '../../core/supabase.js';
import { triggerHaptic, triggerConfetti, showNotification, getCategoryIcon } from './shared.js';

/**
 * Main entry point for Matura Dashboard
 */
export async function renderMaturaDashboard(container) {
    const user = state.currentUser?.name;
    const isJozka = user === 'Jožka';
    const maturityDate = isJozka
        ? new Date('2026-05-19T08:00:00')
        : new Date('2026-05-25T08:00:00');

    const now = new Date();
    const diff = maturityDate - now;
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    // Calculate Stats
    const subjects = ['czech_jozka', 'czech_klarka', 'it'];
    let totalItems = 0;
    let completedItems = 0;
    let jDone = 0;
    let kDone = 0;
    let myStarted = 0;
    
    const priorityTopics = [];

    subjects.forEach(sub => {
        const items = state.maturaTopics?.[sub] || [];
        totalItems += items.length;

        items.forEach(item => {
            const prog = state.maturaProgress[item.id] || {};
            if (prog.jose?.status === 'done') { completedItems += 0.5; jDone++; }
            if (prog.klarka?.status === 'done') { completedItems += 0.5; kDone++; }
            
            const myStatus = isJozka ? prog.jose?.status : prog.klarka?.status;
            if (myStatus === 'started') myStarted++;

            // Priority Logic: topics I haven't finished yet that have content
            if (myStatus !== 'done' && item.has_content && priorityTopics.length < 3) {
                priorityTopics.push(item);
            }
        });
    });

    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    container.innerHTML = `
        <div id="matura-dashboard-container" class="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-fade-in relative min-h-full">
            <!-- Glow background -->
            <div class="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#eb459e]/10 rounded-full blur-[80px] pointer-events-none"></div>

            <div class="text-center space-y-2 relative">
                <button onclick="import('/js/modules/matura.js').then(m => m.toggleLocalTheme('matura-dashboard-container'))" 
                        class="absolute right-0 top-0 p-3 rounded-full hover:bg-white/5 text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-all"
                        title="Přepnout téma okna">
                    <i class="fas fa-sun theme-toggle-icon"></i>
                </button>
                <h1 class="text-3xl md:text-5xl font-black text-[var(--text-header)] tracking-tighter uppercase italic">
                    <span class="text-[#eb459e]">Cesta</span> ke svobodě
                </h1>
                <p class="text-[var(--interactive-normal)] text-sm tracking-widest uppercase font-bold mb-4">Maturitní Akademie 2026</p>
                
                <!-- Search Bar -->
                <div class="max-w-xl mx-auto relative group">
                    <div class="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#5865F2] transition-colors">
                        <i class="fas fa-search text-sm"></i>
                    </div>
                    <input type="text" 
                        oninput="import('/js/modules/matura.js').then(m => m.handleMaturaSearch(this.value))"
                        placeholder="Hledat téma, autora nebo okruh..." 
                        class="w-full bg-[var(--bg-secondary)] border border-white/5 group-hover:border-white/10 focus:border-[#5865F2]/50 focus:ring-4 focus:ring-[#5865F2]/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-[var(--text-header)] placeholder-gray-500 outline-none transition-all shadow-xl font-bold tracking-tight">
                </div>
            </div>

            <!-- Main Stats Row -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Countdown -->
                <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col items-center justify-center text-center group hover:border-[#eb459e]/30 transition-all duration-300">
                    <div class="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-1">Dní do vysvobození</div>
                    <div class="text-6xl font-black text-[var(--text-header)] group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(235,69,158,0.3)]">${days}</div>
                    <div class="text-[10px] text-[#eb459e] font-bold mt-2 uppercase">Uteče to jako voda! 🌊</div>
                </div>

                <!-- Overall Readiness Gauge -->
                <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col items-center justify-center relative group overflow-hidden">
                    <div class="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">Celková připravenost</div>
                    <div class="readiness-gauge-container">
                        <div class="readiness-gauge-bg"></div>
                        <div id="readiness-gauge-fill" class="readiness-gauge-fill" style="transform: rotate(0deg)"></div>
                        <div class="absolute inset-0 flex flex-col items-center justify-end pb-2">
                            <span id="readiness-value" class="text-3xl font-black text-white italic">0%</span>
                        </div>
                    </div>
                </div>

                <!-- Jožka vs Klárka comparison -->
                <div class="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-white/5 shadow-2xl flex flex-col justify-between gap-4">
                    <div class="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Souboj Titánů</div>
                    <div class="space-y-3">
                        <div class="leaderboard-row ${isJozka ? 'border-[#5865F2]/30' : ''}">
                            <div class="flex items-center gap-3">
                                <div class="leaderboard-pfp flex items-center justify-center text-xs">🧔</div>
                                <span class="text-xs font-bold text-gray-300">Jožka</span>
                            </div>
                            <span class="text-xs font-black text-[#5865F2] italic">${jDone} / ${totalItems}</span>
                        </div>
                        <div class="leaderboard-row ${!isJozka ? 'border-[#eb459e]/30' : ''}">
                            <div class="flex items-center gap-3">
                                <div class="leaderboard-pfp flex items-center justify-center text-xs">👩</div>
                                <span class="text-xs font-bold text-gray-300">Klárka</span>
                            </div>
                            <span class="text-xs font-black text-[#eb459e] italic">${kDone} / ${totalItems}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Focus & Priorities Row -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Personalized Priorities -->
                <div class="lg:col-span-1 space-y-4">
                    <div class="bg-[var(--bg-secondary)] border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
                        <div class="absolute top-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:scale-125 transition-transform"><i class="fas fa-bullseye text-4xl"></i></div>
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-[#ed4245] mb-4 flex items-center gap-2">
                            <i class="fas fa-fire"></i> Tvoje priority
                        </h3>
                        <div class="space-y-2">
                            ${priorityTopics.length > 0 ? priorityTopics.map(t => `
                                <button onclick="import('/js/modules/matura.js').then(m => m.openKnowledgeBase('${t.id}'))" class="critical-topic-btn">
                                    <span class="text-base">${t.icon || '📝'}</span>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-[10px] font-bold text-white truncate">${t.title}</div>
                                        <div class="text-[8px] text-gray-500 uppercase font-black">${t.author || 'Okruh IT'}</div>
                                    </div>
                                    <i class="fas fa-chevron-right text-[10px] text-gray-600"></i>
                                </button>
                            `).join('') : '<div class="text-[10px] italic text-gray-500">Nemáš žádné prioritní resty! Skvěle! 🌟</div>'}
                        </div>
                    </div>
                    
                    <!-- Streak info -->
                    <div class="bg-[var(--bg-secondary)] border border-white/5 rounded-2xl p-6 flex items-center justify-between group hover:border-orange-500/30 transition-all">
                        <div>
                            <div class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Tvůj Streak</div>
                            <div class="text-3xl font-black text-[var(--text-header)] flex items-center gap-2">
                                <span class="text-orange-500 animate-pulse">🔥</span> 
                                ${state.maturaStreaks[isJozka ? 'jose' : 'klarka'] || 0} dní
                            </div>
                        </div>
                        <div class="text-right">
                             <div class="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">${isJozka ? 'Klárka' : 'Jožka'}</div>
                             <div class="text-xl font-bold text-[var(--text-muted)] flex items-center gap-1 justify-end">
                                 <span>🔥</span> ${state.maturaStreaks[isJozka ? 'klarka' : 'jose'] || 0}
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Timer Hub -->
                <div class="lg:col-span-2 bg-gradient-to-br from-[#1e1f22] to-[var(--bg-secondary)] border border-white/5 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
                     <div class="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div class="text-center md:text-left">
                            <h2 class="text-2xl font-black text-[var(--text-header)] uppercase italic leading-none mb-2">Focus Hub</h2>
                            <p class="text-xs text-[var(--text-muted)]">Zapni Pomodoro a studujte společně.</p>
                        </div>
                        <div class="flex items-center gap-6">
                            <div id="pomodoro-timer" class="text-4xl font-black text-[var(--text-header)] font-mono bg-black/20 px-6 py-4 rounded-2xl border border-white/5 tabular-nums">25:00</div>
                            <button id="pomodoro-btn" onclick="import('/js/modules/matura.js').then(m => m.togglePomodoro())" 
                                    class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition active:scale-95">
                                Start 🧠
                            </button>
                        </div>
                     </div>
                     <div id="pomodoro-status-list" class="mt-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none"></div>
                </div>
            </div>

            <!-- SOS & Quests -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button onclick="import('/js/modules/matura.js').then(m => m.triggerSOS())" 
                        class="bg-[#ed4245]/10 hover:bg-[#ed4245]/20 border border-[#ed4245]/20 p-6 rounded-2xl transition-all group flex flex-col items-center gap-2">
                    <div class="text-2xl group-hover:scale-110 transition">🆘</div>
                    <div class="text-[9px] font-black text-[#ed4245] uppercase tracking-widest leading-none">Panic Button</div>
                </button>

                <div class="md:col-span-3 bg-[var(--bg-secondary)] border border-white/5 p-6 rounded-2xl flex items-center gap-6 relative overflow-hidden group">
                    <div class="absolute -right-4 -bottom-4 text-7xl opacity-5 transition-transform group-hover:scale-150 rotate-12">🎖️</div>
                    <div class="text-3xl">🎓</div>
                    <div>
                        <h3 class="font-black text-[var(--text-header)] uppercase tracking-tight text-sm">Aktuální Milestone</h3>
                        <p class="text-xs text-[var(--text-muted)]">Pokud oba dokončíte <b>všechny sítě</b>, objednáváme pizzu! 🍕</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Calculate Total Mastery & Gauge Animation Async
    import('../spaced_repetition.js').then(async sr => {
        let totalMasterySum = 0;
        let totalCount = 0;

        for (const sub of subjects) {
            const items = state.maturaTopics?.[sub] || [];
            for (const item of items) {
                totalMasterySum += await sr.getTopicMastery(item.id);
                totalCount++;
            }
        }

        const avgMastery = totalCount > 0 ? Math.round(totalMasterySum / totalCount) : 0;
        // Overall Readiness is average of Mastery and Passive Completion
        const finalReadiness = Math.round((avgMastery + progressPercent) / 2);
        
        const gaugeEl = document.getElementById('readiness-gauge-fill');
        const valueEl = document.getElementById('readiness-value');
        
        if (gaugeEl && valueEl) {
            // Gauge is semi-circle (180deg), so 0-100% maps to 0-180deg
            const deg = (finalReadiness / 100) * 180;
            gaugeEl.style.transform = `rotate(${deg}deg)`;
            
            // Counter animation
            let current = 0;
            const timer = setInterval(() => {
                if (current >= finalReadiness) {
                    clearInterval(timer);
                    valueEl.textContent = finalReadiness + '%';
                } else {
                    current++;
                    valueEl.textContent = current + '%';
                }
            }, 15);
        }
    });

    // Update missions and streak
    renderTodaysMissions();
    updateMaturaStreak();
}

export async function updateMaturaStreak() {
    if (!state.currentUser) return;

    const today = new Date().toISOString().split('T')[0];
    const userKey = state.currentUser?.name === 'Jožka' ? 'jose' : 'klarka';

    try {
        const { data, error } = await supabase.from('matura_streaks').select('*').eq('user_id', state.currentUser.id).maybeSingle();

        let newStreak = 1;
        let lastDate = data?.last_study_date;

        if (data) {
            if (lastDate === today) return; // Už dnes studoval

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastDate === yesterdayStr) {
                newStreak = data.current_streak + 1;
            }
        }

        await supabase.from('matura_streaks').upsert({
            user_id: state.currentUser.id,
            current_streak: newStreak,
            max_streak: Math.max(newStreak, data?.max_streak || 0),
            last_study_date: today,
            updated_at: new Date().toISOString()
        });

        state.maturaStreaks[userKey] = newStreak;

        // Unlock Achievements
        if (newStreak === 3) import('../achievements.js').then(a => a.autoUnlock('matura_streak_3'));
        if (newStreak === 7) import('../achievements.js').then(a => a.autoUnlock('matura_streak_7'));

        showNotification(`🔥 STUDIJNÍ STREAK: ${newStreak} dní! Jen tak dál!`, 'success');
        triggerHaptic('success');
        triggerConfetti();

    } catch (e) {
        console.error("Streak error:", e);
    }
}

export function renderTodaysMissions() {
    const listEl = document.getElementById('todays-mission-list');
    if (!listEl) return;

    const today = new Date().toISOString().split('T')[0];
    const myMissions = state.maturaSchedule.filter(s => s.user_id === state.currentUser?.id && s.scheduled_date === today);

    if (myMissions.length === 0) {
        listEl.innerHTML = '<div class="text-gray-500 text-[10px] italic">Žádné plány na dnešek... Odpočívej! 💤</div>';
        return;
    }

    listEl.innerHTML = '';
    myMissions.forEach(m => {
        let item = null;
        if (state.maturaTopics) {
            for (const cat in state.maturaTopics) {
                const found = state.maturaTopics[cat].find(i => i.id === m.item_id);
                if (found) {
                    item = found;
                    break;
                }
            }
        }

        if (!item) return;

        const div = document.createElement('div');
        div.className = "bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3 group/mission hover:border-[#5865F2]/40 transition-all relative overflow-hidden";
        div.innerHTML = `
            <div class="text-xl group-hover/mission:scale-110 transition-transform">${item.icon}</div>
            <div class="flex-1 min-w-0">
                <div class="text-[9px] font-bold text-white truncate px-0.5">${item.title}</div>
                <div class="text-[8px] text-gray-500 uppercase font-black">Studijní cíl</div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="import('/js/modules/matura.js').then(m => m.openKnowledgeBase('${item.id}'))" 
                        class="bg-[#5865F2]/20 text-[#5865F2] w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#5865F2]/40 transition tooltip" data-tip="Studovat">
                    <i class="fas fa-play text-[10px]"></i>
                </button>
                <button onclick="import('/js/modules/matura.js').then(m => m.removeMission('${m.id}'))" 
                        class="text-gray-600 hover:text-[#ed4245] w-6 h-8 flex items-center justify-center transition-colors tooltip" data-tip="Zrušit misi">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </div>
        `;
        listEl.appendChild(div);
    });
}
