import { state, saveStateToCache } from '../../core/state.js';
import { changeTheme, showNotification } from '../../core/theme.js';
import { triggerHaptic } from '../../core/utils.js';

export function renderThemeOption(id, name, bgClass) {
    const isActive = state.settings.theme === id;
    return `
        <div onclick="window.updateThemeSetting('${id}')" 
            class="relative h-24 rounded-xl cursor-pointer border-2 transition-all overflow-hidden ${isActive ? 'border-[#853ee6] scale-105 shadow-lg z-10' : 'border-[#202225] hover:border-[#4f545c] opacity-80 hover:opacity-100'}">
            <div class="absolute inset-0 ${bgClass}"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                <div class="text-white font-bold text-xs truncate">${name}</div>
            </div>
            ${isActive ? '<div class="absolute top-2 right-2 w-5 h-5 bg-[#853ee6] rounded-full flex items-center justify-center text-white text-[10px] shadow-md"><i class="fas fa-check"></i></div>' : ''}
        </div>
    `;
}

export function getSliderStyle(val, min, max, color = '#853ee6') {
    const percentage = ((val - min) / (max - min)) * 100;
    return `linear-gradient(to right, ${color} 0%, ${color} ${percentage}%, #202225 ${percentage}%, #202225 100%)`;
}

export function applyGlassEffect() {
    const root = document.documentElement;
    if (state.settings.glassmorphism) {
        root.style.setProperty('--glass-blur', `${state.settings.blurIntensity}px`);
        root.style.setProperty('--glass-opacity', '0.1');
    } else {
        root.style.setProperty('--glass-blur', '0px');
        root.style.setProperty('--glass-opacity', '1');
    }
}

export function updateBlurIntensity(val) {
    state.settings.blurIntensity = parseInt(val);
    const valEl = document.getElementById('blur-val');
    if (valEl) valEl.textContent = `${val}px`;

    applyGlassEffect();
    clearTimeout(window._blurSaveTimeout);
    window._blurSaveTimeout = setTimeout(() => saveStateToCache(), 1000);
}

export function updateThemeSetting(theme, refreshFn) {
    triggerHaptic('medium');
    state.settings.theme = theme;
    changeTheme(theme);
    saveStateToCache();
    if (refreshFn) refreshFn();
    showNotification(`Téma změněno na ${theme.toUpperCase()}`, "success");
}

export function toggleSetting(key, el) {
    triggerHaptic('light');
    state.settings[key] = !state.settings[key];

    if (key === 'glassmorphism') {
        const sliderSection = document.getElementById('glass-slider-section');
        if (sliderSection) sliderSection.classList.toggle('hidden', !state.settings.glassmorphism);
        applyGlassEffect();
    }

    if (key === 'soundEnabled' && state.settings.soundEnabled) {
        import('../../core/sound.js').then(m => m.playChime?.()).catch(e => console.warn('[Sound] Test chime failed:', e));
    }

    const bg = el.querySelector('.rounded-full');
    const dot = el.querySelector('.absolute.bg-white');
    if (bg && dot) {
        if (state.settings[key]) {
            bg.classList.replace('bg-[#4f545c]', 'bg-[#853ee6]');
            dot.classList.add('translate-x-5');
        } else {
            bg.classList.replace('bg-[#853ee6]', 'bg-[#4f545c]');
            dot.classList.remove('translate-x-5');
        }
    }

    saveStateToCache();
}
