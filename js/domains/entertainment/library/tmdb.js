import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { safeInsert } from '@core/offline.js';
import { triggerHaptic } from '@core/utils.js';
import { showNotification } from '@core/theme.js';
import { renderModal, renderButton, renderInputGroup } from '@core/ui.js';
import * as TMDB from '@core/tmdb.js';
import { ensureModals } from './modals.js';

export function mapGenresToCategory(genresString) {
    if (!genresString) return "Ostatní";
    const categories = ["Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický", "Dobrodružný", "Ostatní"];
    const genreList = genresString.split(',').map(g => g.trim().toLowerCase());

    for (const genre of genreList) {
        const direct = categories.find(c => c.toLowerCase() === genre);
        if (direct) return direct;

        if (genre.includes("sci-fi") || genre.includes("science fiction") || genre === "vědecko-fantastický" || genre === "sci-fi & fantasy") {
            return "Sci-Fi";
        }
        if (genre === "akční a dobrodružný" || genre.includes("akční")) {
            return "Akční";
        }
        if (genre === "krimi" || genre === "thriller" || genre === "mysteriózní" || genre.includes("krimi") || genre.includes("thriller")) {
            return "Drama";
        }
        if (genre === "mýdlová opera") {
            return "Romantický";
        }
    }
    
    for (const genre of genreList) {
        for (const cat of categories) {
            if (genre.includes(cat.toLowerCase()) || cat.toLowerCase().includes(genre)) {
                if (cat !== "Ostatní") return cat;
            }
        }
    }

    return "Ostatní";
}

export function showAddMediaModal(category) {
    const targetCat = (category === 'movie' || category === 'movies') ? 'movies' : ((category === 'series') ? 'series' : 'games');
    const modalTitle = targetCat === 'movies' ? 'Přidat film' : (targetCat === 'series' ? 'Přidat seriál' : 'Přidat hru');
    const defaultEmoji = targetCat === 'games' ? '🎮' : '🎬';

    const categories = targetCat === 'games' 
        ? ["RPG", "FPS", "Strategie", "Simulátor", "Závodní", "Ostatní"]
        : ["Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický", "Dobrodružný", "Ostatní"];

    let modalContent = `
        <div class="space-y-6 text-left">
            ${targetCat !== 'games' ? `
            <div class="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-3">
                <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] text-blue-400 font-black uppercase tracking-widest">Vyhledat na TMDB 🎬</label>
                    <span class="text-[9px] text-gray-500 italic">Automatické doplnění</span>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="tmdb-search-input" placeholder="Zadej název filmu..." 
                           class="flex-1 bg-[#202225] text-white p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all text-sm">
                    <button onclick="Library.searchTMDBInModal('${targetCat}')" class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-4 rounded-xl transition">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
                <div id="tmdb-results" class="hidden max-h-48 overflow-y-auto custom-scrollbar space-y-1 pt-2"></div>
            </div>
            ` : ''}

            <div class="space-y-4">
                ${renderInputGroup({ label: 'Název', id: 'm-title', placeholder: targetCat === 'games' ? 'Např. It Takes Two' : 'Např. Inception' })}
                
                <div class="grid grid-cols-2 gap-4">
                    ${renderInputGroup({ label: 'Ikona (emoji)', id: 'm-icon', placeholder: defaultEmoji, attr: 'class="text-center text-2xl w-full bg-[#202225] text-white p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all"' })}
                    <div class="space-y-1">
                        <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                        <select id="m-cat" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all">
                            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                ${targetCat === 'games' ? `
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Stav hry</label>
                    <select id="m-game-status" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all">
                        <option value="máme" selected>🎮 Máme (V naší knihovně)</option>
                        <option value="chceme">🌟 Chceme (V plánu / Wishlist)</option>
                        <option value="dohráno">🏆 Dohráno (Dokončeno)</option>
                    </select>
                </div>

                <div class="bg-[#faa61a]/10 border border-[#faa61a]/30 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#faa61a]/15 transition" onclick="const cb = document.getElementById('m-is-frequent'); cb.checked = !cb.checked;">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl text-[#faa61a]">⚡</span>
                        <div>
                            <div class="text-xs font-bold text-white">Naše stálice (Často hrané)</div>
                            <div class="text-[10px] text-gray-400">Zahrnout do rychlého výběru v Herním Tinderu</div>
                        </div>
                    </div>
                    <input type="checkbox" id="m-is-frequent" class="w-4 h-4 accent-[#faa61a] rounded pointer-events-none" />
                </div>
                ` : ''}
                
                ${renderInputGroup({ label: 'Magnet Link (volitelné)', id: 'm-magnet', placeholder: 'magnet:?xt=...', attr: 'class="w-full bg-[#202225] text-white text-[10px] p-3 rounded-xl border border-[#2f3136] outline-none font-mono"' })}
                ${renderInputGroup({ label: 'Google Drive Link (volitelné)', id: 'm-gdrive', placeholder: 'https://drive.google.com/...' })}
                ${renderInputGroup({ label: 'Mood Tags / Vibes (oddělit čárkou)', id: 'm-moods', placeholder: 'Např. Kooperativní, Zábava, Pohoda' })}
                
                <input type="hidden" id="m-tmdb-id">
                <input type="hidden" id="m-poster-path">
                <input type="hidden" id="m-rating">
                <input type="hidden" id="m-runtime">
                <input type="hidden" id="m-genres">
                <input type="hidden" id="m-year">
            </div>
        </div>
    `;

    const modalActions = renderButton({
        text: 'ULOŽIT DO KNIHOVNY 🚀',
        onclick: `Library.saveNewMedia('${targetCat}')`,
        className: 'w-full py-4 text-lg'
    });

    const modalHtml = renderModal({
        id: 'media-admin-modal',
        title: modalTitle,
        subtitle: 'Rozšíření naší sbírky',
        content: modalContent,
        actions: modalActions,
        onClose: "document.getElementById('media-admin-modal')?.remove()"
    });

    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    const modalElement = container.firstElementChild;
    document.body.appendChild(modalElement);
    modalElement.classList.replace('hidden', 'flex');
}

