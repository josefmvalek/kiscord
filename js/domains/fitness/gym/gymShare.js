import { state } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal } from '@core/ui.js';
import { getMyName, getMyEmoji } from './shared.js';

// =====================================================================
// WORKOUT SHARE CARD ENGINE (CANVAS 2D API)
// =====================================================================

/**
 * Draws a high-res 1080×1350 vertical PNG card for social / story sharing.
 * @param {object} log 
 * @returns {Promise<Blob>}
 */
export async function createWorkoutShareCanvas(log) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    // 1. Background gradient (Deep Dark Slate with Amber / Purple nebula glow)
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
    bgGrad.addColorStop(0, '#1a1b1e');
    bgGrad.addColorStop(0.5, '#202225');
    bgGrad.addColorStop(1, '#0e0f11');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Glowing subtle spheres
    const radial1 = ctx.createRadialGradient(200, 200, 10, 200, 200, 450);
    radial1.addColorStop(0, 'rgba(250, 166, 26, 0.18)');
    radial1.addColorStop(1, 'transparent');
    ctx.fillStyle = radial1;
    ctx.fillRect(0, 0, 1080, 1350);

    const radial2 = ctx.createRadialGradient(900, 1000, 10, 900, 1000, 500);
    radial2.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
    radial2.addColorStop(1, 'transparent');
    ctx.fillStyle = radial2;
    ctx.fillRect(0, 0, 1080, 1350);

    // Glass Card Container in center
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 60, 60, 960, 1230, 48);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // App Branding Header
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#faa61a';
    ctx.letterSpacing = '4px';
    ctx.fillText('KISCORD FITNESS 🦍', 110, 140);

    const dateStr = new Date(log.logged_at || log.date_key).toLocaleDateString('cs-CZ', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(dateStr.toUpperCase(), 110, 180);

    // Workout Name
    ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    const workoutName = (log.name || 'Trénink').toUpperCase();
    ctx.fillText(workoutName.length > 20 ? workoutName.substring(0, 20) + '…' : workoutName, 110, 270);

    // User & Duration Badge
    const durationMin = Math.round((log.duration_seconds || 0) / 60);
    const userBadgeText = `${getMyEmoji()} ${getMyName()} • ⏱ ${durationMin} min`;
    ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(userBadgeText, 110, 320);

    // Calculate Stats
    let totalVolume = 0;
    let totalCompletedSets = 0;
    let maxWeight = 0;
    (log.exercises || []).forEach(ex => {
        (ex.sets || []).forEach(s => {
            if (s.completed && s.type !== 'W') {
                const w = parseFloat(s.weight) || 0;
                const r = parseInt(s.reps) || 0;
                totalVolume += w * r;
                totalCompletedSets++;
                if (w > maxWeight) maxWeight = w;
            }
        });
    });

    // 3 Metric Stat Cards
    const metricsY = 380;
    const cardW = 280;
    const cardH = 140;

    // Card 1: Volume
    drawMetricBox(ctx, 110, metricsY, cardW, cardH, 'CELKOVÁ TONÁŽ', `${(totalVolume / 1000).toFixed(1)} t`, 'rgba(250, 166, 26, 0.15)', '#faa61a');
    // Card 2: Sets
    drawMetricBox(ctx, 410, metricsY, cardW, cardH, 'SÉRIE', `${totalCompletedSets}`, 'rgba(59, 165, 92, 0.15)', '#3ba55c');
    // Card 3: Max Weight
    drawMetricBox(ctx, 710, metricsY, cardW, cardH, 'MAX VÁHA', `${maxWeight} kg`, 'rgba(168, 85, 247, 0.15)', '#c084fc');

    // Exercise List Section Header
    ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('ODCVIČENÉ CVIKY', 110, 580);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, 600);
    ctx.lineTo(970, 600);
    ctx.stroke();

    // Render up to 5 exercises
    let curY = 660;
    const exercisesToDraw = (log.exercises || []).slice(0, 5);

    exercisesToDraw.forEach((ex, idx) => {
        const completedSets = (ex.sets || []).filter(s => s.completed && s.type !== 'W');
        const bestSet = completedSets.reduce((max, s) => (parseFloat(s.weight) > parseFloat(max.weight) ? s : max), { weight: 0, reps: 0 });

        // Exercise Number Pill
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        drawRoundedRect(ctx, 110, curY - 32, 44, 44, 12);
        ctx.fill();

        ctx.font = '800 22px monospace';
        ctx.fillStyle = '#faa61a';
        ctx.fillText(`${idx + 1}`, 124, curY - 3);

        // Exercise Name
        ctx.font = '800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        const exName = ex.name || ex.exercise_name || 'Cvik';
        ctx.fillText(exName.length > 24 ? exName.substring(0, 24) + '…' : exName, 175, curY - 2);

        // Sets & Reps detail
        ctx.font = '700 26px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        const setsText = `${completedSets.length}× • max ${bestSet.weight}kg × ${bestSet.reps}`;
        ctx.fillText(setsText, 175, curY + 36);

        curY += 105;
    });

    if ((log.exercises || []).length > 5) {
        ctx.font = 'italic 700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(`+ dalších ${(log.exercises || []).length - 5} cviků v záznamu...`, 175, curY - 10);
    }

    // Footer Branding
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('Společně silnější • Kiscord Fitness 👸🦝', 110, 1220);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function drawMetricBox(ctx, x, y, w, h, label, val, bgCol, valCol) {
    ctx.save();
    ctx.fillStyle = bgCol;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, x, y, w, h, 24);
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(label, x + 24, y + 42);

    ctx.font = '900 48px monospace';
    ctx.fillStyle = valCol;
    ctx.fillText(val, x + 24, y + 104);
    ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

