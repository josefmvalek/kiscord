/**
 * Kiscord DOM Action Dispatcher
 * Provides clean Event Delegation on dynamic containers, reducing inline onclick attributes.
 */

/**
 * Attaches a delegated click handler to a container element.
 * Reads `data-action` and any `data-*` parameters from clicked elements.
 * 
 * @param {HTMLElement} container - The parent container element
 * @param {Record<string, (dataset: DOMStringMap, event: MouseEvent, element: HTMLElement) => void>} actionMap - Map of action names to handlers
 * @returns {() => void} Cleanup function to remove event listener
 */
export function attachActionDispatcher(container, actionMap) {
    if (!container || !actionMap) return () => {};

    const handleClick = (event) => {
        const target = event.target;
        if (!target || !(target instanceof Element)) return;

        const actionElement = target.closest('[data-action]');
        if (!actionElement || !container.contains(actionElement)) return;

        const actionName = actionElement.getAttribute('data-action');
        if (!actionName) return;

        const handler = actionMap[actionName];
        if (typeof handler === 'function') {
            handler(actionElement.dataset, event, actionElement);
        }
    };

    container.addEventListener('click', handleClick);

    return () => {
        container.removeEventListener('click', handleClick);
    };
}
