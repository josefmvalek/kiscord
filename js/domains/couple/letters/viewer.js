import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { showNotification, showConfirmDialog } from '@core/theme.js';
import { playArcade } from '@core/sound.js';

export function renderInbox(letters) {
    if (letters.length === 0) {
        return `<div class="flex flex-col items-center justify-center p-16 text-center opacity-40">
            <div class="text-6xl mb-4">📭</div>
            <p class="font-bold text-xs uppercase tracking-widest text-gray-500">Zatím žádné dopisy</p>
        </div>`;
    }

    const now = new Date();
    return `<div class="grid gap-2">
        ${letters.map(l => {
        const unlockDate = new Date(l.unlock_at);
        const isUnlocked = unlockDate <= now;
        const isMe = l.sender_id === state.currentUser.id;
        const senderName = isMe ? 'Ty' : (state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka');
        const fromLabel = isMe ? 'OD TEBE' : `OD ${senderName === 'Klárka' ? 'KLÁRKY' : 'JOŽKY'}`;

        return `
            <div class="bg-[#2f3136] hover:bg-[#34373c] transition-all duration-200 rounded-lg p-3 cursor-pointer border-l-2 ${isUnlocked && !l.is_read ? 'border-[#eb459e]' : 'border-transparent'} group relative flex items-center gap-4" 
                 onclick="${isUnlocked ? `window.loadModule('letters').then(m => m.openLetter('${l.id}'))` : ''}">
                
                <!-- Status Icon with Dot -->
                <div class="relative shrink-0 w-12 h-12 bg-[#202225] rounded-full flex items-center justify-center text-2xl">
                    ${isUnlocked ? (l.is_read ? '✉️' : '📩') : '🔒'}
                    ${isUnlocked && !l.is_read ? `<div class="absolute -top-1 -right-1 w-4 h-4 bg-[#eb459e] border-4 border-[#2f3136] rounded-full animate-pulse shadow-[0_0_8px_#eb459e]"></div>` : ''}
                </div>
                
                <div class="flex-1 min-w-0">
                    <!-- Row 1: Sender & Date -->
                    <div class="flex items-center justify-between mb-0.5">
                        <span class="text-[11px] font-bold ${isUnlocked && !l.is_read ? 'text-[#eb459e]' : 'text-gray-400'} uppercase tracking-wider">${fromLabel}</span>
                        <span class="text-[10px] text-gray-500 font-medium">${formatLetterDate(new Date(l.created_at))}</span>
                    </div>
                    
                    <!-- Row 2: Title -->
                    <div class="flex items-center gap-2 mb-0.5">
                        <h3 class="font-bold text-[14px] ${isUnlocked && !l.is_read ? 'text-white' : 'text-gray-200'} truncate">
                            ${l.title || 'Dopis bez názvu'}
                        </h3>
                        ${l.image_url ? '<i class="fas fa-paperclip text-[10px] text-gray-600"></i>' : ''}
                    </div>
                    
                    <!-- Row 3: Snippet -->
                    <div class="text-[12px] text-gray-500 line-clamp-1 leading-snug">
                        ${isUnlocked ? l.content : `<span class="italic text-gray-600 flex items-center gap-1"><i class="fas fa-lock text-[9px]"></i> Odemkne se ${unlockDate.toLocaleString('cs-CZ')}</span>`}
                    </div>
                </div>

                <!-- Unread Indicator (Discord style end-alignment) -->
                ${isUnlocked && !l.is_read ? `
                <div class="shrink-0 flex items-center px-2">
                    <div class="w-2 h-2 bg-[#eb459e] rounded-full shadow-[0_0_6px_#eb459e]"></div>
                </div>
                ` : ''}
            </div>`;
    }).join('')}
    </div>`;
}


