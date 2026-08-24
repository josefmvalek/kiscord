import { state, saveStateToCache, stateEvents } from '@core/state.js';
import { triggerHaptic } from '@core/utils.js';

export function renderWidgetToggle(id, title, desc) {
    const isEnabled = state.settings.dashboardWidgets[id];
    return `
        <div class="bg-[#2f3136] p-4 rounded-xl flex items-center justify-between border border-white/5">
            <div class="flex-1 mr-4">
                <h3 class="text-white font-bold text-sm">${title}</h3>
                <p class="text-[10px] text-[#b9bbbe] line-clamp-1">${desc}</p>
            </div>
            <div class="relative inline-flex items-center cursor-pointer flex-shrink-0" onclick="window.toggleWidget('${id}', this)">
                <div class="w-10 h-5 rounded-full transition-colors ${isEnabled ? 'bg-[#853ee6]' : 'bg-[#4f545c]'}"></div>
                <div class="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-5' : ''}"></div>
            </div>
        </div>
    `;
}

export function toggleWidget(id, el) {
    triggerHaptic('light');
    state.settings.dashboardWidgets[id] = !state.settings.dashboardWidgets[id];

    const bg = el.querySelector('.rounded-full');
    const dot = el.querySelector('.absolute.bg-white');
    if (bg && dot) {
        if (state.settings.dashboardWidgets[id]) {
            bg.classList.replace('bg-[#4f545c]', 'bg-[#853ee6]');
            dot.classList.add('translate-x-5');
        } else {
            bg.classList.replace('bg-[#853ee6]', 'bg-[#4f545c]');
            dot.classList.remove('translate-x-5');
        }
    }

    saveStateToCache();
    stateEvents.emit('settings_changed');
}
