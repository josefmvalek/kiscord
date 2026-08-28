/**
 * Command Palette (Quick Search & Action Launcher) for Kiscord 2.0
 * Provides instant Ctrl+K / Cmd+K fuzzy navigation across all 55+ channels and direct actions.
 */

import { triggerHaptic } from './utils.js';
import { state } from './state.js';

// Pre-defined Quick Actions
const QUICK_ACTIONS = [
    {
        id: 'action-water',
        title: 'Zapsat sklenici vody (+250 ml)',
        category: 'Rychlá akce',
        icon: '💧',
        color: '#00aff4',
        handler: () => {
            window.loadModule?.('dashboard').then(m => {
                const todayKey = new Date().toISOString().split('T')[0];
                if (!state.healthData) state.healthData = {};
                if (!state.healthData[todayKey]) state.healthData[todayKey] = { water: 0 };
                state.healthData[todayKey].water = (state.healthData[todayKey].water || 0) + 1;
                window.updateWater?.(state.healthData[todayKey].water);
            }).catch(() => {
                window.switchChannel('dashboard');
            });
        }
    },
    {
        id: 'action-gym',
        title: 'Zahájit trénink v Posilovně',
        category: 'Rychlá akce',
        icon: '🏋️',
        color: '#f59e0b',
        handler: () => window.switchChannel('gym-tracker')
    },
    {
        id: 'action-tmdb',
        title: 'Vyhledat film nebo seriál (TMDB)',
        category: 'Rychlá akce',
        icon: '🎬',
        color: '#eb459e',
        handler: () => {
            window.switchChannel('knihovna');
            setTimeout(() => window.showAddMediaModal?.(), 300);
        }
    },
    {
        id: 'action-theme',
        title: 'Přepnout téma vzhledu (Dark / Light / Valentines...)',
        category: 'Nastavení',
        icon: '🎨',
        color: '#853ee6',
        handler: () => window.toggleTheme?.()
    },
    {
        id: 'action-sync',
        title: 'Vynutit synchronizaci offline dat se Supabase',
        category: 'Systém',
        icon: '🔄',
        color: '#14b8a6',
        handler: () => {
            window.loadModule?.('offline').then(m => {
                m.processSyncQueue?.();
            });
        }
    },
    {
        id: 'action-calendar',
        title: 'Otevřít Kalendář & Události',
        category: 'Rychlá akce',
        icon: '📅',
        color: '#5865f2',
        handler: () => window.switchChannel('calendar')
    },
    {
        id: 'action-calendar-nlp',
        title: '⚡ Rychle naplánovat událost (NLP textem)',
        category: 'Kalendář 2.0',
        icon: '🪄',
        color: '#a855f7',
        handler: () => {
            window.switchChannel('calendar');
            setTimeout(() => window.Calendar?.openNLPModal?.(), 250);
        }
    },
    {
        id: 'action-calendar-briefing',
        title: '☀️ Dnešní ranní přehled (Briefing & Discord)',
        category: 'Kalendář 2.0',
        icon: '☀️',
        color: '#f59e0b',
        handler: () => {
            window.loadModule?.('calendar').then(m => {
                m.showDailyBriefingModal?.();
            }).catch(() => {
                window.Calendar?.showDailyBriefingModal?.();
            });
        }
    },
    {
        id: 'action-calendar-ics',
        title: '📥 Exportovat kalendář do .ics (Apple / Google)',
        category: 'Kalendář 2.0',
        icon: '📥',
        color: '#10b981',
        handler: () => {
            window.loadModule?.('calendar').then(m => {
                m.showExportICSModal?.();
            }).catch(() => {
                window.Calendar?.showExportICSModal?.();
            });
        }
    },
    {
        id: 'action-calendar-stats',
        title: '📊 Týdenní statistiky a produktivita',
        category: 'Kalendář 2.0',
        icon: '📊',
        color: '#5865f2',
        handler: () => {
            window.switchChannel('calendar');
            setTimeout(() => window.Calendar?.toggleWeeklyAnalytics?.(), 250);
        }
    },
    {
        id: 'action-shop',
        title: 'Otevřít Obchůdek (Love Shop & Kupóny)',
        category: 'Rychlá akce',
        icon: '🪙',
        color: '#faa61a',
        handler: () => window.switchChannel('love-shop')
    },
    {
        id: 'action-pomodoro',
        title: 'Spustit Pomodoro studijní fokus (25 min)',
        category: 'FIT & Studium',
        icon: '⏱️',
        color: '#3b82f6',
        handler: () => {
            window.startPomodoroTimer?.(25);
            import('./theme.js').then(t => t.showNotification('Pomodoro fokus časovač spuštěn! ⏱️📚', 'info'));
        }
    }
];

