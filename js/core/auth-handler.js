import { state, initializeState, resetLazyLoaders } from './state.js';
import { getCurrentUser, signIn, onAuthChange, isJosef, isKlarka } from './auth.js';
import { getAssetUrl } from './assets.js';
import { triggerHaptic } from './utils.js';
import { switchChannel } from './router.js';

let lastUserId = null;

export async function handleAuthState(event, session) {
    const user = session?.user;
    const loginEl = document.getElementById('login-screen');
    const appEl = document.getElementById('app-interface');

    console.log(`[Auth] State Change: ${event}`, { hasUser: !!user });

    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (user) {
            if (user.id === lastUserId) return;
            lastUserId = user.id;

            // Priority: Show the UI IMMEDIATELY
            if (loginEl) loginEl.style.display = 'none';
            if (appEl) {
                appEl.classList.add('show');
                appEl.classList.remove('opacity-0');
                appEl.classList.add('opacity-100');
            }
            updateUserProfileUI(user);

            try {
                // Critical background tasks
                await handleMigrations().catch(e => console.error("Migration Error:", e));
                await initializeState().catch(e => console.error("InitializeState Error:", e));

                // Auto-register Web Push subscription if notifications already granted
                if (Notification.permission === 'granted') {
                    import('./notifications.js').then(nm => {
                        nm.initPushSubscription().then(ok => {
                            if (ok) console.log('[Auth] Push subscription auto-registered.');
                        });
                    });
                }
            } catch (err) {
                console.error("[Auth] Background Task Error:", err);
            }

            // Route to content
            const savedChannel = localStorage.getItem('klarka_last_channel');
            const defaultChannel = (savedChannel && savedChannel !== 'welcome') ? savedChannel : 'dashboard';
            
            console.log(`[Auth] Routing to ${defaultChannel}`);
            history.replaceState({ channel: defaultChannel }, "", "");
            switchChannel(defaultChannel, false);
        } else {
            // INITIAL_SESSION with no user means they are not logged in.
            // We must force the login screen to appear
            if (loginEl) loginEl.style.display = 'flex';
            if (appEl) {
                appEl.classList.remove('show');
                appEl.classList.add('opacity-0');
            }
            lastUserId = null;
        }
    } else if (event === 'SIGNED_OUT') {
        if (loginEl) loginEl.style.display = 'flex';
        if (appEl) {
            appEl.classList.remove('show');
            appEl.classList.add('opacity-0');
        }
        lastUserId = null;
        resetLazyLoaders();
    }
}

export function initAuthListeners() {
    onAuthChange(handleAuthState);

    // Manual fallback for immediate session detection
    getCurrentUser().then(user => {
        if (user && !lastUserId) {
            console.log('[Auth] Manual session detection');
            handleAuthState('INITIAL_SESSION', { user });
        }
    });
}

export async function handleLogin(form) {
    const errorEl = document.getElementById('login-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const email = form.email.value;
    const password = form.password.value;

    if (errorEl) errorEl.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        await signIn(email, password);
        triggerHaptic('success');
    } catch (err) {
        triggerHaptic('heavy');
        if (errorEl) {
            errorEl.textContent = "Chyba přihlášení: " + (err.message === "Invalid login credentials" ? "Nesprávný e-mail nebo heslo." : err.message);
            errorEl.classList.remove('hidden');
        }
        form.querySelectorAll('input').forEach(i => i.classList.add('login-input-error'));
        setTimeout(() => {
            form.querySelectorAll('input').forEach(i => i.classList.remove('login-input-error'));
        }, 1000);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Přihlásit se</span><i class="fas fa-arrow-right text-xs"></i>';
    }
}

