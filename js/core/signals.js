/**
 * Kiscord Ultralight Reactive Signals Engine
 * Pure Vanilla JS reactive primitives (~60 LOC) with fine-grained DOM bindings.
 */

let activeEffect = null;
const effectStack = [];
let isBatching = false;
const pendingEffects = new Set();

/**
 * Creates a reactive signal
 * @template T
 * @param {T} initialValue
 * @returns {[() => T, (nextValue: T | ((prev: T) => T)) => void]}
 */
export function createSignal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const getter = () => {
        if (activeEffect) {
            subscribers.add(activeEffect);
            activeEffect.dependencies.add(subscribers);
        }
        return value;
    };

    const setter = (nextValue) => {
        const resolved = typeof nextValue === 'function' ? nextValue(value) : nextValue;
        if (resolved !== value) {
            value = resolved;
            const subsToRun = [...subscribers];
            subsToRun.forEach(effect => {
                if (isBatching) {
                    pendingEffects.add(effect);
                } else {
                    effect.run();
                }
            });
        }
    };

    return [getter, setter];
}

/**
 * Creates an effect that re-runs whenever any dependent signal changes
 * @param {() => void} fn
 * @returns {() => void} Dispose/cleanup handle
 */
export function createEffect(fn) {
    const effect = {
        dependencies: new Set(),
        run() {
            this.cleanup();
            effectStack.push(this);
            activeEffect = this;
            try {
                fn();
            } finally {
                effectStack.pop();
                activeEffect = effectStack[effectStack.length - 1] || null;
            }
        },
        cleanup() {
            this.dependencies.forEach(subscribers => subscribers.delete(this));
            this.dependencies.clear();
        }
    };

    effect.run();

    return () => effect.cleanup();
}

/**
 * Creates a memoized derived signal
 * @template T
 * @param {() => T} fn
 * @returns {() => T}
 */
export function createComputed(fn) {
    const [getter, setter] = createSignal(undefined);
    createEffect(() => {
        setter(fn());
    });
    return getter;
}

/**
 * Batch multiple signal mutations to execute effects once
 * @param {() => void} fn
 */
export function batch(fn) {
    isBatching = true;
    try {
        fn();
    } finally {
        isBatching = false;
        const toRun = [...pendingEffects];
        pendingEffects.clear();
        toRun.forEach(effect => effect.run());
    }
}

/**
 * Fine-Grained DOM Bindings
 */

/**
 * Reactively binds an element's textContent to a signal or computed getter
 * @param {HTMLElement|string} target
 * @param {() => any} getter
 * @returns {() => void} Dispose handle
 */
export function bindText(target, getter) {
    return createEffect(() => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            const val = getter();
            el.textContent = val !== null && val !== undefined ? String(val) : '';
        }
    });
}

/**
 * Reactively toggles a class on an element based on a boolean signal or getter
 * @param {HTMLElement|string} target
 * @param {string} className
 * @param {() => boolean} boolGetter
 * @returns {() => void} Dispose handle
 */
export function bindClass(target, className, boolGetter) {
    return createEffect(() => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            el.classList.toggle(className, Boolean(boolGetter()));
        }
    });
}

/**
 * Reactively updates an attribute on an element
 * @param {HTMLElement|string} target
 * @param {string} attrName
 * @param {() => any} getter
 * @returns {() => void} Dispose handle
 */
export function bindAttr(target, attrName, getter) {
    return createEffect(() => {
        const el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            const val = getter();
            if (val === false || val === null || val === undefined) {
                el.removeAttribute(attrName);
            } else {
                el.setAttribute(attrName, val === true ? '' : String(val));
            }
        }
    });
}
