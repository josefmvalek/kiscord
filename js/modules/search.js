import { state, ensureLibraryData, ensureTimelineData, ensureMapData, ensureMaturaData, ensureGymData } from '../core/state.js';
import { normalizeText, triggerHaptic } from '../core/utils.js';
import { BRNO_CAMPUS_FOOD } from './dormHub.js';
import { AUSTRIAN_DICTIONARY } from './austrianGerman.js';
import { channelCategories } from '../core/router.js';

// --- SEARCH LOGIC ---

export function expandSearchQuery(query) {
    return query;
}

export function highlightText(text, query) {
    if (!query || !text) return text || '';
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return String(text).replace(regex, '<span class="bg-[#faa61a]/30 text-amber-300 font-black px-0.5 rounded">$1</span>');
}

export async function renderGlobalSearch(query) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        if (window.switchChannel) window.switchChannel(state.currentChannel || 'dashboard');
        return;
    }

    const safeQuery = normalizeText(trimmedQuery);

    // Make sure background collections are loaded for searching
    await Promise.allSettled([
        ensureLibraryData().catch(() => {}),
        ensureTimelineData().catch(() => {}),
        ensureMapData().catch(() => {}),
        ensureMaturaData().catch(() => {}),
        ensureGymData().catch(() => {})
    ]);

    const results = {
        channels: [],
        study: [],
        gym: [],
        media: [],
        places: [],
        timeline: [],
        vocab: [],
        matura: []
    };

    // 1. CHANNELS (Quick Jump)
    channelCategories.forEach(cat => {
        cat.items.forEach(item => {
            const searchStr = `${item.name} ${item.desc || ''} ${cat.name}`;
            if (normalizeText(searchStr).includes(safeQuery)) {
                results.channels.push({
                    id: item.id,
                    title: `#${item.name}`,
                    subtitle: item.desc || cat.name,
                    icon: item.icon,
                    category: cat.name,
                    action: `window.switchChannel('${item.id}')`
                });
            }
        });
    });

    // 2. VUT FIT STUDY (Subjects & Deadlines)
    if (state.schoolDeadlines && Array.isArray(state.schoolDeadlines)) {
        state.schoolDeadlines.forEach(dl => {
            const searchStr = `${dl.subject_code || ''} ${dl.title} ${dl.description || ''} ${dl.type || ''}`;
            if (normalizeText(searchStr).includes(safeQuery)) {
                results.study.push({
                    id: dl.id,
                    title: `[${dl.subject_code || 'FIT'}] ${dl.title}`,
                    subtitle: `Deadline: ${dl.deadline_date || 'Bez data'} • ${dl.type || 'Zadání'}`,
                    icon: '🎯',
                    action: `window.switchChannel('study-planner')`
                });
            }
        });
    }

    // 3. GYM EXERCISES & TEMPLATES
    if (state.gymExercises && Array.isArray(state.gymExercises)) {
        state.gymExercises.forEach(ex => {
            const searchStr = `${ex.name} ${ex.category || ''} ${ex.equipment || ''} ${ex.target_muscles?.join(' ') || ''}`;
            if (normalizeText(searchStr).includes(safeQuery)) {
                results.gym.push({
                    id: ex.id,
                    title: ex.name,
                    subtitle: `${ex.category || 'Cvik'} • ${ex.equipment || 'Vlastní váha'}`,
                    icon: '🏋️‍♂️',
                    action: `window.switchChannel('gym-tracker')`
                });
            }
        });
    }

    // 4. MEDIA & WATCHLIST
    if (state.library) {
        ['movies', 'series', 'games'].forEach(cat => {
            (state.library[cat] || []).forEach(item => {
                const searchStr = `${item.title} ${item.cat || ''} ${item.genres || ''} ${item.release_year || ''}`;
                if (normalizeText(searchStr).includes(safeQuery)) {
                    results.media.push({
                        id: item.id,
                        title: item.title,
                        subtitle: `${cat === 'movies' ? 'Film' : (cat === 'series' ? 'Seriál' : 'Hra')} • ${item.cat || item.genres || ''} (${item.release_year || '–'})`,
                        icon: item.icon || (cat === 'movies' ? '🎬' : (cat === 'series' ? '📺' : '🎮')),
                        action: `window.switchChannel('${cat}')`
                    });
                }
            });
        });
    }

    // 5. PLACES & DORM FOOD
    (state.dateLocations || []).forEach(loc => {
        const searchStr = `${loc.name} ${loc.desc || ''} ${loc.category || ''} ${loc.city || ''}`;
        if (normalizeText(searchStr).includes(safeQuery)) {
            results.places.push({
                id: loc.id,
                title: loc.name,
                subtitle: `${loc.category || 'Rande'} • ${loc.city || 'Místo'}`,
                icon: '📍',
                action: `window.switchChannel('dateplanner')`
            });
        }
    });

    BRNO_CAMPUS_FOOD.forEach(food => {
        const searchStr = `${food.name} ${food.desc} ${food.type}`;
        if (normalizeText(searchStr).includes(safeQuery)) {
            results.places.push({
                id: food.name,
                title: food.name,
                subtitle: `${food.type} • ${food.desc}`,
                icon: '🍔',
                action: `window.switchChannel('dorm-hub')`
            });
        }
    });

    // 6. TIMELINE & MEMORIES
    (state.timelineEvents || []).forEach(event => {
        const searchStr = `${event.title} ${event.description || ''} ${event.event_date || ''}`;
        if (normalizeText(searchStr).includes(safeQuery)) {
            results.timeline.push({
                id: event.id,
                title: event.title,
                subtitle: `Vzpomínka • ${event.event_date || ''}`,
                icon: event.icon || '📸',
                action: `window.switchChannel('timeline')`
            });
        }
    });

    // 7. AUSTRIAN VOCABULARY
    if (AUSTRIAN_DICTIONARY && Array.isArray(AUSTRIAN_DICTIONARY)) {
        AUSTRIAN_DICTIONARY.forEach(v => {
            const searchStr = `${v.austrian} ${v.german} ${v.czech} ${v.category || ''}`;
            if (normalizeText(searchStr).includes(safeQuery)) {
                results.vocab.push({
                    id: v.austrian,
                    title: `"${v.austrian}" 🇦🇹`,
                    subtitle: `Česky: ${v.czech} (Německy: ${v.german})`,
                    icon: '🏔️',
                    action: `window.switchChannel('austrian-german')`
                });
            }
        });
    }

    // 8. MATURA TOPICS
    if (state.maturaTopics) {
        Object.keys(state.maturaTopics).forEach(catId => {
            (state.maturaTopics[catId] || []).forEach(topic => {
                const searchStr = `${topic.title} ${topic.author || ''} ${topic.cat || ''}`;
                if (normalizeText(searchStr).includes(safeQuery)) {
                    results.matura.push({
                        id: topic.id,
                        title: topic.title,
                        subtitle: `${topic.cat || 'Maturita'} ${topic.author ? '• ' + topic.author : ''}`,
                        icon: topic.icon || '🎓',
                        action: `window.loadModule('matura').then(m => m.openKnowledgeBase('${topic.id}'))`
                    });
                }
            });
        });
    }

    const totalCount = Object.values(results).reduce((acc, arr) => acc + arr.length, 0);

    const renderResultSection = (title, items, badgeColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30') => {
        if (items.length === 0) return '';
        return `
            <div class="space-y-2.5">
                <div class="flex items-center justify-between pb-1 border-b border-[var(--border-subtle)]">
                    <h3 class="text-xs font-black text-[var(--text-header)] uppercase tracking-wider">${title}</h3>
                    <span class="text-[9px] font-black px-2 py-0.5 rounded-full border ${badgeColor}">${items.length}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    ${items.map(item => `
                        <div onclick="triggerHaptic('light'); ${item.action}" 
                             class="bg-[var(--bg-secondary)] hover:bg-[var(--bg-modifier-hover)] border border-[var(--border-subtle)] hover:border-[var(--blurple)] p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer group shadow-sm">
                            <div class="w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-110 transition-transform">
                                ${item.icon}
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="text-xs font-bold text-[var(--text-header)] group-hover:text-[var(--blurple)] transition-colors truncate">
                                    ${highlightText(item.title, trimmedQuery)}
                                </h4>
                                <p class="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                                    ${highlightText(item.subtitle, trimmedQuery)}
                                </p>
                            </div>
                            <i class="fas fa-chevron-right text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-header)] group-hover:translate-x-0.5 transition-transform flex-shrink-0"></i>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        <div class="h-full overflow-y-auto custom-scrollbar bg-[var(--bg-primary)] p-4 lg:p-8 space-y-6 animate-fade-in font-sans">
            <div class="max-w-5xl mx-auto space-y-6">
                <!-- Search Info Header -->
                <div class="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-[var(--blurple)]/20 border border-[var(--blurple)]/30 flex items-center justify-center text-2xl text-[var(--blurple)] shadow-inner">
                            <i class="fas fa-search"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h1 class="text-base font-black text-[var(--text-header)] uppercase tracking-tight">Výsledky hledání: "${trimmedQuery}"</h1>
                                <span class="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[var(--blurple)]/20 text-[var(--blurple)] border border-[var(--blurple)]/30">
                                    ${totalCount} ${totalCount === 1 ? 'výsledek' : (totalCount >= 2 && totalCount <= 4 ? 'výsledky' : 'výsledků')}
                                </span>
                            </div>
                            <p class="text-xs text-[var(--text-muted)] font-medium mt-0.5">Prohledána celá aplikace: média, VUT FIT, posilovna, rande, vzpomínky i slovíčka</p>
                        </div>
                    </div>

                    <button onclick="if(window.switchChannel) window.switchChannel(state.currentChannel || 'dashboard')" 
                            class="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-modifier-hover)] text-[var(--text-header)] rounded-xl border border-[var(--border-subtle)] text-xs font-black uppercase tracking-wider transition active:scale-95">
                        <i class="fas fa-times mr-1"></i> Zavřít hledání
                    </button>
                </div>

                ${totalCount === 0 ? `
                    <div class="bg-[var(--bg-secondary)]/50 border border-dashed border-[var(--border-subtle)] rounded-3xl p-12 text-center space-y-3">
                        <div class="text-4xl opacity-50">🔍</div>
                        <h3 class="text-sm font-bold text-[var(--text-header)]">Pro dotaz "${trimmedQuery}" nebylo nic nalezeno</h3>
                        <p class="text-xs text-[var(--text-muted)] max-w-sm mx-auto">Zkus zadat jiný výraz (např. název cviku, filmu, předmětu na FITu, místa nebo slovíčka).</p>
                    </div>
                ` : `
                    <div class="space-y-6 pb-20">
                        ${renderResultSection('⚡ Rychlá navigace v Kiscordu', results.channels, 'bg-purple-500/20 text-purple-300 border-purple-500/30')}
                        ${renderResultSection('🎯 VUT FIT & Studijní Hub', results.study, 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30')}
                        ${renderResultSection('🏋️‍♂️ Posilovna & Cviky', results.gym, 'bg-amber-500/20 text-amber-300 border-amber-500/30')}
                        ${renderResultSection('🎬 Filmy, Seriály & Hry', results.media, 'bg-blue-500/20 text-blue-300 border-blue-500/30')}
                        ${renderResultSection('📍 Místa na rande, Menzy & Bistro', results.places, 'bg-rose-500/20 text-rose-300 border-rose-500/30')}
                        ${renderResultSection('📸 Vzpomínky & Timeline', results.timeline, 'bg-pink-500/20 text-pink-300 border-pink-500/30')}
                        ${renderResultSection('🏔️ Rakouský slovníček', results.vocab, 'bg-teal-500/20 text-teal-300 border-teal-500/30')}
                        ${renderResultSection('🎓 Maturitní témata', results.matura, 'bg-sky-500/20 text-sky-300 border-sky-500/30')}
                    </div>
                `}
            </div>
        </div>
    `;
}
