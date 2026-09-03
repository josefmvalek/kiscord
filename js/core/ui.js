/**
 * UI Utilities for Kiscord 2.0
 * Provides standardized components to ensure visual consistency and reduce HTML repetition.
 */

// Global Escape Key Listener for Modals
if (typeof window !== 'undefined' && !window.__kiscordEscapeListenerAttached) {
    window.__kiscordEscapeListenerAttached = true;
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Find the topmost visible modal
            const openModals = Array.from(document.querySelectorAll('.kiscord-modal-backdrop, .modal-backdrop, #nutrition-modal, [data-modal]'))
                .filter(m => m.style.display !== 'none' && !m.classList.contains('hidden'));
            
            if (openModals.length > 0) {
                const topModal = openModals[openModals.length - 1];
                const closeBtn = topModal.querySelector('[data-modal-close]') || topModal.querySelector('.modal-close-btn');
                if (closeBtn) {
                    closeBtn.click();
                } else if (topModal.id && typeof window.closeModal === 'function') {
                    window.closeModal(topModal.id);
                } else if (topModal.id === 'nutrition-modal' && typeof window.closeNutritionModal === 'function') {
                    window.closeNutritionModal();
                } else {
                    topModal.style.display = 'none';
                    topModal.remove();
                }
            }
        }
    });
}

// Global Enter Key Submit Listener for Modals
if (typeof window !== 'undefined' && !window.__kiscordEnterSubmitAttached) {
    window.__kiscordEnterSubmitAttached = true;
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const target = e.target;
            if (target && target.tagName === 'INPUT' && target.type !== 'textarea') {
                const modal = target.closest('.kiscord-modal-backdrop, .modal-backdrop, #nutrition-modal');
                if (modal) {
                    const primaryBtn = modal.querySelector('[data-modal-primary]') ||
                        modal.querySelector('.kiscord-btn-primary, .kiscord-btn-accent, .kiscord-btn-success, button[type="submit"]');
                    if (primaryBtn && !primaryBtn.disabled) {
                        e.preventDefault();
                        primaryBtn.click();
                    }
                }
            }
        }
    });
}

/**
 * Automatically focuses and selects the first input in a modal.
 * @param {string} modalId
 */
export function focusFirstInputInModal(modalId) {
    if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const input = modal.querySelector('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
            if (input) {
                input.focus();
                if (input.select && typeof input.select === 'function' && input.type !== 'date' && input.type !== 'time') {
                    input.select();
                }
            }
        });
    }
}

/**
 * Renders a standardized modal.
 * @param {Object} config - { id, title, subtitle, icon, content, actions, onClose, size, extraHeader }
 * @returns {string} HTML string for the modal
 */