export function updateUserProfileUI(user) {
    const sidebarName = document.getElementById('sidebar-user-name');
    const popoutName = document.getElementById('popout-user-name');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const popoutAvatar = document.getElementById('popout-user-avatar');
    const bioParagraph = document.getElementById('popout-user-bio');

    const isMeJose = isJosef(user);
    const isMeKlarka = isKlarka(user);

    if (isMeJose) {
        const avatarUrl = getAssetUrl('jozka_profile');
        state.currentUser = { name: 'Jožka', email: user.email, id: user.id, avatar: avatarUrl };
        if (sidebarName) sidebarName.textContent = 'Jožka';
        if (popoutName) popoutName.textContent = 'Jožka';
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (popoutAvatar) popoutAvatar.src = avatarUrl;
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                Systémový Administrátor & Full-Stack Boyfriend<br />
                Třída: ENTP / Chaotický Mýval<br />
                Bio: 📍 Kunovice<br />
                ❄️ Status: Trvale studené ruce.<br />
                🛡️ Upozornění: Pravidelně potřebuje updatovat morální kodex.<br />
            `;
        }
    } else if (isMeKlarka) {
        const avatarUrl = getAssetUrl('klarka_profile');
        state.currentUser = { name: 'Klárka', email: user.email, id: user.id, avatar: avatarUrl };
        if (sidebarName) sidebarName.textContent = 'Klárka';
        if (popoutName) popoutName.textContent = 'Klárka';
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (popoutAvatar) popoutAvatar.src = avatarUrl;
        if (bioParagraph) {
            bioParagraph.innerHTML = `
                Role: Vrchní Fact-Checker & QA Tester<br />
                Třída: Spirituální Sova<br />
                Bio: 📍 Rezidentka sporného území Podolí-Kunovice.<br />
                👀 Pasivní skill: Odmítá nosit brýle, přesto vidí všechny tvoje chyby.<br />
                🦴 Slabina: Vlastní kotníky (a sprchové kouty).<br />
                👸 Status: Královna mývalů.<br />
            `;
        }
    } else {
        const avatarUrl = getAssetUrl('app_kytka');
        state.currentUser = { name: 'Host', email: user.email, id: user.id, avatar: avatarUrl };
        if (sidebarName) sidebarName.textContent = 'Host (Admin)';
        if (popoutName) popoutName.textContent = 'Host';
        if (sidebarAvatar) sidebarAvatar.src = avatarUrl;
        if (popoutAvatar) popoutAvatar.src = avatarUrl;
        if (bioParagraph) bioParagraph.innerHTML = "Přihlášen jako externí administrátor. Vítejte v systému!";
    }
}

export function updateGlobalAssetsUI() {
    const serverIcon = document.getElementById('server-icon');
    const onlineJozka = document.getElementById('online-avatar-jozka');
    const onlineKlarka = document.getElementById('online-avatar-klarka');
    const readmeAvatar = document.getElementById('readme-jozka-avatar');

    if (serverIcon) serverIcon.src = getAssetUrl('server_icon');
    if (onlineJozka) onlineJozka.src = getAssetUrl('jozka_profile');
    if (onlineKlarka) onlineKlarka.src = getAssetUrl('klarka_profile');
    if (readmeAvatar) readmeAvatar.src = getAssetUrl('jozka_profile');
}

async function handleMigrations() {
    // 1. Initial migration from LocalStorage (v1-v4)
    if (!localStorage.getItem('klarka_migration_done')) {
        const { migrateLocalDataToSupabase } = await import('../migration.js');
        const migratedCount = await migrateLocalDataToSupabase();
        if (migratedCount > 0) {
            localStorage.setItem('klarka_migration_done', 'true');
            window.location.reload();
            return;
        }
    }

    // 2. Static content seeding (Non-destructive check)
    if (!localStorage.getItem('klarka_static_migration_v5_done')) {
        const { migrateStaticContentToSupabase } = await import('../migration.js');
        await migrateStaticContentToSupabase();
        localStorage.setItem('klarka_static_migration_v5_done', 'true');
    }

    // 3. Timeline Cleanup (Repair for the duplication bug)
    if (!localStorage.getItem('klarka_timeline_repair_v1_done')) {
        const { cleanupTimelineDuplicates } = await import('../migration.js');
        const count = await cleanupTimelineDuplicates();
        localStorage.setItem('klarka_timeline_repair_v1_done', 'true');
        if (count > 0) {
            console.log(`✨ Timeline repaired: Removed ${count} duplicates.`);
            window.location.reload(); // Reload to refresh state with clean data
            return;
        }
    }
}
