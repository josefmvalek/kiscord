import { supabase } from '../core/supabase.js';
import { state, ensureProfilesData } from '../core/state.js';
import { showAlert } from '../main.js';

/**
 * MaturitaHub 2026 - Profile & Account Module
 */

export async function renderProfile(container) {
    const user = state.currentUser;
    if (!user) return;

    await ensureProfilesData();
    const profile = state.users[user.id] || { display_name: user.email.split('@')[0] };

    // Get statistics
    const { data: topics } = await supabase.from('matura_topics').select('id').eq('author_id', user.id);
    const { data: progress } = await supabase.from('matura_topic_progress').select('*').eq('user_id', user.id).eq('status', 'learned');

    container.innerHTML = `
        <div class="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <button onclick="window.location.hash = '#dashboard'" class="text-gray-500 hover:text-white transition flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                    <i class="fas fa-arrow-left"></i> Zpět na přehled
                </button>
                <h1 class="text-2xl font-black italic text-white uppercase tracking-tighter m-0">Můj Profil</h1>
            </div>

            <!-- Profile Info Card -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="md:col-span-1 flex flex-col items-center space-y-4 bg-darkSecondary/30 p-8 rounded-3xl border border-white/5">
                    <div class="relative group">
                        <img src="${profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.display_name}&background=5865F2&color=fff`}" 
                             class="w-32 h-32 rounded-full border-4 border-blurple/20 group-hover:border-blurple transition-all" alt="Avatar">
                    </div>
                    <div class="text-center">
                        <h2 class="text-xl font-black text-white uppercase italic">${profile.display_name}</h2>
                        <p class="text-[10px] font-black uppercase tracking-widest text-gray-500">${user.email}</p>
                    </div>
                </div>

                <div class="md:col-span-2 grid grid-cols-2 gap-4">
                    <div class="bg-darkSecondary/30 p-6 rounded-3xl border border-white/5 flex flex-col justify-center items-center text-center">
                        <span class="text-3xl font-black text-white">${topics?.length || 0}</span>
                        <span class="text-[10px] font-black uppercase tracking-widest text-gray-500">Vlastních témat</span>
                    </div>
                    <div class="bg-blurple/5 p-6 rounded-3xl border border-blurple/10 flex flex-col justify-center items-center text-center shadow-lg shadow-blurple/5">
                        <span class="text-3xl font-black text-blurple">${progress?.length || 0}</span>
                        <span class="text-[10px] font-black uppercase tracking-widest text-blurple/70">Naučených otázek</span>
                    </div>
                </div>
            </div>

            <!-- Profile Edit Form -->
            <div class="bg-darkSecondary/20 p-8 rounded-3xl border border-white/5 space-y-8">
                <h3 class="text-xs font-black uppercase tracking-widest text-white italic border-l-2 border-blurple pl-4">Změnit nastavení</h3>
                
                <form id="profile-update-form" class="space-y-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">Nickname (Tvé studijní jméno)</label>
                        <input type="text" name="nickname" value="${profile.display_name}" placeholder="Zadej nové jméno" 
                               class="w-full bg-darkSecondary border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blurple/50 transition">
                        <p class="text-[10px] text-gray-600 px-2 italic">Toto jméno uvidí ostatní u tvých sdílených otázek.</p>
                    </div>

                    <div class="flex justify-end pt-4">
                        <button type="submit" class="bg-blurple hover:bg-blurple/90 text-white font-black px-10 py-4 rounded-2xl transition shadow-xl active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3">
                            <i class="fas fa-save"></i> Uložit profil
                        </button>
                    </div>
                </form>
            </div>
            
            <!-- Account Security (Password) -->
            <div class="bg-darkSecondary/20 p-8 rounded-3xl border border-white/5 space-y-8">
                <h3 class="text-xs font-black uppercase tracking-widest text-white italic border-l-2 border-accent-warning pl-4">Zabezpečení účtu</h3>
                
                <form id="password-update-form" class="space-y-6">
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">Nové heslo</label>
                        <input type="password" name="password" placeholder="••••••••" required
                               class="w-full bg-darkSecondary border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blurple/50 transition">
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-gray-500 px-2">Potvrzení nového hesla</label>
                        <input type="password" name="confirm_password" placeholder="••••••••" required
                               class="w-full bg-darkSecondary border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-blurple/50 transition">
                    </div>

                    <div class="flex justify-end pt-4">
                        <button type="submit" class="bg-darkSecondary border border-white/10 hover:border-blurple/50 text-white font-black px-10 py-4 rounded-2xl transition shadow-xl active:scale-95 uppercase tracking-widest text-xs flex items-center gap-3">
                            <i class="fas fa-key"></i> Aktualizovat heslo
                        </button>
                    </div>
                </form>
            </div>

            <!-- Keyboard Shortcuts Cheat Sheet -->
            <div class="bg-darkSecondary/30 p-8 rounded-3xl border border-white/5 space-y-6">
                <div class="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 class="text-xs font-black uppercase tracking-widest text-white italic border-l-2 border-accent-pink pl-4">Tahák pro Editor</h3>
                    <span class="text-[8px] font-black uppercase tracking-widest text-gray-600 bg-white/5 px-3 py-1 rounded-full">Pro Editor v1.0</span>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <!-- Headings -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Nadpis H1</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">1</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Nadpis H2</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">2</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Nadpis H3</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">3</span>
                            </div>
                        </div>
                    </div>

                    <!-- Formatting -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Tučné písmo</span>
                            <div class="flex gap-1">
                                <span class="kbd">Ctrl</span>
                                <span class="kbd">B</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Kurzíva</span>
                            <div class="flex gap-1">
                                <span class="kbd">Ctrl</span>
                                <span class="kbd">I</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Odrážkový seznam</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">L</span>
                            </div>
                        </div>
                    </div>

                    <!-- Special Templates -->
                    <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 pt-4 border-t border-white/5">
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Vložit tabulku (Obsidian-style)</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">T</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Matematický blok ($$)</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">M</span>
                            </div>
                        </div>
                        <div class="flex items-center justify-between group">
                            <span class="text-[10px] font-bold text-gray-400 group-hover:text-white transition">Kódový blok (block)</span>
                            <div class="flex gap-1">
                                <span class="kbd">Alt</span>
                                <span class="kbd">K</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sign Out -->
            <div class="flex justify-center">
                <button id="profile-signout-btn" class="text-[10px] font-black uppercase tracking-widest text-accent-danger/50 hover:text-accent-danger transition flex items-center gap-2 px-6 py-2 rounded-xl hover:bg-accent-danger/5">
                    <i class="fas fa-sign-out-alt"></i> Odhlásit se z aplikace
                </button>
            </div>
        </div>
    `;

    // Handle Form
    const form = document.getElementById('profile-update-form');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const newNickname = e.target.nickname.value;
        if (!newNickname) return;

        try {
            const { error } = await supabase.from('profiles').update({
                display_name: newNickname,
                avatar_url: `https://ui-avatars.com/api/?name=${newNickname}&background=5865F2&color=fff`
            }).eq('id', user.id);

            if (error) throw error;

            await showAlert("Úspěch", "Tvůj profil byl aktualizován! 🎉", "✅");
            
            // Sync local state
            state.users[user.id].display_name = newNickname;
            document.getElementById('my-name').textContent = newNickname;
            
            // Re-render
            renderProfile(container);
        } catch (err) {
            console.error("Profile Update Error:", err);
            await showAlert("Chyba", "Nepodařilo se uložit změny: " + err.message, "❌");
        }
    };

    // Handle Password Change
    const passwordForm = document.getElementById('password-update-form');
    passwordForm.onsubmit = async (e) => {
        e.preventDefault();
        const password = e.target.password.value;
        const confirm = e.target.confirm_password.value;

        if (password !== confirm) {
            return showAlert("Chyba", "Hesla se neshodují!", "❌");
        }
        if (password.length < 6) {
            return showAlert("Chyba", "Heslo musí mít alespoň 6 znaků.", "⚠️");
        }

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            await showAlert("Heslo změněno", "Tvé nové heslo bylo úspěšně nastaveno. 🔐", "✅");
            e.target.reset();
        } catch (err) {
            console.error("Password Update Error:", err);
            await showAlert("Chyba", "Nepodařilo se změnit heslo: " + err.message, "❌");
        }
    };

    // Handle Signout
    document.getElementById('profile-signout-btn').onclick = async () => {
        const { signOut } = await import('../core/auth.js');
        await signOut();
        window.location.hash = '#dashboard'; // Will trigger showLogin via main.js
    };
}
