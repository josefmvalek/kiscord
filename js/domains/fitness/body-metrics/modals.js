import { state, saveStateToCache } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { ACTIVITY_LEVELS, DEFAULT_PROFILES, calculateFullBiometrics } from './biometricsCalculator.js';

/**
 * Opens modal for logging morning weight and optional body fat %.
 */
export function openLogWeightModal(userKey = 'josef') {
    triggerHaptic('light');
    let modal = getOrCreateModalContainer();

    const todayStr = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
        <div class="bg-[#2f3136] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="flex items-center justify-between p-4 border-b border-white/5 bg-[#202225]">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#3ba55c] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-weight-scale"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Zapsat ranní váhu</h3>
                        <p class="text-[10px] text-gray-400">Profil: ${userKey === 'josef' ? 'Josef 🏋️‍♂️' : 'Klárka 🌸'}</p>
                    </div>
                </div>
                <button onclick="window.closeBodyMetricsModal()" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-xs transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form onsubmit="window.submitWeightLog(event, '${userKey}')" class="p-4 space-y-3.5">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Datum vážení</label>
                        <input type="date" id="weight-date" value="${todayStr}" required class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3ba55c]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Váha (kg)</label>
                        <input type="number" id="weight-val" step="0.1" required placeholder="např. 82.5" class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#3ba55c]" />
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Tělesný tuk % (volitelné)</label>
                    <input type="number" id="fat-val" step="0.1" placeholder="např. 14.5" class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#3ba55c]" />
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full py-2.5 bg-[#3ba55c] hover:bg-[#3ba55c]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-[#3ba55c]/20 flex items-center justify-center gap-1.5">
                        <i class="fas fa-save"></i> <span>Uložit váhu</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

/**
 * Opens modal for logging body circumferences (chest, waist, hips, biceps, thighs, calves).
 */
export function openLogCircumferencesModal(userKey = 'josef') {
    triggerHaptic('light');
    let modal = getOrCreateModalContainer();
    const todayStr = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
        <div class="bg-[#2f3136] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="flex items-center justify-between p-4 border-b border-white/5 bg-[#202225]">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-indigo-500/20 text-[#5865F2] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-ruler-combined"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Zapsat tělesné obvody</h3>
                        <p class="text-[10px] text-gray-400">Hodnoty v centimetrech (cm)</p>
                    </div>
                </div>
                <button onclick="window.closeBodyMetricsModal()" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-xs transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form onsubmit="window.submitCircumferencesLog(event, '${userKey}')" class="p-4 space-y-3">
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Datum měření</label>
                    <input type="date" id="circ-date" value="${todayStr}" required class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                </div>

                <div class="grid grid-cols-2 gap-2.5">
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Hrudník (cm)</label>
                        <input type="number" id="circ-chest" step="0.5" placeholder="cm" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Pas / Břicho (cm)</label>
                        <input type="number" id="circ-waist" step="0.5" placeholder="cm" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Boky (cm)</label>
                        <input type="number" id="circ-hips" step="0.5" placeholder="cm" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Biceps (cm)</label>
                        <input type="number" id="circ-biceps" step="0.5" placeholder="cm" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Stehna (cm)</label>
                        <input type="number" id="circ-thighs" step="0.5" placeholder="cm" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Lýtka (cm)</label>
                        <input type="number" id="circ-calves" step="0.5" placeholder="cm" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full py-2.5 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-[#5865F2]/20 flex items-center justify-center gap-1.5">
                        <i class="fas fa-save"></i> <span>Uložit obvody</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

/**
 * Opens modal to configure Personal Biometrics Profile (Age, Height, Activity, Goal, Target Weight).
 */
export function openBiometricsProfileModal(userKey = 'josef') {
    triggerHaptic('light');
    let modal = getOrCreateModalContainer();

    const currentProfile = (state.biometricsProfiles && state.biometricsProfiles[userKey]) || DEFAULT_PROFILES[userKey] || DEFAULT_PROFILES.josef;

    modal.innerHTML = `
        <div class="bg-[#2f3136] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="flex items-center justify-between p-4 border-b border-white/5 bg-[#202225]">
                <div class="flex items-center gap-2">
                    <span class="w-8 h-8 rounded-lg bg-indigo-500/20 text-[#5865F2] flex items-center justify-center text-sm font-bold">
                        <i class="fas fa-user-gear"></i>
                    </span>
                    <div>
                        <h3 class="text-sm font-black text-white uppercase tracking-wider">Osobní Biometrický Profil</h3>
                        <p class="text-[10px] text-gray-400">Přizpůsobení metabolismu & cíle na míru • ${userKey === 'josef' ? 'Josef 🏋️‍♂️' : 'Klárka 🌸'}</p>
                    </div>
                </div>
                <button onclick="window.closeBodyMetricsModal()" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center text-xs transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <form onsubmit="window.saveBiometricsProfile(event, '${userKey}')" class="p-4 space-y-3.5">
                <div class="grid grid-cols-3 gap-2.5">
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Pohlaví</label>
                        <select id="bio-gender" class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#5865F2]">
                            <option value="male" ${currentProfile.gender === 'male' ? 'selected' : ''}>Muž 👨</option>
                            <option value="female" ${currentProfile.gender === 'female' ? 'selected' : ''}>Žena 👩</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Věk (roky)</label>
                        <input type="number" id="bio-age" value="${currentProfile.age || 24}" required class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Výška (cm)</label>
                        <input type="number" id="bio-height" value="${currentProfile.height_cm || 184}" required class="w-full bg-[#202225] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                </div>

                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Denní úroveň aktivity</label>
                    <select id="bio-activity" class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5865F2]">
                        ${ACTIVITY_LEVELS.map(a => `
                            <option value="${a.id}" ${currentProfile.activityLevel === a.id ? 'selected' : ''}>${a.name} (${a.desc})</option>
                        `).join('')}
                    </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cíl stravování</label>
                        <select id="bio-goal" class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#5865F2]">
                            <option value="cut" ${currentProfile.goal === 'cut' ? 'selected' : ''}>✂️ Rýsování (-20%)</option>
                            <option value="maintain" ${currentProfile.goal === 'maintain' ? 'selected' : ''}>⚖️ Udržování (0%)</option>
                            <option value="bulk" ${currentProfile.goal === 'bulk' ? 'selected' : ''}>🏋️‍♂️ Objem (+12%)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Cílová váha (kg)</label>
                        <input type="number" id="bio-target-weight" step="0.5" value="${currentProfile.targetWeight_kg || 80}" required class="w-full bg-[#202225] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#5865F2]" />
                    </div>
                </div>

                <div class="pt-2">
                    <button type="submit" class="w-full py-2.5 bg-[#5865F2] hover:bg-[#5865F2]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-md shadow-[#5865F2]/20 flex items-center justify-center gap-1.5">
                        <i class="fas fa-check"></i> <span>Uložit profil</span>
                    </button>
                </div>
            </form>
        </div>
    `;
    modal.style.display = 'flex';
}

function getOrCreateModalContainer() {
    let modal = document.getElementById('body-metrics-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'body-metrics-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity';
        document.body.appendChild(modal);
    }
    return modal;
}

// Global Event Bindings
window.closeBodyMetricsModal = () => {
    const modal = document.getElementById('body-metrics-modal');
    if (modal) modal.style.display = 'none';
};

window.submitWeightLog = async (e, userKey) => {
    e.preventDefault();
    triggerHaptic('medium');

    const dateStr = document.getElementById('weight-date')?.value || new Date().toISOString().split('T')[0];
    const weightVal = Number(document.getElementById('weight-val')?.value);
    const fatVal = document.getElementById('fat-val')?.value ? Number(document.getElementById('fat-val').value) : null;

    if (!weightVal) return;

    const targetUserId = (userKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;

    const newMeasurement = {
        id: 'bm_' + Date.now(),
        user_id: targetUserId || state.currentUser?.id,
        user_name: userKey,
        date_key: dateStr,
        weight: weightVal,
        body_fat: fatVal,
        created_at: new Date().toISOString()
    };

    if (!state.gymBodyMeasurements) state.gymBodyMeasurements = [];
    state.gymBodyMeasurements.push(newMeasurement);

    saveStateToCache();
    window.closeBodyMetricsModal();
    showNotification(`Váha ${weightVal} kg byla úspěšně zapsána! ⚖️✨`, 'success');

    import('./index.js').then(m => m.renderBodyMetrics()).catch(() => {});

    try {
        await supabase.from('gym_body_measurements').insert([newMeasurement]);
    } catch (err) {
        console.warn('[BodyMetrics] Sync weight error:', err);
    }
};

window.submitCircumferencesLog = async (e, userKey) => {
    e.preventDefault();
    triggerHaptic('medium');

    const dateStr = document.getElementById('circ-date')?.value || new Date().toISOString().split('T')[0];
    const targetUserId = (userKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;

    const newCirc = {
        id: 'circ_' + Date.now(),
        user_id: targetUserId || state.currentUser?.id,
        user_name: userKey,
        date_key: dateStr,
        chest: Number(document.getElementById('circ-chest')?.value) || null,
        waist: Number(document.getElementById('circ-waist')?.value) || null,
        hips: Number(document.getElementById('circ-hips')?.value) || null,
        biceps: Number(document.getElementById('circ-biceps')?.value) || null,
        thighs: Number(document.getElementById('circ-thighs')?.value) || null,
        calves: Number(document.getElementById('circ-calves')?.value) || null,
        created_at: new Date().toISOString()
    };

    if (!state.gymBodyMeasurements) state.gymBodyMeasurements = [];
    state.gymBodyMeasurements.push(newCirc);

    saveStateToCache();
    window.closeBodyMetricsModal();
    showNotification('Tělesné obvody byly uloženy! 📐✨', 'success');

    import('./index.js').then(m => m.renderBodyMetrics()).catch(() => {});

    try {
        await supabase.from('gym_body_measurements').insert([newCirc]);
    } catch (err) {
        console.warn('[BodyMetrics] Sync circumferences error:', err);
    }
};

window.saveBiometricsProfile = (e, userKey) => {
    e.preventDefault();
    triggerHaptic('success');

    const updatedProfile = {
        userKey,
        gender: document.getElementById('bio-gender')?.value || 'male',
        age: Number(document.getElementById('bio-age')?.value) || 24,
        height_cm: Number(document.getElementById('bio-height')?.value) || 184,
        activityLevel: document.getElementById('bio-activity')?.value || 'moderate',
        goal: document.getElementById('bio-goal')?.value || 'maintain',
        targetWeight_kg: Number(document.getElementById('bio-target-weight')?.value) || 80
    };

    if (!state.biometricsProfiles) state.biometricsProfiles = {};
    state.biometricsProfiles[userKey] = updatedProfile;

    saveStateToCache();
    window.closeBodyMetricsModal();
    showNotification('Biometrický profil byl aktualizován! 🧠🎯', 'success');

    import('./index.js').then(m => m.renderBodyMetrics()).catch(() => {});
};

export function applyBiometricsToNutrition(userKey) {
    triggerHaptic('success');

    const profile = (state.biometricsProfiles && state.biometricsProfiles[userKey]) || DEFAULT_PROFILES[userKey] || DEFAULT_PROFILES.josef;
    const measurements = (state.gymBodyMeasurements || []).filter(m => {
        const targetUserId = (userKey === 'josef') ? state.user_ids?.jose : state.user_ids?.klarka;
        return (!m.user_id || m.user_id === targetUserId) && m.weight;
    });
    const currentWeight = measurements.length > 0 ? measurements[measurements.length - 1].weight : (userKey === 'josef' ? 82 : 62);
    const currentFat = measurements.length > 0 ? measurements[measurements.length - 1].body_fat : null;

    const bio = calculateFullBiometrics(profile, currentWeight, currentFat);

    if (!state.nutritionTargets) state.nutritionTargets = {};
    state.nutritionTargets[userKey] = {
        calories: bio.targetCalories,
        protein: bio.macros.protein,
        carbs: bio.macros.carbs,
        fats: bio.macros.fats,
        fiber: bio.macros.fiber
    };

    saveStateToCache();
    showNotification(`Makra byla synchronizována do #výživa (${bio.targetCalories} kcal, ${bio.macros.protein}g protein)! 🥗🚀`, 'success');
}

window.applyBiometricsToNutrition = applyBiometricsToNutrition;