export function renderModal({
    id,
    title,
    subtitle = '',
    icon = '',
    content = '',
    actions = '',
    onClose = '',
    size = 'md',
    extraHeader = ''
}) {
    const sizeClasses = {
        'sm': 'max-w-sm',
        'md': 'max-w-md',
        'lg': 'max-w-2xl',
        'xl': 'max-w-4xl',
        '6xl': 'max-w-6xl',
        'full': 'max-w-[95vw] w-full h-[92vh]'
    };
    const sizeClass = sizeClasses[size] || sizeClasses.md;
    const closeHandler = onClose || `window.closeModal('${id}')`;

    return `
        <div id="${id}" 
             class="kiscord-modal-backdrop modal-backdrop fixed inset-0 z-[100] hidden items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
             onclick="if (event.target === this) { ${closeHandler}; }">
            <div class="bg-[var(--bg-secondary)] rounded-t-3xl sm:rounded-2xl shadow-2xl w-full ${sizeClass} border-t sm:border border-[var(--border-default)] overflow-hidden flex flex-col ${size === 'full' ? 'h-[92vh]' : 'max-h-[85vh] sm:max-h-[90vh]'} animate-slide-up sm:animate-scale-in"
                 onclick="event.stopPropagation()">
                
                <!-- Mobile Drag Indicator -->
                <div class="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden flex-shrink-0"></div>

                <!-- Modal Header -->
                <div class="bg-[var(--bg-tertiary)]/80 px-5 py-4 border-b border-[var(--border-subtle)] flex justify-between items-center backdrop-blur-md flex-shrink-0">
                    <div class="flex items-center gap-3 min-w-0">
                        ${icon ? `
                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--blurple)]/20 to-transparent border border-[var(--border-default)] flex items-center justify-center text-lg flex-shrink-0 shadow-inner">
                            ${icon}
                        </div>` : ''}
                        <div class="truncate">
                            <h3 class="font-black text-[var(--text-header)] text-base leading-tight drop-shadow-sm truncate">${title}</h3>
                            ${subtitle ? `<p class="text-[9px] text-[var(--text-muted)] uppercase font-black tracking-widest mt-0.5 opacity-90 truncate">${subtitle}</p>` : ''}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${extraHeader ? `<div id="${id}-header-extra">${extraHeader}</div>` : `<div id="${id}-header-extra"></div>`}
                        <button data-modal-close onclick="${closeHandler}" class="modal-close-btn text-[var(--interactive-normal)] hover:text-[var(--text-header)] transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10" title="Zavřít (Esc)">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Modal Body -->
                <div class="p-5 md:p-6 overflow-y-auto custom-scrollbar space-y-5 ${size === 'full' ? 'flex-1 flex flex-col !p-4' : ''}">
                    ${content}
                </div>

                <!-- Modal Actions / Footer -->
                ${actions ? `
                <div class="px-5 py-3.5 bg-[var(--bg-tertiary)]/90 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2.5 flex-shrink-0 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
                    ${actions}
                </div>` : ''}
            </div>
        </div>
    `;
}

/**
 * Generates a standardized button HTML.
 * @param {Object} config - { text, icon, variant, size, onclick, className, type, id, disabled }
 */
export function renderButton({
    text,
    icon = '',
    variant = 'primary',
    size = 'md',
    onclick = '',
    className = '',
    type = 'button',
    id = '',
    disabled = false
}) {
    const variantMap = {
        primary: 'kiscord-btn-primary',
        secondary: 'kiscord-btn-secondary',
        accent: 'kiscord-btn-accent',
        success: 'kiscord-btn-success',
        danger: 'kiscord-btn-danger',
        warning: 'kiscord-btn-warning',
        ghost: 'kiscord-btn-ghost',
        icon: 'kiscord-btn-icon'
    };

    const sizeMap = {
        sm: 'kiscord-btn-sm',
        md: '',
        lg: 'kiscord-btn-lg'
    };

    const variantClass = variantMap[variant] || 'kiscord-btn-primary';
    const sizeClass = sizeMap[size] || '';
    const clickAttr = onclick ? `onclick="window.triggerHaptic ? window.triggerHaptic('light') : null; ${onclick}"` : '';
    const idAttr = id ? `id="${id}"` : '';
    const disabledAttr = disabled ? 'disabled' : '';

    return `
        <button type="${type}" ${idAttr} ${clickAttr} ${disabledAttr} class="kiscord-btn ${variantClass} ${sizeClass} ${className}">
            ${icon ? `<i class="${icon}"></i>` : ''}
            ${text ? `<span>${text}</span>` : ''}
        </button>
    `;
}

/**
 * Generates a standardized input group.
 */
export function renderInputGroup({
    label,
    id,
    type = 'text',
    placeholder = '',
    value = '',
    inputmode = '',
    step = '',
    enterkeyhint = '',
    attr = '',
    hint = ''
}) {
    const inputmodeAttr = inputmode ? `inputmode="${inputmode}"` : (type === 'number' ? 'inputmode="decimal"' : '');
    const stepAttr = step ? `step="${step}"` : '';
    const enterkeyAttr = enterkeyhint ? `enterkeyhint="${enterkeyhint}"` : 'enterkeyhint="done"';

    return `
        <div class="space-y-1.5 w-full">
            ${label ? `<label for="${id}" class="kiscord-label">${label}</label>` : ''}
            <input type="${type}" id="${id}" placeholder="${placeholder}" value="${value}" ${inputmodeAttr} ${stepAttr} ${enterkeyAttr} ${attr} class="kiscord-input">
            ${hint ? `<p class="text-[10px] text-[var(--text-muted)] italic">${hint}</p>` : ''}
        </div>
    `;
}

