import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti, getTodayKey } from '../core/utils.js';
import { state, ensureGymData, saveStateToCache } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { playChime, playArcade } from '../core/sound.js';

// --- ACTIVE WORKOUT STATE ---
const ACTIVE_WORKOUT_KEY = 'kiscord_active_workout';
let activeWorkout = null;
let activeTab = 'templates'; // 'templates' | 'feed' | 'prs'
let subscription = null;
let stopwatchInterval = null;
let restTimerInterval = null;
let restTimeRemaining = 0;
let restTimeDuration = 90; // Default 90 seconds
let isRestTimerRunning = false;

// --- DEFAULT DATABASE SEED DATA ---
const defaultExercises = [
    { id: "bench_press", name: "Bench Press", category: "Hrudník", is_default: true },
    { id: "dumbbell_flys", name: "Rozpažování s Jednoručkami", category: "Hrudník", is_default: true },
    { id: "shoulder_press", name: "Tlaky na ramena s JČ", category: "Ramena", is_default: true },
    { id: "lateral_raises", name: "Upažování (Lateral Raise)", category: "Ramena", is_default: true },
    { id: "squat", name: "Dřep s Velkou Činkou", category: "Nohy", is_default: true },
    { id: "leg_press", name: "Leg Press", category: "Nohy", is_default: true },
    { id: "leg_extensions", name: "Předkopávání v sedě", category: "Nohy", is_default: true },
    { id: "deadlift", name: "Mrtvý Tah", category: "Záda", is_default: true },
    { id: "pull_ups", name: "Shyby na Hrazdě", category: "Záda", is_default: true },
    { id: "lat_pulldown", name: "Stahování Horní Kladky", category: "Záda", is_default: true },
    { id: "barbell_rows", name: "Přítahy VČ v předklonu", category: "Záda", is_default: true },
    { id: "bicep_curls", name: "Bicepsový zdvih s JČ", category: "Ruce", is_default: true },
    { id: "tricep_pushdowns", name: "Stahování kladky na triceps", category: "Ruce", is_default: true },
    { id: "plank", name: "Plank (Výdrž)", category: "Břicho", is_default: true },
    { id: "leg_raises", name: "Přednožování ve visu", category: "Břicho", is_default: true }
];

const defaultTemplates = [
    {
        name: "Push Day 🦍",
        description: "Trénink zaměřený na prsa, ramena a triceps",
        exercises: [
            { exercise_id: "bench_press", sets: 4, reps: 8, weight: 60 },
            { exercise_id: "shoulder_press", sets: 3, reps: 10, weight: 16 },
            { exercise_id: "dumbbell_flys", sets: 3, reps: 12, weight: 12 },
            { exercise_id: "lateral_raises", sets: 4, reps: 15, weight: 8 },
            { exercise_id: "tricep_pushdowns", sets: 3, reps: 12, weight: 20 }
        ]
    },
    {
        name: "Pull Day 🐉",
        description: "Trénink zaměřený na záda a bicepsy",
        exercises: [
            { exercise_id: "deadlift", sets: 3, reps: 5, weight: 90 },
            { exercise_id: "pull_ups", sets: 4, reps: 8, weight: 0 },
            { exercise_id: "barbell_rows", sets: 3, reps: 10, weight: 50 },
            { exercise_id: "lat_pulldown", sets: 3, reps: 12, weight: 40 },
            { exercise_id: "bicep_curls", sets: 3, reps: 12, weight: 12 }
        ]
    },
    {
        name: "Legs & Core Day 🦵",
        description: "Trénink zaměřený na nohy a břicho",
        exercises: [
            { exercise_id: "squat", sets: 4, reps: 8, weight: 70 },
            { exercise_id: "leg_press", sets: 3, reps: 10, weight: 120 },
            { exercise_id: "leg_extensions", sets: 3, reps: 12, weight: 45 },
            { exercise_id: "leg_raises", sets: 3, reps: 15, weight: 0 },
            { exercise_id: "plank", sets: 3, reps: 60, weight: 0 }
        ]
    }
];

