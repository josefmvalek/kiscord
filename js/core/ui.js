/**
 * UI Utilities for Kiscord
 * Provides standardized components to ensure visual consistency and reduce HTML repetition.
 */

/**
 * Renders a standardized modal.
 * @param {Object} config - { id, title, subtitle, content, actions, onClose, size }
 * @returns {string} HTML string for the modal
 */
export function renderModal({ id, title, subtitle, content, actions = '', onClose = "closeDayModal()", size = 'md' }) {
    const sizeClasses = {
        'md': 'max-w-md',
        'lg': 'max-w-2xl',
        'xl': 'max-w-4xl',
        '6xl': 'max-w-6xl',
        'full': 'max-w-[95vw] w-full h-[95vh]'
    };
    const sizeClass = sizeClasses[size] || sizeClasses.md;

    return `
        <div id="${id}" class="fixed inset-0 z-[100] hidden modal-backdrop items-center justify-center p-4">
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full ${sizeClass} border border-white/10 overflow-hidden animate-fade-in flex flex-col ${size === 'full' ? '' : 'max-h-[90vh]'}">
                <!-- Modal Header -->
                <div class="bg-black/10 p-5 border-b border-white/5 flex justify-between items-center backdrop-blur-md">
                    <div>
                        <h3 class="font-bold text-[var(--text-header)] text-lg leading-tight drop-shadow-sm">${title}</h3>
                        ${subtitle ? `<p class="text-[10px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-0.5 opacity-80">${subtitle}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <div id="${id}-header-extra"></div>
                        <button onclick="${onClose}" class="text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Modal Body -->
                <div class="p-6 overflow-y-auto custom-scrollbar space-y-6 ${size === 'full' ? 'flex-1 flex flex-col !p-0' : ''}">
                    ${content}
                </div>

                <!-- Modal Actions -->
                ${actions ? `
                <div class="p-4 bg-black/10 border-t border-white/5 flex gap-2">
                    ${actions}
                </div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Generates a standardized button.
 * @param {Object} config - { text, icon, variant, onclick, className }
 */
export function renderButton({ text, icon = '', variant = 'primary', onclick = '', className = '' }) {
    const variants = {
        primary: 'bg-[#5865F2] hover:bg-[#4752c4] text-white',
        secondary: 'bg-[#4f545c] hover:bg-[#5d6269] text-white',
        success: 'bg-[#3ba55c] hover:bg-[#2d7d46] text-white',
        danger: 'bg-[#ed4245] hover:bg-[#c03537] text-white',
        warning: 'bg-[#faa61a] hover:bg-[#c88515] text-white'
    };

    const baseClass = 'px-4 py-2 rounded-xl font-bold transition shadow-lg active:scale-95 flex items-center justify-center gap-2';
    const variantClass = variants[variant] || variants.primary;

    return `
        <button onclick="${onclick}" class="${baseClass} ${variantClass} ${className}">
            ${icon ? `<i class="${icon}"></i>` : ''}
            <span>${text}</span>
        </button>
    `;
}

/**
 * Generates a standardized input group.
 */
/**
 * Renders a standardized card.
 */
export function renderCard({ content, className = '', onclick = '' }) {
    return `
        <div ${onclick ? `onclick="${onclick}"` : ''} 
            class="bg-[var(--bg-secondary)] rounded-2xl border border-white/5 shadow-xl transition-all duration-300 ${onclick ? 'cursor-pointer hover:bg-white/5 active:scale-[0.98]' : ''} ${className}">
            ${content}
        </div>
    `;
}

/**
 * Standardized status/category badge.
 */
export function renderBadge({ text, icon = '', color = '#5865F2', className = '' }) {
    return `
        <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/20 border border-white/5 ${className}">
            ${icon ? `<span class="text-xs">${icon}</span>` : ''}
            <span class="text-[9px] font-black uppercase tracking-wider" style="color: ${color}">${text}</span>
        </div>
    `;
}

/**
 * Specifically for status badges (e.g. Bucket List or Planner)
 */
export function renderStatusBadge({ status, config }) {
    const s = config[status] || { label: status, color: '#b9bbbe', icon: '❓' };
    return `
        <div class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/20 border border-white/5 backdrop-blur-sm">
            <span class="text-[10px] drop-shadow-sm">${s.icon}</span>
            <span class="text-[9px] font-black uppercase tracking-widest leading-none outline-none" style="color: ${s.color}">${s.label}</span>
        </div>
    `;
}

export function renderInputGroup({ label, id, type = 'text', placeholder = '', value = '', attr = '' }) {
    return `
        <div class="space-y-1">
            <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">${label}</label>
            <input type="${type}" id="${id}" placeholder="${placeholder}" value="${value}" ${attr}
                class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
        </div>
    `;
}

/**
 * Renders a standardized error state with a retry button.
 * @param {Object} config - { message, onRetry, containerId }
 */
export function renderErrorState({ message = 'Něco se nepovedlo...', onRetry = '', containerId = '' }) {
    const retryIcon = 'fas fa-redo-alt';
    const retryOnClick = onRetry ? `window.loadModule('utils').then(u => { u.triggerHaptic('light'); ${onRetry} })` : '';

    return `
        <div class="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in group w-full">
            <div class="relative mb-6">
                <div class="text-7xl filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-110">🦝</div>
                <div class="absolute -right-2 -bottom-2 text-3xl animate-bounce-slow">💤</div>
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Mýval usnul v serverovně...</h3>
            <p class="text-gray-400 max-w-xs mb-8 text-sm leading-relaxed">${message}</p>
            ${onRetry ? `
                <button onclick="${retryOnClick}" class="bg-[#4f545c] hover:bg-[#5d6269] text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 border border-white/5">
                    <i class="${retryIcon} text-xs"></i>
                    <span>Zkusit znovu</span>
                </button>
            ` : ''}
        </div>
    `;
}