export async function saveNewMedia(category, refreshFn) {
    const targetCat = (category === 'movie' || category === 'movies') ? 'movies' : ((category === 'series') ? 'series' : 'games');
    const dbType = (targetCat === 'movies') ? 'movie' : ((targetCat === 'series') ? 'series' : 'game');

    const titleEl = document.getElementById('m-title');
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) {
        showNotification("Název je povinný!", "error");
        return;
    }

    const iconEl = document.getElementById('m-icon');
    const icon = (iconEl && iconEl.value.trim()) ? iconEl.value.trim() : (dbType === 'game' ? '🎮' : '🎬');
    const catEl = document.getElementById('m-cat');
    const cat = catEl ? catEl.value : 'Ostatní';
    const magnetEl = document.getElementById('m-magnet');
    const magnet = magnetEl ? magnetEl.value.trim() : '';
    const gdriveEl = document.getElementById('m-gdrive');
    const gdrive = gdriveEl ? gdriveEl.value.trim() : '';
    const moodsEl = document.getElementById('m-moods');
    let moodTags = moodsEl ? moodsEl.value.split(',').map(t => t.trim()).filter(t => t !== "") : [];

    const isFrequentEl = document.getElementById('m-is-frequent');
    if (isFrequentEl && isFrequentEl.checked && !moodTags.includes('stálice')) {
        moodTags.push('stálice');
    }

    const gameStatusEl = document.getElementById('m-game-status');
    if (gameStatusEl && dbType === 'game') {
        const gStatus = gameStatusEl.value;
        if (gStatus && !moodTags.includes(gStatus)) {
            moodTags.push(gStatus);
        }
    }
    
    const tmdbId = document.getElementById('m-tmdb-id')?.value;
    const posterPath = document.getElementById('m-poster-path')?.value;
    const rating = parseFloat(document.getElementById('m-rating')?.value || '0');
    const runtime = parseInt(document.getElementById('m-runtime')?.value || '0');
    const genres = document.getElementById('m-genres')?.value;
    const year = parseInt(document.getElementById('m-year')?.value || '0');
    
    triggerHaptic('success');

    const fullPayload = {
        type: dbType,
        title,
        icon,
        category: cat,
        magnet: magnet || null,
        gdrive: gdrive || null,
        mood_tags: moodTags,
        tmdb_id: tmdbId ? parseInt(tmdbId) : null,
        poster_path: posterPath || null,
        rating: (!isNaN(rating) && rating > 0) ? rating : null,
        runtime: (!isNaN(runtime) && runtime > 0) ? runtime : null,
        genres: genres || null,
        release_year: (!isNaN(year) && year > 0) ? year : null
    };
    
    try {
        let insertedItem = null;
        const { data: newItems, error } = await safeInsert('library_content', [fullPayload]);
        
        if (error) {
            console.warn("safeInsert fullPayload failed, attempting fallback insert:", error);
            const basicPayload = {
                type: dbType,
                title,
                icon,
                category: cat,
                magnet: magnet || null,
                gdrive: gdrive || null
            };
            const { data: fallbackData, error: fallbackErr } = await safeInsert('library_content', [basicPayload]);
            if (fallbackErr) throw fallbackErr;
            insertedItem = (fallbackData && fallbackData[0]) || basicPayload;
        } else {
            insertedItem = (newItems && newItems[0]) || fullPayload;
        }
        
        if (!insertedItem.id) {
            insertedItem.id = Date.now();
        }

        if (!state.library[targetCat]) state.library[targetCat] = [];
        const stateItem = {
            id: insertedItem.id,
            title: insertedItem.title || title,
            icon: insertedItem.icon || icon,
            cat: insertedItem.category || cat,
            magnet: insertedItem.magnet || magnet,
            gdrive: insertedItem.gdrive || gdrive,
            mood_tags: insertedItem.mood_tags || moodTags,
            tmdb_id: insertedItem.tmdb_id || (tmdbId ? parseInt(tmdbId) : null),
            poster_path: insertedItem.poster_path || posterPath || null,
            rating: insertedItem.rating || (rating > 0 ? rating : null),
            runtime: insertedItem.runtime || (runtime > 0 ? runtime : null),
            genres: insertedItem.genres || genres || null,
            release_year: insertedItem.release_year || (year > 0 ? year : null),
            is_frequent: moodTags.includes('stálice')
        };
        state.library[targetCat].push(stateItem);
        
        document.getElementById('media-admin-modal')?.remove();
        
        if (window.showNotification) window.showNotification(`"${title}" přidán do knihovny! ✨`, "success");
        if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
        
        if (refreshFn) refreshFn(targetCat);
        
    } catch (err) {
        console.error("Save Media Error:", err);
        showNotification("Chyba při ukládání: " + err.message, "error");
    }
}