// --- MAIN RENDER ---
export async function renderGym() {
    // Expose functions to window
    window.Gym = {
        switchTab,
        checkAndSeed,
        startWorkout,
        openCreateTemplateModal,
        saveTemplate,
        deleteTemplate,
        cheerWorkout,
        openManualLogModal,
        saveManualLog,
        // Active workout functions
        adjustVal,
        toggleSetComplete,
        finishWorkout,
        cancelWorkout,
        startRestTimer,
        toggleRestTimer,
        resetRestTimer,
        setRestDuration,
        // Refinement functions
        minimizeWorkout,
        restoreWorkout,
        openCreateExerciseModal,
        saveExercise,
        openEditTemplateModal,
        saveEditedTemplate,
        filterModalExercises,
        openEditExerciseModal,
        saveEditedExercise,
        deleteExercise,
        filterTabExercises,
        // New Premium functions
        onSetInputChange,
        updateGlobalWorkoutBadge,
        restoreWorkoutGlobal,
        openExerciseAnalyticsModal
    };

    window.gymCleanup = () => cleanupRealtime();

    const container = document.getElementById("messages-container");
    if (!container) return;

    await ensureGymData();
    
    // Load cached active workout split if present
    if (!activeWorkout && localStorage.getItem(ACTIVE_WORKOUT_KEY)) {
        loadActiveWorkoutFromStorage();
    }

    setupRealtime();

    // Auto-seed database if empty
    if (!state.gymExercises || state.gymExercises.length === 0) {
        container.innerHTML = `
            <div class="h-full bg-[#36393f] flex flex-col items-center justify-center font-sans p-6 text-center">
                <div class="animate-bounce mb-6 text-6xl">🏋️‍♂️</div>
                <h2 class="text-xl font-bold text-white mb-2">Vítej v Gym Trackeru!</h2>
                <p class="text-xs text-gray-400 mb-8 max-w-sm">Právě zakládáme tvůj katalog cviků a tréninkové šablony pro posilovnu.</p>
                <button onclick="window.Gym.checkAndSeed()" class="px-6 py-3 rounded-xl bg-[#faa61a] hover:bg-[#e09216] text-black font-black text-xs uppercase tracking-wider transition shadow-lg transform active:scale-95">
                    Spustit Inicializaci
                </button>
            </div>
        `;
        return;
    }

    // Active workout view overlay takes over if running and not minimized
    if (activeWorkout && !activeWorkout.isMinimized) {
        renderActiveWorkoutView(container);
        return;
    }

    const html = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header Banner -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-6 lg:p-8 flex flex-col items-center justify-center relative">
                <div class="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div class="relative z-10 flex items-center justify-center w-14 h-14 rounded-full border-4 border-[#faa61a] bg-[#202225] shadow-[0_0_20px_rgba(250,166,26,0.3)] mb-3">
                    <i class="fas fa-dumbbell text-[#faa61a] text-xl"></i>
                </div>
                <h1 class="relative z-10 text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Posilovna 🏋️‍♂️💪</h1>
                <p class="relative z-10 text-gray-400 font-semibold mt-1 text-center text-xs max-w-md">Sledujeme naše tréninky, váhy a překonáváme osobáčky společně!</p>
                
                <!-- TAB NAVIGATION -->
                <div class="flex flex-wrap justify-center gap-1 bg-black/30 p-1 border border-white/5 rounded-2xl mt-6 relative z-10 select-none">
                    <button onclick="window.Gym.switchTab('templates')" 
                            class="px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'templates' ? 'bg-[#36393f] text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                        <i class="fas fa-layer-group text-xs text-[#faa61a]"></i> Šablony
                    </button>
                    <button onclick="window.Gym.switchTab('feed')" 
                            class="px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'feed' ? 'bg-[#36393f] text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                        <i class="fas fa-comments text-xs text-[#eb459e]"></i> <span class="hidden sm:inline">Feed & </span>Historie
                    </button>
                    <button onclick="window.Gym.switchTab('prs')" 
                            class="px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'prs' ? 'bg-[#36393f] text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                        <i class="fas fa-trophy text-xs text-[#faa61a]"></i> <span class="hidden sm:inline">Osobní </span>Rekordy
                    </button>
                    <button onclick="window.Gym.switchTab('exercises')" 
                            class="px-3 sm:px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'exercises' ? 'bg-[#36393f] text-white shadow-md' : 'text-gray-400 hover:text-white'}">
                        <i class="fas fa-dumbbell text-xs text-[#7289da]"></i> Cviky
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div class="flex-1 overflow-y-auto w-full mx-auto p-4 lg:p-8 custom-scrollbar relative pb-20">
                <div class="max-w-5xl mx-auto space-y-6">
                    ${renderMinimizedBanner()}
                    ${activeTab === 'templates' ? renderTemplatesTab() : ''}
                    ${activeTab === 'feed' ? renderFeedTab() : ''}
                    ${activeTab === 'prs' ? renderPRsTab() : ''}
                    ${activeTab === 'exercises' ? renderExercisesTab() : ''}
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

export function switchTab(tab) {
    triggerHaptic('light');
    activeTab = tab;
    renderGym();
}

export async function checkAndSeed() {
    triggerHaptic('medium');
    const container = document.getElementById("messages-container");
    if (container) {
        container.innerHTML = `
            <div class="h-full bg-[#36393f] flex flex-col items-center justify-center font-sans">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#faa61a]"></div>
                <p class="text-xs text-gray-400 mt-4">Zakládám data...</p>
            </div>
        `;
    }

    try {
        console.log("[Gym] Inserting default exercises...");
        const { error: exErr } = await supabase.from('gym_exercises').insert(defaultExercises);
        if (exErr) throw exErr;

        console.log("[Gym] Inserting default templates...");
        // Match exercises to default UUID/IDs and assign creator
        const templatesToInsert = defaultTemplates.map(t => ({
            name: t.name,
            description: t.description,
            exercises: t.exercises,
            created_by: state.currentUser?.id
        }));
        const { error: tempErr } = await supabase.from('gym_templates').insert(templatesToInsert);
        if (tempErr) throw tempErr;

        showNotification("Gym database seeded successfully! 🏋️‍♂️", "success");
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Seeding failed:", e);
        showNotification("Inicializace selhala: " + e.message, "danger");
        renderGym();
    }
}

// --- TAB: TEMPLATES & ROUTINES ---
function renderTemplatesTab() {
    const templates = state.gymTemplates || [];
    
    return `
        <div class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-list-ul text-[#faa61a]"></i> Tréninkové plány
                </h2>
                <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button onclick="window.Gym.openCreateExerciseModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <i class="fas fa-dumbbell text-xs text-gray-400"></i> Nový cvik
                    </button>
                    <button onclick="window.Gym.openManualLogModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 flex-1 sm:flex-none justify-center">
                        <i class="fas fa-history text-xs text-gray-400"></i> Zapsat zpětně
                    </button>
                    <button onclick="window.Gym.openCreateTemplateModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                        <i class="fas fa-plus text-xs"></i> Nový plán
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${templates.length === 0 ? `
                    <div class="col-span-full text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                        <span class="text-5xl block mb-4">🦝</span>
                        <h4 class="text-base font-black text-white uppercase tracking-wider">Žádné šablony</h4>
                        <p class="text-xs text-white/40 font-semibold mt-1">Založte si novou tréninkovou šablonu tlačítkem výše!</p>
                    </div>
                ` : templates.map(t => {
                    const exCount = t.exercises ? t.exercises.length : 0;
                    const totalSets = t.exercises ? t.exercises.reduce((sum, e) => sum + (parseInt(e.sets) || 0), 0) : 0;
                    
                    return `
                        <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-0.5">
                            <div>
                                <div class="flex justify-between items-start gap-4 mb-2">
                                    <h3 class="text-base font-black text-white tracking-tight uppercase leading-snug">${t.name}</h3>
                                    <div class="flex gap-1.5 select-none">
                                        <button onclick="window.Gym.openEditTemplateModal('${t.id}', event)" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-[#faa61a] hover:bg-[#faa61a]/10 transition" title="Upravit plán">
                                            <i class="fas fa-edit text-[10px]"></i>
                                        </button>
                                        <button onclick="window.Gym.deleteTemplate('${t.id}', event)" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-500 hover:bg-red-500/10 transition" title="Smazat plán">
                                            <i class="fas fa-trash-alt text-[10px]"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="text-xs text-gray-400 mb-6 font-medium leading-relaxed">${t.description || 'Bez popisu.'}</p>
                                
                                <div class="flex gap-4 mb-6">
                                    <div class="bg-black/20 px-3 py-1.5 border border-white/5 rounded-xl text-center flex-1">
                                        <span class="text-[9px] font-black text-white/30 uppercase tracking-wider block leading-none mb-1">Cviky</span>
                                        <span class="text-sm font-black text-gray-200 tracking-tight">${exCount}</span>
                                    </div>
                                    <div class="bg-black/20 px-3 py-1.5 border border-white/5 rounded-xl text-center flex-1">
                                        <span class="text-[9px] font-black text-white/30 uppercase tracking-wider block leading-none mb-1">Série</span>
                                        <span class="text-sm font-black text-gray-200 tracking-tight">${totalSets}</span>
                                    </div>
                                </div>
                            </div>

                            <button onclick="window.Gym.startWorkout('${t.id}')" class="w-full py-3 rounded-2xl bg-gradient-to-r from-[#faa61a] to-[#e09216] hover:from-[#fbb138] hover:to-[#eb9b1d] text-black font-black text-xs uppercase tracking-widest transition shadow-lg transform active:scale-[0.98] flex items-center justify-center gap-2">
                                <i class="fas fa-play text-[10px]"></i> Spustit trénink
                            </button>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// --- TAB: FEED & HISTORY ---
function renderFeedTab() {
    const logs = state.gymLogs || [];
    
    return `
        <div class="space-y-6">
            <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none mb-6">
                <i class="fas fa-comments text-[#eb459e]"></i> Společná aktivita
            </h2>

            <div class="space-y-4">
                ${logs.length === 0 ? `
                    <div class="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
                        <span class="text-5xl block mb-4">🦾</span>
                        <h4 class="text-base font-black text-white uppercase tracking-wider">Žádné tréninky</h4>
                        <p class="text-xs text-white/40 font-semibold mt-1">Zatím nikdo neodcvičil žádný trénink. Buď první!</p>
                    </div>
                ` : logs.map(l => {
                    const isMe = l.user_id === state.currentUser?.id;
                    const userName = isMe ? state.currentUser?.name : (state.currentUser?.name === 'Klárka' ? 'Jožka' : 'Klárka');
                    const userAvatar = isMe ? (state.currentUser?.name === 'Klárka' ? '/img/app/klarka_profilovka.webp' : '/img/app/jozka_profilovka.jpg') : (state.currentUser?.name === 'Klárka' ? '/img/app/jozka_profilovka.jpg' : '/img/app/klarka_profilovka.webp');
                    const userEmoji = userName === 'Jožka' ? '🦍' : '🦉';
                    
                    const loggedDate = new Date(l.logged_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const minutes = Math.round(l.duration_seconds / 60) || 0;
                    
                    // Total weight volume calculation
                    let totalVolume = 0;
                    if (l.exercises) {
                        l.exercises.forEach(e => {
                            if (e.sets) {
                                e.sets.forEach(s => {
                                    if (s.completed) {
                                        totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
                                    }
                                });
                            }
                        });
                    }

                    // Render Cheers
                    const cheers = l.cheers || [];
                    const hasCheered = cheers.some(c => c.user === state.currentUser?.name);

                    return `
                        <div class="glass-card bg-white/[0.02] border ${isMe ? 'border-indigo-500/10 bg-indigo-950/5' : 'border-white/5'} rounded-3xl p-5 shadow-xl relative overflow-hidden transition-all duration-300">
                            <div class="flex items-start gap-4">
                                <img src="${userAvatar}" alt="${userName}" class="w-10 h-10 rounded-full border-2 ${isMe ? 'border-indigo-400/30' : 'border-gray-700/50'} object-cover" />
                                <div class="flex-1 min-w-0">
                                    <div class="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 class="text-sm font-black text-white flex items-center gap-1.5 leading-snug">
                                                ${userName} ${userEmoji}
                                                <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 text-white/40 font-mono">${loggedDate}</span>
                                            </h4>
                                            <h3 class="text-base font-black text-emerald-400 uppercase tracking-wide tracking-tight mt-1 leading-snug">${l.name}</h3>
                                        </div>
                                        
                                        <div class="text-right">
                                            <span class="text-[9px] font-black text-white/30 uppercase tracking-widest block leading-none mb-1">Celkový objem</span>
                                            <span class="text-base font-black text-[#faa61a] tracking-tight">${totalVolume.toLocaleString('cs-CZ')} kg</span>
                                        </div>
                                    </div>

                                    <div class="flex gap-4 mt-3 mb-4 text-xs font-semibold text-gray-400">
                                        <span class="flex items-center gap-1"><i class="far fa-clock text-[10px] text-gray-500"></i> ${minutes} min</span>
                                        <span class="flex items-center gap-1"><i class="fas fa-dumbbell text-[10px] text-gray-500"></i> ${l.exercises ? l.exercises.length : 0} cviků</span>
                                    </div>

                                    <!-- Collapsible Exercises Detail -->
                                    <details class="group bg-black/10 border border-white/5 rounded-2xl overflow-hidden transition-all duration-200">
                                        <summary class="list-none flex justify-between items-center px-4 py-2.5 cursor-pointer text-xs font-bold text-gray-400 hover:text-white select-none">
                                            <span>Ukázat rozpis sérií</span>
                                            <i class="fas fa-chevron-down text-[10px] transition-transform duration-200 group-open:rotate-180"></i>
                                        </summary>
                                        <div class="px-4 pb-4 pt-1 border-t border-white/5 space-y-3 font-mono">
                                            ${l.exercises ? l.exercises.map(e => {
                                                const completedSets = e.sets ? e.sets.filter(s => s.completed) : [];
                                                return `
                                                    <div class="text-xs">
                                                        <div class="font-bold text-gray-200">${e.exercise_name || 'Cvik'}</div>
                                                        <div class="text-[10px] text-gray-500 mt-0.5">
                                                            ${completedSets.map((s, idx) => `S${idx+1}: <span class="text-emerald-400 font-bold">${s.weight}kg x ${s.reps}</span>`).join(' • ')}
                                                        </div>
                                                    </div>
                                                `;
                                            }).join('') : ''}
                                        </div>
                                    </details>

                                    <!-- Reactions & Cheers Bar -->
                                    <div class="flex items-center justify-between border-t border-white/5 pt-3.5 mt-4">
                                        <div class="flex gap-1.5 flex-wrap items-center">
                                            ${cheers.map(c => `
                                                <div class="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-gray-300 flex items-center gap-1 animate-fade-in">
                                                    <span>${c.user === 'Jožka' ? '🦍' : '🦉'}</span>
                                                    <span>${c.emoji}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        ${!isMe ? `
                                            <div class="flex gap-1">
                                                ${['🔥', '💪', '👑', '❤️'].map(emoji => `
                                                    <button onclick="window.Gym.cheerWorkout('${l.id}', '${emoji}')" 
                                                            class="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 border border-transparent hover:border-white/5 transition duration-150 transform active:scale-75 text-sm"
                                                            title="Reagovat ${emoji}">
                                                        ${emoji}
                                                    </button>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// --- TAB: PERSONAL RECORDS (PRs) ---
function renderPRsTab() {
    const prs = state.gymPRs || [];
    
    // Group PRs by user
    const joLog = prs.filter(p => p.user_id === state.user_ids.jose);
    const klLog = prs.filter(p => p.user_id === state.user_ids.klarka);

    const renderUserPRsList = (userPRs) => {
        if (userPRs.length === 0) {
            return `
                <div class="text-center py-10 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                    <span class="text-3xl block mb-2">🏅</span>
                    <p class="text-xs text-white/30 font-bold">Žádné osobní rekordy</p>
                </div>
            `;
        }

        // Group by exercise name
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                ${userPRs.map(pr => {
                    const ex = state.gymExercises.find(e => e.id === pr.exercise_id) || { name: pr.exercise_id, category: 'Ostatní' };
                    const dateStr = new Date(pr.achieved_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
                    
                    return `
                        <div onclick="window.Gym.openExerciseAnalyticsModal('${pr.exercise_id}')" class="glass-card bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 font-mono cursor-pointer hover:border-[#faa61a]/30 transition group select-none">
                            <div class="min-w-0">
                                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#faa61a]/10 text-[#faa61a] group-hover:bg-[#faa61a]/20 transition">${ex.category}</span>
                                <h4 class="text-xs font-bold text-white truncate leading-snug mt-1 font-sans group-hover:text-[#faa61a] transition">${ex.name}</h4>
                                <span class="text-[9px] text-gray-500 font-bold block mt-0.5">${dateStr}</span>
                            </div>
                            
                            <div class="text-right flex-shrink-0">
                                <span class="text-sm font-black text-emerald-400">${pr.weight} kg</span>
                                <span class="text-[10px] text-gray-500 font-bold block mt-0.5">x ${pr.reps} reps</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    return `
        <div class="space-y-8">
            <div>
                <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none mb-4">
                    <i class="fas fa-trophy text-[#faa61a]"></i> Osobní Rekordy (PRs)
                </h2>
                <p class="text-xs text-gray-400 font-medium">Naše maximální zvednuté váhy na jednotlivé cviky.</p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Jožkovy rekordy -->
                <div class="space-y-4">
                    <h3 class="text-sm font-black text-gray-300 uppercase tracking-wider pl-2 border-l-4 border-l-indigo-400 flex items-center gap-2 leading-none">
                        <span>Jožka 🦍</span>
                    </h3>
                    ${renderUserPRsList(joLog)}
                </div>

                <!-- Klárčiny rekordy -->
                <div class="space-y-4">
                    <h3 class="text-sm font-black text-gray-300 uppercase tracking-wider pl-2 border-l-4 border-l-pink-400 flex items-center gap-2 leading-none">
                        <span>Klárka 🦉</span>
                    </h3>
                    ${renderUserPRsList(klLog)}
                </div>
            </div>
        </div>
    `;
}

// --- CHEER / REACTION ACTION ---
export async function cheerWorkout(logId, emoji) {
    triggerHaptic('success');

    const logs = state.gymLogs || [];
    const log = logs.find(l => l.id === logId);
    if (!log) return;

    // Add or replace cheer
    const cheers = log.cheers || [];
    const index = cheers.findIndex(c => c.user === state.currentUser?.name);

    if (index !== -1) {
        cheers[index].emoji = emoji;
    } else {
        cheers.push({
            user: state.currentUser?.name,
            emoji
        });
    }

    try {
        const { error } = await supabase
            .from('gym_logs')
            .update({ cheers })
            .eq('id', logId);

        if (error) throw error;
        
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Failed to react:", e);
    }
}

// --- CREATE & EDIT TEMPLATE MODAL ---
export function openCreateTemplateModal() {
    triggerHaptic('light');

    const exercises = state.gymExercises || [];

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název šablony tréninku',
                id: 'tmpl-name',
                placeholder: 'např. Push Day 🦍, Vrch těla...'
            })}

            ${renderInputGroup({
                label: 'Popis',
                id: 'tmpl-desc',
                placeholder: 'např. Hrudník, ramena, triceps...'
            })}

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Vyber cviky tréninku</label>
                <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
                <div class="max-h-60 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                    ${exercises.map(ex => `
                        <label class="exercise-select-item flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" data-name="${ex.name.toLowerCase()}" data-category="${ex.category.toLowerCase()}">
                            <input type="checkbox" name="tmpl-exercises" value="${ex.id}" class="w-4 h-4 rounded accent-[#faa61a] border-white/10 bg-black/20 focus:ring-0">
                            <div>
                                <span class="text-xs font-bold text-white block leading-snug">${ex.name}</span>
                                <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('create-template-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveTemplate()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Šablonu
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'create-template-modal',
        title: 'Nová Tréninková Šablona',
        subtitle: 'Navrhni si svůj tréninkový split 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('create-template-modal').remove()"
    }));

    document.getElementById('create-template-modal').classList.remove('hidden');
    document.getElementById('create-template-modal').classList.add('flex');
}

export async function saveTemplate() {
    triggerHaptic('medium');

    const name = document.getElementById('tmpl-name').value.trim();
    const description = document.getElementById('tmpl-desc').value.trim();
    
    const checked = Array.from(document.querySelectorAll('input[name="tmpl-exercises"]:checked')).map(cb => cb.value);

    if (!name) {
        showNotification('Zadej název šablony!', 'warning');
        return;
    }
    if (checked.length === 0) {
        showNotification('Vyber alespoň jeden cvik!', 'warning');
        return;
    }

    // Build exercises structure with default sets/reps
    const tmplExercises = checked.map(exId => ({
        exercise_id: exId,
        sets: 4,
        reps: 10,
        weight: 10
    }));

    try {
        const { error } = await supabase
            .from('gym_templates')
            .insert({
                name,
                description,
                exercises: tmplExercises,
                created_by: state.currentUser?.id
            });

        if (error) throw error;

        showNotification('Šablona uložena! 🦍🏋️‍♂️', 'success');
        document.getElementById('create-template-modal')?.remove();
        
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Failed to save template:", e);
        showNotification('Nepodařilo se uložit šablonu.', 'danger');
    }
}

export async function deleteTemplate(id, event) {
    if (event) event.stopPropagation();

    if (!confirm('Opravdu chceš smazat tuto tréninkovou šablonu?')) return;

    triggerHaptic('medium');

    try {
        const { error } = await supabase
            .from('gym_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Šablona smazána.', 'info');
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error('[Gym] Failed to delete template:', e);
        showNotification('Nepodařilo se smazat šablonu.', 'danger');
    }
}

// --- WORKOUT INTERACTIVE LOG SCREEN ---
export function startWorkout(templateId) {
    triggerHaptic('success');

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Load exercises details and match previous workout values
    const workoutExercises = template.exercises.map(te => {
        const ex = state.gymExercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id, category: 'Ostatní' };
        
        // Find previous weight and reps from gymLogs for this exact exercise
        let prevLog = '';
        const pastLogs = state.gymLogs.filter(l => l.user_id === state.currentUser?.id);
        
        outerLoop:
        for (const log of pastLogs) {
            if (log.exercises) {
                for (const pastEx of log.exercises) {
                    if (pastEx.exercise_id === te.exercise_id && pastEx.sets) {
                        const completed = pastEx.sets.filter(s => s.completed);
                        if (completed.length > 0) {
                            prevLog = `${completed[0].weight}kg x ${completed[0].reps}`;
                            break outerLoop;
                        }
                    }
                }
            }
        }

        // Initialize sets
        const setsArray = [];
        const setsCount = parseInt(te.sets) || 4;
        for (let i = 0; i < setsCount; i++) {
            setsArray.push({
                weight: parseFloat(te.weight) || 10,
                reps: parseInt(te.reps) || 10,
                completed: false
            });
        }

        return {
            exercise_id: te.exercise_id,
            name: ex.name,
            category: ex.category,
            prev: prevLog || '---',
            sets: setsArray
        };
    });

    // Set Active Workout
    activeWorkout = {
        templateId,
        name: template.name,
        startTime: new Date(),
        durationSeconds: 0,
        exercises: workoutExercises
    };

    saveActiveWorkoutToStorage();
    resumeWorkoutIntervals();
    renderGym();
}

function renderActiveWorkoutView(container) {
    if (!activeWorkout) return;

    // Calculate progress
    let totalSets = 0;
    let completedSets = 0;
    activeWorkout.exercises.forEach(e => {
        totalSets += e.sets.length;
        completedSets += e.sets.filter(s => s.completed).length;
    });
    const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    const timerHtml = `
        <div class="text-center bg-black/40 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-2">
            <i class="far fa-clock text-[#faa61a] animate-pulse"></i>
            <span id="active-workout-timer" class="font-mono text-base font-black text-white">00:00</span>
        </div>
    `;

    // Rest timer HTML (Circular progress layout)
    const restMinutes = Math.floor(restTimeRemaining / 60);
    const restSeconds = restTimeRemaining % 60;
    const dashoffset = restTimeDuration > 0 ? 276.4 * (1 - restTimeRemaining / restTimeDuration) : 0;
    const activeColor = isRestTimerRunning ? (restTimeRemaining <= 10 ? '#faa61a' : '#3ba55c') : '#4f545c';
    const countdownColorClass = isRestTimerRunning ? (restTimeRemaining <= 10 ? 'text-[#faa61a]' : 'text-[#3ba55c]') : 'text-gray-300';

    const restTimerHtml = `
        <div class="glass-card bg-[#202225]/85 backdrop-blur-md border ${isRestTimerRunning ? 'border-[#3ba55c]/30 shadow-[0_0_20px_rgba(59,165,92,0.15)]' : 'border-white/5'} rounded-3xl p-5 flex flex-col items-center justify-center max-w-sm mx-auto animate-fade-in relative overflow-hidden">
            ${isRestTimerRunning ? `<div class="absolute inset-0 bg-[#3ba55c]/2 animate-pulse-slow"></div>` : ''}
            
            <div class="relative z-10 flex justify-between items-center w-full mb-4 select-none">
                <span class="text-[9px] font-black uppercase tracking-widest text-white/30">Odpočinek</span>
                <div class="flex gap-1">
                    <button onclick="window.Gym.setRestDuration(60)" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 60 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">60s</button>
                    <button onclick="window.Gym.setRestDuration(90)" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 90 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">90s</button>
                    <button onclick="window.Gym.setRestDuration(120)" class="px-2 py-0.5 rounded text-[8px] font-bold ${restTimeDuration === 120 ? 'bg-[#faa61a] text-black shadow-sm' : 'bg-white/5 text-gray-400 hover:text-white'}">120s</button>
                </div>
            </div>
            
            <!-- Circular Progress Ring SVG -->
            <div class="relative z-10 flex items-center justify-center w-32 h-32 mb-3">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <!-- Background Circle -->
                    <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.03)" stroke-width="6" fill="transparent" />
                    <!-- Dynamic Progress Circle -->
                    <circle id="rest-svg-ring" cx="50" cy="50" r="44" 
                            stroke="${activeColor}" 
                            stroke-width="6" 
                            stroke-linecap="round" 
                            fill="transparent" 
                            stroke-dasharray="276.4" 
                            stroke-dashoffset="${dashoffset}" 
                            class="transition-all duration-1000 ease-linear" 
                            style="filter: drop-shadow(0 0 4px ${isRestTimerRunning ? 'rgba(59,165,92,0.3)' : 'transparent'});" />
                </svg>
                
                <!-- Countdown Overlay -->
                <div class="absolute flex flex-col items-center justify-center select-none text-center">
                    <span id="rest-timer-countdown" class="font-mono text-2xl font-black ${countdownColorClass} leading-none tracking-tight">
                        ${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}
                    </span>
                    <span class="text-[8px] font-bold text-gray-500 mt-1 uppercase tracking-wider">cíl ${restTimeDuration}s</span>
                </div>
            </div>

            <div class="relative z-10 flex gap-2.5 select-none">
                <button onclick="window.Gym.toggleRestTimer()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 transition-all transform active:scale-90" title="Spustit / Pauznout">
                    <i class="fas ${isRestTimerRunning ? 'fa-pause' : 'fa-play'} text-xs"></i>
                </button>
                <button onclick="window.Gym.resetRestTimer()" class="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/55 hover:text-white transition-all transform active:scale-90" title="Resetovat">
                    <i class="fas fa-undo text-xs"></i>
                </button>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="h-full bg-[#36393f] flex flex-col font-sans animate-fade-in relative overflow-hidden">
            <!-- Header active banner -->
            <div class="bg-[#2f3136] shadow-md z-10 flex-shrink-0 border-b border-[#202225] p-5 flex items-center justify-between gap-4">
                <div>
                    <span class="text-[9px] font-black uppercase tracking-widest text-[#faa61a] block mb-0.5">Aktivní cvičení</span>
                    <h2 class="text-base font-black text-white uppercase tracking-tight truncate leading-tight">${activeWorkout.name}</h2>
                </div>
                ${timerHtml}
            </div>

            <!-- Global Progress Bar -->
            <div class="h-2 bg-[#202225] w-full relative z-10 flex-shrink-0">
                <div id="active-workout-progress" class="h-full bg-gradient-to-r from-[#faa61a] to-[#3ba55c] transition-all duration-300" style="width: ${percentage}%"></div>
            </div>

            <!-- Main active exercises list scroll -->
            <div class="flex-1 overflow-y-auto w-full p-4 lg:p-6 custom-scrollbar space-y-6 pb-28 relative">
                <!-- Rest timer sticky block -->
                <div class="mb-6 z-20">
                    ${restTimerHtml}
                </div>

                <div class="max-w-4xl mx-auto space-y-5">
                    ${activeWorkout.exercises.map((e, exIdx) => {
                        const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === e.exercise_id);
                        const prWeight = existingPR ? parseFloat(existingPR.weight) : 0;

                        return `
                            <div class="glass-card bg-white/[0.02] border border-white/5 rounded-3xl p-5 shadow-xl">
                                <div class="flex justify-between items-center mb-3">
                                    <div>
                                        <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/30 font-mono">${e.category}</span>
                                        <h3 class="text-sm font-black text-white leading-snug mt-1">${e.name}</h3>
                                    </div>
                                    <div class="text-right text-[10px] text-gray-500 font-bold font-mono select-none">
                                        Předchozí: <span class="text-[#faa61a]/80">${e.prev}</span>
                                    </div>
                                </div>

                                <!-- Set Row Items -->
                                <div class="space-y-2 mt-4 font-mono select-none">
                                    ${e.sets.map((s, setIdx) => {
                                        const isPR = s.completed && s.weight > prWeight;

                                        return `
                                            <div id="set-row-${exIdx}-${setIdx}" class="flex items-center justify-between gap-3 p-2.5 rounded-2xl transition duration-150 ${s.completed ? 'bg-[#3ba55c]/10 border border-[#3ba55c]/25' : 'bg-black/20 border border-transparent'}">
                                                <div class="text-xs font-bold text-gray-400 w-16 flex items-center gap-1 select-none">
                                                    S${setIdx+1}
                                                    ${isPR ? `<span class="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1 animate-bounce-slow flex items-center gap-0.5">🔥 PR</span>` : ''}
                                                </div>
                                                
                                                <!-- Weight Adjustment -->
                                                <div class="flex items-center gap-1">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', -5)" ${s.completed ? 'disabled' : ''} class="w-7 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] transition active:scale-75 items-center justify-center disabled:opacity-30 hidden sm:inline-flex">-5</button>
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', -1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">-1</button>
                                                    <input id="weight-input-${exIdx}-${setIdx}" type="number" step="0.5" value="${s.weight}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'weight', this.value)" class="w-12 bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', 1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">+1</button>
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'weight', 5)" ${s.completed ? 'disabled' : ''} class="w-7 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] transition active:scale-75 items-center justify-center disabled:opacity-30 hidden sm:inline-flex">+5</button>
                                                    <span class="text-[10px] text-gray-500 font-bold ml-0.5">kg</span>
                                                </div>

                                                <!-- Reps Adjustment -->
                                                <div class="flex items-center gap-1">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', -1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">-</button>
                                                    <input id="reps-input-${exIdx}-${setIdx}" type="number" value="${s.reps}" ${s.completed ? 'disabled' : ''} oninput="window.Gym.onSetInputChange(${exIdx}, ${setIdx}, 'reps', this.value)" class="w-10 bg-black/40 text-center text-xs font-bold text-white p-1.5 rounded-lg border border-white/5 outline-none focus:border-[#faa61a]/30">
                                                    <button onclick="window.Gym.adjustVal(${exIdx}, ${setIdx}, 'reps', 1)" ${s.completed ? 'disabled' : ''} class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 font-black text-xs transition active:scale-75 flex items-center justify-center disabled:opacity-30">+</button>
                                                    <span class="text-[10px] text-gray-500 font-bold ml-0.5">rep</span>
                                                </div>

                                                <!-- Check Box -->
                                                <button id="complete-btn-${exIdx}-${setIdx}" onclick="window.Gym.toggleSetComplete(${exIdx}, ${setIdx})" class="w-8 h-8 rounded-xl flex items-center justify-center transition-all ${s.completed ? 'bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}">
                                                    <i class="fas fa-check text-xs"></i>
                                                </button>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                    <!-- Bottom scroll spacer to prevent overlapping by the sticky bar -->
                    <div class="h-32 select-none pointer-events-none"></div>
                </div>
            </div>

            <!-- Sticky Active controls bottom bar -->
            <div class="absolute bottom-0 left-0 right-0 p-4 bg-[#2f3136] border-t border-[#202225] flex justify-between gap-4 z-30 select-none">
                <button onclick="window.Gym.cancelWorkout()" class="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-red-400 hover:text-red-300 font-black text-xs uppercase tracking-widest transition transform active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-trash-alt text-[10px]"></i> Zahodit
                </button>
                
                <button onclick="window.Gym.minimizeWorkout()" class="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-yellow-400 hover:text-yellow-300 font-black text-xs uppercase tracking-widest transition transform active:scale-95 flex items-center gap-1.5">
                    <i class="fas fa-compress-alt text-[10px]"></i> Minimalizovat
                </button>
                
                <button onclick="window.Gym.finishWorkout()" class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/20 transform active:scale-[0.98] flex items-center justify-center gap-2">
                    <i class="fas fa-check-circle text-sm"></i> Uložit a dokončit trénink
                </button>
            </div>
        </div>
    `;

    // Rescale stopwatch label text size in timer
    const timerEl = document.getElementById('active-workout-timer');
    if (timerEl && activeWorkout) {
        const h = Math.floor(activeWorkout.durationSeconds / 3600);
        const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
        const s = activeWorkout.durationSeconds % 60;
        timerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

// --- ACTIVE WORKOUT HANDLERS ---
export function adjustVal(exIdx, setIdx, key, delta) {
    triggerHaptic('light');
    if (!activeWorkout) return;

    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    if (key === 'weight') {
        setObj.weight = Math.max(0, setObj.weight + delta);
    } else {
        setObj.reps = Math.max(0, setObj.reps + delta);
    }
    
    // In-place DOM update of input element to keep scroll position & avoid re-render animation!
    const inputEl = document.getElementById(`${key}-input-${exIdx}-${setIdx}`);
    if (inputEl) {
        inputEl.value = setObj[key];
    }
    saveActiveWorkoutToStorage();
}

export function toggleSetComplete(exIdx, setIdx) {
    if (!activeWorkout) return;

    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    setObj.completed = !setObj.completed;

    let isNewPR = false;
    if (setObj.completed) {
        triggerHaptic('success');
        // Start rest timer automatically!
        startRestTimer();

        // Instant PR check!
        const exId = activeWorkout.exercises[exIdx].exercise_id;
        const exName = activeWorkout.exercises[exIdx].name;
        const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === exId);
        
        if (setObj.weight > 0 && (!existingPR || setObj.weight > parseFloat(existingPR.weight))) {
            isNewPR = true;
            
            // Premium celebrations!
            playArcade();
            triggerConfetti();
            setTimeout(() => triggerConfetti(), 400); // Double burst!
            
            showNotification(`🏆 NOVÝ OSOBNÍ REKORD na ${exName}: ${setObj.weight} kg! 🔥`, 'success');
        }
    } else {
        triggerHaptic('light');
    }

    // In-place DOM update of the row classes & controls to preserve scroll position perfectly!
    const row = document.getElementById(`set-row-${exIdx}-${setIdx}`);
    if (row) {
        // Toggle background and border classes
        if (setObj.completed) {
            row.className = `flex items-center justify-between gap-3 p-2.5 rounded-2xl transition duration-150 bg-[#3ba55c]/10 border border-[#3ba55c]/25`;
        } else {
            row.className = `flex items-center justify-between gap-3 p-2.5 rounded-2xl transition duration-150 bg-black/20 border border-transparent`;
        }

        // Toggle disabled state on inputs and adjustment buttons
        const controls = row.querySelectorAll(`input, button:not(#complete-btn-${exIdx}-${setIdx})`);
        controls.forEach(c => {
            if (setObj.completed) {
                c.setAttribute('disabled', 'true');
            } else {
                c.removeAttribute('disabled');
            }
        });

        // Toggle complete button classes
        const btn = document.getElementById(`complete-btn-${exIdx}-${setIdx}`);
        if (btn) {
            if (setObj.completed) {
                btn.className = `w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-[#3ba55c] text-white shadow-lg shadow-[#3ba55c]/25 hover:bg-[#2d7d46]`;
            } else {
                btn.className = `w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white`;
            }
        }

        // Update set label for instant PR badge
        const labelEl = row.querySelector('.text-xs.font-bold.text-gray-400');
        if (labelEl) {
            if (setObj.completed && isNewPR) {
                labelEl.innerHTML = `S${setIdx+1} <span class="text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded ml-1 animate-bounce-slow flex items-center gap-0.5">🔥 PR</span>`;
            } else {
                labelEl.innerHTML = `S${setIdx+1}`;
            }
        }
    }

    // Update Global Progress Bar in-place
    let totalSets = 0;
    let completedSets = 0;
    activeWorkout.exercises.forEach(e => {
        totalSets += e.sets.length;
        completedSets += e.sets.filter(s => s.completed).length;
    });
    const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

    const progBar = document.getElementById('active-workout-progress');
    if (progBar) {
        progBar.style.width = `${percentage}%`;
    }
    saveActiveWorkoutToStorage();
}


export function setRestDuration(seconds) {
    triggerHaptic('light');
    restTimeDuration = seconds;
    if (!isRestTimerRunning) {
        restTimeRemaining = seconds;
    }
    saveActiveWorkoutToStorage();
    renderGym();
}

function tickRestTimer() {
    if (restTimeRemaining > 0) {
        restTimeRemaining--;
        const restMinutes = Math.floor(restTimeRemaining / 60);
        const restSeconds = restTimeRemaining % 60;
        
        const countdownEl = document.getElementById('rest-timer-countdown');
        if (countdownEl) {
            countdownEl.textContent = `${String(restMinutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`;
        }
        
        const ringEl = document.getElementById('rest-svg-ring');
        if (ringEl && restTimeDuration > 0) {
            const offset = 276.4 * (1 - restTimeRemaining / restTimeDuration);
            ringEl.setAttribute('stroke-dashoffset', offset);
            
            // Color transitions when remaining time is low
            if (restTimeRemaining <= 10) {
                ringEl.setAttribute('stroke', '#faa61a'); // Amber color for final sprint
                if (countdownEl) {
                    countdownEl.classList.remove('text-[#3ba55c]');
                    countdownEl.classList.add('text-[#faa61a]');
                }
            } else {
                ringEl.setAttribute('stroke', '#3ba55c'); // Calm green
                if (countdownEl) {
                    countdownEl.classList.remove('text-[#faa61a]');
                    countdownEl.classList.add('text-[#3ba55c]');
                }
            }
        }
    } else {
        // Timer finished!
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        isRestTimerRunning = false;
        
        // Acoustic feedback!
        playChime();
        
        // Haptic & Visual Alarm feedback!
        triggerHaptic('success');
        setTimeout(() => triggerHaptic('success'), 600);
        
        showNotification('Pauza vypršela, jdeme na další sérii! 💪🏋️‍♂️', 'success');
        
        // Screen flash overlay
        const flash = document.createElement('div');
        flash.className = 'fixed inset-0 z-[200] bg-[#3ba55c]/25 backdrop-blur-xs pointer-events-none transition-opacity duration-1000';
        document.body.appendChild(flash);
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 1000);
        }, 300);
        
        saveActiveWorkoutToStorage();
        renderGym();
    }
}

export function startRestTimer() {
    restTimeRemaining = restTimeDuration;
    isRestTimerRunning = true;
    saveActiveWorkoutToStorage();

    if (restTimerInterval) clearInterval(restTimerInterval);
    restTimerInterval = setInterval(tickRestTimer, 1000);
}

export function toggleRestTimer() {
    triggerHaptic('light');
    if (isRestTimerRunning) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        isRestTimerRunning = false;
    } else {
        // If remaining is 0, start a fresh one, otherwise resume
        if (restTimeRemaining <= 0) {
            restTimeRemaining = restTimeDuration;
        }
        isRestTimerRunning = true;
        if (restTimerInterval) clearInterval(restTimerInterval);
        restTimerInterval = setInterval(tickRestTimer, 1000);
    }
    saveActiveWorkoutToStorage();
    renderGym();
}

export function resetRestTimer() {
    triggerHaptic('medium');
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    isRestTimerRunning = false;
    restTimeRemaining = restTimeDuration;
    saveActiveWorkoutToStorage();
    renderGym();
}


export function cancelWorkout() {
    if (!confirm('Opravdu chceš zahodit tento běžící trénink? Všechny zapsané série se smažou.')) return;
    
    triggerHaptic('medium');
    cleanupWorkoutTimers();
    activeWorkout = null;
    saveActiveWorkoutToStorage();
    renderGym();
}

export async function finishWorkout() {
    triggerHaptic('success');
    if (!activeWorkout) return;

    // Filter exercises that had at least one completed set
    const loggedExercises = activeWorkout.exercises.map(e => ({
        exercise_id: e.exercise_id,
        exercise_name: e.name,
        sets: e.sets.map(s => ({
            weight: s.weight,
            reps: s.reps,
            completed: s.completed
        }))
    })).filter(e => e.sets.some(s => s.completed));

    if (loggedExercises.length === 0) {
        showNotification('Nebyly splněny žádné série, trénink nelze uložit!', 'warning');
        return;
    }

    const todayStr = getTodayKey();

    try {
        // 1. Insert Completed Workout Log
        const logData = {
            user_id: state.currentUser?.id,
            template_id: activeWorkout.templateId,
            name: activeWorkout.name,
            duration_seconds: activeWorkout.durationSeconds,
            date_key: todayStr,
            exercises: loggedExercises,
            cheers: []
        };

        const { data: newLogs, error: logErr } = await supabase
            .from('gym_logs')
            .insert(logData)
            .select();

        if (logErr) throw logErr;

        const insertedLog = newLogs?.[0];

        // 2. Check and record Personal Records (PRs)
        for (const ex of loggedExercises) {
            const maxCompletedSet = ex.sets
                .filter(s => s.completed)
                .reduce((max, s) => (s.weight > max.weight ? s : max), { weight: 0, reps: 0 });
            
            if (maxCompletedSet.weight > 0) {
                // Find existing PR for this exercise
                const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === ex.exercise_id);
                
                if (!existingPR || maxCompletedSet.weight > parseFloat(existingPR.weight)) {
                    // Update or insert PR
                    const prData = {
                        user_id: state.currentUser?.id,
                        exercise_id: ex.exercise_id,
                        weight: maxCompletedSet.weight,
                        reps: maxCompletedSet.reps,
                        achieved_at: new Date().toISOString(),
                        log_id: insertedLog?.id
                    };

                    if (existingPR) {
                        await supabase.from('gym_prs').delete().eq('id', existingPR.id);
                    }
                    
                    await supabase.from('gym_prs').insert(prData);
                    
                    showNotification(`🏆 NOVÝ OSOBNÍ REKORD na ${ex.exercise_name}: ${maxCompletedSet.weight} kg!`, 'success');

                    // Auto-unlock PR breaker achievement!
                    import('./achievements.js').then(m => {
                        m.autoUnlock('pr_breaker');
                    });
                }
            }
        }

        // 3. Celebrations & Haptic triggers
        triggerConfetti();
        triggerHaptic('success');
        
        // Show global success feedback
        showNotification('Trénink uložen! Získali jste +20 XP do společného levelu! 🎉💪', 'success');

        // Cleanup workout states
        cleanupWorkoutTimers();
        activeWorkout = null;
        saveActiveWorkoutToStorage();

        // Force reload state and levels update
        await ensureGymData(true);
        
        // Dynamic revalidation for level bar triggers (relationship RPC)
        import('../core/state.js').then(s => s.initializeState());

        // Achieve checks if we logged a workout
        import('./achievements.js').then(m => {
            // Unlocks gym rat if logs count matches
            const myLogsCount = state.gymLogs.filter(l => l.user_id === state.currentUser?.id).length;
            if (myLogsCount >= 10) m.autoUnlock('gym_rat');

            // Unlocks synchro gym if both worked out today
            const todayStr = getTodayKey();
            const partnerLogsToday = state.gymLogs.filter(l => l.user_id !== state.currentUser?.id && l.date_key === todayStr);
            if (partnerLogsToday.length > 0) {
                m.autoUnlock('synchro_gym');
            }
        });

        renderGym();
    } catch (e) {
        console.error("[Gym] Finish workout failed:", e);
        showNotification('Chyba při ukládání tréninku: ' + e.message, 'danger');
    }
}

function saveActiveWorkoutToStorage() {
    if (activeWorkout) {
        const dataToSave = {
            templateId: activeWorkout.templateId,
            name: activeWorkout.name,
            startTime: activeWorkout.startTime.toISOString(),
            durationSeconds: activeWorkout.durationSeconds,
            exercises: activeWorkout.exercises,
            isMinimized: activeWorkout.isMinimized || false,
            lastSavedTime: new Date().toISOString(),
            restTimeRemaining,
            restTimeDuration,
            isRestTimerRunning
        };
        localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(dataToSave));
    } else {
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
    }
}

function loadActiveWorkoutFromStorage() {
    try {
        const cached = localStorage.getItem(ACTIVE_WORKOUT_KEY);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed) {
                // Calculate elapsed time since app closure
                const elapsedSeconds = Math.max(0, Math.round((new Date() - new Date(parsed.lastSavedTime)) / 1000));
                
                // Adjust stopwatch duration
                parsed.durationSeconds += elapsedSeconds;

                // Adjust rest timer
                restTimeDuration = parsed.restTimeDuration ?? 90;
                isRestTimerRunning = parsed.isRestTimerRunning ?? false;
                if (isRestTimerRunning && parsed.restTimeRemaining > 0) {
                    restTimeRemaining = Math.max(0, parsed.restTimeRemaining - elapsedSeconds);
                    if (restTimeRemaining === 0) {
                        isRestTimerRunning = false;
                    }
                } else {
                    restTimeRemaining = parsed.restTimeRemaining ?? 0;
                }

                activeWorkout = {
                    templateId: parsed.templateId,
                    name: parsed.name,
                    startTime: new Date(parsed.startTime),
                    durationSeconds: parsed.durationSeconds,
                    exercises: parsed.exercises,
                    isMinimized: parsed.isMinimized ?? false
                };

                // Resume intervals
                resumeWorkoutIntervals();
            }
        }
    } catch (e) {
        console.error("[Gym] Failed to load active workout from storage:", e);
    }
}

function resumeWorkoutIntervals() {
    // Resume Stopwatch
    if (stopwatchInterval) clearInterval(stopwatchInterval);
    stopwatchInterval = setInterval(() => {
        if (activeWorkout) {
            activeWorkout.durationSeconds++;
            
            // Save state to storage every 10 ticks to stay synchronized
            if (activeWorkout.durationSeconds % 10 === 0) {
                saveActiveWorkoutToStorage();
            }

            const timerEl = document.getElementById('active-workout-timer');
            if (timerEl) {
                const h = Math.floor(activeWorkout.durationSeconds / 3600);
                const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
                const s = activeWorkout.durationSeconds % 60;
                timerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }

            // Update the global floating active workout badge!
            const globalTimerEl = document.getElementById('global-workout-timer');
            if (globalTimerEl) {
                const h = Math.floor(activeWorkout.durationSeconds / 3600);
                const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
                const s = activeWorkout.durationSeconds % 60;
                globalTimerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
        }
    }, 1000);

    // Resume Rest Timer
    if (isRestTimerRunning && restTimeRemaining > 0) {
        if (restTimerInterval) clearInterval(restTimerInterval);
        restTimerInterval = setInterval(tickRestTimer, 1000);
    }
}

function cleanupWorkoutTimers() {
    if (stopwatchInterval) { clearInterval(stopwatchInterval); stopwatchInterval = null; }
    if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
    isRestTimerRunning = false;
    restTimeRemaining = 0;
    
    // Remove the global floating badge!
    document.getElementById('global-active-workout-badge')?.remove();
}


// --- TAB: MANUAL RETROACTIVE WORKOUT ZÁPIS MODAL ---
export function openManualLogModal() {
    triggerHaptic('light');

    const templates = state.gymTemplates || [];
    const exercises = state.gymExercises || [];

    const contentHtml = `
        <div class="space-y-4 text-left">
            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Datum tréninku</label>
                <input type="date" id="manual-date" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all" value="${new Date().toISOString().split('T')[0]}">
            </div>

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tréninkový plán (Šablona)</label>
                <select id="manual-template" onchange="window.Gym.onManualTemplateChange(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="">-- Vyber šablonu --</option>
                    ${templates.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                </select>
            </div>

            ${renderInputGroup({
                label: 'Délka tréninku (minuty)',
                id: 'manual-duration',
                type: 'number',
                placeholder: 'např. 60',
                value: '60'
            })}

            <!-- Target Exercise list placeholder -->
            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Cviky a váhy</label>
                <div id="manual-exercises-list" class="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                    <!-- Loaded dynamically based on template select -->
                    <p class="text-xs text-gray-500 italic">Zatím nevybrána šablona.</p>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('manual-log-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveManualLog()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Trénink
            </button>
        </div>
    `;

    // Remove any existing manual log modal first
    document.getElementById('manual-log-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'manual-log-modal',
        title: 'Zpětný zápis tréninku',
        subtitle: 'Zaznamenej trénink z minulosti 🏋️‍♂️📜',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('manual-log-modal').remove()"
    }));

    // Trigger helper on templates change
    window.Gym.onManualTemplateChange = (tmplId) => {
        const listEl = document.getElementById('manual-exercises-list');
        if (!listEl) return;

        const tmpl = templates.find(t => t.id === tmplId);
        if (!tmpl) {
            listEl.innerHTML = `<p class="text-xs text-gray-500 italic">Zatím nevybrána šablona.</p>`;
            return;
        }

        let exListHtml = '';
        tmpl.exercises.forEach((te, idx) => {
            const ex = exercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id };
            exListHtml += `
                <div class="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-2" data-ex-id="${te.exercise_id}">
                    <div class="text-xs font-bold text-white leading-snug">${ex.name}</div>
                    <div class="grid grid-cols-2 gap-2">
                        ${renderInputGroup({
                            label: 'Váha (kg)',
                            id: `manual-ex-${idx}-weight`,
                            type: 'number',
                            value: te.weight.toString()
                        })}
                        ${renderInputGroup({
                            label: 'Opakování',
                            id: `manual-ex-${idx}-reps`,
                            type: 'number',
                            value: te.reps.toString()
                        })}
                    </div>
                    <input type="hidden" id="manual-ex-${idx}-sets" value="${te.sets}">
                </div>
            `;
        });
        listEl.innerHTML = exListHtml;
    };

    document.getElementById('manual-log-modal').classList.remove('hidden');
    document.getElementById('manual-log-modal').classList.add('flex');
}

