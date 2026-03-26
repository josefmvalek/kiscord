
import { state } from '../core/state.js';

export function ensureProfileModal() {
    if (!document.getElementById("user-popout")) {
        const popout = document.createElement("div");
        popout.id = "user-popout";
        popout.className = "user-popout";
        popout.innerHTML = `
            <div class="popout-banner"></div>
            <img id="popout-user-avatar" src="img/app/klarka_profilovka.webp" class="popout-avatar object-cover" />
            <div class="popout-badges text-xl">🏆 🦉</div>
            <div class="pt-12 pb-4 px-4">
                <h3 id="popout-user-name" class="text-white font-bold text-lg">&nbsp;</h3>
                <p class="text-gray-400 text-xs border-b border-gray-700 pb-3">
                    #1337 • Vrchní Fact-Checker
                </p>

                <div class="mt-3">
                    <h4 class="text-xs font-bold text-gray-300 uppercase mb-1">BIO</h4>
                    <p id="popout-user-bio" class="text-gray-400 text-sm">
                        📍 Věří, že Podolí je skutečné místo.<br />
                        🦉 Spirituální zvíře: Sova (protože ponocuje).<br />
                        🔥 Přežila se mnou Hody i požár v Polešovicích.<br />
                        <span class="text-[#eb459e] font-bold">Status:</span> Vrchní navigátor (občas).
                    </p>
                </div>

                <button onclick="window.switchChannel('restore-data'); document.getElementById('user-popout').classList.remove('active')"
                    class="w-full mt-4 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white py-2 rounded text-xs font-bold transition border border-blue-500/20 flex items-center justify-center gap-2">
                    <i class="fas fa-history"></i> Obnovit data (z JSON)
                </button>

                <button onclick="import('./js/core/auth.js').then(m => m.signOut())"
                    class="w-full mt-2 bg-[#ed4245]/10 hover:bg-[#ed4245] text-[#ed4245] hover:text-white py-2 rounded text-xs font-bold transition border border-[#ed4245]/20 flex items-center justify-center gap-2">
                    <i class="fas fa-sign-out-alt"></i> Odhlásit se
                </button>
            </div>
        `;
        document.body.appendChild(popout);
    }
}

export function toggleUserPopout() {
    ensureProfileModal();
    const popout = document.getElementById("user-popout");
    if (!popout) return;

    if (popout.classList.contains("active")) {
        popout.classList.remove("active");
    } else {
        // Update data before showing
        const user = state.currentUser;
        if (user) {
            const nameEl = document.getElementById("popout-user-name");
            const avatarEl = document.getElementById("popout-user-avatar");
            if (nameEl) nameEl.textContent = user.name || user.email;
            if (avatarEl && user.avatar) avatarEl.src = user.avatar;
        }
        
        popout.classList.add("active");
        
        // Close on outside click
        const closePopout = (e) => {
            if (!popout.contains(e.target) && !e.target.closest('[onclick*="toggleUserPopout"]')) {
                popout.classList.remove("active");
                document.removeEventListener("click", closePopout);
            }
        };
        setTimeout(() => document.addEventListener("click", closePopout), 10);
    }
}
