import { state, stateEvents, ensureMaturaData, ensureProfilesData } from './core/state.js';
import { onAuthChange, getCurrentUser } from './core/auth.js';

/**
 * GLOBAL UI HELPERS
 */
export function showAlert(title, desc, icon = '✨') {
    return new Promise((resolve) => {
        const modal = document.getElementById('global-modal');
        const iconEl = document.getElementById('modal-icon');
        const titleEl = document.getElementById('modal-title');
        const descEl = document.getElementById('modal-desc');
        const actionsEl = document.getElementById('modal-actions');

        iconEl.textContent = icon;
        titleEl.textContent = title;
        descEl.textContent = desc;

        actionsEl.innerHTML = `
            <button class="w-full bg-blurple hover:bg-blurple/90 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs">
                Rozumím
            </button>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        actionsEl.querySelector('button').onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(true);
        };
    });
}

export function showConfirm(title, desc, icon = '❓') {
    return new Promise((resolve) => {
        const modal = document.getElementById('global-modal');
        const iconEl = document.getElementById('modal-icon');
        const titleEl = document.getElementById('modal-title');
        const descEl = document.getElementById('modal-desc');
        const actionsEl = document.getElementById('modal-actions');

        iconEl.textContent = icon;
        titleEl.textContent = title;
        descEl.textContent = desc;

        actionsEl.innerHTML = `
            <button id="confirm-yes" class="w-full bg-blurple hover:bg-blurple/90 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs">
                Potvrdit
            </button>
            <button id="confirm-no" class="w-full bg-darkPrimary/50 hover:bg-darkPrimary/80 text-gray-500 hover:text-white font-black py-4 rounded-2xl border border-white/5 transition-all active:scale-95 uppercase tracking-widest text-[10px]">
                Zrušit
            </button>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        document.getElementById('confirm-yes').onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(true);
        };

        document.getElementById('confirm-no').onclick = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(false);
        };
    });
}

/**
 * MaturitaHub 2026 - Main Entry Point
 */

document.addEventListener('DOMContentLoaded', async () => {
    initRouter();
    
    // 1. Initial Auth Check
    const user = await getCurrentUser();
    if (user) {
        handleAuthSuccess(user);
    } else {
        showLogin();
    }
    
    // 2. Listen for Auth Changes
    onAuthChange((event, session) => {
        if (event === 'SIGNED_IN') handleAuthSuccess(session.user);
        if (event === 'SIGNED_OUT') showLogin();
    });
});

async function handleAuthSuccess(user) {
    console.log("[MaturitaHub] Auth success for:", user.email);
    state.currentUser = user;
    hideLogin();
    
    // 1. Get nickname (prioritize metadata from signup)
    const metadataNickname = user.user_metadata?.nickname;
    const emailNickname = user.email.split('@')[0];
    const initialName = metadataNickname || emailNickname;

    try {
        // 2. Load critical data
        await ensureProfilesData();
        
        // 3. Ensure profile exists
        if (!state.users[user.id]) {
            console.log("[MaturitaHub] Profile missing, creating one with name:", initialName);
            const { supabase } = await import('./core/supabase.js');
            const { data: newProfile } = await supabase.from('profiles').upsert({
                id: user.id,
                display_name: initialName,
                avatar_url: `https://ui-avatars.com/api/?name=${initialName}&background=5865F2&color=fff`
            }).select().single();
            
            if (newProfile) state.users[user.id] = newProfile;
        }

        // 4. Update UI Name
        const profile = state.users[user.id];
        document.getElementById('my-name').textContent = profile?.display_name || initialName;

        await ensureMaturaData();
        renderCurrentRoute();
    } catch (err) {
        console.error("[MaturitaHub] Critical Initialization Error:", err);
        const container = document.getElementById('main-content');
        if (container) {
            container.innerHTML = `
                <div class="card p-10 text-center space-y-4 border-accent-danger">
                    <div class="text-4xl">❌</div>
                    <h2 class="text-xl font-bold uppercase italic">Chyba při startu</h2>
                    <p class="text-gray-500 text-sm max-w-sm mx-auto">Aplikaci se nepodařilo spojit s databází. Zkontrolujte prosím své přihlašovací údaje v <code>supabase.js</code> a ujistěte se, že jste spustili SQL skript.</p>
                    <p class="text-xs text-red-400 opacity-50">${err.message}</p>
                </div>
            `;
        }
    }
}

function showLogin() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('login-overlay').classList.add('flex');
}

function hideLogin() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('login-overlay').classList.remove('flex');
}

// --- ROUTER ---

function initRouter() {
    window.addEventListener('hashchange', () => {
        renderCurrentRoute();
    });
}

