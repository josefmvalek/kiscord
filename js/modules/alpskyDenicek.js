import { supabase } from '../core/supabase.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state, ensureDiaryData } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { renderModal, renderInputGroup } from '../core/ui.js';
import { uploadFile } from '../core/storage.js';

let subscription = null;

// Helper to determine trip dates and enable test mode dynamically
function getTripDates() {
    let departureDate = new Date('2026-05-31T00:00:00');
    const now = new Date();
    let currentDayNum = Math.floor((now - departureDate) / (1000 * 60 * 60 * 24)) + 1; // 1-indexed
    let isTestMode = false;

    if (currentDayNum < 1) {
        isTestMode = true;
        // Shift departure to 4 days ago so today is simulated as Day 5 for testing purposes
        departureDate = new Date();
        departureDate.setDate(now.getDate() - 4);
        currentDayNum = 5;
    }
    return { departureDate, currentDayNum, isTestMode };
}

export async function renderAlpskyDenicek() {
    // Expose API to window for button actions
    window.AlpskyDenicek = {
        openWriteDiaryModal,
        saveDiaryEntry,
        exportPDF,
        startRecording,
        stopRecording,
        deleteRecording
    };

    const container = document.getElementById("messages-container");
    if (!container) return;

    await ensureDiaryData();
    setupRealtime();

    const { departureDate, currentDayNum, isTestMode } = getTripDates();

    const diaryEntries = state.brigadeDiary || [];

    // Organize entries by date_key
    const entriesMap = {};
    diaryEntries.forEach(entry => {
        if (!entriesMap[entry.date_key]) {
            entriesMap[entry.date_key] = {};
        }
        const isJose = entry.user_id === state.user_ids?.jose;
        if (isJose) {
            entriesMap[entry.date_key].jose = entry;
        } else {
            entriesMap[entry.date_key].klarka = entry;
        }
    });

    const isTripStarted = currentDayNum >= 1;

    let html = `
        <div class="h-full overflow-y-auto no-scrollbar bg-[#36393f] pb-16 font-sans">
            <!-- Header Banner -->
            <div class="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950/40 p-6 border-b border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[160px]">
                <div class="absolute inset-0 opacity-15 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                <div class="absolute -right-20 -top-20 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div class="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 shadow-xl mb-3 animate-bounce-slow">
                    <i class="fas fa-journal-whills text-white text-2xl drop-shadow-md"></i>
                </div>
                <h1 class="relative z-10 text-2xl lg:text-3xl font-black text-white tracking-tight drop-shadow-lg text-center uppercase">Alpský Deníček 📔🔒</h1>
                <p class="relative z-10 text-gray-300 font-semibold mt-1 text-center text-xs max-w-md">Našich 90 společných vzpomínek s double-lock pojistkou!</p>
                
                ${isTripStarted ? `
                    <button onclick="window.AlpskyDenicek.exportPDF()" 
                            class="relative z-10 mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition duration-300 flex items-center gap-2">
                        <i class="fas fa-file-pdf text-red-400"></i> Exportovat deník do PDF 📖
                    </button>
                ` : ''}
            </div>

            <div class="max-w-3xl mx-auto px-4 pt-6 space-y-6">
                ${isTestMode ? `
                    <!-- Test mode notice -->
                    <div class="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center text-xs text-amber-300 font-semibold shadow-inner">
                        🧪 <b>TESTOVACÍ REŽIM KISCORDU:</b> Odjezd je sice až 31. května, ale pro účely testování jsme nasimulovali, že dnes je <b>Den 5</b> naší brigády. Můžete plně psát zápisy a vyzkoušet odemykání i PDF export!
                    </div>
                ` : ''}
                
                ${!isTripStarted ? `
                    <!-- Countdown state -->
                    <div class="glass-card bg-gradient-to-b from-white/[0.03] to-white/[0.01] border border-white/5 rounded-3xl p-8 text-center shadow-xl">
                        <span class="text-6xl block mb-4 animate-bounce-short">⏳⛰️</span>
                        <h3 class="text-white text-lg font-black uppercase tracking-wider mb-2">Přípravy vrcholí!</h3>
                        <p class="text-xs text-white/50 leading-relaxed font-semibold">
                            Alpský deníček odstartuje přesně v den odjezdu **31. května 2026**!<br>
                            Každý den si sem budete moci zapsat své rants & highlights dne.<br>
                            Držíme palce na cestu! 🇦🇹🚙
                        </p>
                    </div>
                ` : `
                    <!-- Diary entries vertical list -->
                    <div class="space-y-4">
                        ${generateDaysListHtml(currentDayNum, departureDate, entriesMap)}
                    </div>
                `}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function generateDaysListHtml(currentDayNum, departureDate, entriesMap) {
    const rows = [];

    // Show days in reverse chronological order (newest first)
    for (let day = currentDayNum; day >= 1; day--) {
        const targetDate = new Date(departureDate);
        targetDate.setDate(departureDate.getDate() + day - 1);
        const dateKey = targetDate.toISOString().split("T")[0];

        const dayEntries = entriesMap[dateKey] || {};
        const jose = dayEntries.jose;
        const klarka = dayEntries.klarka;

        const isRevealed = !!(jose && klarka);
        const myId = state.currentUser?.id;
        const isMeJose = myId === state.user_ids?.jose;
        const myEntry = isMeJose ? jose : klarka;
        const partnerEntry = isMeJose ? klarka : jose;

        const dateNice = targetDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' });

        // Calculate average stars if revealed
        let starsHtml = "";
        if (isRevealed) {
            const avg = Math.round((jose.rating + klarka.rating) / 2);
            starsHtml = `<div class="flex items-center gap-0.5 text-[#faa61a]">` +
                Array.from({ length: 5 }).map((_, i) => `<i class="${i < avg ? 'fas' : 'far'} fa-star text-xs"></i>`).join('') +
                `</div>`;
        }

        const isToday = new Date().toISOString().split("T")[0] === dateKey;

        rows.push(`
            <div class="glass-card bg-white/[0.02] border ${isToday ? 'border-pink-500/20 bg-pink-500/[0.01]' : 'border-white/5'} rounded-3xl p-5 hover:border-white/10 transition-all flex flex-col gap-4">
                <!-- Row Header -->
                <div class="flex justify-between items-center border-b border-white/5 pb-3">
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-widest text-[#eb459e] block">Den ${day} z 92</span>
                        <h3 class="text-sm font-black text-white leading-tight uppercase mt-0.5">${dateNice}</h3>
                    </div>
                    
                    <div class="flex items-center gap-3">
                        ${starsHtml}
                        <button onclick="window.AlpskyDenicek.openWriteDiaryModal('${dateKey}', ${day})" 
                                class="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-wider transition">
                            ${myEntry ? 'Upravit zápis' : 'Napsat zápis ✍️'}
                        </button>
                    </div>
                </div>

                <!-- Double lock columns layout -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <!-- Jožka Column -->
                    <div class="flex flex-col gap-2 p-4 bg-black/15 rounded-2xl border border-white/5 relative overflow-hidden">
                        <span class="text-[9px] font-black uppercase tracking-widest text-blue-300 block mb-1">🔵 Jožka</span>
                        ${renderColumnContent('jose', jose, isRevealed, isMeJose)}
                    </div>

                    <!-- Klárka Column -->
                    <div class="flex flex-col gap-2 p-4 bg-black/15 rounded-2xl border border-white/5 relative overflow-hidden">
                        <span class="text-[9px] font-black uppercase tracking-widest text-pink-300 block mb-1">🔴 Klárka</span>
                        ${renderColumnContent('klarka', klarka, isRevealed, !isMeJose)}
                    </div>
                </div>
            </div>
        `);
    }

    return rows.join('');
}

function renderColumnContent(userType, entry, isRevealed, isMe) {
    if (!entry) {
        return `
            <div class="flex flex-col items-center justify-center py-6 opacity-35 text-center">
                <i class="fas fa-clock text-base mb-1.5"></i>
                <span class="text-[10px] font-bold uppercase tracking-wider">Zatím nezadáno</span>
            </div>
        `;
    }

    // If it's me, I can always see my own entry!
    // If it's revealed (both completed), both can see.
    const canSee = isMe || isRevealed;

    if (!canSee) {
        return `
            <div class="flex flex-col items-center justify-center py-6 text-center text-amber-500 animate-pulse">
                <i class="fas fa-lock text-lg mb-2"></i>
                <span class="text-[9px] font-black uppercase tracking-widest leading-none mb-1">Obsah uzamčen</span>
                <span class="text-[8px] text-white/30 uppercase tracking-tighter">Odemkne se, až napíšeš svůj zápis!</span>
            </div>
        `;
    }

    // Rating stars rendering
    const stars = Array.from({ length: 5 }).map((_, i) => `<i class="${i < entry.rating ? 'fas' : 'far'} fa-star text-[9px] text-[#faa61a]"></i>`).join('');

    // Audio voice note if available
    let audioHtml = "";
    if (entry.voice_note_url) {
        audioHtml = `
            <div class="mt-2 pt-2 border-t border-white/5">
                <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-1">🎙️ Hlasová vzpomínka</span>
                <audio src="${entry.voice_note_url}" controls class="w-full h-8 rounded-lg bg-black/20 text-xs scale-95 origin-left"></audio>
            </div>
        `;
    }

    return `
        <div class="space-y-2 mt-1">
            <div class="flex justify-between items-center">
                <div class="flex gap-0.5">${stars}</div>
                <span class="text-[8px] text-emerald-400 font-black uppercase tracking-widest">Zapsáno ✅</span>
            </div>
            
            <div class="border-t border-white/5 pt-2 space-y-2">
                <div>
                    <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">🌸 Highlight dne</span>
                    <p class="text-xs text-gray-200 leading-relaxed font-semibold">${entry.highlight_text}</p>
                </div>
                <div>
                    <span class="text-[8px] font-black uppercase tracking-widest text-white/30 block mb-0.5">💩 Shit dne</span>
                    <p class="text-xs text-red-300/80 leading-relaxed font-medium">${entry.rant_text}</p>
                </div>
                ${audioHtml}
            </div>
        </div>
    `;
}

function setupRealtime() {
    if (subscription) return;

    subscription = supabase
        .channel('brigade-diary-realtime')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'brigade_diary' },
            (payload) => {
                console.log('Brigade diary realtime change:', payload.eventType);
                ensureDiaryData(true).then(() => {
                    if (state.currentChannel === 'alpsky-denicek') {
                        renderAlpskyDenicek();
                    }
                });
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

let selectedRating = 5;

let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let recordInterval = null;
let recordTimeLeft = 15;
let recordedAudioUrl = null;

export function startRecording() {
    triggerHaptic('light');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };
        mediaRecorder.onstop = () => {
            audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const preview = document.getElementById('voice-audio-preview');
            if (preview) {
                preview.src = URL.createObjectURL(audioBlob);
                document.getElementById('audio-playback-container').classList.remove('hidden');
            }
            document.getElementById('voice-status').textContent = 'Záznam připraven! 🎙️';
            document.getElementById('record-btn-start').classList.remove('hidden');
            document.getElementById('record-btn-stop').classList.add('hidden');
            document.getElementById('record-btn-delete').classList.remove('hidden');

            // Stop stream tracks
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();

        // Timer
        recordTimeLeft = 15;
        document.getElementById('record-timer').textContent = `0:${recordTimeLeft.toString().padStart(2, '0')}`;
        document.getElementById('record-btn-start').classList.add('hidden');
        document.getElementById('record-btn-stop').classList.remove('hidden');
        document.getElementById('record-btn-delete').classList.add('hidden');
        document.getElementById('voice-status').textContent = 'Nahrávám... 🎙️🔴';

        clearInterval(recordInterval);
        recordInterval = setInterval(() => {
            recordTimeLeft--;
            if (recordTimeLeft <= 0) {
                clearInterval(recordInterval);
                stopRecording();
            } else {
                document.getElementById('record-timer').textContent = `0:${recordTimeLeft.toString().padStart(2, '0')}`;
            }
        }, 1000);

    }).catch(err => {
        console.error('Microphone access denied:', err);
        showNotification('Nelze získat přístup k mikrofonu!', 'warning');
    });
}

export function stopRecording() {
    triggerHaptic('medium');
    clearInterval(recordInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

export function deleteRecording() {
    triggerHaptic('heavy');
    clearInterval(recordInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    audioBlob = null;
    audioChunks = [];
    recordedAudioUrl = null;

    document.getElementById('audio-playback-container').classList.add('hidden');
    const preview = document.getElementById('voice-audio-preview');
    if (preview) preview.src = '';

    document.getElementById('record-btn-delete').classList.add('hidden');
    document.getElementById('record-btn-start').classList.remove('hidden');
    document.getElementById('record-btn-stop').classList.add('hidden');
    document.getElementById('voice-status').textContent = 'Žádný hlasový záznam';
}

export function openWriteDiaryModal(dateKey, dayNum) {
    triggerHaptic('light');

    // Retrieve existing entry for current user if it exists
    const myId = state.currentUser?.id;
    const existing = state.brigadeDiary?.find(e => e.date_key === dateKey && e.user_id === myId);

    selectedRating = existing ? existing.rating : 5;

    const contentHtml = `
        <div class="space-y-5 text-left">
            <div class="space-y-1.5 text-center">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Jak hodnotíš dnešní den?</label>
                <div class="flex justify-center gap-2 mt-1.5">
                    ${Array.from({ length: 5 }).map((_, i) => `
                        <button onclick="window.AlpskyDenicek.selectStars(${i + 1})" 
                                id="star-btn-${i + 1}"
                                class="text-3xl transition-transform active:scale-150 text-[#faa61a]">
                            <i class="${i < selectedRating ? 'fas' : 'far'} fa-star"></i>
                        </button>
                    `).join('')}
                </div>
            </div>

            ${renderInputGroup({
        label: '🌸 Highlight dne',
        id: 'diary-highlight',
        placeholder: '',
        value: existing ? existing.highlight_text : ''
    })}

            ${renderInputGroup({
        label: '🌋 Nejdebilnější věc dne',
        id: 'diary-rant',
        placeholder: '',
        value: existing ? existing.rant_text : ''
    })}

            <!-- Voice Note section -->
            <div class="space-y-1.5">
                <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <span>🎙️ Hlasová Vzpomínka (max 15s)</span>
                </label>
                <div id="voice-record-container" class="bg-black/10 border border-white/5 rounded-2xl p-4 flex flex-col items-center gap-3">
                    <div id="voice-status" class="text-xs text-white/50 font-semibold">Žádný hlasový záznam</div>
                    
                    <div id="audio-playback-container" class="hidden w-full">
                        <audio id="voice-audio-preview" controls class="w-full h-8 rounded-lg bg-black/20 text-xs scale-95"></audio>
                    </div>

                    <div class="flex gap-2">
                        <button type="button" id="record-btn-start" onclick="window.AlpskyDenicek.startRecording()" class="px-4 py-2 bg-[#5865F2] hover:bg-[#4752c4] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md">
                            <i class="fas fa-microphone"></i> Nahrát
                        </button>
                        <button type="button" id="record-btn-stop" onclick="window.AlpskyDenicek.stopRecording()" class="hidden px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md animate-pulse">
                            <i class="fas fa-stop"></i> Zastavit (<span id="record-timer">0:15</span>)
                        </button>
                        <button type="button" id="record-btn-delete" onclick="window.AlpskyDenicek.deleteRecording()" class="hidden px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5">
                            <i class="fas fa-trash"></i> Smazat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const actionsHtml = `
        <div class="flex justify-end gap-2 w-full">
            <button onclick="document.getElementById('write-diary-modal').remove()" 
                    class="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-bold text-[10px] uppercase tracking-wider transition-all">
                Zrušit
            </button>
            <button id="diary-save-btn" onclick="window.AlpskyDenicek.saveDiaryEntry('${dateKey}')" 
                    class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-pink-500/20">
                Uložit zápis 📔
            </button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', renderModal({
        id: 'write-diary-modal',
        title: `Zápis ze dne ${dayNum}`,
        content: contentHtml,
        actions: actionsHtml,
        onClose: "document.getElementById('write-diary-modal').remove()"
    }));

    // Register star select helper
    window.AlpskyDenicek.selectStars = (stars) => {
        triggerHaptic('light');
        selectedRating = stars;
        for (let i = 1; i <= 5; i++) {
            const btn = document.getElementById(`star-btn-${i}`);
            if (btn) {
                btn.innerHTML = `<i class="${i <= stars ? 'fas' : 'far'} fa-star"></i>`;
            }
        }
    };

    document.getElementById('write-diary-modal').classList.remove('hidden');
    document.getElementById('write-diary-modal').classList.add('flex');

    audioBlob = null;
    audioChunks = [];
    recordedAudioUrl = existing ? existing.voice_note_url : null;

    if (recordedAudioUrl) {
        setTimeout(() => {
            const container = document.getElementById('audio-playback-container');
            const preview = document.getElementById('voice-audio-preview');
            const delBtn = document.getElementById('record-btn-delete');
            const status = document.getElementById('voice-status');
            if (container && preview && delBtn && status) {
                container.classList.remove('hidden');
                preview.src = recordedAudioUrl;
                delBtn.classList.remove('hidden');
                status.textContent = 'Nahraný hlasový záznam 🎙️';
            }
        }, 50);
    }
}

export async function saveDiaryEntry(dateKey) {
    const btn = document.getElementById('diary-save-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner animate-spin"></i> Ukládám...';
    }

    triggerHaptic('medium');

    const highlightText = document.getElementById('diary-highlight').value.trim();
    const rantText = document.getElementById('diary-rant').value.trim();

    if (!highlightText || !rantText) {
        showNotification('Prosím vyplňte obě pole (highlight i rant)!', 'warning');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Uložit zápis 📔';
        }
        return;
    }

    try {
        const myId = state.currentUser?.id;

        // Check if updating
        const existing = state.brigadeDiary?.find(e => e.date_key === dateKey && e.user_id === myId);

        let uploadedVoiceUrl = recordedAudioUrl;
        if (audioBlob) {
            // Upload to Supabase Storage
            const fileName = `voice_notes/${dateKey}_${myId}.webm`;
            uploadedVoiceUrl = await uploadFile('diary_voice_notes', audioBlob, fileName);
        }

        let payload = {
            date_key: dateKey,
            user_id: myId,
            highlight_text: highlightText,
            rant_text: rantText,
            rating: selectedRating,
            voice_note_url: uploadedVoiceUrl
        };

        if (existing) {
            payload.id = existing.id;
        }

        const { error } = await supabase
            .from('brigade_diary')
            .upsert(payload, { onConflict: 'date_key,user_id' });

        if (error) throw error;

        // Check if BOTH logged today's entry to trigger big celebration
        const freshEntries = await supabase.from('brigade_diary').select('*').eq('date_key', dateKey);
        if (freshEntries.data && freshEntries.data.length >= 2) {
            triggerConfetti();
            showNotification('Společný deník na dnešek odemčen! 🔓🥳', 'success');
        } else {
            showNotification('Tvůj zápis byl uložen! Čeká se na partnera... ⏳', 'success');
        }

        document.getElementById('write-diary-modal')?.remove();
        await ensureDiaryData(true);
        renderAlpskyDenicek();
    } catch (err) {
        console.error('Chyba při ukládání deníku:', err);
        showNotification('Nepodařilo se uložit zápis do databáze.', 'danger');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Zkusit znovu 🔁';
        }
    }
}

// Accent remover fallback to prevent PDF export square glitches (jsPDF default fonts lack full Latin-2 unicode support)
function removeAccents(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function exportPDF() {
    triggerHaptic('medium');
    showNotification('Generuji PDF deníku... 📖', 'info');

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 1. Title Section
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(removeAccents("Nase Alpske Leto 2026 - Spolecny Denik"), 20, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(removeAccents("Spolecny locked denik z rakouske brigady (31. 5. - 31. 8. 2026)"), 20, 32);
        doc.text(removeAccents("Vyexportovano ze soukrome aplikace Kiscord."), 20, 37);
        doc.line(20, 41, 190, 41);

        let y = 52;
        const pageHeight = doc.internal.pageSize.height;

        const { departureDate, currentDayNum, isTestMode } = getTripDates();
        const diaryEntries = state.brigadeDiary || [];

        // Organize entries by date_key
        const entriesMap = {};
        diaryEntries.forEach(entry => {
            if (!entriesMap[entry.date_key]) entriesMap[entry.date_key] = {};
            const isJose = entry.user_id === state.user_ids?.jose;
            if (isJose) {
                entriesMap[entry.date_key].jose = entry;
            } else {
                entriesMap[entry.date_key].klarka = entry;
            }
        });

        // Filter and sort only revealed days
        const revealedDays = [];
        const todayStr = new Date().toISOString().split("T")[0];

        for (let day = 1; day <= 92; day++) {
            const targetDate = new Date(departureDate);
            targetDate.setDate(departureDate.getDate() + day - 1);
            const dateKey = targetDate.toISOString().split("T")[0];

            if (dateKey > todayStr) break; // In the future

            const dayEntries = entriesMap[dateKey] || {};
            const jose = dayEntries.jose;
            const klarka = dayEntries.klarka;

            if (jose && klarka) {
                revealedDays.push({
                    dayNum: day,
                    dateNice: targetDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'numeric' }),
                    jose,
                    klarka
                });
            }
        }

        if (revealedDays.length === 0) {
            doc.setFontSize(12);
            doc.text(removeAccents("Zatim nemate zadny spolecne odemceny den (oba zapsano)."), 20, 60);
            doc.save("Nase_Alpske_Leto_2026_Denik.pdf");
            showNotification('Exportováno (prázdné)!', 'warning');
            return;
        }

        revealedDays.forEach(day => {
            // Check page height limit, add new page if needed
            if (y + 60 > pageHeight) {
                doc.addPage();
                y = 25; // resetting y
            }

            // Day Header
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(235, 69, 158); // Pink Kiscord color
            doc.text(removeAccents(`Den ${day.dayNum} - ${day.dateNice}`), 20, y);
            doc.setTextColor(0, 0, 0); // reset

            y += 8;

            // Jose details
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Jozka | Hodnoceni: " + "*".repeat(day.jose.rating) + " (" + day.jose.rating + "/5)", 24, y);

            doc.setFont("helvetica", "normal");
            y += 5;
            const joseHighlightLines = doc.splitTextToSize(removeAccents("Highlight: " + day.jose.highlight_text), 150);
            doc.text(joseHighlightLines, 28, y);
            y += (joseHighlightLines.length * 4.5);

            const joseRantLines = doc.splitTextToSize(removeAccents("Rant: " + day.jose.rant_text), 150);
            doc.text(joseRantLines, 28, y);
            y += (joseRantLines.length * 4.5) + 3;

            // Klarka details
            doc.setFont("helvetica", "bold");
            doc.text("Klarka | Hodnoceni: " + "*".repeat(day.klarka.rating) + " (" + day.klarka.rating + "/5)", 24, y);

            doc.setFont("helvetica", "normal");
            y += 5;
            const klarkaHighlightLines = doc.splitTextToSize(removeAccents("Highlight: " + day.klarka.highlight_text), 150);
            doc.text(klarkaHighlightLines, 28, y);
            y += (klarkaHighlightLines.length * 4.5);

            const klarkaRantLines = doc.splitTextToSize(removeAccents("Rant: " + day.klarka.rant_text), 150);
            doc.text(klarkaRantLines, 28, y);
            y += (klarkaRantLines.length * 4.5) + 8; // Spacer to next day card

            doc.line(20, y - 4, 190, y - 4);
            y += 4;
        });

        doc.save("Nase_Alpske_Leto_2026_Denik.pdf");
        triggerConfetti();
        showNotification('PDF deníku bylo úspěšně vygenerováno! 📖🎉', 'success');

    } catch (err) {
        console.error("PDF generation failed:", err);
        showNotification('Generování PDF se nezdařilo.', 'danger');
    }
}