export async function searchTMDBInModal(category) {
    const input = document.getElementById('tmdb-search-input') || document.getElementById('tmdb-quick-search');
    const resultsContainer = document.getElementById('tmdb-results');
    const query = input?.value.trim();

    if (!query) return;

    triggerHaptic('light');
    
    if (!resultsContainer) {
        showAddMediaModal(category);
        const modalInput = document.getElementById('tmdb-search-input');
        if (modalInput) {
            modalInput.value = query;
        }
        setTimeout(() => {
            searchTMDBInModal(category);
        }, 80);
        return;
    }

    resultsContainer.innerHTML = '<div class="text-center py-4 text-xs text-gray-500 animate-pulse">Hledám na TMDB... 🕵️‍♂️</div>';
    resultsContainer.classList.remove('hidden');

    const results = await TMDB.searchTMDB(query, category);

    if (!resultsContainer) return;

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center py-4 text-xs text-red-400">Nebyly nalezeny žádné výsledky.</div>';
    } else {
        resultsContainer.innerHTML = results.slice(0, 5).map(res => {
            const title = res.title || res.name;
            const year = new Date(res.release_date || res.first_air_date).getFullYear() || '????';
            const poster = res.poster_path ? TMDB.getTMDBImageUrl(res.poster_path, 'w92') : null;

            return `
                <div onclick="Library.selectTMDBResult(${res.id}, '${category}')" 
                     class="flex items-center gap-3 p-2 bg-[#2f3136] hover:bg-[#5865F2]/20 border border-transparent hover:border-[#5865F2]/40 rounded-xl cursor-pointer transition group">
                     <div class="w-10 h-14 bg-[#202225] rounded-lg overflow-hidden flex-shrink-0">
                        ${poster ? `<img src="${poster}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-xs text-gray-600">🎬</div>'}
                     </div>
                     <div class="flex-1 min-w-0">
                        <div class="text-xs font-bold text-white truncate group-hover:text-[#5865F2] transition">${title}</div>
                        <div class="text-[10px] text-gray-500 font-medium">${year}</div>
                     </div>
                     <i class="fas fa-plus text-gray-700 group-hover:text-[#5865F2] mr-2"></i>
                </div>
            `;
        }).join('');
    }
}

export async function selectTMDBResult(id, category) {
    triggerHaptic('success');
    
    const resultsContainer = document.getElementById('tmdb-results');
    if (resultsContainer) resultsContainer.innerHTML = '<div class="text-center py-4 text-xs text-blue-400 animate-pulse">Stahuji detaily... 🚀</div>';

    const details = await TMDB.getTMDBDetails(id, category);

    if (!details) {
        showNotification("Nepodařilo se stáhnout detaily z TMDB.", "error");
        return;
    }

    document.getElementById('m-title').value = details.title;
    document.getElementById('m-tmdb-id').value = details.tmdb_id;
    document.getElementById('m-poster-path').value = details.poster_path;
    document.getElementById('m-rating').value = details.rating;
    document.getElementById('m-runtime').value = details.runtime;
    document.getElementById('m-genres').value = details.genres;
    document.getElementById('m-year').value = details.release_year;

    const moodsInput = document.getElementById('m-moods');
    if (!moodsInput.value.trim() && details.genres) {
        moodsInput.value = details.genres;
    }

    if (details.genres) {
        const mappedCat = mapGenresToCategory(details.genres);
        const catSelect = document.getElementById('m-cat');
        if (catSelect) {
            catSelect.value = mappedCat;
        }
    }

    if (resultsContainer) {
        resultsContainer.innerHTML = `
            <div class="bg-[#3ba55c]/10 border border-[#3ba55c]/30 p-3 rounded-xl flex items-center gap-3 animate-slide-up">
                <div class="text-xl text-[#3ba55c]"><i class="fas fa-check-circle"></i></div>
                <div class="text-[10px] font-bold text-[#3ba55c] uppercase">Data úspěšně stažena!</div>
            </div>
        `;
        setTimeout(() => resultsContainer.classList.add('hidden'), 2000);
    }

    showNotification(`Film "${details.title}" načten z TMDB!`, "success");
}

export function showEditMediaModal(itemId, category) {
    let cat = (category === 'movie' || category === 'movies') ? 'movies' : ((category === 'series') ? 'series' : 'games');
    let item = state.library[cat]?.find(i => i.id === itemId);
    if (!item) {
        for (const [c, list] of Object.entries(state.library || {})) {
            if (Array.isArray(list)) {
                const found = list.find(i => i.id === itemId);
                if (found) { item = found; cat = c; break; }
            }
        }
    }
    if (!item) return;

    const isFrequent = item.is_frequent || (item.mood_tags || []).includes('stálice') || item.cat === 'Stálice';
    const currentGameStatus = (state.watchHistory[item.id]?.status === 'seen' || (item.mood_tags || []).includes('dohráno')) ? 'dohráno' : (((item.mood_tags || []).includes('chceme') || (state.watchlist || []).some(w => String(w.id) === String(item.id))) ? 'chceme' : 'máme');
    const modalTitle = cat === 'games' ? 'Upravit hru' : (cat === 'series' ? 'Upravit seriál' : 'Upravit film');
    const categories = cat === 'games' 
        ? ["RPG", "FPS", "Strategie", "Simulátor", "Závodní", "Ostatní"]
        : ["Akční", "Sci-Fi", "Komedie", "Animovaný", "Fantasy", "Drama", "Horor", "Romantický", "Dobrodružný", "Ostatní"];

    let modalContent = `
        <div class="space-y-6 text-left">
            <div class="space-y-4">
                <input type="hidden" id="edit-id" value="${item.id}">
                ${renderInputGroup({ label: 'Název', id: 'm-title-edit', placeholder: 'Název', value: item.title })}
                
                <div class="grid grid-cols-2 gap-4">
                    ${renderInputGroup({ label: 'Ikona (emoji)', id: 'm-icon-edit', placeholder: '🎬', value: item.icon, attr: 'class="text-center text-2xl w-full bg-[#202225] text-white p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all"' })}
                    <div class="space-y-1">
                        <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Kategorie</label>
                        <select id="m-cat-edit" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all">
                            ${categories.map(c => `<option value="${c}" ${c === item.cat ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                ${cat === 'games' ? `
                <div class="space-y-1">
                    <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">Stav hry</label>
                    <select id="m-game-status-edit" class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2] transition-all">
                        <option value="máme" ${currentGameStatus === 'máme' ? 'selected' : ''}>🎮 Máme (V naší knihovně)</option>
                        <option value="chceme" ${currentGameStatus === 'chceme' ? 'selected' : ''}>🌟 Chceme (V plánu / Wishlist)</option>
                        <option value="dohráno" ${currentGameStatus === 'dohráno' ? 'selected' : ''}>🏆 Dohráno (Dokončeno)</option>
                    </select>
                </div>

                <div class="bg-[#faa61a]/10 border border-[#faa61a]/30 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:bg-[#faa61a]/15 transition" onclick="const cb = document.getElementById('m-is-frequent-edit'); cb.checked = !cb.checked;">
                    <div class="flex items-center gap-2.5">
                        <span class="text-xl text-[#faa61a]">⚡</span>
                        <div>
                            <div class="text-xs font-bold text-white">Naše stálice (Často hrané)</div>
                            <div class="text-[10px] text-gray-400">Zahrnout do rychlého výběru v Herním Tinderu</div>
                        </div>
                    </div>
                    <input type="checkbox" id="m-is-frequent-edit" class="w-4 h-4 accent-[#faa61a] rounded pointer-events-none" ${isFrequent ? 'checked' : ''} />
                </div>
                ` : ''}
                
                ${renderInputGroup({ label: 'Magnet Link', id: 'm-magnet-edit', placeholder: 'magnet:?xt=...', value: item.magnet || '', attr: 'class="w-full bg-[#202225] text-white text-[10px] p-3 rounded-xl border border-[#2f3136] outline-none font-mono"' })}
                ${renderInputGroup({ label: 'Google Drive Link', id: 'm-gdrive-edit', placeholder: 'https://drive.google.com/...', value: item.gdrive || '' })}
                ${renderInputGroup({ label: 'Mood Tags (oddělit čárkou)', id: 'm-moods-edit', placeholder: 'Moods', value: (item.mood_tags || []).filter(t => !['stálice', 'máme', 'chceme', 'dohráno'].includes(t)).join(', ') })}
            </div>
        </div>
    `;

    const modalActions = `
        <div class="flex gap-3 mt-2">
            <button onclick="Library.deleteMedia(${item.id}, '${cat}')" class="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-bold transition border border-red-500/30">
                <i class="fas fa-trash-alt mr-2 text-xs"></i>Smazat
            </button>
            <button onclick="Library.updateMedia(${item.id}, '${cat}')" class="flex-[2] bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-xl font-bold shadow-lg transition">
                ULOŽIT ZMĚNY 💾
            </button>
        </div>
    `;

    const modalHtml = renderModal({
        id: 'media-edit-modal',
        title: modalTitle,
        subtitle: item.title,
        content: modalContent,
        actions: modalActions,
        onClose: "document.getElementById('media-edit-modal')?.remove()"
    });

    const container = document.createElement('div');
    container.innerHTML = modalHtml;
    const modalElement = container.firstElementChild;
    document.body.appendChild(modalElement);
    modalElement.classList.replace('hidden', 'flex');
}

export async function updateMedia(itemId, category, refreshFn) {
    let cat = (category === 'movie' || category === 'movies') ? 'movies' : ((category === 'series') ? 'series' : 'games');
    if (!state.library[cat]) {
        for (const [c, list] of Object.entries(state.library || {})) {
            if (Array.isArray(list) && list.some(i => i.id === itemId)) {
                cat = c; break;
            }
        }
    }

    const titleEl = document.getElementById('m-title-edit');
    const title = titleEl ? titleEl.value.trim() : '';
    const icon = document.getElementById('m-icon-edit')?.value.trim() || "🎬";
    const itemCat = document.getElementById('m-cat-edit')?.value || 'Ostatní';
    const magnet = document.getElementById('m-magnet-edit')?.value.trim() || '';
    const gdrive = document.getElementById('m-gdrive-edit')?.value.trim() || '';
    let mood_tags = (document.getElementById('m-moods-edit')?.value || '').split(',').map(t => t.trim()).filter(t => t !== "");

    const isFrequentEl = document.getElementById('m-is-frequent-edit');
    if (isFrequentEl) {
        if (isFrequentEl.checked && !mood_tags.includes('stálice')) {
            mood_tags.push('stálice');
        } else if (!isFrequentEl.checked) {
            mood_tags = mood_tags.filter(t => t !== 'stálice');
        }
    }

    const gameStatusEl = document.getElementById('m-game-status-edit');
    if (gameStatusEl && cat === 'games') {
        const gStatus = gameStatusEl.value;
        mood_tags = mood_tags.filter(t => !['máme', 'chceme', 'dohráno'].includes(t));
        mood_tags.push(gStatus);
        if (gStatus === 'dohráno') {
            if (!state.watchHistory[itemId]) state.watchHistory[itemId] = { status: 'seen', rating: 0, date: new Date().toISOString().split('T')[0] };
            else state.watchHistory[itemId].status = 'seen';
        } else {
            if (state.watchHistory[itemId]) state.watchHistory[itemId].status = 'unseen';
        }
    }

    if (!title) {
        showNotification("Název je povinný!", "error");
        return;
    }

    triggerHaptic('success');
    
    try {
        const { error } = await supabase.from('library_content').update({
            title, icon, category: itemCat, magnet, gdrive, mood_tags
        }).eq('id', itemId);

        if (error) {
            console.warn("Update with mood_tags failed, attempting basic update fallback:", error);
            const { error: basicErr } = await supabase.from('library_content').update({
                title, icon, category: itemCat, magnet, gdrive
            }).eq('id', itemId);
            if (basicErr) throw basicErr;
        }

        if (state.library[cat]) {
            const itemIdx = state.library[cat].findIndex(i => i.id === itemId);
            if (itemIdx !== -1) {
                state.library[cat][itemIdx] = {
                    ...state.library[cat][itemIdx],
                    title, icon, cat: itemCat, magnet, gdrive, mood_tags,
                    is_frequent: mood_tags.includes('stálice')
                };
            }
        }

        document.getElementById('media-edit-modal')?.remove();
        showNotification("Změny uloženy! ✨", "success");
        if (refreshFn) refreshFn(cat);

    } catch (err) {
        console.error("Update Media Error:", err);
        showNotification("Chyba při ukládání: " + err.message, "error");
    }
}

export async function deleteMedia(itemId, category, refreshFn) {
    let cat = category;
    let item = state.library[cat]?.find(i => i.id === itemId);
    if (!item) {
        for (const [c, list] of Object.entries(state.library || {})) {
            if (Array.isArray(list)) {
                const found = list.find(i => i.id === itemId);
                if (found) { item = found; cat = c; break; }
            }
        }
    }
    if (!item) return;

    ensureModals();
    const modal = document.getElementById("delete-media-modal");
    const nameSpan = document.getElementById("delete-media-name");
    const confirmBtn = document.getElementById("confirm-delete-media-btn");

    if (nameSpan) nameSpan.innerText = item.title;
    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            triggerHaptic('heavy');
            try {
                const { error } = await supabase.from('library_content').delete().eq('id', itemId);
                if (error) throw error;

                if (state.library[cat]) {
                    state.library[cat] = state.library[cat].filter(i => i.id !== itemId);
                }
                
                if (window.closeModal) window.closeModal('delete-media-modal');
                else modal.style.display = 'none';
                
                document.getElementById('media-edit-modal')?.remove();
                showNotification("Smazáno z knihovny 🗑️", "success");
                if (refreshFn) refreshFn(cat);
            } catch (err) {
                console.error("Delete Media Error:", err);
                showNotification("Chyba při mazání: " + err.message, "error");
            }
        };
    }

    if (modal) modal.style.display = "flex";
}