/**
 * Opens modal with rendered workout share card & sharing options.
 */
export async function openShareCardModal(logId) {
    triggerHaptic('medium');
    const log = (state.gymLogs || []).find(l => l.id === logId);
    if (!log) {
        showNotification('Záznam nebyl nalezen.', 'warning');
        return;
    }

    const modalId = 'workout-share-modal';
    document.getElementById(modalId)?.remove();

    const loadingHtml = `
        <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div class="glass-card bg-[#2f3136] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-[#faa61a] mx-auto"></div>
                <p class="text-xs text-gray-300 font-bold font-mono">Generuji sdílecí kartu tréninku... 🎨</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);

    try {
        const blob = await createWorkoutShareCanvas(log);
        const imageUrl = URL.createObjectURL(blob);

        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;

        modalEl.innerHTML = `
            <div class="glass-card bg-[#2f3136] border border-white/10 rounded-3xl p-5 max-w-md w-full text-center space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar select-none">
                <div class="flex items-center justify-between">
                    <span class="text-[9px] font-black uppercase text-[#faa61a] tracking-widest font-mono">Exportovat Kārtu</span>
                    <button onclick="document.getElementById('${modalId}').remove()" class="text-gray-400 hover:text-white px-2 py-1">✕</button>
                </div>

                <div class="rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black/40">
                    <img src="${imageUrl}" alt="Workout Share Card" class="w-full h-auto object-cover max-h-[60vh] rounded-2xl">
                </div>

                <div class="flex gap-2 pt-2">
                    <button id="native-share-btn" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
                        <i class="fas fa-share-alt"></i> Sdílet
                    </button>
                    <a href="${imageUrl}" download="kiscord-workout-${log.date_key || 'log'}.png" class="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2">
                        <i class="fas fa-download"></i> Uložit
                    </a>
                </div>
            </div>
        `;

        document.getElementById('native-share-btn')?.addEventListener('click', async () => {
            triggerHaptic('medium');
            const file = new File([blob], `workout-${log.date_key || 'card'}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `${log.name || 'Můj trénink'} • Kiscord Fitness 🦍`,
                        text: `Dnes odcvičeno: ${log.name}! 🏋️‍♂️`,
                        files: [file]
                    });
                    showNotification('Karta byla úspěšně sdílena! 🎉', 'success');
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        showNotification('Sdílení selhalo.', 'warning');
                    }
                }
            } else {
                // Fallback: trigger download
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `kiscord-workout-${log.date_key || 'card'}.png`;
                link.click();
                showNotification('Obrázek stažen do zařízení! 📸', 'success');
            }
        });
    } catch (e) {
        console.error('[GymShare] Failed to generate share card:', e);
        document.getElementById(modalId)?.remove();
        showNotification('Generování karty selhalo.', 'danger');
    }
}