/**
 * Generates a standardized select group.
 */
export function renderSelectGroup({
    label,
    id,
    options = [], // [{ value, label, selected }]
    attr = '',
    hint = ''
}) {
    const optionsHtml = options.map(opt => `
        <option value="${opt.value}" ${opt.selected ? 'selected' : ''}>${opt.label}</option>
    `).join('');

    return `
        <div class="space-y-1.5 w-full">
            ${label ? `<label for="${id}" class="kiscord-label">${label}</label>` : ''}
            <select id="${id}" ${attr} class="kiscord-select">
                ${optionsHtml}
            </select>
            ${hint ? `<p class="text-[10px] text-[var(--text-muted)] italic">${hint}</p>` : ''}
        </div>
    `;
}

/**
 * Generates a standardized textarea group.
 */
export function renderTextareaGroup({
    label,
    id,
    placeholder = '',
    value = '',
    rows = 3,
    attr = '',
    hint = ''
}) {
    return `
        <div class="space-y-1.5 w-full">
            ${label ? `<label for="${id}" class="kiscord-label">${label}</label>` : ''}
            <textarea id="${id}" rows="${rows}" placeholder="${placeholder}" ${attr} class="kiscord-textarea">${value}</textarea>
            ${hint ? `<p class="text-[10px] text-[var(--text-muted)] italic">${hint}</p>` : ''}
        </div>
    `;
}

/**
 * Renders a standardized card container.
 */
export function renderCard({ content, className = '', onclick = '', interactive = false }) {
    const clickAttr = onclick ? `onclick="${onclick}"` : '';
    const interactiveClass = (onclick || interactive) ? 'kiscord-card-interactive kiscord-card-hover' : '';

    return `
        <div ${clickAttr} class="glass-card p-5 ${interactiveClass} ${className}">
            ${content}
        </div>
    `;
}

/**
 * Standardized badge component.
 */
export function renderBadge({ text, icon = '', variant = 'default', className = '' }) {
    const variantClass = variant !== 'default' ? `kiscord-badge-${variant}` : '';
    return `
        <div class="kiscord-badge ${variantClass} ${className}">
            ${icon ? `<span>${icon}</span>` : ''}
            <span>${text}</span>
        </div>
    `;
}

/**
 * Status badge with custom label/color/icon map.
 */
export function renderStatusBadge({ status, config }) {
    const s = config[status] || { label: status, color: 'var(--text-muted)', icon: '❓' };
    return `
        <div class="kiscord-badge" style="border-color: ${s.color}40; background: ${s.color}15; color: ${s.color};">
            <span class="text-[10px] drop-shadow-sm">${s.icon}</span>
            <span class="font-black">${s.label}</span>
        </div>
    `;
}

/**
 * Standardized module/channel header banner.
 */
