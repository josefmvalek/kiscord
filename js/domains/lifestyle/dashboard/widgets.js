import { state } from '@core/state.js';
import { getTodayKey } from '@core/utils.js';
import { AUSTRIAN_DICTIONARY } from '@domains/archive/austrian-german.js';

export function generateStaticStars(count = 50) {
    let particles = "";
    for (let i = 0; i < count; i++) {
        const size = Math.random() * 2 + 0.5;
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 5;

        const colors = ['#ffffff', '#f8fafc', '#fff7ed', '#e0f2fe'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particles += `<div class="particle-star" style="
            width: ${size}px; 
            height: ${size}px; 
            left: ${left}%; 
            top: ${top}%; 
            --duration: ${duration}s; 
            --delay: ${delay}s; 
            background: ${color};
        "></div>`;
    }
    return particles;
}

export function getDailyFactSeed() {
    const dateStr = getTodayKey();
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export function generateFactOfTheDay() {
    const allFacts = [];
    const catMap = {
        raccoon: '🦝', owl: '🦉', octopus: '🐙', fun: '✨', penis: '🍌'
    };
    Object.entries(catMap).forEach(([catId, icon]) => {
        const facts = state.factsLibrary?.[catId] || [];
        facts.forEach(f => allFacts.push({ ...f, _catId: catId, _catIcon: icon }));
    });

    if (allFacts.length === 0) return '';

    const seed = getDailyFactSeed();
    const fact = allFacts[seed % allFacts.length];

    const isFav = state.factFavorites?.some(id => String(id) === String(fact.id));
    const heartClass = isFav ? 'text-[#eb459e]' : 'text-gray-500 hover:text-[#eb459e]';
    const heartIcon = isFav ? 'fas' : 'far';

    return `
        <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-xl border border-white/5 p-5 relative group overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#5865F2] to-[#eb459e]"></div>
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                    <i class="fas fa-lightbulb text-[#faa61a]"></i> Dnešní moudrost
                </h3>
                <div class="flex items-center gap-2">
                    <button onclick="window.loadModule('funfacts').then(m => { window.switchChannel('funfacts'); })"
                            class="text-[10px] text-gray-500 hover:text-[#5865F2] transition font-bold uppercase tracking-widest flex items-center gap-1">
                        více <i class="fas fa-chevron-right text-[8px]"></i>
                    </button>
                    <button id="fotd-heart-btn"
                            onclick="window.loadModule('funfacts').then(m => m.toggleFactFavorite('${fact.id}', '${fact._catId}', '${fact.subcategory || ''}', '${fact.subcategory_level2 || ''}')).then(() => window.loadModule('dashboard').then(d => d.refreshFactOfTheDayHeart('${fact.id}')))"
                            class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-all hover:bg-white/10 active:scale-90">
                        <i class="${heartIcon} fa-heart ${heartClass} transition-colors"></i>
                    </button>
                </div>
            </div>
            <div class="flex items-start gap-4">
                <div class="text-3xl bg-[#202225] p-2.5 rounded-xl flex-shrink-0 border border-white/5">${fact.icon || fact._catIcon}</div>
                <p class="text-gray-200 text-sm font-medium leading-relaxed flex-1">${fact.text}</p>
            </div>
        </div>
    `;
}

export function refreshFactOfTheDayHeart(factId) {
    const btn = document.getElementById('fotd-heart-btn');
    if (!btn) return;
    const isFav = state.factFavorites?.some(id => String(id) === String(factId));
    btn.querySelector('i').className = `${isFav ? 'fas' : 'far'} fa-heart ${isFav ? 'text-[#eb459e]' : 'text-gray-500 hover:text-[#eb459e]'
        } transition-colors`;
}

export function generateAustriaCountdownWidget() {
    const departureDate = new Date('2026-05-31T00:00:00');
    const returnDate = new Date('2026-08-31T23:59:59');
    const now = new Date();
    const diffMs = departureDate - now;

    if (diffMs > 0) {
        return `
            <div class="flex items-center bg-white/10 backdrop-blur-md rounded-full px-3 py-1 border border-white/10 shadow-lg text-white w-fit mt-2 select-none">
                <span class="text-xs mr-1.5 animate-bounce-subtle">🇦🇹</span>
                <div class="flex items-center gap-0.5 text-xs font-black tracking-wide">
                    <span id="countdown-days" class="text-amber-400 tabular-nums">--</span><span class="text-white/60 font-medium mr-1">d</span>
                    <span id="countdown-hours" class="tabular-nums">--</span><span class="text-white/60 font-medium mr-1">h</span>
                    <span id="countdown-minutes" class="tabular-nums">--</span><span class="text-white/60 font-medium mr-1">m</span>
                    <span id="countdown-seconds" class="text-pink-400 tabular-nums">--</span><span class="text-white/60 font-medium">s</span>
                </div>
                <svg viewBox="0 0 120 20" class="w-20 h-4 overflow-visible ml-1.5 select-none">
                    <path id="gondola-path" d="M 5,12 C 40,12 80,9 105,6" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="3, 2" />
                    <g transform="translate(108, 2)">
                        <text class="text-[10px] filter drop-shadow-[0_0_3px_rgba(52,211,153,0.4)] animate-bounce-slow">🏡</text>
                    </g>
                    <g id="gondola-group" class="transition-all duration-1000 ease-out cursor-pointer" onclick="window.clickGondola()">
                        <text id="gondola-lift" class="text-[10px] filter drop-shadow-[0_0_4px_rgba(235,69,158,0.6)] animate-gondola-sway" style="dominant-baseline: middle; text-anchor: middle; transform-origin: 0px -4px;">🚡</text>
                    </g>
                </svg>
            </div>
        `;
    } else {
        const totalMs = returnDate - departureDate;
        const elapsedMs = now - departureDate;
        const dayDiff = Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1;
        const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));

        if (dayDiff <= totalDays) {
            const pct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
            return `
                <div class="flex items-center bg-white/10 backdrop-blur-md rounded-full px-3 py-1 border border-white/10 shadow-lg text-white w-fit mt-2 select-none text-xs">
                    <span class="text-xs mr-1.5 animate-bounce-subtle">🇦🇹</span>
                    <span class="font-bold text-white/90 mr-2">${dayDiff}. den z ${totalDays} v Alpách</span>
                    <div class="w-16 h-2 bg-[#202225] rounded-full overflow-hidden border border-white/10 relative p-[1px] mr-1.5">
                        <div class="h-full rounded-full bg-gradient-to-r from-[#5865F2] via-[#eb459e] to-[#faa61a]" style="width: ${pct}%"></div>
                    </div>
                    <span class="text-[10px] font-bold text-[#eb459e]">${pct}%</span>
                </div>
            `;
        } else {
            return `
                <div class="flex items-center bg-emerald-950/40 backdrop-blur-md rounded-full px-3 py-1 border border-white/10 shadow-lg text-white w-fit mt-2 select-none text-xs">
                    <span class="text-xs mr-1.5 animate-bounce-subtle">❤️</span>
                    <span class="font-bold text-white/90">Vzpomínky na ${totalDays} dní v Rakousku 🇦🇹</span>
                    <i class="fas fa-check-circle text-emerald-400 text-[10px] ml-2 animate-pulse"></i>
                </div>
            `;
        }
    }
}

