
import { triggerHaptic } from './utils.js';

export function changeTheme(theme) {
    const root = document.documentElement;
    const body = document.body;

    // List of all managed theme classes
    const themeClasses = ['theme-christmas', 'theme-tetris', 'theme-valentines', 'theme-forest', 'theme-gold', 'theme-light'];
    
    // Remove all existing theme classes from both html and body
    root.classList.remove(...themeClasses);
    if (body) body.classList.remove(...themeClasses);

    console.log(`[Theme] Switching to: ${theme}`);

    // Add the new theme class if it's not default
    if (theme !== 'default' && themeClasses.includes(`theme-${theme}`)) {
        root.classList.add(`theme-${theme}`);
        if (body) body.classList.add(`theme-${theme}`);
    }

    localStorage.setItem('klarka_theme', theme);
}

export function initTheme() {
    const saved = localStorage.getItem('klarka_theme') || 'default';
    changeTheme(saved);
}

export function toggleTheme() {
    triggerHaptic('medium');
    const current = localStorage.getItem('klarka_theme') || 'default';
    const themes = ['default', 'light', 'valentines', 'christmas', 'tetris', 'forest', 'gold'];
    const nextIndex = (themes.indexOf(current) + 1) % themes.length;
    const newTheme = themes[nextIndex];
    changeTheme(newTheme);
}

export function toggleValentineMode() {
    triggerHaptic('medium');
    const current = localStorage.getItem('klarka_theme');
    if (current === 'valentines') {
        changeTheme('default');
    } else {
        changeTheme('valentines');
    }
}

let lastNotificationMessage = '';
let lastNotificationTime = 0;

export function showNotification(message, type = 'info') {
    const now = Date.now();
    if (message === lastNotificationMessage && now - lastNotificationTime < 2000) {
        return;
    }
    lastNotificationMessage = message;
    lastNotificationTime = now;

    // Create/Find notification container
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    // Create notification element
    const notif = document.createElement('div');
    const isCoin = type === 'coin' || message.includes('Love Coinů');
    const borderAccent = isCoin ? '#f59e0b' :
                         type === 'success' ? 'var(--green)' :
                         type === 'error' ? 'var(--red)' :
                         type === 'warning' ? 'var(--yellow)' : 'var(--blurple)';

    const extraBg = isCoin ? 'bg-gradient-to-r from-amber-500/15 via-[var(--bg-secondary)] to-[var(--bg-secondary)] border-amber-500/40 shadow-[0_8px_30px_rgba(245,158,11,0.25)]' : 'bg-[var(--bg-secondary)] border-[var(--border-default)] shadow-2xl';

    notif.className = `p-4 rounded-xl text-[var(--text-header)] ${extraBg} border transform transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-sm backdrop-blur-md`;
    notif.style.borderLeft = `4px solid ${borderAccent}`;

    // Icon
    const iconClass = isCoin ? 'fa-coins text-amber-400 animate-bounce' :
                      type === 'success' ? 'fa-check-circle text-[var(--green)]' :
                      type === 'error' ? 'fa-exclamation-circle text-[var(--red)]' :
                      type === 'warning' ? 'fa-triangle-exclamation text-[var(--yellow)]' :
                      'fa-info-circle text-[var(--blurple)]';

    notif.innerHTML = `
        <i class="fas ${iconClass} text-xl flex-shrink-0"></i>
        <div class="flex-1 min-w-0">
            <p class="font-bold text-xs leading-snug break-words ${isCoin ? 'text-amber-300' : ''}">${message}</p>
        </div>
    `;

    container.appendChild(notif);

    // Animate In
    requestAnimationFrame(() => {
        notif.classList.remove('translate-x-10', 'opacity-0');
    });

    // Remove after 3s
    setTimeout(() => {
        notif.classList.add('translate-x-10', 'opacity-0');
        setTimeout(() => notif.remove(), 300);
    }, isCoin ? 3800 : 3200);

    triggerHaptic(isCoin ? 'success' : 'light');
}

// Make it global because many legacy onclick handlers might use it
window.showNotification = showNotification;

/**
 * showConfirmDialog – replaces native browser confirm().
 * Returns a Promise<boolean>.
 */