let isPaletteOpen = false;
let selectedIndex = 0;
let currentResults = [];

const SLASH_COMMAND_DEFS = [
    {
        command: '/server',
        title: '/server [home/love/fitness/fit/media/archive/system]',
        desc: 'Bleskově přepne aktivní server Kiscordu z klávesnice',
        category: '⚡ Slash Příkaz',
        icon: '🌐',
        color: '#5865f2',
        match: (q) => q.startsWith('/server'),
        getDynamicItem: (q) => {
            const raw = q.replace('/server', '').trim().toLowerCase();
            const serverMap = {
                'home': 'home', 'hub': 'home', 'hlavni': 'home', 'dm': 'home',
                'love': 'love', 'laska': 'love', 'svet': 'love',
                'fitness': 'fitness', 'fitko': 'fitness', 'gym': 'fitness', 'zdravi': 'fitness',
                'fit': 'fit', 'vut': 'fit', 'skola': 'fit', 'koleje': 'fit',
                'media': 'media', 'filmy': 'media', 'hry': 'media', 'fun': 'media',
                'archive': 'archive', 'archiv': 'archive', 'trezor': 'archive', 'brigada': 'archive',
                'system': 'system', 'nastaveni': 'system', 'sys': 'system'
            };
            const targetId = serverMap[raw] || 'home';
            return {
                id: `slash-server-${targetId}`,
                title: `/server: Přepnout na server [${targetId.toUpperCase()}]`,
                desc: `Aktivuje vybraný server a přenačte kanály`,
                category: '⚡ Slash Příkaz',
                icon: '🌐',
                color: '#5865f2',
                type: 'action',
                handler: () => {
                    import('./router.js').then(r => r.switchServer(targetId));
                }
            };
        }
    },
    {
        command: '/pomodoro',
        title: '/pomodoro [minuty]',
        desc: 'Spustí studijní fokus časovač v Dynamic Islandu (např. /pomodoro 25)',
        category: '⚡ Slash Příkaz',
        icon: '⏱️',
        color: '#3b82f6',
        match: (q) => q.startsWith('/pomodoro'),
        getDynamicItem: (q) => {
            const raw = q.replace('/pomodoro', '').trim();
            const minutes = parseInt(raw, 10) || 25;
            return {
                id: 'slash-pomodoro',
                title: `/pomodoro: Spustit ${minutes}min studijní fokus ⏱️`,
                desc: 'Aktivuje plovoucí Dynamic Island s odpočtem na učení',
                category: '⚡ Slash Příkaz',
                icon: '⏱️',
                color: '#3b82f6',
                type: 'action',
                handler: () => {
                    window.startPomodoroTimer?.(minutes);
                    import('./theme.js').then(t => t.showNotification(`Pomodoro fokus ${minutes} min spuštěn! ⏱️`, 'info'));
                }
            };
        }
    },
    {
        command: '/rande',
        title: '/rande [návrh]',
        desc: 'Vytvoří nový návrh na rande a odešle pozvánku partnerovi (např. /rande Piknik u přehrady)',
        category: '⚡ Slash Příkaz',
        icon: '🥂',
        color: '#eb459e',
        match: (q) => q.startsWith('/rande'),
        getDynamicItem: (q) => {
            const planText = q.replace('/rande', '').trim() || 'Společný romantický večer';
            return {
                id: 'slash-rande',
                title: `/rande: Navrhnout rande "${planText}" 🥂`,
                desc: 'Otevře Plánovač rande s předvyplněným návrhem',
                category: '⚡ Slash Příkaz',
                icon: '🥂',
                color: '#eb459e',
                type: 'action',
                handler: () => {
                    window.switchChannel('dateplanner');
                    import('./theme.js').then(t => t.showNotification(`Návrh "${planText}" připraven! 🥂`, 'love'));
                }
            };
        }
    },
    {
        command: '/kupon',
        title: '/kupon',
        desc: 'Zobrazí tvou spížku na kupóny a odměny v Obchůdku 🪙🎁',
        category: '⚡ Slash Příkaz',
        icon: '🎟️',
        color: '#faa61a',
        match: (q) => q.startsWith('/kupon'),
        getDynamicItem: () => ({
            id: 'slash-kupon',
            title: '/kupon: Otevřít Spížku na kupóny a odměny 🎟️',
            desc: 'Přepne tě do Obchůdku a aktivuje záložku Moje kupóny',
            category: '⚡ Slash Příkaz',
            icon: '🎟️',
            color: '#faa61a',
            type: 'action',
            handler: () => {
                window.switchChannel('love-shop');
            }
        })
    },
    {
        command: '/voda',
        title: '/voda [počet]',
        desc: 'Bleskově zapíše vypité sklenice vody (např. /voda +2 nebo /voda 3)',
        category: '⚡ Slash Příkaz',
        icon: '💧',
        color: '#00aff4',
        match: (q) => q.startsWith('/voda'),
        getDynamicItem: (q) => {
            const raw = q.replace('/voda', '').trim();
            const count = parseInt(raw.replace('+', ''), 10) || 1;
            return {
                id: 'slash-voda',
                title: `/voda: Přidat ${count} ${count === 1 ? 'sklenici' : (count < 5 ? 'sklenice' : 'sklenic')} vody (+${count * 250} ml)`,
                desc: 'Okamžitě aktualizuje denní hydrataci a synchronizuje se serverem',
                category: '⚡ Slash Příkaz',
                icon: '💧',
                color: '#00aff4',
                type: 'action',
                handler: () => {
                    import('./state.js').then(({ state, saveStateToCache }) => {
                        const todayKey = new Date().toISOString().split('T')[0];
                        if (!state.healthData) state.healthData = {};
                        if (!state.healthData[todayKey]) state.healthData[todayKey] = { water: 0 };
                        state.healthData[todayKey].water = Math.min(8, (state.healthData[todayKey].water || 0) + count);
                        saveStateToCache();
                        if (typeof window.updateWater === 'function') {
                            window.updateWater(state.healthData[todayKey].water);
                        }
                        import('./theme.js').then(t => t.showNotification(`Zapsáno +${count} sklenic vody! 💧`, 'success'));
                        import('./sound.js').then(s => s.playSuccessChime?.());
                    });
                }
            };
        }
    },
    {
        command: '/vaha',
        title: '/vaha [kg]',
        desc: 'Zapíše ranní tělesnou váhu do biometrického hubu (např. /vaha 74.5)',
        category: '⚡ Slash Příkaz',
        icon: '⚖️',
        color: '#3ba55c',
        match: (q) => q.startsWith('/vaha'),
        getDynamicItem: (q) => {
            const raw = q.replace('/vaha', '').trim().replace(',', '.');
            const weight = parseFloat(raw);
            const valid = !isNaN(weight) && weight > 30 && weight < 250;
            return {
                id: 'slash-vaha',
                title: valid ? `/vaha: Uložit ranní váhu ${weight} kg` : '/vaha [kg]: Zadej hodnotu váhy (např. /vaha 72.5)',
                desc: valid ? 'Uloží váhu do biometrie, přepočítá trend a EMA křivku' : 'Zadej číslo v kilogramech',
                category: '⚡ Slash Příkaz',
                icon: '⚖️',
                color: '#3ba55c',
                type: 'action',
                handler: () => {
                    if (!valid) {
                        import('./theme.js').then(t => t.showNotification('Zadej platnou hodnotu váhy, např. /vaha 74.5', 'warning'));
                        return;
                    }
                    import('../domains/fitness/body-metrics/index.js').then(bm => {
                        bm.saveQuickWeight?.(weight);
                        import('./theme.js').then(t => t.showNotification(`Váha ${weight} kg úspěšně zaznamenána! ⚖️`, 'success'));
                        import('./sound.js').then(s => s.playSuccessChime?.());
                    }).catch(() => {
                        window.switchChannel('body-metrics');
                    });
                }
            };
        }
    },
    {
        command: '/dotek',
        title: '/dotek',
        desc: 'Odešle partnerovi okamžitý haptický puls a tlukot srdce přes WebSocket 🫀',
        category: '⚡ Slash Příkaz',
        icon: '🫀',
        color: '#eb459e',
        match: (q) => q.startsWith('/dotek'),
        getDynamicItem: () => ({
            id: 'slash-dotek',
            title: '/dotek: Odeslat partnerovi haptický tlukot srdce 💓',
            desc: 'Vyšle okamžitou haptickou vibraci a zvukové zaťukání na zařízení partnera',
            category: '⚡ Slash Příkaz',
            icon: '🫀',
            color: '#eb459e',
            type: 'action',
            handler: () => {
                import('./sync.js').then(s => {
                    s.broadcastToPartner?.('haptic-pulse', { from: 'command-palette', timestamp: Date.now() });
                });
                import('./sound.js').then(s => s.playHeartbeat?.());
                import('./theme.js').then(t => t.showNotification('Tlukot srdce byl odeslán partnerovi! 🫀❤️', 'love'));
                triggerHaptic('heartbeat');
            }
        })
    },
    {
        command: '/lovecoin',
        title: '/lovecoin [počet] [zpráva]',
        desc: 'Daruje Love Coins partnerovi s oslavnými konfetami (např. /lovecoin +5 Skvělá večeře!)',
        category: '⚡ Slash Příkaz',
        icon: '🪙',
        color: '#faa61a',
        match: (q) => q.startsWith('/lovecoin') || q.startsWith('/coin'),
        getDynamicItem: (q) => {
            const clean = q.replace(/^\/(lovecoin|coin)/, '').trim();
            const parts = clean.split(' ');
            const numPart = (parts[0] || '').replace('+', '');
            const amount = parseInt(numPart, 10) || 5;
            const message = parts.slice(1).join(' ') || 'Za to, jak jsi úžasná/ý! ❤️';

            return {
                id: 'slash-coin',
                title: `/lovecoin: Poslat +${amount} Love Coins ("${message}")`,
                desc: 'Odešle mince s oslavným efektem',
                category: '⚡ Slash Příkaz',
                icon: '🪙',
                color: '#faa61a',
                type: 'action',
                handler: () => {
                    import('./state.js').then(({ awardLoveCoinsToCurrentUser }) => {
                        awardLoveCoinsToCurrentUser(amount, message);
                        import('./utils.js').then(u => u.triggerConfetti?.());
                        import('./sound.js').then(s => s.playSuccessChime?.());
                    });
                }
            };
        }
    }
];

