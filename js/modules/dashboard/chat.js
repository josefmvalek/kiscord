import { state } from '../../core/state.js';
import { triggerHaptic, triggerConfetti } from '../../core/utils.js';
import { getAssetUrl } from '../../core/assets.js';

export function handleWelcomeChat(e) {
    if (e.key === "Enter") {
        const text = e.target.value.trim();
        if (!text) return;

        triggerHaptic("light");
        addMessageToChat(state.currentUser.name, "klarka_profilovka.webp", text);
        e.target.value = "";
        processCommand(text);
    }
}

export function addMessageToChat(name, avatar, text, isBot = false) {
    const container = document.getElementById("new-messages-area");
    const scroller = document.getElementById("chat-scroller");
    if (!container) return;

    const div = document.createElement("div");
    div.className = "message-group animate-fade-in group hover:bg-black/5 -mx-4 px-4 py-1 mt-1";

    const badge = isBot ? `<span class="text-[10px] bg-[#5865F2] text-white px-1 rounded uppercase font-bold flex-shrink-0 ml-1">BOT</span>` : "";
    const colorClass = isBot ? "text-[#5865F2]" : "text-white";
    
    // Resolve avatar URL via Asset Manager if it looks like a simple filename or internal path
    let avatarSrc = avatar;
    if (!avatar.startsWith('http') && !avatar.startsWith('data:')) {
        const assetKey = avatar.includes('jozka') ? 'jozka_profile' : 
                         avatar.includes('klarka') ? 'klarka_profile' : 'app_kytka';
        avatarSrc = getAssetUrl(assetKey);
    }

    div.innerHTML = `
        <div class="flex gap-4 items-start">
            <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover mt-1 shadow-md flex-shrink-0" loading="lazy">
            <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                    <span class="font-bold text-[var(--text-header)] hover:underline cursor-pointer">${name}</span>
                    ${badge}
                    <span class="text-xs text-[var(--interactive-normal)]">Právě teď</span>
                </div>
                <div class="text-[var(--text-normal)] mt-1 ${colorClass}">
                    <p>${text}</p>
                </div>
            </div>
        </div>
    `;

    container.appendChild(div);
    if (scroller) scroller.scrollTop = scroller.scrollHeight;

    // Achievement Hook
    if (!isBot && state.currentUser.name === 'Klárka') {
        state.messageCount = (state.messageCount || 0) + 1;
        if (state.messageCount >= 10) {
            import('../achievements.js').then(m => m.autoUnlock('social_butterfly'));
        }
    }
}

export function processCommand(text) {
    const lower = text.toLowerCase();
    const indicator = document.getElementById("typing-indicator");

    const botReply = (msg, delay = 1000) => {
        if (indicator) indicator.classList.remove('hidden');
        if (indicator) indicator.style.display = "flex";
        setTimeout(() => {
            if (indicator) indicator.style.display = "none";
            triggerHaptic("medium");
            addMessageToChat("System Bot", "jozka_profile", msg, true);
        }, delay);
    };

    if (lower.startsWith("/miluju") || lower.includes("laska") || lower.includes("láska")) {
        botReply("❤️ Alert: Hladina lásky překročila kritickou mez! Systém se roztéká! ❤️", 1000);
        triggerConfetti();
    }
    else if (lower.includes("sova") || lower.includes("sovy") || lower.includes("hou")) {
        const facts = state.factsLibrary?.owl || [];
        if (facts.length > 0) {
            const fact = facts[Math.floor(Math.random() * facts.length)];
            botReply(`🦉 ${fact.text}`, 1000);
        } else botReply("🦉 Hou hou! (Zatím o mně nic nevím)", 1000);
    }
    else if (lower.includes("mýval") || lower.includes("myval") || lower.includes("raccoon")) {
        const facts = state.factsLibrary?.raccoon || [];
        if (facts.length > 0) {
            const fact = facts[Math.floor(Math.random() * facts.length)];
            botReply(`🦝 ${fact.text}`, 1000);
        } else botReply("🦝 *Krade popelnici* (A o mně nic nevíš?)", 1000);
    }
    else if (lower.startsWith("/help") || lower.includes("pomoc")) {
        botReply("🤖 **Dostupné příkazy:**\n`/miluju` - Vyznání lásky\n`/sova` - Moudrost\n`hlad` - Pomoc s výběrem", 500);
    }
}

export function refreshDashboardFact() {
    const allFacts = [...(state.factsLibrary?.owl || []), ...(state.factsLibrary?.raccoon || [])];
    if (allFacts.length === 0) return;
    const randomFact = allFacts[Math.floor(Math.random() * allFacts.length)];
    const el = document.getElementById("dashboard-fact-container");
    if (el) {
        el.style.opacity = "0";
        setTimeout(() => {
            el.querySelector('p').innerHTML = `"${randomFact.text}"`;
            el.querySelector('.text-2xl').innerHTML = randomFact.icon || "🦝";
            el.style.opacity = "1";
        }, 200);
    }
}