export async function saveManualLog() {
    triggerHaptic('medium');

    const dateVal = document.getElementById('manual-date').value;
    const templateId = document.getElementById('manual-template').value;
    const durationMin = parseInt(document.getElementById('manual-duration').value) || 60;

    if (!templateId) {
        showNotification('Vyber tréninkovou šablonu!', 'warning');
        return;
    }

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    const loggedExercises = [];
    let hasLoggedAnything = false;

    template.exercises.forEach((te, idx) => {
        const weightEl = document.getElementById(`manual-ex-${idx}-weight`);
        const repsEl = document.getElementById(`manual-ex-${idx}-reps`);
        const setsCount = parseInt(document.getElementById(`manual-ex-${idx}-sets`).value) || 4;

        if (weightEl && repsEl) {
            const weight = parseFloat(weightEl.value) || 0;
            const reps = parseInt(repsEl.value) || 0;

            const setsArray = [];
            for (let s = 0; s < setsCount; s++) {
                setsArray.push({
                    weight,
                    reps,
                    completed: true
                });
            }

            const ex = state.gymExercises.find(e => e.id === te.exercise_id) || { name: te.exercise_id };
            loggedExercises.push({
                exercise_id: te.exercise_id,
                exercise_name: ex.name,
                sets: setsArray
            });
            hasLoggedAnything = true;
        }
    });

    if (!hasLoggedAnything) {
        showNotification('Chyba při logování cviků.', 'warning');
        return;
    }

    try {
        const logData = {
            user_id: state.currentUser?.id,
            template_id: templateId,
            name: template.name,
            duration_seconds: durationMin * 60,
            date_key: dateVal,
            exercises: loggedExercises,
            cheers: []
        };

        const { data: newLogs, error: logErr } = await supabase
            .from('gym_logs')
            .insert(logData)
            .select();

        if (logErr) throw logErr;

        const insertedLog = newLogs?.[0];

        // Check for PRs
        for (const ex of loggedExercises) {
            const maxCompletedSet = ex.sets[0]; // All sets are identical in manual entry
            if (maxCompletedSet && maxCompletedSet.weight > 0) {
                const existingPR = state.gymPRs.find(p => p.user_id === state.currentUser?.id && p.exercise_id === ex.exercise_id);
                if (!existingPR || maxCompletedSet.weight > parseFloat(existingPR.weight)) {
                    const prData = {
                        user_id: state.currentUser?.id,
                        exercise_id: ex.exercise_id,
                        weight: maxCompletedSet.weight,
                        reps: maxCompletedSet.reps,
                        achieved_at: new Date().toISOString(),
                        log_id: insertedLog?.id
                    };

                    if (existingPR) {
                        await supabase.from('gym_prs').delete().eq('id', existingPR.id);
                    }
                    await supabase.from('gym_prs').insert(prData);

                    // Auto-unlock PR breaker achievement!
                    import('./achievements.js').then(m => {
                        m.autoUnlock('pr_breaker');
                    });
                }
            }
        }

        triggerConfetti();
        showNotification('Zpětný trénink uložen! Získali jste +20 XP! 🎉', 'success');
        document.getElementById('manual-log-modal')?.remove();

        await ensureGymData(true);
        
        // Achieve checks if we logged a workout
        import('./achievements.js').then(m => {
            const myLogsCount = state.gymLogs.filter(l => l.user_id === state.currentUser?.id).length;
            if (myLogsCount >= 10) m.autoUnlock('gym_rat');

            const partnerLogsToday = state.gymLogs.filter(l => l.user_id !== state.currentUser?.id && l.date_key === dateVal);
            if (partnerLogsToday.length > 0) {
                m.autoUnlock('synchro_gym');
            }
        });

        import('../core/state.js').then(s => s.initializeState());
        renderGym();
    } catch (e) {
        console.error("[Gym] Manual log failed:", e);
        showNotification('Chyba ukládání: ' + e.message, 'danger');
    }
}

