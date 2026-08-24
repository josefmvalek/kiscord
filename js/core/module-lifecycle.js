/**
 * Kiscord Module Lifecycle & Cleanup Management
 * Provides a standardized contract for all modular views in Kiscord.
 */

/**
 * @typedef {Object} AppModule
 * @property {(container: HTMLElement, params?: Record<string, any>) => Promise<void> | void} mount - Called when entering the channel
 * @property {() => void} [unmount] - Called when navigating away from the channel
 * @property {(event: string, payload: any) => void} [onStateChange] - Optional state update subscriber
 * @property {() => Record<string, any>} [getMetadata] - Optional metadata accessor
 */

export class CleanupCollector {
    constructor() {
        /** @type {Array<() => void>} */
        this._cleanups = [];
    }

    /**
     * Add a generic cleanup function
     * @param {() => void} fn
     */
    add(fn) {
        if (typeof fn === 'function') {
            this._cleanups.push(fn);
        }
    }

    /**
     * Track and auto-clear a timeout
     * @param {number} timeoutId
     */
    addTimeout(timeoutId) {
        this.add(() => clearTimeout(timeoutId));
    }

    /**
     * Track and auto-clear an interval
     * @param {number} intervalId
     */
    addInterval(intervalId) {
        this.add(() => clearInterval(intervalId));
    }

    /**
     * Track and auto-remove a DOM event listener
     * @param {EventTarget} target
     * @param {string} type
     * @param {EventListenerOrEventListenerObject} listener
     * @param {boolean|AddEventListenerOptions} [options]
     */
    addEventListener(target, type, listener, options) {
        if (target && typeof target.addEventListener === 'function') {
            target.addEventListener(type, listener, options);
            this.add(() => {
                try {
                    target.removeEventListener(type, listener, options);
                } catch {
                    // Ignore DOM disconnection errors
                }
            });
        }
    }

    /**
     * Execute all registered cleanup callbacks in reverse order
     */
    run() {
        while (this._cleanups.length > 0) {
            const cleanup = this._cleanups.pop();
            try {
                cleanup();
            } catch (err) {
                console.error('[CleanupCollector] Error running cleanup callback:', err);
            }
        }
    }
}

/**
 * Currently active mounted module reference
 * @type {{ id: string, module: AppModule, cleanup: CleanupCollector } | null}
 */
let _activeMount = null;

/**
 * Get current active module mount
 */
export function getActiveMount() {
    return _activeMount;
}

/**
 * Sets the active mounted module
 * @param {string} id
 * @param {AppModule} module
 * @param {CleanupCollector} cleanup
 */
export function setActiveMount(id, module, cleanup) {
    _activeMount = { id, module, cleanup };
}

/**
 * Unmount the currently active module if one exists
 */
export function unmountActiveModule() {
    if (!_activeMount) return;

    try {
        if (_activeMount.module && typeof _activeMount.module.unmount === 'function') {
            _activeMount.module.unmount();
        }
    } catch (err) {
        console.error(`[Lifecycle] Error unmounting module '${_activeMount.id}':`, err);
    }

    try {
        if (_activeMount.cleanup) {
            _activeMount.cleanup.run();
        }
    } catch (err) {
        console.error(`[Lifecycle] Error running cleanup for '${_activeMount.id}':`, err);
    }

    _activeMount = null;
}

/**
 * Adapt legacy module exports into the standardized AppModule interface
 * @param {Record<string, any>} rawModule - Raw imported ES module
 * @param {string} channelId - The channel ID being mounted
 * @returns {AppModule}
 */
export function wrapLegacyModule(rawModule, channelId) {
    // If the module already defines a standard AppModule interface, use it
    if (rawModule.default && typeof rawModule.default.mount === 'function') {
        return rawModule.default;
    }
    if (typeof rawModule.mount === 'function') {
        return {
            mount: rawModule.mount,
            unmount: rawModule.unmount,
            onStateChange: rawModule.onStateChange,
            getMetadata: rawModule.getMetadata
        };
    }

    // Determine the primary render entry point for legacy modules
    const renderFn =
        rawModule.render ||
        rawModule[`render${capitalize(channelId)}`] ||
        rawModule.init ||
        rawModule.renderDashboard ||
        rawModule.renderGym ||
        rawModule.renderCalendar ||
        rawModule.renderTrackingHub;

    return {
        mount: async (container, params) => {
            if (typeof renderFn === 'function') {
                await renderFn(container, params);
            } else if (typeof rawModule.default === 'function') {
                await rawModule.default(container, params);
            } else {
                console.warn(`[Lifecycle] No recognized render function found for channel '${channelId}'`);
            }
        },
        unmount: () => {
            if (typeof rawModule.cleanup === 'function') {
                rawModule.cleanup();
            } else if (typeof rawModule.destroy === 'function') {
                rawModule.destroy();
            }
        }
    };
}

function capitalize(str) {
    if (!str) return '';
    return str.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
