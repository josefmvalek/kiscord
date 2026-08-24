import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { getMyName, getPartnerName, getMyEmoji, getPartnerEmoji } from './shared.js';
import { getAllSyncDays } from './coupleGym.js';

// =====================================================================
// FITNESS WRAPPED / ANNUAL & ALL-TIME SUMMARY ENGINE
// =====================================================================

let currentSlideIdx = 0;

/**
 * Calculates fitness statistics for wrapped summary.
 * @param {string} userId
 * @param {number|null} year - null for all time
 */
export function calculateFitnessWrapped(userId, year = null) {
    const logs = state.gymLogs || [];
    const prs = state.gymPRs || [];
    const targetUserId = userId || state.currentUser?.id;

    const userLogs = logs.filter(l => {
        if (l.user_id !== targetUserId) return false;
        if (!year) return true;
        const d = new Date(l.logged_at || l.date_key);
        return d.getFullYear() === year;
    });

    let totalVolumeKg = 0;
    let totalSetsCount = 0;
    let totalSeconds = 0;
    const exerciseUsage = {}; // { name: { count: 0, sets: 0, maxWeight: 0 } }

    userLogs.forEach(log => {
        totalSeconds += log.duration_seconds || 0;
        (log.exercises || []).forEach(ex => {
            const exName = ex.name || ex.exercise_name || 'Cvik';
            if (!exerciseUsage[exName]) exerciseUsage[exName] = { count: 0, sets: 0, maxWeight: 0 };
            exerciseUsage[exName].count++;

            (ex.sets || []).forEach(s => {
                if (s.completed && s.type !== 'W') {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    totalVolumeKg += w * r;
                    totalSetsCount++;
                    if (w > exerciseUsage[exName].maxWeight) exerciseUsage[exName].maxWeight = w;
                }
            });
        });
    });

    // Top Exercise
    let topExercise = null;
    let maxSets = 0;
    Object.entries(exerciseUsage).forEach(([name, data]) => {
        if (data.sets > maxSets) {
            maxSets = data.sets;
            topExercise = { name, ...data };
        }
    });

    // Tons & Comparisons
    const totalTons = (totalVolumeKg / 1000).toFixed(1);
    const elephants = (totalVolumeKg / 6000).toFixed(1); // 1 elephant = ~6 tons
    const cars = (totalVolumeKg / 1500).toFixed(1); // 1 car = ~1.5 tons

    // User PRs
    const userPRs = prs.filter(p => p.user_id === targetUserId);

    // Sync days
    const allSyncDays = getAllSyncDays();

    return {
        workoutsCount: userLogs.length,
        totalHours: Math.round(totalSeconds / 3600),
        totalVolumeKg: Math.round(totalVolumeKg),
        totalTons,
        totalSetsCount,
        elephants,
        cars,
        topExercise: topExercise || { name: 'Bench Press', sets: 0, maxWeight: 0 },
        prsCount: userPRs.length,
        syncDaysCount: allSyncDays.length
    };
}

/**
 * Opens the interactive Fitness Wrapped modal.
 */
