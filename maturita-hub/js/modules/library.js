import { state, ensureMaturaData } from '../core/state.js';

/**
 * MaturitaHub 2026 - Library Module (My Topics)
 */

export async function renderLibrary(container) {
    if (!container) return;
    
    // Ensure we have data
    await ensureMaturaData();
    
    const user = state.currentUser;
    if (!user) return;

    let html = `
        <div id="matura-hub-library" class="space-y-24 animate-fade-in relative mb-32">
            <div class="flex items-center justify-between">
                <h1 class="text-3xl font-black text-white italic uppercase tracking-tighter">
                    Tvoje <span class="text-blurple">Knihovna</span>
                </h1>
                
                <button onclick="window.location.hash = '#new'" 
                        class="bg-accent-success hover:bg-accent-success/90 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-3 transition shadow-lg active:scale-95 text-[10px] uppercase tracking-widest">
                    <i class="fas fa-plus"></i> Nové téma
                </button>
            </div>

            <div class="space-y-24">
    `;

    // Group by category
    const categories = Object.keys(state.maturaTopics);
    
    if (categories.length === 0) {
        html += `<div class="card p-20 text-center space-y-4 bg-darkSecondary/30 border-dashed border-2 border-white/5">
            <div class="text-5xl">📚</div>
            <h2 class="text-xl font-black text-white uppercase italic">Knihovna je prázdná</h2>
            <p class="text-gray-500 text-sm max-w-sm mx-auto">Začni psát svá maturitní témata nebo si nějaká zkopíruj od ostatních uživatelů.</p>
            <div class="flex items-center justify-center gap-4 mt-6">
                <button onclick="window.location.hash = '#browse'" class="btn-primary">Objevovat materiály</button>
            </div>
        </div>`;
    } else {
        categories.sort().forEach(cat => {
            const items = state.maturaTopics[cat];
            html += `
                <div class="category-section">
                    <div class="flex items-center gap-6 mb-8">
                        <div class="w-10 h-10 bg-blurple/10 rounded-xl flex items-center justify-center text-blurple">
                            <i class="fas ${getCategoryIcon(cat)}"></i>
                        </div>
                        <h2 class="text-xl font-black text-white uppercase italic tracking-widest m-0">${cat}</h2>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                        ${items.map(t => renderTopicCard(t)).join('')}
                    </div>
                </div>
            `;
        });
    }

    html += `</div></div>`;
    container.innerHTML = html;
    
    // Attach Event Listeners
    container.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const topicId = btn.dataset.id;
            await cycleStatus(topicId);
        });
    });

    container.querySelectorAll('.study-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            window.location.hash = `#view/${btn.dataset.id}`;
        });
    });

    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            window.location.hash = `#edit/${btn.dataset.id}`;
        });
    });

    // Smooth progress bar animations
    requestAnimationFrame(() => {
        animateProgressBars();
    });
}

function renderTopicCard(item) {
    const prog = state.maturaProgress[item.id] || { status: 'none', notes: '' };
    
    const statusIcon = prog.status === 'done' ? '✅' : (prog.status === 'started' ? '📖' : '⚪');
    const statusClass = prog.status === 'done' ? 'text-green-500' : (prog.status === 'started' ? 'text-blurple' : 'text-gray-600');
    const statusText = prog.status === 'done' ? 'Hotovo' : (prog.status === 'started' ? 'Studuji' : 'Nic');

    return `
        <div id="topic-card-${item.id}" class="card bg-darkSecondary/80 p-8 flex flex-col group relative border border-white/5 hover:border-blurple/30 transition-all duration-300">
             <div class="flex items-start gap-4 mb-4">
                <div class="text-4xl group-hover:scale-110 transition-transform duration-300 transform-gpu">${item.icon || '📝'}</div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-black text-white leading-tight truncate px-0.5 group-hover:text-blurple transition-colors" title="${item.title}">${item.title}</h3>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">${item.category}</p>
                </div>
            </div>

            <div class="mb-6">
                <div class="status-btn flex items-center gap-2 p-2 px-3 rounded-xl bg-darkPrimary/50 border border-white/5 transition active:scale-95 cursor-pointer" data-id="${item.id}">
                    <span class="text-sm status-icon">${statusIcon}</span>
                    <span class="text-[10px] font-black uppercase ${statusClass} tracking-widest status-text">${statusText}</span>
                </div>
            </div>

            <div class="mt-auto flex gap-2">
                <button data-id="${item.id}" class="study-btn flex-1 bg-blurple/10 hover:bg-blurple/20 text-blurple rounded-xl py-3 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest transition-all border border-blurple/20 shadow-sm active:scale-95">
                    <i class="fas fa-book-open"></i> Studovat
                </button>
                <button data-id="${item.id}" class="edit-btn bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl w-12 flex items-center justify-center transition border border-white/5 active:scale-95">
                    <i class="fas fa-pencil-alt text-xs"></i>
                </button>
            </div>
        </div>
    `;
}

function getCategoryIcon(cat) {
    const icons = {
        'czech': 'fa-language',
        'čeština': 'fa-language',
        'it': 'fa-laptop-code',
        'informatika': 'fa-laptop-code',
        'math': 'fa-square-root-variable',
        'matematika': 'fa-square-root-variable'
    };
    return icons[cat.toLowerCase()] || 'fa-bookmark';
}

export async function cycleStatus(topicId) {
    const prog = state.maturaProgress[topicId] || { status: 'none', notes: '' };
    const current = prog.status;
    
    let next = 'none';
    if (current === 'none') next = 'started';
    else if (current === 'started') next = 'done';
    else if (current === 'done') next = 'none';

    prog.status = next;
    state.maturaProgress[topicId] = prog;
    
    // Persist to Supabase
    try {
        const { supabase } = await import('../core/supabase.js');
        await supabase.from('matura_topic_progress').upsert({
            topic_id: topicId,
            user_id: state.currentUser.id,
            status: next,
            updated_at: new Date().toISOString()
        });
        
        // Update local UI
        const card = document.getElementById(`topic-card-${topicId}`);
        if (card) {
            const textEl = card.querySelector('.status-text');
            const iconEl = card.querySelector('.status-icon');
            iconEl.textContent = next === 'done' ? '✅' : (next === 'started' ? '📖' : '⚪');
            textEl.textContent = next === 'done' ? 'Hotovo' : (next === 'started' ? 'Studuji' : 'Nic');
            textEl.className = `text-[10px] font-black uppercase ${next === 'done' ? 'text-green-500' : (next === 'started' ? 'text-blurple' : 'text-gray-600')} tracking-widest status-text`;
        }
    } catch (err) {
        console.error("Status Sync Error:", err);
    }
}

function animateProgressBars() {
    // Implement standard logic or custom animations
}
