import { state, ensureProfilesData } from '../core/state.js';
import { supabase } from '../core/supabase.js';

/**
 * MaturitaHub 2026 - Study Room Module (Social Presence)
 * Displays who is currently online and studying in real-time.
 */

export async function renderStudyRoom(container) {
    if (!container) return;
    
    // 1. Fetch latest profile statuses
    await ensureProfilesData();
    
    // 2. Fetch active study history/sessions (last 1 hour)
    const { data: activeSessions } = await supabase
        .from('study_activity')
        .select(`*, profiles(display_name, avatar_url)`)
        .gte('started_at', new Date(Date.now() - 3600000).toISOString())
        .order('started_at', { ascending: false });

    container.innerHTML = `
        <div id="matura-hub-study-room" class="space-y-10 animate-fade-in relative mb-20">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-3xl font-black text-white italic uppercase tracking-tighter">
                        Společná <span class="text-blurple">Studovna</span>
                    </h2>
                    <p class="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">Učení jde lépe, když v tom nejste sami.</p>
                </div>
                
                <div class="flex items-center gap-3 bg-blurple/10 px-6 py-3 rounded-2xl border border-blurple/20">
                    <span class="relative flex h-3 w-3">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-success opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-3 w-3 bg-accent-success"></span>
                    </span>
                    <span class="text-sm font-black text-white italic uppercase tracking-widest">${Object.keys(state.users).length} Aktivních studentů</span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                <!-- Main Activity Stream -->
                <div class="lg:col-span-3 space-y-6">
                    <h3 class="text-sm font-black uppercase tracking-widest text-gray-400 px-2">Živá aktivita ⚡</h3>
                    
                    <div id="activity-feed" class="space-y-4">
                        ${activeSessions && activeSessions.length > 0 ? activeSessions.map(session => renderActivityCard(session)).join('') : '<div class="card p-20 text-center text-gray-500 italic">Zatím nikdo dnes nestudoval. Buď první!</div>'}
                    </div>
                </div>

                <!-- Active Students Sidebar -->
                <div class="lg:col-span-1 space-y-6">
                    <h3 class="text-sm font-black uppercase tracking-widest text-gray-400 px-2">Studenti online</h3>
                    <div class="space-y-3">
                        ${Object.values(state.users).map(u => renderUserStatus(u)).join('')}
                    </div>
                </div>

            </div>
        </div>
    `;
}

function renderActivityCard(session) {
    const time = new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const author = session.profiles?.display_name || 'Anonym';
    
    return `
        <div class="card p-6 flex items-center justify-between group hover:border-blurple/30 transition-all bg-darkSecondary/80">
            <div class="flex items-center gap-6">
                <div class="relative">
                    <img src="${session.profiles?.avatar_url || 'https://ui-avatars.com/api/?name='+author+'&background=random'}" class="w-12 h-12 rounded-2xl border-2 border-white/5" />
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-blurple rounded-full border-2 border-darkSecondary flex items-center justify-center text-[8px] text-white">
                        <i class="fas fa-brain"></i>
                    </div>
                </div>
                <div>
                    <h4 class="font-black text-white uppercase italic tracking-tighter text-sm">${author} <span class="text-gray-500 text-[10px] font-bold lowercase tracking-normal">začal(a) studovat</span></h4>
                    <p class="text-gray-400 text-xs mt-1">Téma: <span class="text-blurple font-bold">Informační sítě</span></p>
                </div>
            </div>
            <div class="text-right">
                <div class="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">${time}</div>
                <div class="px-3 py-1 rounded-full bg-blurple/10 border border-blurple/20 text-[8px] font-black text-blurple uppercase tracking-widest animate-pulse">Studuje právě teď</div>
            </div>
        </div>
    `;
}

function renderUserStatus(u) {
    const isOnline = true; // Placeholder for real-time presence
    const statusText = u.current_status === 'studying' ? 'Šrotí se 📖' : 'Má pauzu ☕';
    const statusColor = u.current_status === 'studying' ? 'text-blurple' : 'text-gray-500';

    return `
        <div class="user-status-pill p-4 flex items-center gap-4 bg-darkSecondary/50 border border-white/5 hover:border-white/10 transition cursor-default">
             <div class="relative">
                <img src="${u.avatar_url || 'https://ui-avatars.com/api/?name='+u.display_name+'&background=random'}" class="w-10 h-10 rounded-full border-2 border-transparent" />
                <div class="absolute bottom-0 right-0 w-3 h-3 ${isOnline ? 'bg-accent-success' : 'bg-gray-600'} rounded-full border-2 border-darkSecondary"></div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="font-bold text-sm text-white truncate">${u.display_name}</div>
                <div class="text-[9px] font-black uppercase ${statusColor} tracking-widest mt-1">${statusText}</div>
            </div>
        </div>
    `;
}
