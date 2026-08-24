/**
 * Kiscord Central Action Dispatcher & Declarative Event Delegation Engine
 * Replaces scattered inline window handlers with performant, unified data-action delegation.
 */

import { triggerHaptic } from '../utils.js';
import { showNotification } from '../theme.js';

/** @type {Map<string, (payload: any, event: Event, element: HTMLElement) => any>} */
const actionRegistry = new Map();

let isDelegationInitialized = false;

/**
 * Register a domain action handler.
 * @param {string} name - Action name (e.g. 'switchChannel', 'closeModal', 'toggleWatchlist')
 * @param {(payload: any, event: Event, element: HTMLElement) => any} handler - Function to execute
 */
export function registerAction(name, handler) {
    if (typeof handler !== 'function') {
        throw new TypeError(`Action handler for "${name}" must be a function.`);
    }
    actionRegistry.set(name, handler);
}

/**
 * Register multiple actions at once.
 * @param {Record<string, (payload: any, event: Event, element: HTMLElement) => any>} actions
 */
export function registerActions(actions) {
    for (const [name, handler] of Object.entries(actions)) {
        registerAction(name, handler);
    }
}

/**
 * Unregister an action handler.
 * @param {string} name 
 */
export function unregisterAction(name) {
    return actionRegistry.delete(name);
}

/**
 * Check if an action is registered.
 * @param {string} name 
 * @returns {boolean}
 */
export function hasAction(name) {
    return actionRegistry.has(name);
}

/**
 * Get all registered action names.
 * @returns {string[]}
 */
export function getRegisteredActionNames() {
    return Array.from(actionRegistry.keys());
}

/**
 * Helper to extract payload from an element's dataset.
 * Merges JSON data-action-payload with all dataset key-values.
 * @param {HTMLElement} element 
 * @returns {Record<string, any>}
 */
export function extractActionPayload(element) {
    /** @type {Record<string, any>} */
    const payload = {};

    // 1. Copy all dataset properties (excluding 'action' and 'actionPayload')
    if (element.dataset) {
        for (const [key, value] of Object.entries(element.dataset)) {
            if (key !== 'action' && key !== 'actionPayload' && key !== 'haptic') {
                payload[key] = value;
            }
        }

        // 2. Parse explicit JSON payload if present
        if (element.dataset.actionPayload) {
            try {
                const parsed = JSON.parse(element.dataset.actionPayload);
                Object.assign(payload, parsed);
            } catch (err) {
                console.warn(`[ActionDispatcher] Failed to parse data-action-payload JSON on element:`, element, err);
            }
        }
    }

    return payload;
}

/**
 * Dispatch an action programmatically or from an event.
 * @param {string} actionName 
 * @param {any} [payload] 
 * @param {Event} [event] 
 * @param {HTMLElement} [element] 
 * @returns {Promise<any>}
 */
export async function dispatchAction(actionName, payload = {}, event = null, element = null) {
    const handler = actionRegistry.get(actionName);

    if (!handler) {
        // Graceful fallback to global window if available during migration
        if (typeof window !== 'undefined' && typeof window[actionName] === 'function') {
            try {
                // If payload is object with single key matching name or primitive values
                const args = payload && typeof payload === 'object' && Object.keys(payload).length > 0 
                    ? Object.values(payload) 
                    : [payload];
                return await window[actionName](...args);
            } catch (err) {
                console.error(`[ActionDispatcher] Window fallback error for "${actionName}":`, err);
                throw err;
            }
        }
        console.warn(`[ActionDispatcher] Unrecognized action: "${actionName}". Registered actions:`, getRegisteredActionNames());
        return;
    }

    try {
        return await handler(payload, event, element);
    } catch (error) {
        console.error(`[ActionDispatcher] Error executing action "${actionName}":`, error);
        if (typeof showNotification === 'function') {
            showNotification(`Chyba při spuštění akce: ${error.message || error}`, 'error');
        }
        throw error;
    }
}

/**
 * Handle delegating an event to registered actions.
 * @param {Event} event 
 */
function handleDelegatedEvent(event) {
    const target = /** @type {HTMLElement} */ (event.target);
    if (!target || typeof target.closest !== 'function') return;

    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const actionName = actionEl.getAttribute('data-action');
    if (!actionName) return;

    // Optional haptic profile specified on element
    const hapticProfile = actionEl.getAttribute('data-haptic');
    if (hapticProfile) {
        triggerHaptic(hapticProfile);
    }

    // Optional prevent default
    if (actionEl.getAttribute('data-prevent-default') === 'true' || actionEl.tagName === 'A' && actionEl.getAttribute('href') === '#') {
        event.preventDefault();
    }

    // Stop propagation if requested
    if (actionEl.getAttribute('data-stop-propagation') === 'true') {
        event.stopPropagation();
    }

    const payload = extractActionPayload(actionEl);
    dispatchAction(actionName, payload, event, actionEl);
}

/**
 * Initialize global declarative event delegation on the document.
 * @param {HTMLElement | Document} [rootElement=document]
 */
export function initActionDelegation(rootElement = typeof document !== 'undefined' ? document : null) {
    if (!rootElement || isDelegationInitialized) return;

    rootElement.addEventListener('click', handleDelegatedEvent);
    rootElement.addEventListener('change', handleDelegatedEvent);
    
    isDelegationInitialized = true;
}

/**
 * Central ActionDispatcher Singleton Export
 */
export const ActionDispatcher = {
    register: registerAction,
    registerMany: registerActions,
    unregister: unregisterAction,
    dispatch: dispatchAction,
    has: hasAction,
    getNames: getRegisteredActionNames,
    extractPayload: extractActionPayload,
    init: initActionDelegation
};
