import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic } from '../core/utils.js';

export let allHighlights = [];
export let myHighlights = [];
export let otherHighlights = [];
let currentItemId = null;
let currentSelectionRange = null;
let popoverElement = null;
let activeHighlightId = null;
let rootContainerId = null;

export async function initHighlighter(containerId, itemId) {
    currentItemId = itemId;
    rootContainerId = containerId;
    allHighlights = [];
    myHighlights = [];
    otherHighlights = [];
    const modalContainer = document.getElementById(containerId);
    if (!modalContainer) return;
    const contentDiv = modalContainer.querySelector('.matura-content') || modalContainer;

    // 1. Fetch existing highlights
    try {
        const { data, error } = await supabase
            .from('matura_highlights')
            .select('*')
            .eq('item_id', itemId)
            .order('start_offset', { ascending: false });
        
        if (!error && data) {
            allHighlights = data;
            myHighlights = data.filter(hl => hl.creator_name === state.currentUser?.name);
            otherHighlights = data.filter(hl => hl.creator_name !== state.currentUser?.name);
            
            // Trigger initial render of content AND sidebar
            refreshRender();
        }
    } catch (e) {
        console.error("Failed to fetch highlights", e);
    }

    // 2. Trigger initial render (critical for Matura boxes/content)
    await refreshRender();

    // 3. Inject Popover into body if not exists
    if (!document.getElementById('hl-popover')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="hl-popover" class="hidden opacity-0 scale-95 fixed z-[9999] bg-[#2f3136] border border-white/10 p-2 rounded-2xl flex items-center gap-2 shadow-2xl transition-all duration-200">
                <button class="hl-btn hl-btn-yellow" data-color="yellow" title="Důležité"></button>
                <button class="hl-btn hl-btn-red" data-color="red" title="Nabiflovat"></button>
                <button class="hl-btn hl-btn-green" data-color="green" title="Umím"></button>
                <div class="w-px h-6 bg-white/10 mx-1"></div>
                <button class="hl-btn hl-btn-clear" data-color="clear" title="Smazat"><i class="fas fa-trash"></i></button>
            </div>
            <style>
                .kb-hl-yellow { background-color: rgba(250, 204, 21, 0.25); border-bottom: 2px solid rgba(250, 204, 21, 0.4); cursor: pointer; color: inherit; }
                .kb-hl-red { background-color: rgba(248, 113, 113, 0.2); border-bottom: 2px solid rgba(248, 113, 113, 0.4); cursor: pointer; color: inherit; }
                .kb-hl-green { background-color: rgba(74, 222, 128, 0.2); border-bottom: 2px solid rgba(74, 222, 128, 0.4); cursor: pointer; color: inherit; }
                .kb-hl-yellow:hover, .kb-hl-red:hover, .kb-hl-green:hover { filter: brightness(1.2); }
                .hl-btn { width: 26px; height: 26px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3); transition: transform 0.2s; outline: none; }
                .hl-btn:hover { transform: scale(1.15); }
                .hl-btn:active { transform: scale(0.9); }
                .hl-btn-yellow { background: #facc15; }
                .hl-btn-red { background: #f87171; }
                .hl-btn-green { background: #4ade80; }
                .hl-btn-clear { background: #4b5563; display: flex; align-items: center; justify-content: center; font-size: 10px; color: white; }
            </style>
        `);

        popoverElement = document.getElementById('hl-popover');
        
        // Setup popover listeners
        popoverElement.querySelectorAll('.hl-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.currentTarget.dataset.color;
                if (color === 'clear') {
                    if (activeHighlightId) removeHighlight(activeHighlightId);
                } else {
                    if (activeHighlightId) {
                        updateHighlightColor(activeHighlightId, color);
                    } else if (currentSelectionRange) {
                        createNewHighlight(contentDiv, currentSelectionRange, color);
                    }
                }
                hidePopover();
            });
        });
    } else {
        popoverElement = document.getElementById('hl-popover');
    }

    // 3. Selection Event Listener
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // 4. Mousedown on existing highlights to edit/delete
    modalContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'SPAN' && target.className.startsWith('kb-hl-')) {
            // Clicked on existing highlight
            activeHighlightId = target.dataset.id;
            const rect = target.getBoundingClientRect();
            showPopover(rect.left + rect.width / 2, rect.top - 10);
            e.stopPropagation();
        } else {
            // Clicked elsewhere, hide popover unless there is a selection
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                hidePopover();
            }
        }
    });
}

export function destroyHighlighter() {
    document.removeEventListener('selectionchange', handleSelectionChange);
    hidePopover();
}

// Handler for showing/hiding popover when text is dragged
function handleSelectionChange() {
    clearTimeout(window.hlTimeout);
    window.hlTimeout = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
            if (!activeHighlightId) hidePopover();
            return;
        }

        const range = sel.getRangeAt(0);
        // Ensure selection is inside matura-content
        let container = range.commonAncestorContainer;
        if (container.nodeType === 3) container = container.parentNode;
        
        const mainContent = document.querySelector('.matura-content');
        if (!mainContent || !mainContent.contains(container)) return;

        currentSelectionRange = range.cloneRange();
        activeHighlightId = null; // new selection, not editing existing
        
        const rects = range.getClientRects();
        if (rects.length > 0) {
            const firstRect = rects[0];
            showPopover(firstRect.left + firstRect.width / 2, firstRect.top - 10);
        }
    }, 200);
}

function showPopover(x, y) {
    if (!popoverElement) return;
    popoverElement.classList.remove('hidden');
    // small delay to allow display:block to apply before animation
    requestAnimationFrame(() => {
        popoverElement.style.left = `${x}px`;
        popoverElement.style.top = `${y}px`;
        // Centering offset by translating self
        popoverElement.style.transform = 'translate(-50%, -100%)';
        popoverElement.classList.remove('opacity-0', 'scale-95');
    });
    triggerHaptic('light');
}

function hidePopover() {
    if (!popoverElement) return;
    popoverElement.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        popoverElement.classList.add('hidden');
    }, 200);
    activeHighlightId = null;
    currentSelectionRange = null;
}

// --- CORE HIGHLIGHT ALGORITHM ---

function getOffsetsFromRange(rootNode, range) {
    const treeWalker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let start = -1, end = -1;

    let sc = range.startContainer;
    let so = range.startOffset;
    if (sc.nodeType === Node.ELEMENT_NODE) {
        sc = sc.childNodes[Math.min(so, sc.childNodes.length - 1)];
        while (sc && sc.nodeType !== Node.TEXT_NODE) sc = sc.firstChild || sc.nextSibling;
        so = 0;
    }

    let ec = range.endContainer;
    let eo = range.endOffset;
    if (ec.nodeType === Node.ELEMENT_NODE) {
        ec = ec.childNodes[Math.min(eo, ec.childNodes.length - 1)];
        while (ec && ec.nodeType !== Node.TEXT_NODE) ec = ec.lastChild || ec.previousSibling;
        if (ec && ec.nodeType === Node.TEXT_NODE) eo = ec.nodeValue.length;
    }

    while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;
        const len = node.nodeValue.length;
        
        if (start === -1 && node === sc) {
            start = currentOffset + so;
        }
        if (end === -1 && node === ec) {
            end = currentOffset + eo;
        }
        
        if (start !== -1 && end !== -1) break;
        currentOffset += len;
    }
    return { start, end };
}

async function createNewHighlight(rootNode, range, color) {
    const { start, end } = getOffsetsFromRange(rootNode, range);
    if (start === -1 || end === -1 || start === end) return;

    const actualStart = Math.min(start, end);
    const actualEnd = Math.max(start, end);

    window.getSelection().removeAllRanges(); // clear selection immediately

    const hlObj = {
        id: crypto.randomUUID(),
        item_id: currentItemId,
        user_id: state.currentUser?.id,
        creator_name: state.currentUser?.name,
        start_offset: actualStart,
        end_offset: actualEnd,
        color: color
    };

    myHighlights.push(hlObj);
    myHighlights.sort((a, b) => b.start_offset - a.start_offset);
    allHighlights.push(hlObj);
    allHighlights.sort((a, b) => b.start_offset - a.start_offset);

    // Re-render all highlights to ensure purity (easy fallback)
    // Actually, safer to just re-render the whole HTML from DB and apply all from scratch
    // to prevent nested spans issues from split text nodes.
    await refreshRender();

    triggerHaptic('success');

    // Save
    try {
        await supabase.from('matura_highlights').insert([hlObj]);
    } catch (e) { console.error('Error saving highlight', e); }
}

async function updateHighlightColor(id, newColor) {
    const hlM = myHighlights.find(h => h.id === id);
    if (hlM) hlM.color = newColor;
    const hlA = allHighlights.find(h => h.id === id);
    if (hlA) hlA.color = newColor;
    
    await refreshRender();
    triggerHaptic('medium');

    try {
        await supabase.from('matura_highlights').update({ color: newColor }).eq('id', id);
    } catch (e) {}
}

async function removeHighlight(id) {
    myHighlights = myHighlights.filter(h => h.id !== id);
    allHighlights = allHighlights.filter(h => h.id !== id);
    await refreshRender();
    triggerHaptic('heavy');

    try {
        await supabase.from('matura_highlights').delete().eq('id', id);
    } catch (e) {}
}

export async function clearAllHighlights() {
    myHighlights = [];
    allHighlights = allHighlights.filter(h => h.creator_name !== state.currentUser?.name);
    await refreshRender();
    try {
        await supabase.from('matura_highlights').delete()
            .eq('item_id', currentItemId)
            .eq('creator_name', state.currentUser?.name);
        triggerHaptic('success');
    } catch (e) {}
}

// Function to safely apply a highlight to raw DOM
export function applyHighlight(rootNode, hl) {
    const treeWalker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentOffset = 0;
    let nodesToWrap = [];

    while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;
        const len = node.nodeValue.length;
        const nodeStart = currentOffset;
        const nodeEnd = currentOffset + len;

        if (nodeEnd > hl.start_offset && nodeStart < hl.end_offset) {
            nodesToWrap.push({
                node: node,
                start: Math.max(0, hl.start_offset - nodeStart),
                end: Math.min(len, hl.end_offset - nodeStart)
            });
        }
        currentOffset += len;
        if (currentOffset >= hl.end_offset) break;
    }

    // Wrap backwards!
    for (let i = nodesToWrap.length - 1; i >= 0; i--) {
        const { node, start, end } = nodesToWrap[i];
        if (start === end) continue; // safety

        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        
        const span = document.createElement('span');
        const isOther = hl.creator_name !== state.currentUser?.name;
        span.className = `kb-hl-${hl.color} ${isOther ? 'hl-other' : ''}`;
        span.dataset.id = hl.id;
        
        try {
            range.surroundContents(span);
        } catch (e) {
            // Cannot surround if it spans invalid bounds. Usually safe in pure text node.
        }
    }
}

// Triggered when editing/adding to refresh the DOM state 
export async function refreshRender() {
    if (window.refreshKBContent) {
        const activeHls = window.isCoopMode ? allHighlights : myHighlights;
        window.refreshKBContent(activeHls, applyHighlight);
        
        // Sync Sidebar Highlights List - tiny delay to ensure DOM query picks up new spans
        setTimeout(() => {
            const modal = document.getElementById(rootContainerId);
            if (!modal) return;
            const list = modal.querySelector('#kb-highlights-list');
            if (list) {
                const hlsForSidebar = myHighlights.filter(h => h.color !== 'green');
                if (hlsForSidebar.length === 0) {
                    list.innerHTML = '<li class="italic opacity-50 pl-3 text-xs">Zatím nemáte žádné klíčové body. Obarvěte si text.</li>';
                } else {
                    list.innerHTML = '';
                    // Find all DOM elements for our highlights
                    const domHighlights = modal.querySelectorAll('.kb-hl-yellow:not(.hl-other), .kb-hl-red:not(.hl-other)');
                    
                    domHighlights.forEach(span => {
                        const id = span.dataset.id;
                        const color = span.classList.contains('kb-hl-yellow') ? '#faa61a' : '#ed4245';
                        const parentText = span.closest('p, li')?.textContent || span.textContent;

                        const li = document.createElement('li');
                        li.className = 'pl-3 border-l-2 cursor-pointer hover:text-white transition-opacity leading-relaxed text-xs';
                        li.style.borderColor = color;
                        li.textContent = parentText.trim();
                        li.onclick = () => span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        list.appendChild(li);
                    });
                }
            }
        }, 50);
    }
}

export function updateCoopMode(enabled) {
    window.isCoopMode = enabled;
    refreshRender();
}
