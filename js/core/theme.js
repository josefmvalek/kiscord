
import { triggerHaptic } from './utils.js';

export function changeTheme(theme) {
    const root = document.documentElement;

    // List of all managed theme classes
    const themeClasses = ['theme-christmas', 'theme-tetris', 'theme-valentines', 'theme-forest', 'theme-gold', 'theme-light'];
    
    // Remove all existing theme classes
    root.classList.remove(...themeClasses);

    console.log(`[Theme] Switching to: ${theme}`);

    // Add the new theme class if it's not default
    if (theme !== 'default' && themeClasses.includes(`theme-${theme}`)) {
        root.classList.add(`theme-${theme}`);
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
    const themes = ['default', 'light', 'christmas', 'tetris', 'valentines'];
    const nextIndex = (themes.indexOf(current) + 1) % themes.length;
    const newTheme = themes[nextIndex];
    changeTheme(newTheme);
    showNotification(`Téma: ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`, "success");
}

export function toggleValentineMode() {
    triggerHaptic('medium');
    const current = localStorage.getItem('klarka_theme');
    if (current === 'valentines') {
        changeTheme('default');
        showNotification("Valentýnský mod deaktivován 💔", "info");
    } else {
        changeTheme('valentines');
        showNotification("Valentýnský mod aktivován 💖", "success");
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
    notif.className = `p-4 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-x-10 opacity-0 pointer-events-auto flex items-center gap-3 min-w-[300px] border-l-4 ${type === 'success' ? 'bg-[#202225] border-green-500' :
            type === 'error' ? 'bg-[#202225] border-red-500' :
                'bg-[#202225] border-blue-500'
        }`;

    // Icon
    const icon = type === 'success' ? 'fa-check-circle text-green-500' :
        type === 'error' ? 'fa-exclamation-circle text-red-500' :
            'fa-info-circle text-blue-500';

    notif.innerHTML = `
        <i class="fas ${icon} text-xl"></i>
        <div class="flex-1">
            <p class="font-bold text-sm">${message}</p>
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
    }, 3000);

    triggerHaptic('light');
}

// Make it global because many legacy onclick handlers might use it
window.showNotification = showNotification;

/**
 * showConfirmDialog – replaces native browser confirm().
 * Returns a Promise<boolean>.
 */
export function showConfirmDialog(message, confirmLabel = 'Ano', cancelLabel = 'Zrušit') {
    return new Promise((resolve) => {
        // Remove any existing confirm dialog
        const existing = document.getElementById('app-confirm-dialog');
        if (existing) existing.remove();

        triggerHaptic('heavy');

        const overlay = document.createElement('div');
        overlay.id = 'app-confirm-dialog';
        overlay.className = 'fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in';
        overlay.innerHTML = `
            <div class="bg-[#36393f] rounded-2xl shadow-2xl border border-[#202225] max-w-sm w-full p-6 animate-scale-in">
                <p class="text-white font-bold text-lg text-center mb-6 leading-snug">${message}</p>
                <div class="flex gap-3">
                    <button id="confirm-cancel" class="flex-1 py-3 rounded-xl border border-[#40444b] text-gray-400 hover:text-white hover:bg-[#40444b] font-bold transition">${cancelLabel}</button>
                    <button id="confirm-ok" class="flex-1 py-3 rounded-xl bg-[#ed4245] hover:bg-[#c03537] text-white font-black transition transform hover:scale-105 active:scale-95">${confirmLabel}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#confirm-ok').onclick = () => { overlay.remove(); resolve(true); };
        overlay.querySelector('#confirm-cancel').onclick = () => { overlay.remove(); resolve(false); };
        overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
}
window.showConfirmDialog = showConfirmDialog;