export function getShiftActiveStatus(shift) {
    if (!shift || shift.shift_type === 'volno') {
        return { active: false, label: 'Volno 🌴', color: 'text-emerald-400 font-bold' };
    }

    let start = '';
    let end = '';

    if (shift.shift_type === 'ranni') {
        start = '06:00';
        end = '14:00';
    } else if (shift.shift_type === 'odpoledni') {
        start = '14:00';
        end = '22:00';
    } else if (shift.shift_type === 'custom') {
        start = shift.time_start || '';
        end = shift.time_end || '';
    }

    if (!start || !end) return { active: false, label: 'Makat ⚙️', color: 'text-blue-450 font-bold' };

    const now = new Date();
    const todayStr = getTodayKey();
    const startDt = new Date(`${todayStr}T${start}:00`);
    const endDt = new Date(`${todayStr}T${end}:00`);

    if (now >= startDt && now <= endDt) {
        const diffMs = endDt - now;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;

        const timeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        return {
            active: true,
            label: `V práci 🛠️`,
            subLabel: `padla za ${timeLeft} (${end})`,
            color: 'text-amber-400 font-black animate-pulse'
        };
    } else if (now < startDt) {
        return { active: false, label: `Začíná v ${start} ⏳`, color: 'text-purple-300 font-semibold' };
    } else {
        return { active: false, label: 'Padla! 🎉', color: 'text-emerald-450 font-bold' };
    }
}

