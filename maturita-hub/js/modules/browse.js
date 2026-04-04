import { state, ensureProfilesData } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { showAlert, showConfirm } from '../main.js';

/**
 * MaturitaHub 2026 - Browse/Discover Module
 * Allows users to find and clone topics from other students.
 */

export async function renderBrowse(container) {
    if (!container) return;
    
    // 1. Fetch public topics from OTHER users
    const { data: topics, error } = await supabase
        .from('matura_topics')
        .select(`*, profiles(display_name, avatar_url)`)
        .eq('is_public', true)
        .neq('author_id', state.currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Browse Fetch Error:", error);
        container.innerHTML = `<div class="p-20 text-center text-red-400">Chyba při načítání materiálů.</div>`;
        return;
    }

    container.innerHTML = `
        <div id="matura-hub-browse" class="space-y-10 animate-fade-in relative mb-20">
            <h1 class="text-3xl font-black text-white italic uppercase tracking-tighter">
                Objevuj <span class="text-blurple">Materiály</span>
            </h1>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${topics && topics.length > 0 ? topics.map(t => renderPublicTopic(t)).join('') : '<div class="col-span-full py-20 text-center text-gray-500 italic">Zatím nikdo jiný nic nepublikoval. Buď první! 🚀</div>'}
            </div>
        </div>
    `;
}

function renderPublicTopic(t) {
    const author = t.profiles?.display_name || 'Anonym';
    return `
        <div class="card p-6 flex flex-col group h-full">
            <div class="flex items-start gap-4 mb-4">
                <div class="text-4xl group-hover:scale-110 transition-transform">${t.icon || '📚'}</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-black text-white leading-tight truncate group-hover:text-blurple transition-colors">${t.title}</h3>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">${t.category}</p>
                </div>
            </div>
            
            <p class="text-gray-400 text-xs line-clamp-3 mb-6 font-medium italic">"${t.description || 'Bez popisu'}"</p>

            <div class="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <img src="${t.profiles?.avatar_url || 'https://ui-avatars.com/api/?name='+author+'&background=random'}" class="w-6 h-6 rounded-full border border-white/10" />
                    <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">${author}</span>
                </div>
                
                <button onclick="import('./modules/browse.js').then(m => m.cloneTopic('${t.id}'))" class="bg-blurple/10 hover:bg-blurple text-blurple hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blurple/20 flex items-center gap-2">
                    <i class="fas fa-plus-circle"></i> Kopírovat
                </button>
            </div>
        </div>
    `;
}

export async function cloneTopic(topicId) {
    if (!await showConfirm('Kopírovat téma?', 'Chcete si toto studijní téma zkopírovat do své knihovny?', '📚')) return;
    
    try {
        // 1. Fetch the source topic
        const { data: source, error: fetchErr } = await supabase
            .from('matura_topics')
            .select('*')
            .eq('id', topicId)
            .single();
            
        if (fetchErr) throw fetchErr;

        // 2. Insert a copy with CURRENT USER as author
        const { data: newTopic, error: cloneErr } = await supabase
            .from('matura_topics')
            .insert({
                author_id: state.currentUser.id,
                title: `${source.title} (Kopie)`,
                category: source.category,
                description: source.description,
                content: source.content,
                icon: source.icon,
                is_public: false // Make copies private by default
            })
            .select()
            .single();

        if (cloneErr) throw cloneErr;

        await showAlert('Naklonováno! 🎉', 'Téma bylo úspěšně přidáno do vaší knihovny.', '✅');
        window.location.hash = '#library';
        
    } catch (err) {
        console.error("Clone Error:", err);
        await showAlert('Chyba ❌', 'Nepodařilo se kopírovat téma: ' + err.message, '⚠️');
    }
}