export function renderSent(letters) {
    if (letters.length === 0) {
        return `<div class="flex flex-col items-center justify-center p-16 text-center opacity-40">
            <div class="text-6xl mb-4">✍️</div>
            <p class="font-bold text-xs uppercase tracking-widest text-gray-500">Zatím jsi nic nenapsal/a</p>
        </div>`;
    }

    const now = new Date();
    return `<div class="grid gap-2">
        ${letters.map(l => {
        const unlockDate = new Date(l.unlock_at);
        const isUnlocked = unlockDate <= now;

        return `
            <div class="bg-[#2f3136] hover:bg-[#34373c] transition-all duration-200 rounded-lg p-3 cursor-pointer border border-white/5 flex items-center gap-4" 
                 onclick="window.loadModule('letters').then(m => m.openLetter('${l.id}'))">
                
                <div class="shrink-0 w-12 h-12 bg-[#202225] rounded-full flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    📬
                </div>
                
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between mb-0.5">
                        <span class="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ty • ${formatLetterDate(new Date(l.created_at))}</span>
                    </div>
                    
                    <div class="flex items-center gap-2 mb-0.5">
                        <h3 class="font-bold text-[14px] text-gray-200 truncate">
                            ${l.title || 'Dopis bez názvu'}
                        </h3>
                        ${l.image_url ? '<i class="fas fa-paperclip text-[10px] text-gray-500"></i>' : ''}
                    </div>
                    
                    <div class="text-[12px] text-gray-500 line-clamp-1 leading-snug">
                        ${l.content}
                    </div>
                </div>
            </div>`;
    }).join('')}
    </div>`;
}

/**
 * Premium Date Formatter: "Dnes v 18:00", "Včera v 10:00", or "10. 4. 2026"
 */
function formatLetterDate(date) {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Dnes v ${time}`;
    if (isYesterday) return `Včera v ${time}`;

    return date.toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}


export async function openLetter(id) {
    const { data: letter } = await supabase.from('love_letters').select('*').eq('id', id).maybeSingle();
    if (!letter) return;

    const isMe = letter.sender_id === state.currentUser.id;
    const senderName = !isMe ? (state.currentUser.name === 'Jožka' ? 'Klárka' : 'Jožka') : 'Ty';
    const signature = isMe ? (state.currentUser.name === 'Jožka' ? 'Jožka' : 'Klárka') : senderName;

    // Mark as read only if receiver is opening it
    if (!letter.is_read && !isMe) {
        await supabase.from('love_letters').update({ is_read: true }).eq('id', id);
    }

    const container = document.getElementById("messages-container");
    container.innerHTML = `
    <div class="flex flex-col h-full bg-[#1a1b1e] animate-fade-in overflow-hidden font-main">
        <!-- Header -->
        <div class="px-6 py-4 bg-[#36393f] border-b border-white/5 z-10 shrink-0 flex items-center justify-between shadow-lg">
            <div class="flex items-center gap-4">
                <button onclick="window.loadModule('letters').then(m => m.renderLetters())"
                    class="w-10 h-10 rounded-xl bg-[#202225] hover:bg-[#40444b] text-gray-400 hover:text-white transition flex items-center justify-center">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div>
                    <h1 class="text-sm font-bold text-white tracking-tight">${letter.title || 'Dopis'}</h1>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-0.5">
                        od ${senderName === 'Ty' ? 'Tebe' : (senderName === 'Klárka' ? 'Klárky' : 'Jožky')} • ${formatLetterDate(new Date(letter.created_at))}
                    </p>
                </div>
            </div>
            <button onclick="window.loadModule('letters').then(m => m.deleteLetter('${letter.id}', true))"
                class="w-10 h-10 rounded-xl hover:bg-red-500/10 text-gray-600 hover:text-red-500 transition flex items-center justify-center">
                <i class="fas fa-trash-alt text-sm"></i>
            </button>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar scroll-smooth">
            <div class="max-w-2xl mx-auto">
                <div class="bg-[#2f3136] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div class="px-6 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <p class="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                             Vzkaz od ${senderName === 'Ty' ? 'Tebe' : (senderName === 'Klárka' ? 'Klárky' : 'Jožky')}
                        </p>
                        ${letter.is_read ? '<span class="text-[9px] text-gray-600 font-bold uppercase tracking-widest flex items-center gap-1"><i class="fas fa-check-double text-[#43b581]"></i> Přečteno</span>' : ''}
                    </div>

                    <div class="p-8 pb-10">
                        ${letter.image_url ? `
                        <div class="mb-8 relative group/img rounded-xl overflow-hidden bg-black/20 border border-white/5 shadow-lg cursor-zoom-in" 
                             onclick="window.loadModule('letters').then(m => m.openFullscreen('${letter.image_url}'))">
                            <img src="${letter.image_url}" 
                                 class="w-full h-auto max-h-[500px] object-contain transition-transform duration-700 group-hover/img:scale-105" />
                            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span class="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">Zvětšit fotografii</span>
                            </div>
                        </div>` : ''}

                        <div class="text-gray-100 text-base leading-relaxed whitespace-pre-wrap font-main tracking-wide">${letter.content}</div>
                        
                        <div class="mt-12 flex justify-end">
                            <div class="text-gray-400 font-bold italic border-b border-[#eb459e]/30 pb-1 flex items-center gap-2">
                                — ${signature} <span class="text-[#eb459e]">❤️</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}


