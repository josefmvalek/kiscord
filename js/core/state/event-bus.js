/**
 * Typed EventBus & State Subscription Engine
 * Lightweight, zero-overhead Pub/Sub with selector-based subscriptions and unsubscribe handles.
 */

class EventBus {
    constructor() {
        /** @type {Record<string, Array<(payload: any) => void>>} */
        this._listeners = {};
    }

    /**
     * Subscribe to an event or state slice channel
     * @param {string} event - Event name or domain:action (e.g. 'gym:workoutSaved', 'health', 'loveShop')
     * @param {(payload: any) => void} callback - Handler function
     * @returns {() => void} Unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners[event]) {
            this._listeners[event] = [];
        }
        this._listeners[event].push(callback);

        return () => {
            this.off(event, callback);
        };
    }

    /**
     * Alias for .on()
     */
    subscribe(event, callback) {
        return this.on(event, callback);
    }

    /**
     * Emit an event to all active subscribers
     * @param {string} event
     * @param {any} [payload]
     */
    emit(event, payload) {
        const listeners = this._listeners[event];
        if (Array.isArray(listeners) && listeners.length > 0) {
            // Clone array so listener mutations during dispatch don't break iteration
            const cloned = [...listeners];
            for (let i = 0; i < cloned.length; i++) {
                try {
                    cloned[i](payload);
                } catch (e) {
                    console.error(`[EventBus] Error in listener for event '${event}':`, e);
                }
            }
        }
    }

    /**
     * Remove a subscriber
     * @param {string} event
     * @param {(payload: any) => void} callback
     */
    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
            if (this._listeners[event].length === 0) {
                delete this._listeners[event];
            }
        }
    }

    /**
     * Clear all listeners
     */
    clear() {
        this._listeners = {};
    }
}

export const eventBus = new EventBus();
export const stateEvents = eventBus;
