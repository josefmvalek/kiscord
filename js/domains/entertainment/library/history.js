import { state } from '@core/state.js';
import { supabase } from '@core/supabase.js';
import { safeUpsert } from '@core/offline.js';
import { triggerHaptic } from '@core/utils.js';
import { ensureModals } from './modals.js';

let currentHistoryStatus = "unseen";

export function openHistoryModal(id) {
    ensureModals();
    let item = state.watchHistory[id];
    
    if (!item || typeof item === 'string') {
        item = { 
            status: typeof item === 'string' ? item : "unseen", 
            date: "", 
            reaction: "", 
            rating: state.ratings[id] || 0 
        };
    }

    const idInput = document.getElementById("history-item-id");
    const modal = document.getElementById("history-modal");
    if (idInput) idInput.value = id;
    if (modal) modal.style.display = "flex";
    triggerHaptic('light');

    if (item.date) document.getElementById("history-date").value = item.date;
    else document.getElementById("history-date").valueAsDate = new Date();

    const reaction = item.reaction || "";
    document.getElementById("history-reaction").value = reaction;
    
    document.querySelectorAll(".verdict-btn").forEach(btn => {
        btn.classList.remove("active");
        const verdictText = btn.querySelector("span:last-child")?.innerText;
        const emoji = btn.querySelector("span:first-child")?.innerText;
        if (reaction.includes(emoji) || (verdictText && reaction.toLowerCase().includes(verdictText.toLowerCase()))) {
            btn.classList.add("active");
        }
    });
    
    setStarRating(item.rating || 0);
    setHistoryStatus(item.status);
}

export function setReactionInput(text, btn) {
    const input = document.getElementById("history-reaction");
    if (!input) return;

    triggerHaptic('light');

    document.querySelectorAll(".verdict-btn").forEach(b => b.classList.remove("active"));
    
    if (btn) {
        btn.classList.add("active");
        const currentVal = input.value.trim();
        const emojiMatch = currentVal.match(/^(\p{Emoji_Presentation}\s[^\n]+)/u);
        
        if (!currentVal || emojiMatch) {
            input.value = text;
        } else {
            input.value = text + "\n" + currentVal;
        }
    } else {
        input.value = text;
    }
}

export function setStarRating(rating) {
    triggerHaptic('light');
    const ratingInput = document.getElementById("history-rating");
    if (ratingInput) ratingInput.value = rating;
    
    const stars = document.querySelectorAll(".star-btn");
    stars.forEach(btn => {
        const r = parseInt(btn.getAttribute("data-rating"));
        if (r <= rating) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

export function setHistoryStatus(status) {
    triggerHaptic('light');
    currentHistoryStatus = status;

    document.querySelectorAll(".status-btn").forEach((btn) => {
        btn.classList.add("opacity-50");
        btn.classList.remove("bg-[#40444b]", "border-[#eb459e]");
    });

    const activeBtn = document.getElementById(`status-${status}`);
    if (activeBtn) {
        activeBtn.classList.remove("opacity-50");
        activeBtn.classList.add("bg-[#40444b]", "border-[#eb459e]");
    }

    const dateWrapper = document.getElementById("history-date-wrapper");
    const reactionWrapper = document.getElementById("history-reaction-wrapper");

    if (status === "unseen") {
        dateWrapper.classList.add("hidden");
        reactionWrapper.classList.add("hidden");
    } else if (status === "watching") {
        dateWrapper.classList.remove("hidden");
        reactionWrapper.classList.add("hidden");
    } else if (status === "seen") {
        dateWrapper.classList.remove("hidden");
        reactionWrapper.classList.remove("hidden");
    }
}

export async function saveHistory(refreshFn) {
    const idInput = document.getElementById("history-item-id");
    if (!idInput) return;
    const id = parseInt(idInput.value);
    
    const dateEl = document.getElementById("history-date");
    const reactionEl = document.getElementById("history-reaction");
    const ratingEl = document.getElementById("history-rating");

    const date = dateEl ? dateEl.value : "";
    const reaction = reactionEl ? reactionEl.value : "";
    const rating = ratingEl ? parseInt(ratingEl.value) || 0 : 0;

    const finalDate = (currentHistoryStatus !== "unseen" && !date) ? new Date().toISOString().split('T')[0] : date;

    if (currentHistoryStatus === "unseen") {
        delete state.watchHistory[id];
        delete state.ratings[id];
        await supabase.from('library_ratings').delete().match({ media_id: id });
        triggerHaptic('heavy');
    } else {
        triggerHaptic('success');
        const { error } = await safeUpsert('library_ratings', {
            media_id: id,
            rating: rating,
            status: currentHistoryStatus,
            reaction: reaction,
            seen_date: finalDate || null,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error("Save history error:", error);
            if (window.showNotification) window.showNotification("Chyba při ukládání... 😕", "error");
            return;
        }

        state.ratings[id] = rating;
        state.watchHistory[id] = {
            rating: rating,
            status: currentHistoryStatus,
            date: finalDate,
            reaction: reaction
        };
    }

    if (finalDate) {
        if (!state.movieHistory[finalDate]) state.movieHistory[finalDate] = [];
        state.movieHistory[finalDate] = state.movieHistory[finalDate].filter(m => m.media_id !== id);
        
        if (currentHistoryStatus === 'seen') {
            state.movieHistory[finalDate].push({
                media_id: id,
                rating: rating,
                status: currentHistoryStatus,
                reaction: reaction
            });
        }
    }

    if (window.closeModal) window.closeModal("history-modal");
    else document.getElementById("history-modal").style.display = "none";

    if (window.showNotification) window.showNotification("Deníček aktualizován! 📝", "success");

    if (refreshFn) refreshFn();
}

export function deleteHistory() {
    ensureModals();
    triggerHaptic('light');
    const idInput = document.getElementById("history-item-id");
    if (!idInput) return;
    const id = idInput.value;
    if (!id) return;
    const modal = document.getElementById("delete-history-modal");
    if (modal) modal.style.display = "flex";
}

export async function confirmDeleteHistory(refreshFn) {
    const id = parseInt(document.getElementById("history-item-id")?.value);
    if (!id) return;

    triggerHaptic('heavy');

    try {
        const { error } = await supabase.from('library_ratings').delete().match({ media_id: id });
        if (error) throw error;

        if (state.watchHistory[id]?.date) {
            const date = state.watchHistory[id].date;
            if (state.movieHistory[date]) {
                state.movieHistory[date] = state.movieHistory[date].filter(m => m.media_id !== id);
            }
        }

        delete state.watchHistory[id];
        delete state.ratings[id];

        if (window.closeModal) {
            window.closeModal("delete-history-modal");
            window.closeModal("history-modal");
        } else {
            document.getElementById("delete-history-modal").style.display = "none";
            document.getElementById("history-modal").style.display = "none";
        }

        if (window.showNotification) window.showNotification("Záznam smazán 🗑️", "success");

        if (refreshFn) refreshFn();
    } catch (e) {
        console.error("Delete history error:", e);
        if (window.showNotification) window.showNotification("Chyba při mazání... 😕", "error");
    }
}
