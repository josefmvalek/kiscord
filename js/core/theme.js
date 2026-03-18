
import { triggerHaptic } from './utils.js';

export function changeTheme(theme) {
    const root = document.documentElement;
    const body = document.body;

    // Clear any existing inline styles or classes
    body.style.fontFamily = "";
    body.style.fontSize = "";
    body.classList.remove('theme-valentines');

    console.log(`[Theme] Switching to: ${theme}`);

    if (theme === "christmas") {
        root.style.setProperty("--bg-tertiary", "#420d0d");
        root.style.setProperty("--bg-secondary", "#5c1414");
        root.style.setProperty("--bg-primary", "#240a0a");
        root.style.setProperty("--blurple", "#c92a2a"); // Red
        root.style.setProperty("--green", "#ffd700"); // Gold
        root.style.setProperty("--text-header", "#ffffff");
        root.style.setProperty("--interactive-active", "#ffffff");
        root.style.setProperty("--interactive-normal", "#e8e8e8"); // Lighter text
        root.style.setProperty("--text-normal", "#f0f0f0");
    } else if (theme === "tetris") {
        root.style.setProperty("--bg-tertiary", "#0d0e15");
        root.style.setProperty("--bg-secondary", "#151620");
        root.style.setProperty("--bg-primary", "#1c1d29");
        root.style.setProperty("--blurple", "#00e5ff");
        root.style.setProperty("--green", "#69f0ae");
        root.style.setProperty("--red", "#ff5252");
        root.style.setProperty("--yellow", "#ffd740");
        root.style.setProperty("--pink", "#e040fb");
        root.style.setProperty("--text-normal", "#33ff00");
        root.style.setProperty("--interactive-normal", "#33ff00");
        body.style.fontFamily = "'Press Start 2P', cursive";
        body.style.fontSize = "0.8rem";
    } else if (theme === "valentines") {
        // Force CSS variables on root
        root.style.setProperty("--bg-tertiary", "#2d0a12");
        root.style.setProperty("--bg-secondary", "#4a101e");
        root.style.setProperty("--bg-primary", "#6d2232");
        root.style.setProperty("--blurple", "#ff69b4"); // Hot pink
        root.style.setProperty("--green", "#00ff00"); // Lime green (ironic)
        root.style.setProperty("--red", "#ff0000");
        root.style.setProperty("--yellow", "#ffff00");
        root.style.setProperty("--pink", "#ff1493");
        root.style.setProperty("--text-normal", "#ffd1dc");
        root.style.setProperty("--interactive-normal", "#fab1c6");

        // Force font family via style AND class for redundancy
        body.style.fontFamily = "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', sans-serif";
        body.classList.add('theme-valentines');
    } else if (theme === "forest") {
        root.style.setProperty("--bg-tertiary", "#1a2a1a");
        root.style.setProperty("--bg-secondary", "#243a24");
        root.style.setProperty("--bg-primary", "#2d4a2d");
        root.style.setProperty("--blurple", "#5a8a5a");
        root.style.setProperty("--green", "#8ebf8e");
        root.style.setProperty("--text-normal", "#d1e0d1");
        root.style.setProperty("--interactive-normal", "#94a894");
    } else if (theme === "gold") {
        root.style.setProperty("--bg-tertiary", "#1a160d");
        root.style.setProperty("--bg-secondary", "#2f2814");
        root.style.setProperty("--bg-primary", "#42381c");
        root.style.setProperty("--blurple", "#d4af37");
        root.style.setProperty("--green", "#ffd700");
        root.style.setProperty("--text-normal", "#f1e5ac");
        root.style.setProperty("--interactive-normal", "#d4af37");
    } else {
        // Default / Reset
        root.style.setProperty("--bg-tertiary", "#202225");
        root.style.setProperty("--bg-secondary", "#2f3136");
        root.style.setProperty("--bg-primary", "#36393f");
        root.style.setProperty("--blurple", "#5865F2");
        root.style.setProperty("--green", "#3ba55c");
        root.style.setProperty("--red", "#ed4245");
        root.style.setProperty("--yellow", "#faa61a");
        root.style.setProperty("--pink", "#eb459e");
        root.style.setProperty("--text-normal", "#dcddde");
        root.style.setProperty("--interactive-normal", "#b9bbbe");
    }

    localStorage.setItem('klarka_theme', theme);

    // Only show notification if it's not the initial load (optimization)
    // We can't easily know if it's initial load here without a flag, but for now we'll allow it or rely on caller.
    // showNotification(`Téma změněno: ${theme}`, "success"); 
    // Commented out to avoid spam on init, callers can invoke notification if triggered by user.
}

export function initTheme() {
    const saved = localStorage.getItem('klarka_theme') || 'default';
    changeTheme(saved);
}

export function toggleTheme() {
    const current = localStorage.getItem('klarka_theme') || 'default';
    const themes = ['default', 'christmas', 'tetris', 'valentines'];
    const nextIndex = (themes.indexOf(current) + 1) % themes.length;
    const newTheme = themes[nextIndex];
    changeTheme(newTheme);
    showNotification(`Téma: ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)}`, "success");
}

export function toggleValentineMode() {
    const current = localStorage.getItem('klarka_theme');
    if (current === 'valentines') {
        changeTheme('default');
        showNotification("Valentýnský mod deaktivován 💔", "info");
    } else {
        changeTheme('valentines');
        showNotification("Valentýnský mod aktivován 💖", "success");
    }
}

export function showNotification(message, type = 'info') {
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