// --- REFINEMENT HANDLERS ---

export function minimizeWorkout() {
    triggerHaptic('light');
    if (activeWorkout) {
        activeWorkout.isMinimized = true;
    }
    saveActiveWorkoutToStorage();
    renderGym();
}

export function restoreWorkout() {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
    renderGym();
}

export function onSetInputChange(exIdx, setIdx, key, val) {
    if (!activeWorkout) return;
    const setObj = activeWorkout.exercises[exIdx].sets[setIdx];
    if (key === 'weight') {
        setObj.weight = parseFloat(val) || 0;
    } else {
        setObj.reps = parseInt(val) || 0;
    }
    saveActiveWorkoutToStorage();
}

export function updateGlobalWorkoutBadge() {
    if (!activeWorkout) {
        document.getElementById('global-active-workout-badge')?.remove();
        return;
    }
    
    // Do not show the global floating badge if we are already in the Posilovna channel
    if (state.currentChannel === 'gym-tracker') {
        document.getElementById('global-active-workout-badge')?.remove();
        return;
    }
    
    let badge = document.getElementById('global-active-workout-badge');
    if (!badge) {
        const html = `
            <div id="global-active-workout-badge" onclick="window.Gym.restoreWorkoutGlobal()" 
                 class="fixed bottom-4 right-4 z-[100] cursor-pointer bg-[#2f3136]/95 backdrop-blur-md border border-[#faa61a]/30 shadow-[0_4px_20px_rgba(250,166,26,0.25)] rounded-2xl px-4 py-2.5 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all select-none animate-pulse-slow">
                <div class="w-8 h-8 rounded-xl bg-[#faa61a]/10 flex items-center justify-center text-[#faa61a]">
                    <i class="fas fa-dumbbell text-sm animate-bounce-slow"></i>
                </div>
                <div>
                    <span class="text-[9px] font-black uppercase text-white/40 tracking-widest block leading-none mb-1 font-sans">Běží trénink</span>
                    <span id="global-workout-timer" class="text-xs font-mono font-black text-white leading-none">00:00</span>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        badge = document.getElementById('global-active-workout-badge');
    }
    
    const globalTimerEl = document.getElementById('global-workout-timer');
    if (globalTimerEl && activeWorkout) {
        const h = Math.floor(activeWorkout.durationSeconds / 3600);
        const m = Math.floor((activeWorkout.durationSeconds % 3600) / 60);
        const s = activeWorkout.durationSeconds % 60;
        globalTimerEl.textContent = `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
}

export function restoreWorkoutGlobal() {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
    if (typeof window.switchChannel === 'function') {
        window.switchChannel('gym-tracker');
    } else {
        import('../core/router.js').then(r => r.switchChannel('gym-tracker'));
    }
}


// 1. Create Custom Exercise Modal
export function openCreateExerciseModal() {
    triggerHaptic('light');

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název nového cviku',
                id: 'new-ex-name',
                placeholder: 'např. Dřep s činkou vzadu, Peck Deck...'
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie / Partie</label>
                <select id="new-ex-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    <option value="Hrudník">Hrudník</option>
                    <option value="Záda">Záda</option>
                    <option value="Ramena">Ramena</option>
                    <option value="Nohy">Nohy</option>
                    <option value="Ruce">Ruce</option>
                    <option value="Břicho">Břicho</option>
                    <option value="Ostatní">Ostatní</option>
                </select>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('create-exercise-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveExercise()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Vytvořit Cvik
            </button>
        </div>
    `;

    document.getElementById('create-exercise-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'create-exercise-modal',
        title: 'Vytvořit Vlastní Cvik',
        subtitle: 'Rozšiř svůj katalog cviků 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('create-exercise-modal').remove()"
    }));

    document.getElementById('create-exercise-modal').classList.remove('hidden');
    document.getElementById('create-exercise-modal').classList.add('flex');
}

export async function saveExercise() {
    triggerHaptic('medium');

    const name = document.getElementById('new-ex-name').value.trim();
    const category = document.getElementById('new-ex-cat').value;

    if (!name) {
        showNotification('Prosím zadej název cviku!', 'warning');
        return;
    }

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
        const { error } = await supabase
            .from('gym_exercises')
            .insert({
                id,
                name,
                category,
                is_default: false,
                created_by: state.currentUser?.id
            });

        if (error) throw error;

        showNotification('Nový cvik byl úspěšně přidán! 🏋️‍♂️', 'success');
        document.getElementById('create-exercise-modal')?.remove();
        
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Failed to save exercise:", e);
        showNotification('Nepodařilo se uložit cvik. Zkontroluj unikátnost názvu.', 'danger');
    }
}

// 2. Edit Workout Template Modal
export function openEditTemplateModal(templateId, event) {
    if (event) event.stopPropagation();
    triggerHaptic('light');

    const template = state.gymTemplates.find(t => t.id === templateId);
    if (!template) return;

    const exercises = state.gymExercises || [];
    const templateExerciseIds = template.exercises.map(e => e.exercise_id);

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název šablony',
                id: 'edit-tmpl-name',
                placeholder: 'např. Push Day 🦍',
                value: template.name
            })}

            ${renderInputGroup({
                label: 'Popis',
                id: 'edit-tmpl-desc',
                placeholder: 'např. Hrudník, ramena...',
                value: template.description || ''
            })}

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 ml-1">Zvolené cviky tréninku</label>
                <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterModalExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition mb-2">
                <div class="max-h-60 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2">
                    ${exercises.map(ex => {
                        const isChecked = templateExerciseIds.includes(ex.id);
                        return `
                            <label class="exercise-select-item flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none" data-name="${ex.name.toLowerCase()}" data-category="${ex.category.toLowerCase()}">
                                <input type="checkbox" name="edit-tmpl-exercises" value="${ex.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded accent-[#faa61a] border-white/10 bg-black/20 focus:ring-0">
                                <div>
                                    <span class="text-xs font-bold text-white block leading-snug">${ex.name}</span>
                                    <span class="text-[9px] font-black uppercase text-white/30 tracking-wider font-mono">${ex.category}</span>
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <input type="hidden" id="edit-tmpl-id" value="${templateId}">
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('edit-template-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveEditedTemplate()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Změny
            </button>
        </div>
    `;

    document.getElementById('edit-template-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-template-modal',
        title: 'Upravit Tréninkový Plán',
        subtitle: 'Uprav složení cviků a popis splitu 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-template-modal').remove()"
    }));

    document.getElementById('edit-template-modal').classList.remove('hidden');
    document.getElementById('edit-template-modal').classList.add('flex');
}

export async function saveEditedTemplate() {
    triggerHaptic('medium');

    const id = document.getElementById('edit-tmpl-id').value;
    const name = document.getElementById('edit-tmpl-name').value.trim();
    const description = document.getElementById('edit-tmpl-desc').value.trim();
    const checked = Array.from(document.querySelectorAll('input[name="edit-tmpl-exercises"]:checked')).map(cb => cb.value);

    if (!name) {
        showNotification('Zadej název šablony!', 'warning');
        return;
    }
    if (checked.length === 0) {
        showNotification('Vyber alespoň jeden cvik!', 'warning');
        return;
    }

    const template = state.gymTemplates.find(t => t.id === id);
    if (!template) return;

    // Preserving old sets/reps/weights for matching exercises, creating defaults for new ones
    const newExercises = checked.map(exId => {
        const oldEx = template.exercises.find(e => e.exercise_id === exId);
        return oldEx || {
            exercise_id: exId,
            sets: 4,
            reps: 10,
            weight: 10
        };
    });

    try {
        const { error } = await supabase
            .from('gym_templates')
            .update({
                name,
                description,
                exercises: newExercises
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Tréninkový plán byl úspěšně upraven! 🏋️‍♂️💪', 'success');
        document.getElementById('edit-template-modal')?.remove();

        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Failed to update template:", e);
        showNotification('Nepodařilo se uložit změny plánu.', 'danger');
    }
}

// 3. Minimized Active Banner View
function renderMinimizedBanner() {
    if (!activeWorkout || !activeWorkout.isMinimized) return '';

    let totalSets = 0;
    let completedSets = 0;
    activeWorkout.exercises.forEach(e => {
        totalSets += e.sets.length;
        completedSets += e.sets.filter(s => s.completed).length;
    });

    return `
        <div class="bg-gradient-to-r from-[#faa61a]/10 via-[#faa61a]/5 to-[#faa61a]/10 border border-[#faa61a]/20 p-4 rounded-3xl mb-6 flex justify-between items-center animate-pulse shadow-xl relative overflow-hidden select-none">
            <div class="absolute inset-0 bg-[#faa61a]/2 pointer-events-none"></div>
            <div class="flex items-center gap-3 relative z-10">
                <div class="w-10 h-10 rounded-xl bg-[#faa61a]/10 flex items-center justify-center text-xl text-[#faa61a] animate-bounce-slow">
                    ⚡
                </div>
                <div>
                    <span class="text-[9px] font-black uppercase text-white/40 tracking-widest block mb-0.5 font-sans">Probíhající trénink</span>
                    <h4 class="text-xs font-black text-white leading-tight mt-0.5">${activeWorkout.name} • Splněno ${completedSets} z ${totalSets} sérií</h4>
                </div>
            </div>
            
            <button onclick="window.Gym.restoreWorkout()" class="px-5 py-2.5 rounded-xl bg-[#faa61a] hover:bg-[#e09216] text-black font-black text-xs uppercase tracking-wider transition shadow-lg transform active:scale-95 relative z-10 flex items-center gap-1.5 font-sans">
                <i class="fas fa-expand-alt"></i> Otevřít trénink
            </button>
        </div>
    `;
}

// 4. Live Modal Exercises filter (Vanilla client-side search)
export function filterModalExercises(query) {
    const q = query.toLowerCase().trim();
    const items = document.querySelectorAll('.exercise-select-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        const category = item.getAttribute('data-category') || '';
        if (name.includes(q) || category.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// --- REALTIME ---
function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('gym-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_logs' },
            async () => {
                const { data } = await supabase.from('gym_logs').select('*').order('logged_at', { ascending: false });
                if (data) {
                    state.gymLogs = data;
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGym();
                    }
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_prs' },
            async () => {
                const { data } = await supabase.from('gym_prs').select('*');
                if (data) {
                    state.gymPRs = data;
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGym();
                    }
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_exercises' },
            async () => {
                const { data } = await supabase.from('gym_exercises').select('*').order('name');
                if (data) {
                    state.gymExercises = data;
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGym();
                    }
                }
            }
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'gym_templates' },
            async () => {
                const { data } = await supabase.from('gym_templates').select('*').order('created_at', { ascending: false });
                if (data) {
                    state.gymTemplates = data;
                    if (state.currentChannel === 'gym-tracker' && !activeWorkout) {
                        renderGym();
                    }
                }
            }
        )
        .subscribe();
}

export function cleanupRealtime() {
    if (subscription) {
        supabase.removeChannel(subscription);
        subscription = null;
    }
}

// --- TAB: EXERCISES MANAGEMENT ---
function renderExercisesTab() {
    const exercises = state.gymExercises || [];
    const categories = ['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Ostatní'];

    return `
        <div class="space-y-6">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 class="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 leading-none">
                    <i class="fas fa-dumbbell text-[#7289da]"></i> Katalog cviků
                </h2>
                <button onclick="window.Gym.openCreateExerciseModal()" class="px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 w-full sm:w-auto justify-center">
                    <i class="fas fa-plus text-xs"></i> Nový cvik
                </button>
            </div>

            <!-- Tab Search Bar -->
            <input type="text" placeholder="Hledat cvik podle názvu nebo partie..." oninput="window.Gym.filterTabExercises(this.value)" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition shadow-md">

            <!-- Category lists -->
            <div class="space-y-6" id="exercises-tab-list">
                ${categories.map(cat => {
                    const catExercises = exercises.filter(e => e.category === cat);
                    if (catExercises.length === 0) return '';

                    // Categorized badge colors
                    const badgeColors = {
                        'Hrudník': 'border-l-blue-400',
                        'Záda': 'border-l-emerald-400',
                        'Ramena': 'border-l-amber-400',
                        'Nohy': 'border-l-indigo-400',
                        'Ruce': 'border-l-pink-400',
                        'Břicho': 'border-l-red-400',
                        'Ostatní': 'border-l-gray-400'
                    };
                    const borderClass = badgeColors[cat] || 'border-l-gray-400';

                    return `
                        <div class="space-y-3 exercise-cat-section" data-cat="${cat.toLowerCase()}">
                            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest pl-2 border-l-4 ${borderClass} flex items-center gap-2 leading-none">
                                <span>${cat}</span>
                                <span class="text-[10px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono">${catExercises.length}</span>
                            </h3>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                ${catExercises.map(ex => `
                                    <div class="glass-card bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4 transition duration-150 exercise-tab-item" data-name="${ex.name.toLowerCase()}">
                                        <div class="min-w-0">
                                            <h4 class="text-xs font-bold text-white truncate leading-snug">${ex.name}</h4>
                                            ${ex.is_default ? `
                                                <span class="text-[8px] font-black uppercase text-white/20 tracking-wider">Výchozí</span>
                                            ` : `
                                                <span class="text-[8px] font-black uppercase text-[#7289da]/80 tracking-wider">Vlastní</span>
                                            `}
                                        </div>
                                        
                                        <div class="flex gap-1 flex-shrink-0 select-none">
                                            <button onclick="window.Gym.openExerciseAnalyticsModal('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#5865F2] hover:bg-[#5865F2]/10 transition" title="Zobrazit graf pokroku">
                                                <i class="fas fa-chart-line text-[10px]"></i>
                                            </button>
                                            <button onclick="window.Gym.openEditExerciseModal('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#faa61a] hover:bg-[#faa61a]/10 transition" title="Upravit název/partii">
                                                <i class="fas fa-edit text-[10px]"></i>
                                            </button>
                                            <button onclick="window.Gym.deleteExercise('${ex.id}')" class="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition" title="Smazat cvik">
                                                <i class="fas fa-trash-alt text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Live client-side search inside the Exercises Tab
export function filterTabExercises(query) {
    const q = query.toLowerCase().trim();
    
    // Filter individual exercise item cards
    const items = document.querySelectorAll('.exercise-tab-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        if (name.includes(q)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // Hide/show category headers depending on if they have visible children
    const sections = document.querySelectorAll('.exercise-cat-section');
    sections.forEach(sec => {
        const cat = sec.getAttribute('data-cat') || '';
        const visibleItems = sec.querySelectorAll('.exercise-tab-item[style*="display: flex"], .exercise-tab-item:not([style*="display: none"])');
        
        // If the category category match OR has visible exercises
        if (cat.includes(q) || visibleItems.length > 0) {
            sec.style.display = 'block';
            
            // If category itself matched, show all its items
            if (cat.includes(q) && q.length > 0) {
                sec.querySelectorAll('.exercise-tab-item').forEach(i => i.style.display = 'flex');
            }
        } else {
            sec.style.display = 'none';
        }
    });
}

// Edit Custom Exercise Modal
export function openEditExerciseModal(exerciseId) {
    triggerHaptic('light');

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    const contentHtml = `
        <div class="space-y-4 text-left">
            ${renderInputGroup({
                label: 'Název cviku',
                id: 'edit-ex-name',
                placeholder: 'např. Dřep s činkou vzadu...',
                value: ex.name
            })}

            <div class="space-y-1">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie / Partie</label>
                <select id="edit-ex-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
                    ${['Hrudník', 'Záda', 'Ramena', 'Nohy', 'Ruce', 'Břicho', 'Ostatní'].map(cat => `
                        <option value="${cat}" ${ex.category === cat ? 'selected' : ''}>${cat}</option>
                    `).join('')}
                </select>
            </div>
            
            <input type="hidden" id="edit-ex-id" value="${exerciseId}">
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('edit-exercise-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition">
                Zrušit
            </button>
            <button onclick="window.Gym.saveEditedExercise()" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-[10px] uppercase tracking-wider transition shadow-lg shadow-emerald-500/20">
                Uložit Změny
            </button>
        </div>
    `;

    document.getElementById('edit-exercise-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'edit-exercise-modal',
        title: 'Upravit Cvik',
        subtitle: 'Uprav detaily cviku z katalogu 🏋️‍♂️',
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('edit-exercise-modal').remove()"
    }));

    document.getElementById('edit-exercise-modal').classList.remove('hidden');
    document.getElementById('edit-exercise-modal').classList.add('flex');
}

export async function saveEditedExercise() {
    triggerHaptic('medium');

    const id = document.getElementById('edit-ex-id').value;
    const name = document.getElementById('edit-ex-name').value.trim();
    const category = document.getElementById('edit-ex-cat').value;

    if (!name) {
        showNotification('Název cviku nesmí být prázdný!', 'warning');
        return;
    }

    try {
        const { error } = await supabase
            .from('gym_exercises')
            .update({
                name,
                category
            })
            .eq('id', id);

        if (error) throw error;

        showNotification('Cvik byl úspěšně upraven! 🏋️‍♂️', 'success');
        document.getElementById('edit-exercise-modal')?.remove();
        
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Failed to edit exercise:", e);
        showNotification('Nepodařilo se uložit změny cviku.', 'danger');
    }
}

export async function deleteExercise(exerciseId) {
    triggerHaptic('medium');

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    // Check if the exercise is used in any templates
    const templatesWithEx = (state.gymTemplates || []).filter(t => 
        t.exercises && t.exercises.some(te => te.exercise_id === exerciseId)
    );

    let confirmMsg = `Opravdu chceš smazat cvik "${ex.name}" z katalogu?`;
    if (ex.is_default) {
        confirmMsg = `⚠️ Pozor: "${ex.name}" je výchozí společný cvik. Opravdu ho chceš smazat?`;
    }

    if (templatesWithEx.length > 0) {
        const tNames = templatesWithEx.map(t => `"${t.name}"`).join(', ');
        confirmMsg = `⚠️ Pozor! Cvik "${ex.name}" je aktuálně používán v šablonách: ${tNames}.\n\nPokud ho smažeš, bude z těchto šablon AUTOMATICKY odebrán. Chceš přesto pokračovat?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
        // 1. If templates contain this exercise, we must remove it from their exercises JSONB
        for (const t of templatesWithEx) {
            const updatedExercises = t.exercises.filter(te => te.exercise_id !== exerciseId);
            
            const { error: tErr } = await supabase
                .from('gym_templates')
                .update({ exercises: updatedExercises })
                .eq('id', t.id);

            if (tErr) throw tErr;
        }

        // 2. Delete the exercise from gym_exercises
        const { error: exErr } = await supabase
            .from('gym_exercises')
            .delete()
            .eq('id', exerciseId);

        if (exErr) throw exErr;

        showNotification(`Cvik "${ex.name}" byl úspěšně smazán.`, 'info');
        
        await ensureGymData(true);
        renderGym();
    } catch (e) {
        console.error("[Gym] Failed to delete exercise:", e);
        showNotification('Nepodařilo se smazat cvik z databáze.', 'danger');
    }
}

// --- EXERCISE ANALYTICS MODAL & CUSTOM SVG GRAPH ---
export function openExerciseAnalyticsModal(exerciseId) {
    triggerHaptic('light');

    const ex = state.gymExercises.find(e => e.id === exerciseId);
    if (!ex) return;

    // Gather logs for this exercise
    const logs = state.gymLogs || [];
    const exHistory = [];

    logs.forEach(log => {
        if (log.exercises) {
            log.exercises.forEach(le => {
                if (le.exercise_id === exerciseId && le.sets) {
                    const completedSets = le.sets.filter(s => s.completed);
                    if (completedSets.length > 0) {
                        // Max weight in this log
                        const maxW = completedSets.reduce((max, s) => Math.max(max, parseFloat(s.weight) || 0), 0);
                        // Total Volume
                        const vol = completedSets.reduce((sum, s) => sum + (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0), 0);
                        // Est 1RM
                        const max1RM = completedSets.reduce((max, s) => {
                            const w = parseFloat(s.weight) || 0;
                            const r = parseInt(s.reps) || 0;
                            const oneRM = r === 1 ? w : w * (1 + r / 30);
                            return Math.max(max, oneRM);
                        }, 0);

                        exHistory.push({
                            logId: log.id,
                            workoutName: log.name,
                            date: log.date_key,
                            rawDate: new Date(log.logged_at || log.date_key),
                            maxWeight: maxW,
                            volume: vol,
                            est1RM: Math.round(max1RM * 10) / 10,
                            setsStr: completedSets.map(s => `${s.weight}kg x ${s.reps}`).join(', ')
                        });
                    }
                }
            });
        }
    });

    // Sort chronologically (oldest to newest for plotting trends)
    exHistory.sort((a, b) => a.rawDate - b.rawDate);

    // Save in window scope for dynamic switching
    window.Gym.currentAnalyticsData = {
        exerciseName: ex.name,
        category: ex.category,
        history: exHistory
    };

    const contentHtml = `
        <div class="space-y-4 text-left font-sans min-w-0">
            <!-- Tabs / Metric Selector -->
            <div class="flex gap-1.5 p-1 bg-black/30 border border-white/5 rounded-xl select-none max-w-md">
                <button onclick="window.Gym.renderAnalyticsChart('maxWeight')" id="btn-metric-maxWeight" class="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center">
                    Maximálka
                </button>
                <button onclick="window.Gym.renderAnalyticsChart('est1RM')" id="btn-metric-est1RM" class="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center">
                    Odhad 1RM
                </button>
                <button onclick="window.Gym.renderAnalyticsChart('volume')" id="btn-metric-volume" class="flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center">
                    Objem
                </button>
            </div>

            <!-- Chart Container -->
            <div id="analytics-chart-container" class="relative bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center justify-center min-h-[220px]">
                <!-- Loaded dynamically by renderAnalyticsChart -->
            </div>

            <!-- History List Table -->
            <div class="space-y-2 mt-4">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest ml-1">Historie pokusů</label>
                <div class="max-h-48 overflow-y-auto border border-white/5 bg-black/10 rounded-2xl p-3 custom-scrollbar space-y-2.5">
                    ${exHistory.length === 0 ? `
                        <p class="text-xs text-gray-500 italic text-center py-6">Zatím žádné dokončené zápisy pro tento cvik.</p>
                    ` : [...exHistory].reverse().map(h => {
                        const dateStr = new Date(h.rawDate).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: '2-digit' });
                        return `
                            <div class="flex items-start justify-between gap-3 text-xs border-b border-white/[0.03] pb-2 last:border-0 last:pb-0 font-mono">
                                <div class="min-w-0">
                                    <div class="font-bold text-gray-200 font-sans truncate max-w-[180px]">${h.workoutName}</div>
                                    <div class="text-[10px] text-gray-500 font-semibold mt-0.5">${h.setsStr}</div>
                                </div>
                                <div class="text-right flex-shrink-0">
                                    <span class="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/40 block w-max ml-auto leading-none mb-1 font-sans">${dateStr}</span>
                                    <span class="font-bold text-[#faa61a]">${h.maxWeight} kg</span>
                                    <span class="text-[10px] text-gray-500 block">Objem: ${h.volume} kg</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end w-full">
            <button onclick="document.getElementById('exercise-analytics-modal').remove()" 
                    class="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-[10px] uppercase tracking-wider transition">
                Zavřít
            </button>
        </div>
    `;

    document.getElementById('exercise-analytics-modal')?.remove();

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'exercise-analytics-modal',
        title: ex.name,
        subtitle: `Analýza a historie zvedaných vah (${ex.category}) 📊`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('exercise-analytics-modal').remove()"
    }));

    document.getElementById('exercise-analytics-modal').classList.remove('hidden');
    document.getElementById('exercise-analytics-modal').classList.add('flex');

    // Default render with Max Weight metric
    window.Gym.renderAnalyticsChart('maxWeight');
}

export function renderAnalyticsChart(metric) {
    triggerHaptic('light');

    const data = window.Gym.currentAnalyticsData;
    if (!data) return;

    const container = document.getElementById('analytics-chart-container');
    if (!container) return;

    // Toggle active classes on metric buttons
    const metrics = ['maxWeight', 'est1RM', 'volume'];
    metrics.forEach(m => {
        const btn = document.getElementById(`btn-metric-${m}`);
        if (btn) {
            if (m === metric) {
                btn.className = "flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center bg-[#faa61a] text-black shadow-sm font-sans";
            } else {
                btn.className = "flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-bold transition-all text-center bg-transparent text-gray-400 hover:text-white font-sans";
            }
        }
    });

    const history = data.history || [];
    if (history.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10">
                <span class="text-4xl block mb-2">🦉</span>
                <p class="text-xs text-gray-500 font-bold">Žádná data pro vykreslení grafu.</p>
            </div>
        `;
        return;
    }

    const unit = metric === 'volume' ? 'kg volume' : 'kg';

    // Chart parameters
    const svgWidth = 430;
    const svgHeight = 180;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 30;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const chartHeight = svgHeight - paddingTop - paddingBottom;

    // Retrieve values for selected metric
    const values = history.map(h => h[metric]);
    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    // Padding values for graph bounds
    const valRange = maxVal - minVal;
    const yMax = valRange === 0 ? maxVal + 10 : maxVal + valRange * 0.15;
    const yMin = valRange === 0 ? Math.max(0, minVal - 10) : Math.max(0, minVal - valRange * 0.15);
    const yRange = yMax - yMin;

    // Generate path points
    const points = [];
    const N = history.length;

    history.forEach((h, idx) => {
        // Distribute X evenly across graph
        const x = paddingLeft + (N > 1 ? (idx / (N - 1)) * chartWidth : chartWidth / 2);
        const y = paddingTop + (1 - (h[metric] - yMin) / yRange) * chartHeight;
        points.push({ x, y, val: h[metric], date: h.date });
    });

    // SVG Gradient and Filter tags
    let svgHtml = `
        <svg class="w-full h-full min-h-[180px] min-w-[280px]" viewBox="0 0 ${svgWidth} ${svgHeight}">
            <defs>
                <!-- Area Gradient -->
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#faa61a" stop-opacity="0.2" />
                    <stop offset="100%" stop-color="#faa61a" stop-opacity="0.0" />
                </linearGradient>
                <!-- Line Glow Filter -->
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            <!-- Grid lines -->
            <line x1="${paddingLeft}" y1="${paddingTop}" x2="${svgWidth - paddingRight}" y2="${paddingTop}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="${paddingLeft}" y1="${paddingTop + chartHeight / 2}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight / 2}" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
            <line x1="${paddingLeft}" y1="${paddingTop + chartHeight}" x2="${svgWidth - paddingRight}" y2="${paddingTop + chartHeight}" stroke="rgba(255,255,255,0.07)" stroke-width="1" />

            <!-- Y Axis labels -->
            <text x="${paddingLeft - 8}" y="${paddingTop + 3}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-weight="bold">${Math.round(yMax)}</text>
            <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight / 2 + 3}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-weight="bold">${Math.round(yMin + yRange / 2)}</text>
            <text x="${paddingLeft - 8}" y="${paddingTop + chartHeight + 3}" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="end" font-weight="bold">${Math.round(yMin)}</text>
    `;

    if (points.length > 0) {
        // Build Area path string
        let areaPath = `M ${points[0].x} ${paddingTop + chartHeight}`;
        points.forEach(p => {
            areaPath += ` L ${p.x} ${p.y}`;
        });
        areaPath += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;

        // Build Line path string
        let linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            linePath += ` L ${points[i].x} ${points[i].y}`;
        }

        // Render Area Gradient fill
        svgHtml += `<path d="${areaPath}" fill="url(#chart-area-grad)" />`;

        // Render Glowing Line Path
        svgHtml += `<path d="${linePath}" fill="none" stroke="#faa61a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px rgba(250,166,26,0.45));" />`;

        // Render Data Node Circles & tooltips
        points.forEach((p, idx) => {
            const dateObj = new Date(p.date);
            const dateStr = dateObj.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' });
            
            // X Axis date labels (only first, middle, last to prevent overlap)
            const shouldShowLabel = idx === 0 || idx === N - 1 || (N > 2 && idx === Math.floor(N / 2));
            if (shouldShowLabel) {
                svgHtml += `
                    <text x="${p.x}" y="${paddingTop + chartHeight + 15}" fill="rgba(255,255,255,0.25)" font-size="8" text-anchor="middle" font-weight="bold">${dateStr}</text>
                `;
            }

            svgHtml += `
                <g class="chart-node group/node" cursor="pointer">
                    <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#faa61a" stroke="#202225" stroke-width="1.5" />
                    <!-- Hover outer ring -->
                    <circle cx="${p.x}" cy="${p.y}" r="9" fill="rgba(250,166,26,0.15)" class="opacity-0 hover:opacity-100 transition duration-150" />
                    <!-- SVG Tooltip -->
                    <title>${dateStr}: ${p.val} ${unit}</title>
                </g>
            `;
        });
    }

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;
}