export function getAllSearchableItems() {
    const items = [];

    // 1. Add Slash Commands
    items.push(...SLASH_COMMAND_DEFS.map(s => ({
        id: `slash-cmd-${s.command}`,
        title: s.title,
        category: s.category,
        desc: s.desc,
        icon: s.icon,
        color: s.color,
        type: 'action',
        handler: () => {
            const input = document.getElementById('command-palette-input');
            if (input) {
                input.value = s.command + ' ';
                input.focus();
                renderPaletteResults(input.value);
            }
        }
    })));

    // 2. Add Quick Actions
    items.push(...QUICK_ACTIONS.map(a => ({
        ...a,
        type: 'action'
    })));

    // 3. Add all Channels from router categories if available
    const categories = window.__channelCategories || [];
    categories.forEach(cat => {
        cat.items.forEach(ch => {
            items.push({
                id: ch.id,
                title: `${ch.name}`,
                category: cat.name.replace(/^[^\w\s]+/, '').trim(),
                desc: ch.desc || '',
                icon: ch.icon || 'fa-hashtag',
                isIconFa: typeof ch.icon === 'string' && ch.icon.startsWith('fa-'),
                color: ch.color || 'var(--blurple)',
                type: 'channel',
                handler: () => window.switchChannel(ch.id)
            });
        });
    });

    return items;
}

