import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { triggerHaptic, triggerConfetti } from '../core/utils.js';

let currentItemId = null;
let completedSections = new Set();
let rootContainerId = null;
let isSaving = false;

export async function initProgress(containerId, itemId) {
    currentItemId = itemId;
    rootContainerId = containerId;
    completedSections.clear();
    
    try {
        const { data, error } = await supabase
            .from('matura_sections_done')
            .select('section_id')
            .eq('item_id', itemId)
            .eq('creator_name', state.currentUser?.name);
            
        if (!error && data) {
            data.forEach(row => completedSections.add(row.section_id));
        }
    } catch (e) { 
        console.warn('Progress DB error:', e);
    }

    mountCheckboxes(containerId);
}

/**
 * Calculates percentage of checked sections for a topic.
 * Returns { done: number, total: number }
 */
export async function getTopicProgress(itemId) {
    if (!state.currentUser) return { done: 0, total: 0 };
    
    try {
        // 1. Get total sections count from KB metadata
        const { data: kbData } = await supabase
            .from('matura_kb')
            .select('sections_count')
            .eq('item_id', itemId)
            .single();

        const total = kbData?.sections_count || 0;

        // 2. Get completed sections count
        const { count, error } = await supabase
            .from('matura_sections_done')
            .select('*', { count: 'exact', head: true })
            .eq('item_id', itemId)
            .eq('creator_name', state.currentUser?.name);
            
        if (error) return { done: 0, total };
        return { done: count || 0, total };
    } catch (e) {
        return { done: 0, total: 0 };
    }
}

function normalizeSlug(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function mountCheckboxes(explicitContainerId) {
    const targetId = explicitContainerId || rootContainerId;
    if (!targetId) return;
    const container = document.getElementById(targetId);
    if (!container) return;
    const content = container.querySelector('.matura-content');
    if (!content) return;

    const headings = content.querySelectorAll('h1, h2, h3');
    headings.forEach(heading => {
        if (heading.querySelector('.section-check')) return;

        const slug = normalizeSlug(heading.textContent);
        const isDone = completedSections.has(slug);

        const btn = document.createElement('button');
        btn.className = `section-check ${isDone ? 'section-check-done' : ''}`;
        btn.innerHTML = '<i class="fas fa-check text-[10px]"></i>';
        btn.dataset.slug = slug;
        btn.title = isDone ? 'Přečteno' : 'Označit jako přečtené';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSection(btn, slug);
        });
        
        heading.appendChild(btn);
    });
}

async function toggleSection(btn, slug) {
    if (isSaving) return;
    isSaving = true;
    
    const wasDone = completedSections.has(slug);
    
    // UI Update (Optimistic)
    if (wasDone) {
        completedSections.delete(slug);
        btn.classList.remove('section-check-done');
        btn.title = 'Označit jako přečtené';
        triggerHaptic('light');
    } else {
        completedSections.add(slug);
        btn.classList.add('section-check-done');
        btn.title = 'Přečteno';
        triggerHaptic('success');
        triggerConfetti(btn);
        
        // Trigger Matura Streak Update
        import('./matura.js').then(m => m.updateMaturaStreak());
    }

    // DB Update
    try {
        if (wasDone) {
            await supabase.from('matura_sections_done').delete()
                .eq('item_id', currentItemId)
                .eq('section_id', slug)
                .eq('creator_name', state.currentUser?.name);
        } else {
            await supabase.from('matura_sections_done').insert([{
                item_id: currentItemId,
                section_id: slug,
                user_id: state.currentUser?.id,
                creator_name: state.currentUser?.name
            }]);
        }
    } catch (e) {
        console.error("Save error:", e);
    } finally {
        isSaving = false;
    }
}