function renderCurrentRoute() {
    const fullHash = window.location.hash || '#dashboard';
    console.log("[MaturitaHub] Routing to:", fullHash);
    
    // Split by / to handle sub-routes like #view/id
    const parts = fullHash.split('/');
    const hash = parts[0];
    const id = parts[1];
    
    const container = document.getElementById('main-content');
    if (!container) return;
    
    // Update Nav Active States
    document.querySelectorAll('.nav-link, .mobile-nav-btn').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });

    const handleImportError = (err) => {
        console.error("[MaturitaHub] Module Load Error:", err);
        container.innerHTML = `
            <div class="card p-10 text-center space-y-4 border-accent-danger max-w-md mx-auto mt-20">
                <div class="text-4xl">🔌</div>
                <h2 class="text-xl font-bold uppercase italic">Chyba načítání stránky</h2>
                <p class="text-gray-500 text-sm">Nepodařilo se načíst požadovaný modul. Zkontrolujte připojení k internetu a zkuste to znovu.</p>
                <button onclick="window.location.reload()" class="btn-primary mt-4 text-xs">Obnovit aplikaci</button>
            </div>
        `;
    };

    try {
        if (hash === '#dashboard') {
            import('./modules/dashboard.js').then(m => m.renderDashboard(container)).catch(handleImportError);
        } else if (hash === '#library') {
            import('./modules/library.js').then(m => m.renderLibrary(container)).catch(handleImportError);
        } else if (hash === '#browse') {
            import('./modules/browse.js').then(m => m.renderBrowse(container)).catch(handleImportError);
        } else if (hash === '#study-room') {
            import('./modules/study_room.js').then(m => m.renderStudyRoom(container)).catch(handleImportError);
        } else if (hash === '#profile') {
            import('./modules/profile.js').then(m => m.renderProfile(container)).catch(handleImportError);
        } else if (hash === '#view' && id) {
            console.log("[MaturitaHub] Opening Viewer for:", id);
            import('./modules/viewer.js').then(m => m.openTopic(id)).catch(handleImportError);
        } else if (hash === '#edit' && id) {
            import('./modules/editor.js').then(m => m.editTopic(id)).catch(handleImportError);
        } else if (hash === '#new') {
            import('./modules/editor.js').then(m => m.openNewTopic()).catch(handleImportError);
        } else {
            console.warn("[MaturitaHub] Unknown Route:", hash);
            container.innerHTML = `
                <div class="card p-10 text-center space-y-4 max-w-md mx-auto mt-20">
                    <div class="text-4xl">🧭</div>
                    <h2 class="text-xl font-bold uppercase italic">Stránka nenalezena</h2>
                    <p class="text-gray-500 text-sm">Tato adresa neexistuje.</p>
                    <a href="#dashboard" class="btn-primary inline-block mt-4 text-xs">Zpět domů</a>
                </div>
            `;
        }
    } catch (err) {
        handleImportError(err);
    }
}

// --- AUTH UI HANDLERS ---

let authMode = 'login'; // 'login' or 'signup'

const authToggleBtn = document.getElementById('auth-toggle-btn');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const nicknameField = document.getElementById('nickname-field');

authToggleBtn.addEventListener('click', () => {
    authMode = authMode === 'login' ? 'signup' : 'login';
    authTitle.textContent = authMode === 'login' ? 'Vítej zpět!' : 'Vytvořit účet';
    authSubmitBtn.textContent = authMode === 'login' ? 'Vstoupit 🚀' : 'Registrovat 📝';
    authToggleBtn.innerHTML = authMode === 'login' ? 'Nemáš účet? Registruj se &rarr;' : 'Už máš účet? Přihlas se &larr;';
    
    // Toggle nickname field
    if (authMode === 'signup') {
        nicknameField.classList.remove('hidden');
    } else {
        nicknameField.classList.add('hidden');
    }
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const nickname = e.target.nickname?.value || '';
    const errorEl = document.getElementById('auth-error');
    
    try {
        const { signIn, signUp } = await import('./core/auth.js');
        if (authMode === 'login') {
            await signIn(email, password);
        } else {
            if (!nickname) throw new Error("Prosím zadej svůj nickname.");
            await signUp(email, password, { nickname });
            showAlert('Registrace úspěšná!', 'Tvůj studijní profil je připraven. Nyní se můžeš přihlásit.', '🎉');
            authToggleBtn.click(); // Switch back to login
        }
        errorEl.classList.add('hidden');
    } catch (err) {
        errorEl.textContent = "Chyba: " + err.message;
        errorEl.classList.remove('hidden');
    }
});