export function getDailyVocab() {
    if (!AUSTRIAN_DICTIONARY || AUSTRIAN_DICTIONARY.length === 0) return null;
    const seed = getDailyFactSeed();
    return AUSTRIAN_DICTIONARY[seed % AUSTRIAN_DICTIONARY.length];
}

export function getDashboardAnimClass() {
    const container = document.getElementById("messages-container");
    const isFirstNav = !container || container.innerHTML.trim() === "";
    return isFirstNav ? "stagger-item" : "opacity-100 animate-fade-in";
}

export function generateAlpskaHlidkaWidget() {
    const todayKey = getTodayKey();
    
    const departureDate = new Date('2026-05-31T00:00:00');
    const returnDate = new Date('2026-08-31T23:59:59');
    const now = new Date();
    
    const totalMs = returnDate - departureDate;
    const elapsedMs = now - departureDate;
    const dayDiff = Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1;
    const totalDays = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
    const pct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
    const isTripStarted = dayDiff >= 1;
    const isTripEnded = dayDiff > totalDays;
    
    let headerText = "";
    let progressHtml = "";
    
    if (!isTripStarted) {
        headerText = "🏔️ Alpská Hlídka — Přípravy Vrcholí! ⏳";
        progressHtml = `
            <div class="text-[10px] text-purple-200/60 font-semibold mb-1">Do odjezdu zbývá jen chvíle! Vyjíždíme 31. května.</div>
            <div class="w-full bg-[#202225] h-2 rounded-full overflow-hidden border border-white/5 relative p-[1px]">
                <div class="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style="width: 0%"></div>
            </div>
        `;
    } else if (isTripEnded) {
        headerText = "🏔️ Alpská Hlídka — Vítejte Doma! 🏆";
        progressHtml = `
            <div class="text-[10px] text-emerald-400 font-bold mb-1">Zvládli jsme celých ${totalDays} dní v Rakousku! 🇦🇹❤️</div>
            <div class="w-full bg-[#202225] h-2 rounded-full overflow-hidden border border-white/5 relative p-[1px]">
                <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style="width: 100%"></div>
            </div>
        `;
    } else {
        headerText = `🏔️ Alpská Hlídka — Den ${dayDiff} z ${totalDays}`;
        progressHtml = `
            <div class="flex justify-between items-center text-[9px] font-bold text-gray-400 mb-1">
                <span>Průběh pobytu</span>
                <span class="text-[#eb459e]">${pct}% v Alpách</span>
            </div>
            <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5 relative p-[1px]">
                <div class="h-full rounded-full bg-gradient-to-r from-[#5865F2] via-[#eb459e] to-[#faa61a]" style="width: ${pct}%"></div>
            </div>
        `;
    }

    const challengeRecord = state.brigadeChallenges?.find(c => c.date_key === todayKey) || {};
    const challengeRevealed = localStorage.getItem(`kiscord_revealed_challenge_${todayKey}`) === 'true';
    const challengeCompletedJose = challengeRecord.completed_by_jose || false;
    const challengeCompletedKlarka = challengeRecord.completed_by_klarka || false;

    const diaryJose = state.brigadeDiary?.find(e => e.date_key === todayKey && e.user_id === state.user_ids?.jose);
    const diaryKlarka = state.brigadeDiary?.find(e => e.date_key === todayKey && e.user_id === state.user_ids?.klarka);
    const diaryCompletedJose = !!diaryJose;
    const diaryCompletedKlarka = !!diaryKlarka;

    const shiftsToday = state.shifts?.[todayKey] || {};
    const joseShift = shiftsToday.jose;
    const klarkaShift = shiftsToday.klarka;

    let myEarnings = 0;
    let myExpenses = 0;
    const myId = state.currentUser?.id;
    (state.brigadeFinances || []).forEach(item => {
        if (item.user_id === myId) {
            const val = parseFloat(item.amount) || 0;
            if (item.type === 'earning') {
                myEarnings += val;
            } else {
                myExpenses += val;
            }
        }
    });
    const balance = myEarnings - myExpenses;
    const savingsGoalKey = `kiscord_savings_goal_${myId || 'default'}`;
    const savingsGoal = parseFloat(localStorage.getItem(savingsGoalKey) || '2000');
    const goalPercentage = savingsGoal > 0 ? Math.min(Math.round((balance / savingsGoal) * 100), 100) : 0;

    const getShiftBadge = (shift) => {
        if (!shift) return '<span class="text-white/30 text-[10px]">Nezadána 😴</span>';
        if (shift.shift_type === 'volno') return '<span class="text-emerald-450 font-black text-[10px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">🌴 Volno</span>';
        if (shift.shift_type === 'ranni') return '<span class="text-amber-400 font-black text-[10px] uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">🌅 Ranní</span>';
        if (shift.shift_type === 'odpoledni') return '<span class="text-indigo-400 font-black text-[10px] uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md"><ctrl42> Odpol.</span>';
        return '<span class="text-blue-400 font-black text-[10px] uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">⚙️ Vlastní</span>';
    };

    return `
        <div class="glass-card bg-gradient-to-b from-slate-900/60 to-slate-950/60 border border-white/5 rounded-3xl p-6 ${getDashboardAnimClass()} shadow-2xl relative overflow-hidden" style="animation-delay: 0.25s">
            <div class="absolute -right-16 -top-16 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -left-16 -bottom-16 w-36 h-36 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <div class="border-b border-white/5 pb-4 mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <span class="text-lg">🏔️</span>
                    <h3 class="text-xs font-black text-white uppercase tracking-wider leading-none">${headerText}</h3>
                </div>
                ${progressHtml}
            </div>

            <div class="grid grid-cols-2 gap-4 border-b border-white/5 pb-4 mb-4">
                <div class="bg-black/25 p-3.5 rounded-2xl border border-white/5 flex flex-col gap-2.5">
                    <div class="flex items-center gap-1.5 pb-1 border-b border-white/5">
                        <span class="text-xs">🔵</span>
                        <span class="text-[9px] font-black uppercase tracking-wider text-white/80">Jožka</span>
                    </div>
                    
                    <div class="flex items-center justify-between text-xs font-semibold gap-1">
                        <span class="text-white/40 text-[9px] font-bold uppercase tracking-tight">Výzva:</span>
                        <span>
                            ${!challengeRevealed && isTripStarted
                                ? '<span class="text-purple-300 font-black uppercase text-[9px] tracking-wider animate-pulse">Uzamčeno 🔒</span>'
                                : (challengeCompletedJose ? '<span class="text-emerald-450 font-black text-[9px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">Splněno ✅</span>' : '<span class="text-white/30 text-[9px] font-black uppercase tracking-wider">Čeká ⏳</span>')
                            }
                        </span>
                    </div>

                    <div class="flex items-center justify-between text-xs font-semibold gap-1">
                        <span class="text-white/40 text-[9px] font-bold uppercase tracking-tight">Deník:</span>
                        <span>
                            ${diaryCompletedJose 
                                ? '<span class="text-pink-400 font-black text-[9px] uppercase tracking-wider bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-md">Zapsáno 📔</span>' 
                                : '<span class="text-white/30 text-[9px] font-black uppercase tracking-wider animate-pulse">Čeká ✍️</span>'
                            }
                        </span>
                    </div>

                    <div class="flex items-center justify-between text-xs font-semibold gap-1">
                        <span class="text-white/40 text-[9px] font-bold uppercase tracking-tight">Směna:</span>
                        <span class="text-[11px] font-bold">${getShiftBadge(joseShift)}</span>
                    </div>
                </div>

                <div class="bg-black/25 p-3.5 rounded-2xl border border-white/5 flex flex-col gap-2.5">
                    <div class="flex items-center gap-1.5 pb-1 border-b border-white/5">
                        <span class="text-xs">🔴</span>
                        <span class="text-[9px] font-black uppercase tracking-wider text-white/80">Klárka</span>
                    </div>

                    <div class="flex items-center justify-between text-xs font-semibold gap-1">
                        <span class="text-white/40 text-[9px] font-bold uppercase tracking-tight">Výzva:</span>
                        <span>
                            ${!challengeRevealed && isTripStarted
                                ? '<span class="text-purple-300 font-black uppercase text-[9px] tracking-wider animate-pulse">Uzamčeno 🔒</span>'
                                : (challengeCompletedKlarka ? '<span class="text-emerald-450 font-black text-[9px] uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">Splněno ✅</span>' : '<span class="text-white/30 text-[9px] font-black uppercase tracking-wider">Čeká ⏳</span>')
                            }
                        </span>
                    </div>

                    <div class="flex items-center justify-between text-xs font-semibold gap-1">
                        <span class="text-white/40 text-[9px] font-bold uppercase tracking-tight">Deník:</span>
                        <span>
                            ${diaryCompletedKlarka 
                                ? '<span class="text-pink-400 font-black text-[9px] uppercase tracking-wider bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-md">Zapsáno 📔</span>' 
                                : '<span class="text-white/30 text-[9px] font-black uppercase tracking-wider animate-pulse">Čeká ✍️</span>'
                            }
                        </span>
                    </div>

                    <div class="flex items-center justify-between text-xs font-semibold gap-1">
                        <span class="text-white/40 text-[9px] font-bold uppercase tracking-tight">Směna:</span>
                        <span class="text-[11px] font-bold">${getShiftBadge(klarkaShift)}</span>
                    </div>
                </div>
            </div>

            <div class="bg-black/20 p-4 rounded-2xl border border-white/5 mb-4">
                <div class="flex justify-between items-end mb-2">
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-0.5">Moje Finance</span>
                        <h4 class="text-xs font-black text-white uppercase tracking-wider">💶 Vydělané Money</h4>
                    </div>
                    <span class="text-xs font-black text-emerald-400">${balance.toFixed(2)} € / ${savingsGoal.toFixed(0)} €</span>
                </div>
                <div class="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 relative p-[1px] mb-1">
                    <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 transition-all duration-1000 ease-out" 
                         style="width: ${goalPercentage}%"></div>
                </div>
                <div class="flex justify-between items-center text-[9px] text-gray-500 font-bold px-1">
                    <span>Pokrok k osobnímu cíli</span>
                    <span>${goalPercentage}% splněno</span>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-2">
                <button onclick="window.switchChannel('alpska-vyzva')" 
                        class="py-2.5 px-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow active:scale-95">
                    Výzvy 🏔️
                </button>
                <button onclick="window.switchChannel('alpsky-denicek')" 
                        class="py-2.5 px-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow active:scale-95">
                    Deník 📔
                </button>
                <button onclick="window.switchChannel('kasicka')" 
                        class="py-2.5 px-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow active:scale-95">
                    Kasička 💶
                </button>
            </div>
        </div>
    `;
}

