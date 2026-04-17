import { triggerHaptic, triggerConfetti } from '../core/utils.js';
import { state } from '../core/state.js';
import { showNotification } from '../core/theme.js';
import { supabase } from '../core/supabase.js';
import { renderModal as uiModal } from '../core/ui.js';
import { loadMarked, loadKaTeX } from '../core/loader.js';

let quizData = [];
let currentIndex = 0;
let score = 0;
let results = []; 
let isFinished = false;

export async function openQuiz(itemId) {
    await Promise.all([loadMarked(), loadKaTeX()]);
    
    // Fetch fresh data
    try {
        const { data, error } = await supabase.from('matura_topics').select('title, quizzes').eq('id', itemId).single();
        if (error || !data || !data.quizzes || data.quizzes.length === 0) {
            showNotification("Pro toto téma zatím není vygenerovaný test. Klikni na 'Generovat test (A/B/C)' v detailu tématu!", "warning");
            return;
        }

        quizData = data.quizzes;
        currentIndex = 0;
        score = 0;
        results = [];
        isFinished = false;

        renderModal(data.title, itemId);
        renderQuestion();
    } catch (e) {
        console.error("Quiz load error:", e);
        showNotification("Nepodařilo se načíst test z databáze.", "error");
    }
}

function renderModal(title, itemId) {
    if (document.getElementById('quiz-modal')) document.getElementById('quiz-modal').remove();

    const modalHtml = `
        <div class="flex flex-col h-full overflow-hidden bg-[var(--bg-tertiary)] relative">
            <!-- Header (Progress Dots Only) -->
            <div class="px-4 py-3 bg-black/10 border-b border-white/5 flex flex-col items-center justify-center gap-2">
                <div class="flex gap-1.5 w-full max-w-md justify-center" id="quiz-progress-dots">
                    ${quizData.map((_, i) => `
                        <div class="flex-1 h-1 rounded-full bg-white/5 border border-white/5 transition-all duration-500" id="quiz-dot-${i}"></div>
                    `).join('')}
                </div>
            </div>

            <!-- Question Area -->
            <div id="quiz-stage" class="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-10 flex flex-col items-center justify-center">
                <!-- Content injected here -->
            </div>
        </div>
    `;

    const actions = `
        <div class="flex w-full items-center justify-between gap-4">
             <div id="quiz-footer-left" class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Otázka 1 z ${quizData.length}
             </div>
             <div id="quiz-footer-center" class="flex-1 flex justify-center">
                <!-- Next button will appear here -->
             </div>
             <div id="quiz-footer-right" class="flex items-center gap-2">
                <button onclick="document.getElementById('quiz-modal').remove()" class="bg-white/5 hover:bg-white/10 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition">Ukončit test</button>
             </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', uiModal({
        id: 'quiz-modal',
        title: title || 'Cvičný test',
        subtitle: 'Oficiální simulace • AI Generováno ✍️',
        content: modalHtml,
        actions: actions,
        size: 'lg',
        onClose: "document.getElementById('quiz-modal')?.remove()"
    }));

    document.getElementById('quiz-modal').classList.remove('hidden');
    document.getElementById('quiz-modal').classList.add('flex');
}

function renderQuestion() {
    if (currentIndex >= quizData.length) {
        showSummary();
        return;
    }

    const q = quizData[currentIndex];
    const stage = document.getElementById('quiz-stage');
    if (!stage) return;

    // Check if ALREADY ANSWERED
    const result = results.find(r => r.qIndex === currentIndex);
    isFinished = !!result;

    // Reset Footer
    const footerCenter = document.getElementById('quiz-footer-center');
    if (footerCenter) {
        footerCenter.innerHTML = '';
        if (result) {
            const isLast = currentIndex + 1 >= quizData.length;
            footerCenter.innerHTML = `
                <button onclick="window.loadModule('quiz').then(m => m.nextQuestion())"
                        class="${isLast ? 'bg-[#eb459e] border-[#eb459e]' : 'bg-[#5865F2] border-[#5865F2]'} hover:brightness-110 text-white px-6 md:px-10 py-2.5 rounded-xl border font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2 animate-pop-in">
                    <span class="hidden xs:inline">${isLast ? 'Zobrazit výsledky' : 'Další otázka'}</span>
                    <span class="xs:hidden">${isLast ? 'Výsledek' : 'Další'}</span>
                    <i class="fas fa-arrow-right text-[8px]"></i>
                </button>
            `;
        }
    }
    
    // Update Progress Text & Back Button
    const footerLeft = document.getElementById('quiz-footer-left');
    if (footerLeft) {
        footerLeft.innerHTML = `
            <div class="flex items-center gap-2">
                ${currentIndex > 0 ? `
                    <button onclick="window.loadModule('quiz').then(m => m.prevQuestion())" 
                            class="bg-white/5 hover:bg-white/10 text-gray-400 p-2 rounded-lg transition" title="Předchozí otázka">
                        <i class="fas fa-arrow-left text-[10px]"></i>
                    </button>
                ` : ''}
                <div class="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span class="hidden sm:inline">Otázka</span> ${currentIndex + 1} <span class="text-gray-600">/ ${quizData.length}</span>
                </div>
            </div>
        `;
    }

    // Update Progress dots (Semantic)
    quizData.forEach((_, i) => {
        const dot = document.getElementById(`quiz-dot-${i}`);
        if (!dot) return;
        // ... (rest of dot reset)
        dot.className = "flex-1 h-1 rounded-full border transition-all duration-500 shadow-none";
        const dotRes = results.find(r => r.qIndex === i);
        if (i === currentIndex) {
            dot.classList.add('bg-[#5865F2]', 'border-[#5865F2]', 'shadow-[0_0_10px_rgba(88,101,242,0.8)]', 'scale-y-125');
        } else if (dotRes) {
            if (dotRes.correct) dot.classList.add('bg-green-500', 'border-green-500');
            else dot.classList.add('bg-red-500', 'border-red-500');
        } else {
            dot.classList.add('bg-white/5', 'border-white/10');
        }
    });

    stage.innerHTML = `
        <div class="w-full max-w-2xl space-y-4 md:space-y-8 animate-pop-in">
            <!-- Question Box -->
            <div class="bg-white/5 border border-white/10 p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-xl relative overflow-hidden group">
                <div class="absolute -left-4 -top-4 w-24 h-24 bg-[#48b4e0]/5 rounded-full blur-2xl"></div>
                <div class="text-[9px] md:text-[10px] font-black text-[#48b4e0] uppercase tracking-widest mb-2 md:mb-4">Otázka ${currentIndex + 1}</div>
                <h3 class="text-lg md:text-2xl font-bold text-white leading-relaxed">
                    ${q.q}
                </h3>
            </div>

            <!-- Options Grid -->
            <div class="grid grid-cols-1 gap-2 md:gap-3 pb-8" id="quiz-options">
                ${q.options.map((option, i) => {
                    let classes = "quiz-option-btn group w-full bg-[#1b1d20] hover:bg-white/5 border border-white/5 hover:border-white/20 p-4 md:p-5 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 transition-all active:scale-[0.98] text-left relative overflow-hidden";
                    let iconHtml = '';
                    let letterClasses = "w-7 h-7 md:w-8 md:h-8 shrink-0 rounded-lg bg-black/20 flex items-center justify-center text-[9px] md:text-[10px] font-black text-gray-500 group-hover:text-white transition-colors border border-white/5";
                    
                    if (result) {
                        classes += " pointer-events-none";
                        if (i === q.correct) {
                            classes += " bg-green-500/20 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
                            iconHtml = '<div class="ml-auto quiz-result-icon shrink-0"><i class="fas fa-check text-green-500 text-xs md:text-base"></i></div>';
                            letterClasses += " !bg-green-500 !text-white !border-green-500";
                        } else if (i === result.selected && !result.correct) {
                            classes += " bg-red-500/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]";
                            iconHtml = '<div class="ml-auto quiz-result-icon shrink-0"><i class="fas fa-times text-red-500 text-xs md:text-base"></i></div>';
                            letterClasses += " !bg-red-500 !text-white !border-red-500";
                        } else {
                            classes += " opacity-40 grayscale-[0.5]";
                        }
                    }

                    return `
                        <button onclick="window.loadModule('quiz').then(m => m.handleAnswer(${i}))" class="${classes}">
                            <div class="${letterClasses}">
                                ${String.fromCharCode(65 + i)}
                            </div>
                            <span class="text-xs md:text-base text-gray-300 font-medium group-hover:text-white transition-colors py-1">${option}</span>
                            ${iconHtml || '<div class="ml-auto opacity-0 quiz-result-icon shrink-0"></div>'}
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

export function prevQuestion() {
    if (currentIndex <= 0) return;
    currentIndex--;
    renderQuestion();
}

export function handleAnswer(index) {
    if (isFinished) return;
    const q = quizData[currentIndex];
    const isCorrect = (index === q.correct);
    
    isFinished = true;
    const btns = document.querySelectorAll('.quiz-option-btn');
    const icons = document.querySelectorAll('.quiz-result-icon');

    if (isCorrect) {
        score++;
        const scoreEl = document.getElementById('quiz-score-display');
        if (scoreEl) scoreEl.textContent = `${score} / ${quizData.length}`;
        triggerHaptic('success');
    } else {
        triggerHaptic('heavy');
    }

    btns.forEach((btn, i) => {
        btn.onclick = null; // Disable clicks
        btn.classList.add('pointer-events-none');

        if (i === q.correct) {
            // Highlight CORRECT (always)
            btn.classList.remove('bg-[#1b1d20]', 'border-white/5');
            btn.classList.add('bg-green-500/20', 'border-green-500', 'shadow-[0_0_15px_rgba(34,197,94,0.2)]');
            icons[i].innerHTML = '<i class="fas fa-check text-green-500 text-xs md:text-base"></i>';
            icons[i].classList.remove('opacity-0');
            const letter = btn.querySelector('.shrink-0');
            if (letter) letter.classList.add('!bg-green-500', '!text-white', '!border-green-500');
        } else if (i === index && !isCorrect) {
            // Highlight WRONG (only if user clicked it)
            btn.classList.remove('bg-[#1b1d20]', 'border-white/5');
            btn.classList.add('bg-red-500/20', 'border-red-500', 'shadow-[0_0_15px_rgba(239,68,68,0.2)]');
            icons[i].innerHTML = '<i class="fas fa-times text-red-500 text-xs md:text-base"></i>';
            icons[i].classList.remove('opacity-0');
            const letter = btn.querySelector('.shrink-0');
            if (letter) letter.classList.add('!bg-red-500', '!text-white', '!border-red-500');
        } else {
            btn.classList.add('opacity-40', 'grayscale-[0.5]');
        }
    });

    // UPDATE DOT IMMEDIATELY
    const currentDot = document.getElementById(`quiz-dot-${currentIndex}`);
    if (currentDot) {
        currentDot.className = "flex-1 h-1 rounded-full border transition-all duration-500 shadow-none scale-y-100";
        if (isCorrect) {
            currentDot.classList.add('bg-green-500', 'border-green-500', 'shadow-[0_0_5px_rgba(34,197,94,0.3)]');
        } else {
            currentDot.classList.add('bg-red-500', 'border-red-500', 'shadow-[0_0_5px_rgba(239,68,68,0.3)]');
        }
    }

    results.push({ qIndex: currentIndex, selected: index, correct: isCorrect });

    // SHOW NEXT BUTTON IN FOOTER
    const footerCenter = document.getElementById('quiz-footer-center');
    if (footerCenter) {
        const isLast = currentIndex + 1 >= quizData.length;
        footerCenter.innerHTML = `
            <button onclick="window.loadModule('quiz').then(m => m.nextQuestion())"
                    class="${isLast ? 'bg-[#eb459e] border-[#eb459e]' : 'bg-[#5865F2] border-[#5865F2]'} hover:brightness-110 text-white px-6 md:px-10 py-2.5 rounded-xl border font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center gap-2 animate-pop-in">
                <span class="hidden xs:inline">${isLast ? 'Zobrazit výsledky' : 'Další otázka'}</span>
                <span class="xs:hidden">${isLast ? 'Výsledek' : 'Další'}</span>
                <i class="fas fa-arrow-right text-[8px]"></i>
            </button>
        `;
    }
}

export function nextQuestion() {
    isFinished = false;
    currentIndex++;
    renderQuestion();
}

export function restartQuiz() {
    currentIndex = 0;
    score = 0;
    results = [];
    isFinished = false;

    // Reset Dots
    quizData.forEach((_, i) => {
        const dot = document.getElementById(`quiz-dot-${i}`);
        if (dot) dot.className = "flex-1 h-1 rounded-full bg-white/5 border border-white/5 transition-all duration-500 shadow-none scale-y-100";
    });

    const scoreEl = document.getElementById('quiz-score-display');
    if (scoreEl) scoreEl.textContent = `0 / ${quizData.length}`;

    renderQuestion();
}

function showSummary() {
    const stage = document.getElementById('quiz-stage');
    if (!stage) return;

    // Clear Footer Next Button if any
    const footerCenter = document.getElementById('quiz-footer-center');
    if (footerCenter) footerCenter.innerHTML = '';

    const percent = Math.round((score / quizData.length) * 100);
    let grade = 'F';
    let color = '#ed4245';
    let msg = 'Zkus to znovu!';

    if (percent >= 90) { grade = 'A'; color = '#3ba55c'; msg = 'Geniální! Jsi připraven na jedničku.'; }
    else if (percent >= 75) { grade = 'B'; color = '#48b4e0'; msg = 'Skvělý výkon! Skoro bezchybné.'; }
    else if (percent >= 50) { grade = 'C'; color = '#facc15'; msg = 'Nebylo to špatné, ale chce to ještě projít.'; }
    else if (percent >= 30) { grade = 'D'; color = '#faa61a'; msg = 'Základy tam jsou, ale víc zaber.'; }

    stage.innerHTML = `
        <div class="w-full max-w-md text-center py-12 animate-pop-in">
            <div class="relative inline-block mb-8">
                <div class="w-32 h-32 rounded-full border-8 border-white/5 flex items-center justify-center bg-black/20 shadow-2xl">
                    <span class="text-6xl font-black italic" style="color: ${color}">${grade}</span>
                </div>
                ${percent >= 50 ? `<div class="absolute -right-4 -top-4 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center text-xl shadow-xl animate-bounce">🏆</div>` : ''}
            </div>

            <h3 class="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Test dokončen!</h3>
            <p class="text-gray-400 mb-8">${msg}</p>

            <div class="bg-white/5 rounded-3xl p-6 border border-white/5 mb-8">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-black uppercase text-gray-500 tracking-widest">Tvé skóre</span>
                    <span class="text-xl font-black text-white">${score} / ${quizData.length}</span>
                </div>
                <div class="w-full h-3 bg-black/20 rounded-full overflow-hidden">
                    <div class="h-full transition-all duration-1000" style="width: ${percent}%; background: ${color}"></div>
                </div>
                <div class="mt-4 text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center">${percent}% úspěšnost</div>
            </div>

            <div class="flex flex-col gap-3">
                 <button onclick="document.getElementById('quiz-modal').remove()" 
                         class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-4 rounded-2xl font-black uppercase tracking-widest transition shadow-xl active:scale-95">
                    Zavřít test
                 </button>
                 <button onclick="window.loadModule('quiz').then(m => m.restartQuiz())" 
                         class="w-full bg-white/5 hover:bg-white/10 text-gray-400 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition">
                    Zkusit znovu
                 </button>
            </div>
        </div>
    `;

    if (percent >= 50) {
        triggerConfetti(stage);
        triggerHaptic('success');
    }
}
