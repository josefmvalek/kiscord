let speechInstance = null;
let isPlaying = false;
let isPaused = false;

export function initTTS() {
    return 'speechSynthesis' in window;
}

export function toggleTTS(btnElement) {
    if (isPlaying && !isPaused) {
        window.speechSynthesis.pause();
        isPaused = true;
        updateBtn(btnElement, 'resume');
        return;
    }
    
    if (isPlaying && isPaused) {
        window.speechSynthesis.resume();
        isPaused = false;
        updateBtn(btnElement, 'pause');
        return;
    }

    const content = document.querySelector('.matura-content');
    if (!content) return;
    
    const clone = content.cloneNode(true);
    clone.querySelectorAll('.section-check, .kb-hl-popover').forEach(el => el.remove());
    const text = clone.innerText;

    if (!text.trim()) return;

    speechInstance = new SpeechSynthesisUtterance(text);
    speechInstance.lang = 'cs-CZ';
    speechInstance.rate = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const czVoice = voices.find(v => v.lang === 'cs-CZ' && (v.name.includes('Premium') || v.name.includes('Online')));
    if (czVoice) speechInstance.voice = czVoice;

    speechInstance.onend = () => {
        isPlaying = false;
        isPaused = false;
        updateBtn(btnElement, 'play');
    };
    
    speechInstance.onerror = () => {
        isPlaying = false;
        isPaused = false;
        updateBtn(btnElement, 'play');
    };

    window.speechSynthesis.speak(speechInstance);
    isPlaying = true;
    isPaused = false;
    updateBtn(btnElement, 'pause');
}

export function stopTTS() {
    if (speechInstance) {
        window.speechSynthesis.cancel();
        isPlaying = false;
        isPaused = false;
    }
}

function updateBtn(btn, state) {
    if (!btn) return;
    if (state === 'play') {
        btn.innerHTML = '<i class="fas fa-play"></i> Přečíst text (TTS)';
        btn.className = 'bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2 tts-btn';
    } else if (state === 'pause') {
        btn.innerHTML = '<i class="fas fa-pause"></i> Pozastavit';
        btn.className = 'bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition shadow-[0_0_15px_rgba(88,101,242,0.4)] flex items-center gap-2 tts-btn';
    } else if (state === 'resume') {
        btn.innerHTML = '<i class="fas fa-play"></i> Pokračovat';
        btn.className = 'bg-[#3ba55c] hover:bg-[#2d8046] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition shadow-[0_0_15px_rgba(59,165,92,0.4)] flex items-center gap-2 tts-btn';
    }
}

export function toggleZenMode() {
    const modal = document.getElementById('kb-modal');
    if (!modal) return;
    const isZen = modal.classList.toggle('zen-mode-active');
    
    const elementsToHide = modal.querySelectorAll('.border-b, .bg-black\\\\/40'); // Escape the UI footer class selector
    elementsToHide.forEach(el => {
        if (isZen) {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.5s ease, height 0.5s ease, padding 0.5s ease';
            setTimeout(() => {
                if (modal.classList.contains('zen-mode-active')) {
                    el.style.display = 'none';
                }
            }, 500);
        } else {
            el.style.display = 'flex';
            setTimeout(() => {
                el.style.opacity = '1';
            }, 10);
        }
    });

    const contentWrap = modal.querySelector('.flex-1');
    if (contentWrap) {
        contentWrap.style.transition = 'background-color 0.5s ease';
        contentWrap.style.backgroundColor = isZen ? '#0f1011' : '#1b1d20';
    }
}
