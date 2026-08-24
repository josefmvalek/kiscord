import { state } from '../state.js';
import { triggerHaptic } from '../utils.js';
import { channelCategories, getChannelItemById } from './channel-registry.js';
import { SERVER_BOTTOM_NAV_MAP } from './server-nav.js';

export function updateMobileBottomNav(channelId) {
    const nav = document.getElementById('mobile-bottom-nav');
    if (!nav) return;

    const currentServer = state.currentServer || 'home';
    const serverTabs = SERVER_BOTTOM_NAV_MAP[currentServer] || SERVER_BOTTOM_NAV_MAP['home'];

    if (nav.getAttribute('data-active-server') !== currentServer) {
        nav.setAttribute('data-active-server', currentServer);
        
        let html = '';
        serverTabs.forEach(tab => {
            html += `
                <button class="mobile-nav-btn flex-1 py-1 flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-header)] transition active:scale-95 group" 
                        data-nav-channel="${tab.id}" 
                        onclick="window.switchChannel('${tab.id}')">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base nav-icon-box transition" style="color: ${tab.color}">
                        ${tab.icon}
                    </div>
                    <span class="text-[9px] font-black uppercase tracking-tight nav-label truncate max-w-[58px]">${tab.name}</span>
                </button>
            `;
        });

        html += `
            <button class="mobile-nav-btn flex-1 py-1 flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-header)] transition active:scale-95 group" 
                    onclick="window.toggleMobileMenu ? window.toggleMobileMenu() : null" 
                    title="Otevřít Servery a Kanály">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-base text-[var(--server-current-accent)] nav-icon-box transition">
                    <i class="fas fa-bars"></i>
                </div>
                <span class="text-[9px] font-black uppercase tracking-tight nav-label">Servery</span>
            </button>
        `;

        nav.innerHTML = html;
        import('../app-ui.js').then(u => u.setupBottomNavLongPress?.()).catch(() => {});
    }

    nav.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = nav.querySelector(`.mobile-nav-btn[data-nav-channel="${channelId}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

export function toggleMobileCategorySheet(catType) {
    const backdrop = document.getElementById('mobile-sheet-backdrop');
    if (!backdrop) return;

    if (!backdrop.classList.contains('hidden') && backdrop.dataset.currentCat === catType) {
        closeMobileCategorySheet();
        return;
    }

    openMobileCategorySheet(catType);
}

export function openMobileCategorySheet(catType) {
    triggerHaptic('light');
    const backdrop = document.getElementById('mobile-sheet-backdrop');
    const content = document.getElementById('mobile-sheet-content');
    const body = document.getElementById('mobile-sheet-body');
    if (!backdrop || !content || !body) return;

    backdrop.dataset.currentCat = catType;

    let title = '';
    let items = [];

    if (catType === 'vut') {
        title = '🎓 VUT FIT & Koleje Brno';
        items = [
            { id: 'schedule', name: 'Rozvrh FIT', icon: 'fa-calendar-week', color: 'text-indigo-400', desc: 'Týdenní rozvrh, volná okna & učebny' },
            { id: 'study-planner', name: 'Studijní Plán', icon: 'fa-tasks', color: 'text-emerald-400', desc: 'Zkoušky, WIS body & deadliny' },
            { id: 'dorm-hub', name: 'Koleje & Prádelna', icon: 'fa-building', color: 'text-amber-400', desc: 'Časovač pračky, nákupy & menzy' },
            { id: 'finance-tracker', name: 'Finance Brno', icon: 'fa-wallet', color: 'text-yellow-400', desc: 'Společný studentský rozpočet' },
            { id: 'laptop-comparison', name: 'Počítač', icon: 'fa-laptop', color: 'text-blue-400', desc: 'Průvodce notebooky na FIT' }
        ];
    } else {
        title = '💬 Náš Svět & Zábava';
        items = [
            { id: 'habits', name: 'Návyky Tracker', icon: 'fa-check-circle', color: 'text-emerald-400', desc: 'Denní rutina (+5 Love Coins)' },
            { id: 'love-shop', name: 'Láskyplný Obchůdek', icon: 'fa-store', color: 'text-pink-400', desc: 'Spížka na kupóny & mince' },
            { id: 'daily-questions', name: 'Denní Otázky', icon: 'fa-question-circle', color: 'text-amber-400', desc: 'Každodenní otázka pro nás dva' },
            { id: 'topics', name: 'Témata', icon: 'fa-comments', color: 'text-orange-400', desc: 'O čem si dnes popovídat' },
            { id: 'quiz', name: 'Kvízy & Hry', icon: 'fa-brain', color: 'text-purple-400', desc: 'Kdo lépe zná, Draw duel...' },
            { id: 'timeline', name: 'Timeline Vzpomínek', icon: 'fa-history', color: 'text-pink-400', desc: 'Naše nejhezčí společné chvilky' },
            { id: 'letters', name: 'Dopisy v láhvi', icon: 'fa-envelope-open-text', color: 'text-rose-400', desc: 'Vzkazy pro budoucí já' },
            { id: 'settings', name: 'Nastavení', icon: 'fa-cog', color: 'text-gray-400', desc: 'Vzhled, barvy a správa účtu' },
            { id: '_all_channels', name: 'Všechny Kanály', icon: 'fa-bars', color: 'text-indigo-400', desc: 'Otevřít kompletní Discord menu' }
        ];
    }

    body.innerHTML = `
        <div class="space-y-3 pb-6">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <h3 class="text-sm font-black text-[var(--text-header)] uppercase tracking-wider">${title}</h3>
                <button onclick="window.closeMobileCategorySheet()" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-muted)] flex items-center justify-center text-sm transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 gap-2">
                ${items.map(item => `
                    <div class="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border-subtle)] transition active:scale-95 cursor-pointer group"
                         onclick="${item.id === '_all_channels' ? 'window.closeMobileCategorySheet(); window.toggleMobileMenu();' : `window.switchChannel('${item.id}'); window.closeMobileCategorySheet();`}">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-lg ${item.color} flex-shrink-0 group-hover:scale-110 transition-transform shadow-inner">
                                <i class="fas ${item.icon}"></i>
                            </div>
                            <div class="min-w-0">
                                <h4 class="text-xs font-black text-[var(--text-header)] truncate">${item.name}</h4>
                                <p class="text-[10px] text-[var(--text-muted)] font-medium truncate mt-0.5">${item.desc}</p>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right text-xs text-[var(--text-muted)] group-hover:text-[var(--text-header)] group-hover:translate-x-0.5 transition-all"></i>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    backdrop.classList.remove('hidden');
    requestAnimationFrame(() => {
        backdrop.classList.remove('opacity-0');
        backdrop.classList.add('opacity-100');
        content.classList.remove('translate-y-full');
        content.classList.add('translate-y-0');
    });
}

export function closeMobileCategorySheet() {
    const backdrop = document.getElementById('mobile-sheet-backdrop');
    const content = document.getElementById('mobile-sheet-content');
    if (!backdrop || !content) return;

    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    content.classList.remove('translate-y-0');
    content.classList.add('translate-y-full');

    setTimeout(() => {
        backdrop.classList.add('hidden');
    }, 300);
}

let miniBarLiveTicker = null;