export function openFitnessWrappedModal() {
    triggerHaptic('medium');
    triggerConfetti();

    const stats = calculateFitnessWrapped(state.currentUser?.id);
    const myName = getMyName();
    const partnerName = getPartnerName();
    const myEmoji = getMyEmoji();
    const partnerEmoji = getPartnerEmoji();

    const modalId = 'fitness-wrapped-modal';
    document.getElementById(modalId)?.remove();

    currentSlideIdx = 0;

    const slides = [
        // Slide 1: Welcome & Total Workouts
        `
            <div class="space-y-4 text-center">
                <span class="text-4xl animate-bounce-slow inline-block">🏆</span>
                <span class="text-[9px] font-black uppercase text-[#faa61a] tracking-widest block font-mono">Tvoje Výsledky</span>
                <h2 class="text-2xl font-black text-white uppercase tracking-tight">Fitness Wrapped</h2>
                <p class="text-xs text-gray-300">Ahoj <strong class="text-white">${myName} ${myEmoji}</strong>! Tady je tvůj kompletní fitness přehled.</p>
                <div class="p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-black/40 to-black/60 border border-amber-500/30 shadow-2xl">
                    <span class="text-4xl font-black text-amber-400 font-mono block">${stats.workoutsCount}</span>
                    <span class="text-xs font-bold text-gray-300 uppercase tracking-wider mt-1 block">Odcvičených Tréninků</span>
                    <span class="text-[10px] text-gray-400 font-mono block mt-1">Celkem ${stats.totalHours} hodin v posilovně</span>
                </div>
            </div>
        `,
        // Slide 2: Total Volume & Fun Comparison
        `
            <div class="space-y-4 text-center">
                <span class="text-4xl inline-block">🐘</span>
                <span class="text-[9px] font-black uppercase text-emerald-400 tracking-widest block font-mono">Zvednutá Tonáž</span>
                <h2 class="text-2xl font-black text-white uppercase tracking-tight">${stats.totalTons} Tun</h2>
                <div class="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                    <p class="text-xs text-gray-200 leading-relaxed font-medium">
                        Celkem jsi zvedl <strong class="text-emerald-300 font-bold">${stats.totalVolumeKg.toLocaleString('cs-CZ')} kg</strong> železa v <strong class="text-white">${stats.totalSetsCount}</strong> sériích!
                    </p>
                    <div class="flex items-center justify-around gap-2 pt-2 border-t border-white/5 font-mono text-[10px]">
                        <div class="text-center">
                            <span class="text-lg block">🐘</span>
                            <span class="text-white font-bold">${stats.elephants}×</span>
                            <span class="text-gray-400 block text-[8px]">dospělý slon</span>
                        </div>
                        <div class="text-center">
                            <span class="text-lg block">🚗</span>
                            <span class="text-white font-bold">${stats.cars}×</span>
                            <span class="text-gray-400 block text-[8px]">osobní auto</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        // Slide 3: King of Exercises & PRs
        `
            <div class="space-y-4 text-center">
                <span class="text-4xl inline-block">👑</span>
                <span class="text-[9px] font-black uppercase text-purple-400 tracking-widest block font-mono">Král Tvého Gymu</span>
                <h2 class="text-xl font-black text-white uppercase tracking-tight truncate">${stats.topExercise.name}</h2>
                <div class="p-5 rounded-3xl bg-purple-500/10 border border-purple-500/25 space-y-2">
                    <p class="text-xs text-gray-300">
                        Tvůj nejoblíbenější cvik! Odcvičil jsi na něm <strong class="text-purple-300 font-bold">${stats.topExercise.sets} sérií</strong>.
                    </p>
                    <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
                        <span class="text-gray-400">Překonaných PR:</span>
                        <span class="text-amber-400 font-black">🔥 ${stats.prsCount} rekordů</span>
                    </div>
                </div>
            </div>
        `,
        // Slide 4: Couple Power & Teamwork
        `
            <div class="space-y-4 text-center">
                <div class="flex justify-center -space-x-3 text-3xl">
                    <span class="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">${myEmoji}</span>
                    <span class="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center">${partnerEmoji}</span>
                </div>
                <span class="text-[9px] font-black uppercase text-pink-400 tracking-widest block font-mono">Týmová Síla</span>
                <h2 class="text-xl font-black text-white uppercase tracking-tight">${myName} & ${partnerName}</h2>
                <div class="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-white/10 space-y-2">
                    <p class="text-xs text-gray-200">
                        Společně jste splnili <strong class="text-amber-300 font-bold">${stats.syncDaysCount} Sync Dní</strong>, kdy jste oba odcvičili v ten samý den! ⚡
                    </p>
                    <p class="text-[10px] text-gray-400 font-mono pt-1">
                        Skvělá motivace a týmový fitness duch! 🚀
                    </p>
                </div>
            </div>
        `
    ];

    const modalHtml = `
        <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
            <div class="glass-card bg-[#2f3136] border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-6 shadow-2xl relative overflow-hidden">
                <!-- Progress Dots -->
                <div class="flex items-center justify-center gap-2">
                    ${slides.map((_, i) => `
                        <span id="wrapped-dot-${i}" class="h-1.5 rounded-full transition-all duration-300 ${i === 0 ? 'w-6 bg-amber-400' : 'w-2 bg-white/20'}"></span>
                    `).join('')}
                </div>

                <!-- Slide Container -->
                <div id="wrapped-slide-content" class="min-h-[260px] flex items-center justify-center transition-all duration-200">
                    ${slides[0]}
                </div>

                <!-- Navigation Controls -->
                <div class="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <button id="wrapped-prev-btn" class="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold text-xs uppercase tracking-wider transition opacity-0 pointer-events-none">
                        Zpět
                    </button>

                    <button id="wrapped-next-btn" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition shadow-md flex items-center gap-1">
                        <span>Další</span> <i class="fas fa-arrow-right text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const slideContentEl = document.getElementById('wrapped-slide-content');
    const prevBtn = document.getElementById('wrapped-prev-btn');
    const nextBtn = document.getElementById('wrapped-next-btn');

    const updateSlide = () => {
        if (!slideContentEl) return;
        slideContentEl.innerHTML = slides[currentSlideIdx];

        // Update dots
        slides.forEach((_, i) => {
            const dot = document.getElementById(`wrapped-dot-${i}`);
            if (dot) {
                if (i === currentSlideIdx) {
                    dot.className = 'h-1.5 rounded-full transition-all duration-300 w-6 bg-amber-400';
                } else {
                    dot.className = 'h-1.5 rounded-full transition-all duration-300 w-2 bg-white/20';
                }
            }
        });

        // Prev btn visibility
        if (currentSlideIdx > 0) {
            prevBtn.className = 'px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-bold text-xs uppercase tracking-wider transition opacity-100 pointer-events-auto';
        } else {
            prevBtn.className = 'px-3 py-2 rounded-xl bg-white/5 text-gray-400 font-bold text-xs uppercase tracking-wider transition opacity-0 pointer-events-none';
        }

        // Next btn text
        if (currentSlideIdx === slides.length - 1) {
            nextBtn.innerHTML = '<span>Zavřít 🎉</span>';
        } else {
            nextBtn.innerHTML = '<span>Další</span> <i class="fas fa-arrow-right text-[10px]"></i>';
        }
    };

    nextBtn?.addEventListener('click', () => {
        triggerHaptic('light');
        if (currentSlideIdx < slides.length - 1) {
            currentSlideIdx++;
            updateSlide();
        } else {
            document.getElementById(modalId)?.remove();
        }
    });

    prevBtn?.addEventListener('click', () => {
        triggerHaptic('light');
        if (currentSlideIdx > 0) {
            currentSlideIdx--;
            updateSlide();
        }
    });
}
