/**
 * UI Utilities for Kiscord
 * Provides standardized components to ensure visual consistency and reduce HTML repetition.
 */

/**
 * Renders a standardized modal.
 * @param {Object} config - { id, title, subtitle, content, actions, onClose }
 * @returns {string} HTML string for the modal
 */
export function renderModal({ id, title, subtitle, content, actions = '', onClose = "closeDayModal()" }) {
    return `
        <div id="${id}" class="fixed inset-0 z-[100] hidden modal-backdrop items-center justify-center p-4">
            <div class="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-md border border-white/10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
                <!-- Modal Header -->
                <div class="bg-black/20 p-5 border-b border-white/5 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-white text-lg leading-tight">${title}</h3>
                        ${subtitle ? `<p class="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5">${subtitle}</p>` : ''}
                    </div>
                    <button onclick="${onClose}" class="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <!-- Modal Body -->
                <div class="p-6 overflow-y-auto custom-scrollbar space-y-6">
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
export function renderInputGroup({ label, id, type = 'text', placeholder = '', value = '', attr = '' }) {
    return `
        <div class="space-y-1">
            <label class="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">${label}</label>
            <input type="${type}" id="${id}" placeholder="${placeholder}" value="${value}" ${attr}
                class="w-full bg-[#202225] text-white text-xs p-3 rounded-xl border border-[#2f3136] outline-none focus:border-[#5865F2]/50 transition-all">
        </div>
    `;
}