export function openCommandPalette() {
    isPaletteOpen = true;
    triggerHaptic('light');

    let modal = document.getElementById('command-palette-modal');
    if (!modal) {
        createPaletteDOM();
        modal = document.getElementById('command-palette-modal');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const input = document.getElementById('command-palette-input');
    if (input) {
        input.value = '';
        input.focus();
    }

    renderPaletteResults('');
}

export function closeCommandPalette() {
    isPaletteOpen = false;
    const modal = document.getElementById('command-palette-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

export function renderPaletteResults(query = '') {
    const container = document.getElementById('command-palette-results');
    if (!container) return;

    const allItems = getAllSearchableItems();
    const q = query.toLowerCase().trim();

    if (!q) {
        // Show Slash Commands + Quick Actions + Popular Channels
        currentResults = allItems.slice(0, 12);
    } else if (q.startsWith('/')) {
        // Check for dynamic slash command match
        const matchedDef = SLASH_COMMAND_DEFS.find(s => s.match(q));
        if (matchedDef) {
            currentResults = [
                matchedDef.getDynamicItem(query),
                ...SLASH_COMMAND_DEFS.filter(s => s !== matchedDef).map(s => ({
                    id: `slash-cmd-${s.command}`,
                    title: s.title,
                    category: s.category,
                    desc: s.desc,
                    icon: s.icon,
                    color: s.color,
                    type: 'action',
                    handler: () => {
                        const input = document.getElementById('command-palette-input');
                        if (input) {
                            input.value = s.command + ' ';
                            input.focus();
                            renderPaletteResults(input.value);
                        }
                    }
                }))
            ];
        } else {
            // Filter slash commands
            currentResults = SLASH_COMMAND_DEFS.map(s => ({
                id: `slash-cmd-${s.command}`,
                title: s.title,
                category: s.category,
                desc: s.desc,
                icon: s.icon,
                color: s.color,
                type: 'action',
                handler: () => {
                    const input = document.getElementById('command-palette-input');
                    if (input) {
                        input.value = s.command + ' ';
                        input.focus();
                        renderPaletteResults(input.value);
                    }
                }
            })).filter(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
        }
    } else {
        currentResults = allItems.filter(item => {
            const titleMatch = item.title.toLowerCase().includes(q);
            const descMatch = (item.desc || '').toLowerCase().includes(q);
            const catMatch = (item.category || '').toLowerCase().includes(q);
            const idMatch = (item.id || '').toLowerCase().includes(q);
            return titleMatch || descMatch || catMatch || idMatch;
        }).slice(0, 12);
    }

    selectedIndex = Math.min(selectedIndex, Math.max(0, currentResults.length - 1));


    if (currentResults.length === 0) {
        container.innerHTML = `
            <div class="py-12 text-center text-[var(--text-muted)] animate-fade-in">
                <div class="text-3xl mb-2">🔍</div>
                <p class="text-xs font-bold">Nenalezeny žádné výsledky pro "${query}"</p>
                <p class="text-[11px] opacity-75 mt-1">Zkus hledat "voda", "film", "posilovna" nebo název kanálu</p>
            </div>
        `;
        return;
    }

    // Group results by category
    const grouped = {};
    currentResults.forEach((item, index) => {
        const cat = item.category || 'Ostatní';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ ...item, globalIndex: index });
    });

    let html = '';
    Object.entries(grouped).forEach(([categoryName, items]) => {
        html += `
            <div class="px-3 pt-3 pb-1">
                <span class="text-[9px] font-black uppercase tracking-wider text-[var(--text-muted)] opacity-80">${categoryName}</span>
            </div>
        `;

        items.forEach(item => {
            const isSelected = item.globalIndex === selectedIndex;
            const iconHtml = item.isIconFa
                ? `<div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs" style="background: ${item.color}20; color: ${item.color}; border: 1px solid ${item.color}40;"><i class="fas ${item.icon}"></i></div>`
                : `<div class="w-8 h-8 rounded-xl flex items-center justify-center text-base" style="background: ${item.color}20; border: 1px solid ${item.color}40;">${item.icon}</div>`;

            html += `
                <div onclick="window.__executePaletteItem(${item.globalIndex})"
                     onmouseenter="window.__setPaletteIndex(${item.globalIndex})"
                     class="flex items-center justify-between p-2.5 mx-1.5 rounded-xl cursor-pointer transition-all duration-150 select-none ${isSelected ? 'bg-[var(--bg-modifier-selected)] border border-[var(--blurple)]/40 shadow-sm' : 'hover:bg-[var(--bg-modifier-hover)] border border-transparent'}">
                    <div class="flex items-center gap-3 min-w-0">
                        ${iconHtml}
                        <div class="min-w-0">
                            <div class="text-xs font-bold text-[var(--text-header)] truncate flex items-center gap-2">
                                <span>${item.title}</span>
                                ${item.type === 'action' ? `<span class="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Akce</span>` : ''}
                            </div>
                            ${item.desc ? `<div class="text-[10px] text-[var(--text-muted)] truncate">${item.desc}</div>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 text-[var(--text-muted)] text-[10px] flex-shrink-0">
                        ${isSelected ? '<span class="text-[9px] font-bold uppercase tracking-wider text-[var(--blurple)] flex items-center gap-1">Enter <i class="fas fa-level-down-alt fa-rotate-90 text-[8px]"></i></span>' : ''}
                    </div>
                </div>
            `;
        });
    });

    container.innerHTML = html;

    // Scroll active item into view
    const selectedEl = container.querySelector('.bg-\\[var\\(--bg-modifier-selected\\)\\]');
    if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
    }
}

function createPaletteDOM() {
    const modal = document.createElement('div');
    modal.id = 'command-palette-modal';
    modal.className = 'fixed inset-0 z-[300] hidden items-start justify-center p-3 md:p-6 pt-16 md:pt-24 bg-black/75 backdrop-blur-md animate-fade-in';
    modal.onclick = (e) => {
        if (e.target === modal) closeCommandPalette();
    };

    modal.innerHTML = `
        <div class="bg-[var(--bg-secondary)] w-full max-w-xl rounded-2xl md:rounded-3xl border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-spring" onclick="event.stopPropagation()">
            <!-- Search Input Bar -->
            <div class="p-3.5 md:p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] flex items-center gap-3">
                <i class="fas fa-search text-[var(--blurple)] text-base pl-2"></i>
                <input id="command-palette-input" 
                       type="text" 
                       placeholder="Napiš název kanálu, akci nebo vyhledej cokoliv..." 
                       autocomplete="off"
                       spellcheck="false"
                       class="flex-1 bg-transparent text-sm font-medium text-[var(--text-header)] placeholder-[var(--text-muted)] outline-none border-none">
                <kbd class="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-black text-[var(--text-muted)] uppercase">ESC</kbd>
            </div>

            <!-- Results List -->
            <div id="command-palette-results" class="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar min-h-[220px]"></div>

            <!-- Footer Hints -->
            <div class="px-4 py-2.5 bg-[var(--bg-tertiary)] border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)] select-none">
                <div class="flex items-center gap-3">
                    <span><kbd class="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-bold">↑</kbd> <kbd class="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-bold">↓</kbd> Navigace</span>
                    <span><kbd class="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-bold">↵</kbd> Spustit</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <span>Kiscord Quick Search</span>
                    <span class="w-1.5 h-1.5 rounded-full bg-[var(--green)]"></span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('command-palette-input');
    input.addEventListener('input', (e) => {
        selectedIndex = 0;
        renderPaletteResults(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentResults.length > 0) {
                selectedIndex = (selectedIndex + 1) % currentResults.length;
                renderPaletteResults(input.value);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentResults.length > 0) {
                selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
                renderPaletteResults(input.value);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentResults[selectedIndex]) {
                window.__executePaletteItem(selectedIndex);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeCommandPalette();
        }
    });
}

// Global exposure for event handlers
window.__executePaletteItem = (index) => {
    const item = currentResults[index];
    if (item && item.handler) {
        closeCommandPalette();
        item.handler();
    }
};

window.__setPaletteIndex = (index) => {
    if (selectedIndex !== index) {
        selectedIndex = index;
        const input = document.getElementById('command-palette-input');
        renderPaletteResults(input ? input.value : '');
    }
};

// Global Keyboard Listener for Ctrl+K / Cmd+K
if (typeof window !== 'undefined' && !window.__commandPaletteListenerAttached) {
    window.__commandPaletteListenerAttached = true;
    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            if (isPaletteOpen) {
                closeCommandPalette();
            } else {
                openCommandPalette();
            }
        }
    });
}