export function renderModuleHeader({ title, subtitle = '', icon = '✨', badge = '', actions = '' }) {
    return `
        <div class="bg-[var(--bg-secondary)] border-b border-[var(--border-subtle)] p-4 lg:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0">
            <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--blurple)]/20 to-transparent flex items-center justify-center text-2xl border border-[var(--border-default)] shadow-inner">
                    ${icon}
                </div>
                <div>
                    <div class="flex items-center gap-2">
                        <h1 class="text-base md:text-lg font-black text-[var(--text-header)] uppercase tracking-tight">${title}</h1>
                        ${badge ? `<span class="bg-[var(--blurple)]/20 text-[var(--blurple)] text-[8px] font-black px-2 py-0.5 rounded-full border border-[var(--blurple)]/30 uppercase tracking-widest">${badge}</span>` : ''}
                    </div>
                    ${subtitle ? `<p class="text-xs text-[var(--text-muted)] font-medium mt-0.5">${subtitle}</p>` : ''}
                </div>
            </div>
            ${actions ? `<div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">${actions}</div>` : ''}
        </div>
    `;
}

/**
 * Standardized Empty State.
 */
export function renderEmptyState({
    icon = '🦝',
    title = 'Tady je zatím prázdno',
    description = 'Zatím tu nic není, ale brzy sem něco společně přidáme!',
    actionText = '',
    onAction = ''
}) {
    return `
        <div class="flex flex-col items-center justify-center py-16 px-6 text-center animate-fade-in w-full">
            <div class="w-16 h-16 rounded-3xl bg-[var(--bg-secondary)] border border-[var(--border-default)] flex items-center justify-center text-3xl mb-4 shadow-xl shadow-black/20">
                ${icon}
            </div>
            <h3 class="text-base font-bold text-[var(--text-header)] mb-1">${title}</h3>
            <p class="text-xs text-[var(--text-muted)] max-w-sm mb-6 leading-relaxed">${description}</p>
            ${actionText ? `
                <button onclick="${onAction}" class="kiscord-btn kiscord-btn-primary kiscord-btn-sm">
                    <i class="fas fa-plus"></i>
                    <span>${actionText}</span>
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Standardized error state with a retry button.
 */
export function renderErrorState({ message = 'Něco se nepovedlo...', onRetry = '' }) {
    const retryOnClick = onRetry ? `window.loadModule('utils').then(u => { u.triggerHaptic('light'); ${onRetry} })` : '';

    return `
        <div class="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in group w-full">
            <div class="relative mb-6">
                <div class="text-7xl filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-110">🦝</div>
                <div class="absolute -right-2 -bottom-2 text-3xl animate-bounce-slow">💤</div>
            </div>
            <h3 class="text-xl font-bold text-[var(--text-header)] mb-2">Mýval usnul v serverovně...</h3>
            <p class="text-[var(--text-muted)] max-w-xs mb-8 text-sm leading-relaxed">${message}</p>
            ${onRetry ? `
                <button onclick="${retryOnClick}" class="kiscord-btn kiscord-btn-secondary">
                    <i class="fas fa-redo-alt text-xs"></i>
                    <span>Zkusit znovu</span>
                </button>
            ` : ''}
        </div>
    `;
}

/**
 * Renders high-performance Skeleton Shimmer placeholders (Zero CLS).
 * @param {Object} config - { type: 'channel' | 'card' | 'grid' | 'list', count: number }
 */
export function renderSkeletonLoader({ type = 'channel', count = 3 } = {}) {
    if (type === 'channel') {
        return `
            <div class="p-4 md:p-6 space-y-6 w-full kiscord-skeleton-container animate-fade-in select-none">
                <!-- Header skeleton -->
                <div class="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                    <div class="flex items-center gap-3.5">
                        <div class="w-11 h-11 rounded-2xl kiscord-skeleton kiscord-skeleton-shimmer shadow-sm"></div>
                        <div class="space-y-2">
                            <div class="w-36 h-4 rounded-lg kiscord-skeleton kiscord-skeleton-shimmer"></div>
                            <div class="w-52 h-3 rounded-md kiscord-skeleton kiscord-skeleton-shimmer opacity-70"></div>
                        </div>
                    </div>
                    <div class="w-28 h-9 rounded-xl kiscord-skeleton kiscord-skeleton-shimmer shadow-sm"></div>
                </div>
                <!-- Grid Cards skeleton -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${Array.from({ length: count }).map(() => `
                        <div class="kiscord-skeleton-card">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl kiscord-skeleton kiscord-skeleton-shimmer flex-shrink-0"></div>
                                <div class="flex-1 space-y-1.5 min-w-0">
                                    <div class="w-3/4 h-3.5 rounded-md kiscord-skeleton kiscord-skeleton-shimmer"></div>
                                    <div class="w-1/2 h-2.5 rounded-md kiscord-skeleton kiscord-skeleton-shimmer opacity-70"></div>
                                </div>
                            </div>
                            <div class="w-full h-20 rounded-xl kiscord-skeleton kiscord-skeleton-shimmer mt-1"></div>
                            <div class="flex justify-between items-center mt-2 pt-2.5 border-t border-[var(--border-subtle)]">
                                <div class="w-24 h-3 rounded-md kiscord-skeleton kiscord-skeleton-shimmer opacity-60"></div>
                                <div class="w-14 h-6 rounded-lg kiscord-skeleton kiscord-skeleton-shimmer"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (type === 'list') {
        return `
            <div class="p-4 space-y-3 w-full kiscord-skeleton-container animate-fade-in select-none">
                ${Array.from({ length: count }).map(() => `
                    <div class="p-4 rounded-2xl bg-[var(--luxe-glass-bg,var(--bg-secondary))] border border-[var(--luxe-glass-border,var(--border-subtle))] flex items-center justify-between gap-4 shadow-sm">
                        <div class="flex items-center gap-3.5 min-w-0 flex-1">
                            <div class="kiscord-skeleton-avatar kiscord-skeleton-shimmer flex-shrink-0"></div>
                            <div class="space-y-1.5 flex-1 min-w-0">
                                <div class="w-1/2 h-3.5 rounded-md kiscord-skeleton kiscord-skeleton-shimmer"></div>
                                <div class="w-1/3 h-2.5 rounded-md kiscord-skeleton kiscord-skeleton-shimmer opacity-70"></div>
                            </div>
                        </div>
                        <div class="w-16 h-8 rounded-xl kiscord-skeleton kiscord-skeleton-shimmer flex-shrink-0"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 kiscord-skeleton-container animate-fade-in select-none">
            ${Array.from({ length: count }).map(() => `
                <div class="kiscord-skeleton-card">
                    <div class="w-full h-32 rounded-xl kiscord-skeleton kiscord-skeleton-shimmer mb-2"></div>
                    <div class="w-3/4 h-4 rounded-md kiscord-skeleton kiscord-skeleton-shimmer"></div>
                    <div class="w-1/2 h-3 rounded-md kiscord-skeleton kiscord-skeleton-shimmer opacity-70"></div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Standardized Bento-Grid Metric Card Component.
 */
export function renderMetricCard({
    title,
    value,
    unit = '',
    trend = null,
    trendLabel = '',
    icon = '✨',
    color = 'var(--blurple)',
    subtitle = '',
    onclick = '',
    className = ''
} = {}) {
    const clickAttr = onclick ? `onclick="${onclick}" class="kiscord-bento-card cursor-pointer group active-pop ${className}"` : `class="kiscord-bento-card group ${className}"`;

    return `
        <div ${clickAttr}>
            <div class="flex justify-between items-start mb-3">
                <span class="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">${title}</span>
                <div class="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-inner group-hover:scale-110 transition-transform" style="background: ${color}20; color: ${color}; border: 1px solid ${color}35;">
                    ${icon}
                </div>
            </div>
            <div class="flex items-baseline gap-1.5 my-1">
                <span class="text-2xl md:text-3xl font-black text-[var(--text-header)] tracking-tight">${value}</span>
                ${unit ? `<span class="text-xs font-bold text-[var(--text-muted)]">${unit}</span>` : ''}
            </div>
            ${subtitle ? `<p class="text-[11px] text-[var(--text-muted)] mt-0.5">${subtitle}</p>` : ''}
            ${trend !== null ? `
                <div class="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-wider ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                    <i class="fas fa-arrow-${trend >= 0 ? 'up' : 'down'} text-[9px]"></i>
                    <span>${Math.abs(trend)}% ${trendLabel || 'oproti minulu'}</span>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Closes a modal by ID or element reference.
 * Hides it, adds 'hidden' class, and removes dynamic modals after animation.
 * @param {string|HTMLElement} id - Modal element ID or element itself
 */
export function closeModal(id) {
    const modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (!modal) return;
    modal.classList.add('opacity-0');
    modal.classList.add('hidden');
    modal.style.display = 'none';
    if (modal.dataset && modal.dataset.dynamicModal === 'true') {
        setTimeout(() => modal.remove(), 250);
    }
    if (id === 'gallery-modal' && window.Timeline && window.Timeline.closeGallery) {
        window.Timeline.closeGallery();
    }
}
