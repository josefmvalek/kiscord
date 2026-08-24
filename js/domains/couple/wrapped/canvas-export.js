/**
 * Canvas Image Generator & Shareable Stories Card Export
 */

import { getNames } from './analytics.js';
import { triggerHaptic } from '@core/utils.js';

export function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        return;
    }
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

export async function generateWrappedCardImage(stats) {
    const { myName, partnerName } = getNames();
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // Background Gradient (Dark Discord Aesthetic)
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#0f1012');
    bgGrad.addColorStop(0.3, '#1e1b2e');
    bgGrad.addColorStop(0.7, '#131926');
    bgGrad.addColorStop(1, '#090a0f');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Decorative Glow Orbs
    const orb1 = ctx.createRadialGradient(250, 400, 50, 250, 400, 500);
    orb1.addColorStop(0, 'rgba(235, 69, 158, 0.25)');
    orb1.addColorStop(1, 'transparent');
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, 1080, 1920);

    const orb2 = ctx.createRadialGradient(850, 1400, 50, 850, 1400, 600);
    orb2.addColorStop(0, 'rgba(88, 101, 242, 0.25)');
    orb2.addColorStop(1, 'transparent');
    ctx.fillStyle = orb2;
    ctx.fillRect(0, 0, 1080, 1920);

    // Header Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    drawRoundedRect(ctx, 340, 140, 400, 70, 35);
    ctx.fill();

    ctx.font = 'bold 30px monospace, sans-serif';
    ctx.fillStyle = '#faa61a';
    ctx.textAlign = 'center';
    ctx.fillText('💖 KISCORD WRAPPED', 540, 186);

    // Title
    const periodLabel = stats.period === 'month' 
        ? `${stats.monthName.toUpperCase()} ${stats.year}` 
        : stats.period === 'year' ? `ROK ${stats.year}` : 'NÁŠ CELÝ PŘÍBĚH';
    ctx.font = '900 68px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(periodLabel, 540, 290);

    ctx.font = 'bold 38px sans-serif';
    ctx.fillStyle = '#eb459e';
    ctx.fillText(`${myName} & ${partnerName} • ${stats.daysTogether} dní spolu`, 540, 355);

    // Rank Pill
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    drawRoundedRect(ctx, 140, 410, 800, 130, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 24px monospace, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('VZTAHOVÝ STATUS & LEVEL', 540, 455);

    ctx.font = '900 42px sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`${stats.rankTitle} (LVL ${stats.relationshipLevel})`, 540, 510);

    // 5 Metric Cards
    const cards = [
        { icon: '🏋️‍♂️', title: 'NAZVEDÁNO ŽELEZA', val: `${stats.totalTons} Tun`, sub: `${stats.gymWorkoutsCount} tréninků (${stats.elephants}× slon)`, color: '#34d399' },
        { icon: '🍿', title: 'FILMŮ & SERIÁLŮ', val: `${stats.seenMediaCount} Zhlédnuto`, sub: `${stats.mutualMatchesCount} Tinder shod večer`, color: '#c084fc' },
        { icon: '🎟️', title: 'LÁSKYPLNÝ OBCHŮDEK', val: `${stats.redeemedCouponsCount} Voucherů`, sub: `${stats.massageCount}× masáž, ${stats.breakfastCount}× snídaně`, color: '#f472b6' },
        { icon: '🚀', title: 'BUCKET LIST & ZÁŽITKY', val: `${stats.completedBucketCount} Splněno`, sub: `${stats.dateLocationsCount} míst na mapě • ${stats.timelinePhotosCount} fotek`, color: '#fbbf24' },
        { icon: '💧', title: 'HYDRATACE & PÉČE', val: `${stats.totalWaterLiters} L Vody`, sub: `Nálada ${stats.avgMood}/10 • ${stats.totalSleepHours}h spánku`, color: '#38bdf8' }
    ];

    cards.forEach((c, idx) => {
        const y = 570 + (idx * 225);
        ctx.fillStyle = 'rgba(30, 31, 34, 0.75)';
        drawRoundedRect(ctx, 140, y, 800, 195, 32);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '50px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.icon, 180, y + 105);

        ctx.font = 'bold 22px monospace, sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(c.title, 260, y + 65);

        ctx.font = '900 44px sans-serif';
        ctx.fillStyle = c.color;
        ctx.fillText(c.val, 260, y + 120);

        ctx.font = '500 24px sans-serif';
        ctx.fillStyle = '#d1d5db';
        ctx.fillText(c.sub, 260, y + 160);
    });

    // Footer Watermark
    ctx.font = 'bold 22px monospace, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('vygenerováno s ❤️ v aplikaci Kiscord', 540, 1840);

    return canvas;
}

export function downloadCanvasAsPng(canvas, filename = 'kiscord-wrapped.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerHaptic('success');
}

export async function showCardPreviewModal(stats) {
    triggerHaptic('light');
    const existing = document.getElementById('wrapped-card-preview-modal');
    if (existing) existing.remove();

    const canvas = await generateWrappedCardImage(stats);
    const dataUrl = canvas.toDataURL('image/png');

    const modal = document.createElement('div');
    modal.id = 'wrapped-card-preview-modal';
    modal.className = 'fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-[#1e1f22] border border-white/10 rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl flex flex-col items-center animate-scale-in">
            <div class="flex justify-between items-center w-full pb-2 border-b border-white/5">
                <h3 class="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>📸</span> Stories Karta
                </h3>
                <button id="wrapped-close-card-preview-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="relative w-full rounded-2xl overflow-hidden shadow-xl border border-white/10 max-h-[60vh] flex items-center justify-center bg-black/40">
                <img src="${dataUrl}" alt="Kiscord Wrapped Story Card" class="w-full h-auto object-contain max-h-[58vh]">
            </div>

            <div class="flex gap-2 w-full pt-1">
                <button id="wrapped-download-card-btn" class="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-amber-500 hover:opacity-90 text-white font-black text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2">
                    <i class="fas fa-download"></i> <span>Stáhnout PNG</span>
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#wrapped-close-card-preview-btn')?.addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#wrapped-download-card-btn')?.addEventListener('click', () => {
        downloadCanvasAsPng(canvas, `kiscord-wrapped-${stats.period}-${stats.year}.png`);
    });
}

export const showWrappedCardPreviewModal = showCardPreviewModal;