export function generateAustrianWordOfTheDayCard() {
    if (!AUSTRIAN_DICTIONARY || AUSTRIAN_DICTIONARY.length === 0) return '';

    const vocab = getDailyVocab();
    if (!vocab) return '';

    return `
        <div class="glass-card rounded-2xl p-6 ${getDashboardAnimClass()} relative overflow-hidden group select-none" style="animation-delay: 0.32s">
            <div class="absolute -right-10 -top-10 w-24 h-24 bg-[#eb459e]/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div class="flex justify-between items-start mb-4 relative z-10">
                <h3 class="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 leading-none">
                    <i class="fas fa-utensils text-[#eb459e]"></i> Rakouské Slovíčko Dne
                </h3>
                <button onclick="window.switchChannel('austrian-german')" 
                        class="text-[10px] text-gray-500 hover:text-[#eb459e] transition font-bold uppercase tracking-widest flex items-center gap-1">
                    slovníček <i class="fas fa-chevron-right text-[8px]"></i>
                </button>
            </div>
            
            <div class="flex flex-col gap-3 relative z-10">
                <div class="flex justify-between items-center">
                    <span class="text-2xl font-black text-amber-400 tracking-tight italic">
                        "${vocab.austrian}"
                    </span>
                    <span class="text-[9px] font-black uppercase tracking-widest text-[#eb459e] bg-[#eb459e]/10 px-2 py-0.5 rounded-full">
                        ${vocab.category}
                    </span>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mt-2 border-t border-white/5 pt-3">
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">Spisovná němčina</span>
                        <span class="text-xs font-bold text-white/80">${vocab.german}</span>
                    </div>
                    <div>
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">Český překlad</span>
                        <span class="text-xs font-black text-white/90">${vocab.czech}</span>
                    </div>
                </div>
                
                ${vocab.example ? `
                    <div class="bg-black/20 p-3 rounded-xl border border-white/5 mt-2">
                        <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">Příklad použití</span>
                        <span class="text-[10.5px] font-semibold italic text-purple-200/90 leading-relaxed block">"${vocab.example}"</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

export { generateDailyQuestionCard } from './daily-question-widget.js';