export async function deleteLetter(id, fromDetailView = false) {
    const ok = await showConfirmDialog('Fakt chceš tento dopis smazat? 🥺', 'Smazat', 'Zrušit');
    if (!ok) return;

    try {
        // 1. Get letter data first to check for image
        const { data: letter } = await supabase.from('love_letters').select('image_url').eq('id', id).maybeSingle();

        // 2. Delete from Storage if image exists
        if (letter && letter.image_url) {
            try {
                const urlParts = letter.image_url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                await deleteFile('timeline-photos', `letters/${fileName}`);
            } catch (storageErr) {
                console.warn("[Letters] Failed to delete image from storage:", storageErr);
            }
        }

        // 3. Delete from DB
        const { error } = await supabase.from('love_letters').delete().eq('id', id);
        if (error) throw error;

        showNotification('Dopis byl smazán.', 'info');

        if (fromDetailView) {
            renderLetters(); // Go back to main view
        } else {
            renderLetters(); // Just refresh
        }
    } catch (err) {
        console.error("[Letters] Delete Error:", err);
        showNotification('Chyba při mazání dopisu.', 'error');
    }
}


export function formatTimeLeft(date) {
    const now = new Date();
    const diff = date - now;
    if (diff <= 0) return 'teď';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} dní a ${hours} hodin`;
    if (hours > 0) return `${hours} hodin a ${minutes} minut`;
    return `${minutes} minut`;
}

export function openFullscreen(url) {
    const overlay = document.createElement('div');
    overlay.id = 'letter-fullscreen-overlay';
    overlay.className = 'fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-0 animate-fade-in overflow-hidden touch-none';

    let scale = 1;
    let lastScale = 1;
    let startPinchDist = 0;

    let posX = 0;
    let posY = 0;
    let lastPosX = 0;
    let lastPosY = 0;

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    overlay.innerHTML = `
        <!-- Top Bar -->
        <div class="absolute top-0 left-0 right-0 p-6 flex items-center justify-end gap-3 z-[10000] bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div class="flex items-center gap-2 pointer-events-auto">
                <button id="zoom-in" class="text-white/70 hover:text-white transition-all p-3 rounded-full hover:bg-white/10 text-xl" title="Přiblížit">
                    <i class="fas fa-search-plus"></i>
                </button>
                <button id="zoom-out" class="text-white/70 hover:text-white transition-all p-3 rounded-full hover:bg-white/10 text-xl" title="Oddálit">
                    <i class="fas fa-search-minus"></i>
                </button>
                <button id="download-btn" class="text-white/70 hover:text-white transition-all p-3 rounded-full hover:bg-white/10 text-xl" title="Stáhnout obrázek">
                    <i class="fas fa-download"></i>
                </button>
                <button id="close-overlay" class="text-white/70 hover:text-white transition-all p-3 rounded-full hover:bg-white/10 text-xl ml-4" title="Zavřít">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <!-- Image Container -->
        <div id="full-img-container" class="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing">
            <img src="${url}" id="full-img-el" 
                class="max-w-full max-h-full object-contain rounded shadow-2xl transition-transform duration-200 ease-out select-none pointer-events-none" 
                style="transform: translate(0px, 0px) scale(1);" />
        </div>

        <p id="zoom-hint" class="absolute bottom-6 text-white/30 text-[10px] uppercase tracking-[0.3em] pointer-events-none select-none">Pinch nebo klikni pro zoom</p>
    `;

    const img = overlay.querySelector('#full-img-el');
    const container = overlay.querySelector('#full-img-container');
    const zoomInBtn = overlay.querySelector('#zoom-in');
    const zoomOutBtn = overlay.querySelector('#zoom-out');
    const closeBtn = overlay.querySelector('#close-overlay');
    const downloadBtn = overlay.querySelector('#download-btn');
    const zoomHint = overlay.querySelector('#zoom-hint');

    const downloadImage = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            triggerHaptic('medium');
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `kiscord_foto_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (err) {
            console.error("Download failed:", err);
            window.open(url, '_blank'); // Fallback
        }
    };

    const updateTransform = (smooth = true) => {
        img.style.transition = smooth ? 'transform 0.2s ease-out' : 'none';

        // Boundaries (roughly)
        if (scale <= 1.01) {
            posX = 0;
            posY = 0;
        }

        img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale})`;

        if (zoomHint) {
            zoomHint.innerText = scale > 1.1 ? 'Tažením se posouvej' : 'Pinch nebo klikni pro zoom';
        }
    };

    const handleZoom = (delta, centerX, centerY) => {
        const oldScale = scale;
        scale = Math.min(Math.max(1, scale + delta), 5);

        if (scale !== oldScale) {
            triggerHaptic('light');
            updateTransform();
        }
    };

    const getDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    // --- Events ---

    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - posX;
            startY = e.touches[0].clientY - posY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            startPinchDist = getDist(e.touches[0], e.touches[1]);
            lastScale = scale;
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging && scale > 1) {
            posX = e.touches[0].clientX - startX;
            posY = e.touches[0].clientY - startY;
            updateTransform(false);
        } else if (e.touches.length === 2) {
            const dist = getDist(e.touches[0], e.touches[1]);
            const zoomDelta = (dist / startPinchDist);
            scale = Math.min(Math.max(1, lastScale * zoomDelta), 6);
            updateTransform(false);
        }
    }, { passive: false });

    container.addEventListener('touchend', () => {
        isDragging = false;
        updateTransform(true);
    });

    // Desktop Mouse Drag
    container.onmousedown = (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        startX = e.clientX - posX;
        startY = e.clientY - posY;
    };

    window.onmousemove = (e) => {
        if (isDragging && scale > 1) {
            posX = e.clientX - startX;
            posY = e.clientY - startY;
            updateTransform(false);
        }
    };

    window.onmouseup = () => { isDragging = false; updateTransform(true); };

    // Buttons
    zoomInBtn.onclick = (e) => { e.stopPropagation(); handleZoom(0.5); };
    zoomOutBtn.onclick = (e) => { e.stopPropagation(); handleZoom(-0.5); };
    downloadBtn.onclick = downloadImage;
    closeBtn.onclick = () => {
        overlay.classList.add('animate-fade-out');
        setTimeout(() => overlay.remove(), 250);
    };

    // Double click to toggle
    container.ondblclick = (e) => {
        if (scale > 1.1) {
            scale = 1;
            posX = 0;
            posY = 0;
        } else {
            scale = 2.5;
        }
        updateTransform();
    };

    document.body.appendChild(overlay);
    if (typeof triggerHaptic === 'function') triggerHaptic('light');
}