export function showConfirmDialog(message, confirmLabel = 'Ano', cancelLabel = 'Zrušit', isDanger = true) {
    return new Promise((resolve) => {
        // Remove any existing confirm dialog
        const existing = document.getElementById('app-confirm-dialog');
        if (existing) existing.remove();

        triggerHaptic('heavy');

        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-dialog';
        overlay.className = 'fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in';
        overlay.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-default)] max-w-sm w-full p-6 animate-scale-in flex flex-col items-center text-center">
                <div class="w-12 h-12 rounded-2xl ${isDanger ? 'bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30' : 'bg-[var(--blurple)]/15 text-[var(--blurple)] border border-[var(--blurple)]/30'} flex items-center justify-center text-2xl mb-4 shadow-inner">
                    <i class="fas ${isDanger ? 'fa-trash-alt' : 'fa-question'}"></i>
                </div>
                <p class="text-[var(--text-header)] font-bold text-base mb-6 leading-snug">${message}</p>
                <div class="flex gap-3 w-full">
                    <button id="confirm-cancel" class="kiscord-btn kiscord-btn-secondary flex-1">${cancelLabel}</button>
                    <button id="confirm-ok" class="kiscord-btn ${isDanger ? 'kiscord-btn-danger' : 'kiscord-btn-primary'} flex-1">${confirmLabel}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const closeWith = (val) => {
            document.removeEventListener('keydown', handleKey);
            overlay.classList.add('opacity-0');
            setTimeout(() => overlay.remove(), 200);
            resolve(val);
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') closeWith(false);
            if (e.key === 'Enter') closeWith(true);
        };
        document.addEventListener('keydown', handleKey);

        overlay.querySelector('#confirm-ok').onclick = () => closeWith(true);
        overlay.querySelector('#confirm-cancel').onclick = () => closeWith(false);
        overlay.onclick = (e) => { if (e.target === overlay) closeWith(false); };
    });
}
window.showConfirmDialog = showConfirmDialog;

/**
 * showPromptDialog – replaces native browser prompt().
 * Returns a Promise<string|null>.
 */
export function showPromptDialog(message, defaultValue = '', okLabel = 'OK', cancelLabel = 'Zrušit') {
    return new Promise((resolve) => {
        // Remove any existing dialogs
        const existing = document.getElementById('app-prompt-dialog');
        if (existing) existing.remove();

        triggerHaptic('medium');

        const overlay = document.createElement('div');
        overlay.id = 'app-prompt-dialog';
        overlay.className = 'fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in';
        overlay.innerHTML = `
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-default)] max-w-sm w-full p-6 animate-scale-in">
                <p class="text-[var(--text-header)] font-bold text-base text-center mb-4 leading-snug">${message}</p>
                <input type="text" id="prompt-input" value="${defaultValue}" class="kiscord-input mb-6 text-sm">
                <div class="flex gap-3">
                    <button id="prompt-cancel" class="kiscord-btn kiscord-btn-secondary flex-1">${cancelLabel}</button>
                    <button id="prompt-ok" class="kiscord-btn kiscord-btn-primary flex-1">${okLabel}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = overlay.querySelector('#prompt-input');
        input.focus();
        input.select();

        const finish = (val) => {
            document.removeEventListener('keydown', handleKey);
            overlay.remove();
            resolve(val);
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') finish(null);
            if (e.key === 'Enter') finish(input.value);
        };
        document.addEventListener('keydown', handleKey);

        overlay.querySelector('#prompt-ok').onclick = () => finish(input.value);
        overlay.querySelector('#prompt-cancel').onclick = () => finish(null);
        overlay.onclick = (e) => { if (e.target === overlay) finish(null); };
    });
}
window.showPromptDialog = showPromptDialog;

export function showProgress(message) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    const id = 'progress-' + Date.now();
    const notif = document.createElement('div');
    notif.id = id;
    notif.className = `p-4 rounded-lg shadow-2xl bg-[#202225] text-white border-l-4 border-amber-500 transform transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto flex flex-col gap-2 min-w-[320px] shadow-[0_10px_40px_rgba(0,0,0,0.4)]`;

    notif.innerHTML = `
        <div class="flex items-center gap-3">
            <i class="fas fa-magic text-amber-500 animate-pulse"></i>
            <div class="flex-1">
                <p class="font-bold text-xs uppercase tracking-wider text-amber-500/80 mb-0.5">Probíhá generování...</p>
                <p class="font-bold text-sm" id="${id}-msg">${message}</p>
            </div>
        </div>
        <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1 border border-white/5">
            <div id="${id}-bar" class="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700 w-0 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
        </div>
    `;

    container.appendChild(notif);
    requestAnimationFrame(() => notif.classList.remove('translate-x-10', 'opacity-0'));

    return {
        setProgress: (p) => {
            const bar = document.getElementById(`${id}-bar`);
            if (bar) bar.style.width = p + '%';
        },
        setMessage: (txt) => {
            const msg = document.getElementById(`${id}-msg`);
            if (msg) msg.textContent = txt;
        },
        close: () => {
            notif.classList.add('translate-x-10', 'opacity-0');
            setTimeout(() => notif.remove(), 300);
        }
    };
}

window.showProgress = showProgress;
