import { state } from '../state.js';
import { getChannelItemById, channelCategories } from './channel-registry.js';
import { getServerForChannel, getServerById, applyServerAmbientTheme, updateHeaderLoveCoins } from '../servers.js';
import { moduleMap } from './module-loader.js';
import { switchChannel } from './navigation.js';

export function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            moduleMap.search().then(m => m.renderGlobalSearch(m.expandSearchQuery(query)));
        } else {
            switchChannel(state.currentChannel);
        }
    });
}

export function updateChannelHeader(channelId) {
    const nameEl = document.getElementById('channel-name');
    const descEl = document.getElementById('channel-desc');
    const iconEl = document.getElementById('channel-icon');

    const server = getServerForChannel(channelId);
    applyServerAmbientTheme(server?.id);
    updateHeaderLoveCoins();

    if (channelId === 'dashboard') {
        if (nameEl) nameEl.textContent = 'Můj Den';
        if (descEl) descEl.textContent = 'Tvůj osobní přehled a zdraví ❤️';
        if (iconEl) {
            iconEl.className = 'fas fa-heart text-[#eb459e] text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    if (channelId === 'changelog') {
        if (nameEl) nameEl.textContent = 'changelog';
        if (descEl) descEl.textContent = 'Historie změn a vylepšení v Kiscordu. 📢';
        if (iconEl) {
            iconEl.className = 'fas fa-bullhorn text-[#faa61a] text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    if (channelId === 'calendar') {
        if (nameEl) nameEl.textContent = 'Kalendář';
        if (descEl) descEl.textContent = 'Plánování našich akcí a školy 📅';
        if (iconEl) {
            iconEl.className = 'fas fa-calendar-alt text-[#5865F2] text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    if (channelId === 'restore-data') {
        if (nameEl) nameEl.textContent = 'Obnova Dat';
        if (descEl) descEl.textContent = 'Migrace historických záznamů 🛠️';
        if (iconEl) {
            iconEl.className = 'fas fa-history text-blue-400 text-xl mr-2';
            iconEl.innerHTML = '';
        }
        return;
    }

    let found = getChannelItemById(channelId);
    if (!found) {
        channelCategories.forEach(cat => {
            const item = cat.items.find(i => i.id === channelId);
            if (item) found = item;
        });
    }

    if (found) {
        if (nameEl) nameEl.textContent = found.name;
        if (descEl) descEl.textContent = found.desc || '';
        if (iconEl) {
            iconEl.className = 'text-xl mr-2 flex items-center justify-center w-6 h-6';
            iconEl.innerHTML = found.icon;
            iconEl.style.color = found.color || 'inherit';
        }
    }
}

