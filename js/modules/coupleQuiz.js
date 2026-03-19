import { state } from '../core/state.js';
import { supabase } from '../core/supabase.js';
import { triggerHaptic } from '../core/utils.js';

// --- COUPLES QUIZ MODULE ---

let quizView = 'hub'; // 'hub' | 'create' | 'play' | 'results'
let quizTitle = '';
let quizQuestions = [];
let currentQuizId = null; // null for creating, id for editing
let showingHistoryFor = null;
let currentQuiz = null;
let currentAnswers = {};
let currentQuestionIdx = 0;

export async function renderCoupleQuiz() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const { data: quizzes } = await supabase
        .from('couple_quizzes')
        .select('*, couple_quiz_answers(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    container.innerHTML = `
    <div class="flex flex-col h-full animate-fade-in">
        <!-- HEADER -->
        <div class="bg-gradient-to-r from-[#5865F2]/20 to-[#faa61a]/10 border-b border-[#202225] p-6">
            <div class="max-w-2xl mx-auto">
                <h1 class="text-2xl font-black text-white flex items-center gap-3 mb-1">
                    <i class="fas fa-brain text-[#5865F2]"></i> Kvízy pro Dva
                </h1>
                <p class="text-gray-400 text-sm">Otázky o sobě × odpovědi partnera = kdo vás lépe zná? 🧠</p>
            </div>
        </div>

        <!-- CONTENT -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div class="max-w-2xl mx-auto space-y-4 pb-8">
                ${quizView === 'hub' ? renderHub(quizzes || []) : ''}
                ${quizView === 'create' ? renderCreate() : ''}
            </div>
        </div>
    </div>`;
}

function renderHub(quizzes) {
    const myQuizzes = quizzes.filter(q => q.creator_id === state.currentUser.id);
    const otherQuizzes = quizzes.filter(q => q.creator_id !== state.currentUser.id && q.is_published !== false);

    return `
    <!-- Create Button -->
    <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.startCreate())"
        class="w-full py-4 bg-gradient-to-r from-[#5865F2] to-[#eb459e] text-white font-black rounded-xl shadow-lg hover:shadow-[#5865F2]/30 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mb-2">
        <i class="fas fa-plus-circle"></i> Vytvořit nový kvíz
    </button>

    ${showingHistoryFor ? renderHistory(quizzes.find(q => q.id === showingHistoryFor)) : ''}

    <!-- Partner's Quizzes (to answer) -->
    <div>
        <h2 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            <i class="fas fa-hand-point-right text-[#eb459e] mr-1"></i>
            Kvízy čekající na tebe (${otherQuizzes.length})
        </h2>
        ${otherQuizzes.length === 0 ? `
            <div class="bg-[#2f3136] rounded-xl border border-[#202225] p-6 text-center">
                <p class="text-gray-400 text-sm">Partner ještě žádný kvíz nevytvořil</p>
            </div>
        ` : otherQuizzes.map(quiz => {
            const myAnswer = quiz.couple_quiz_answers?.find(a => a.answerer_id === state.currentUser.id);
            const totalQ = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
            return `
            <div class="bg-[#2f3136] rounded-xl border border-[#202225] hover:border-[#5865F2] transition shadow-lg overflow-hidden mb-3">
                <div class="p-4">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex-1">
                            <h3 class="font-bold text-white">${quiz.title}</h3>
                            <p class="text-xs text-gray-400 mt-0.5">od ${quiz.creator_name} · ${totalQ} otázek</p>
                        </div>
                        ${myAnswer
                            ? `<div class="text-right shrink-0">
                                <div class="text-lg font-black ${myAnswer.score === myAnswer.total ? 'text-[#faa61a]' : 'text-[#5865F2]'}">${myAnswer.score}/${myAnswer.total}</div>
                                <div class="text-[10px] text-gray-500">shoda</div>
                               </div>`
                            : `<span class="bg-[#eb459e] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 animate-pulse">NOVÝ</span>`
                        }
                    </div>
                </div>
                <div class="px-4 pb-4">
                    ${myAnswer
                        ? `<div class="bg-[#202225] rounded-lg p-3 text-center">
                            <p class="text-gray-400 text-xs">Již odpovězeno · Sdílej výsledky s partnerem</p>
                           </div>`
                        : `<button onclick="import('./js/modules/coupleQuiz.js').then(m => m.startPlay('${quiz.id}'))"
                                class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-2.5 rounded-lg font-bold text-sm transition">
                                <i class="fas fa-play mr-2"></i> Odpovědět na kvíz
                           </button>`
                    }
                </div>
            </div>`;
        }).join('')}
    </div>

    <!-- My Quizzes -->
    <div>
        <h2 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            <i class="fas fa-list text-[#faa61a] mr-1"></i>
            Moje kvízy (${myQuizzes.length})
        </h2>
        ${myQuizzes.length === 0 ? `
            <div class="bg-[#2f3136] rounded-xl border border-[#202225] p-6 text-center">
                <p class="text-gray-400 text-sm">Ještě jsi nevytvořil/a žádný kvíz</p>
            </div>
        ` : myQuizzes.map(quiz => {
            const partnerAnswers = quiz.couple_quiz_answers?.filter(a => a.answerer_id !== state.currentUser.id) || [];
            const latestAnswer = partnerAnswers.length > 0 ? partnerAnswers.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0] : null;
            const totalQ = Array.isArray(quiz.questions) ? quiz.questions.length : 0;
            const isDraft = quiz.is_published === false;

            return `
            <div class="bg-[#2f3136] rounded-xl border border-[#202225] shadow-md overflow-hidden mb-3 relative">
                ${isDraft ? `<div class="absolute top-0 right-0 bg-[#faa61a] text-black text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">Draft</div>` : ''}
                <div class="p-4 flex items-center gap-4">
                    <div class="flex-1 min-w-0 cursor-pointer" onclick="import('./js/modules/coupleQuiz.js').then(m => m.toggleHistory('${quiz.id}'))">
                        <h3 class="font-bold text-white flex items-center gap-2 truncate">
                            ${quiz.title}
                            ${partnerAnswers.length > 1 ? `<span class="bg-[#5865F2]/20 text-[#5865F2] text-[9px] px-1.5 py-0.5 rounded shrink-0">${partnerAnswers.length} pokusy</span>` : ''}
                        </h3>
                        <p class="text-xs text-gray-400 mt-0.5">${totalQ} otázek</p>
                    </div>
                    ${latestAnswer
                        ? `<div class="text-right shrink-0">
                            <div class="text-lg font-black text-[#3ba55c]">${latestAnswer.score}/${latestAnswer.total}</div>
                            <div class="text-[10px] text-gray-500">partner</div>
                           </div>`
                        : `<span class="text-[10px] text-gray-500 italic shrink-0">${isDraft ? 'Koncept' : 'Čeká na partnera...'}</span>`
                    }
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.startEdit('${quiz.id}'))"
                            class="w-8 h-8 flex items-center justify-center bg-[#202225] text-gray-400 hover:text-[#5865F2] rounded-lg transition shadow-inner">
                            <i class="fas fa-edit text-xs"></i>
                        </button>
                        <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.deleteQuiz('${quiz.id}'))"
                            class="w-8 h-8 flex items-center justify-center bg-[#202225] text-gray-400 hover:text-red-400 rounded-lg transition shadow-inner">
                            <i class="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

function renderHistory(quiz) {
    if (!quiz) return '';
    const myAnswers = quiz.couple_quiz_answers?.filter(a => a.answerer_id === state.currentUser.id) || [];
    const partnerAnswers = quiz.couple_quiz_answers?.filter(a => a.answerer_id !== state.currentUser.id) || [];
    const allAnswers = [...myAnswers, ...partnerAnswers].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    return `
    <div class="bg-[#2f3136] rounded-xl border-l-4 border-[#5865F2] p-4 mb-4 animate-fade-in-up shadow-xl overflow-hidden relative">
        <div class="flex items-center justify-between mb-3">
            <div>
                <h3 class="text-[10px] font-black text-white uppercase tracking-wider">Historie pokusů</h3>
                <p class="text-[9px] text-gray-400">${quiz.title}</p>
            </div>
            <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.toggleHistory(null))" 
                class="w-6 h-6 flex items-center justify-center rounded-full bg-[#202225] text-gray-500 hover:text-white transition">
                <i class="fas fa-times text-[10px]"></i>
            </button>
        </div>
        <div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            ${allAnswers.length === 0 ? '<p class="text-gray-500 text-[10px] italic py-2 text-center">Zatím žádné pokusy</p>' : allAnswers.map(a => `
                <div class="flex items-center justify-between bg-[#202225] p-2.5 rounded-lg border border-white/5 shadow-inner">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full ${a.answerer_id === state.currentUser.id ? 'bg-[#eb459e]' : 'bg-[#faa61a] shadow-[0_0_8px_rgba(250,166,26,0.3)]'}"></div>
                        <div>
                            <div class="text-[10px] font-bold text-white">${a.answerer_id === state.currentUser.id ? 'Můj pokus' : 'Partner'}</div>
                            <div class="text-[8px] text-gray-500">${new Date(a.created_at).toLocaleString('cs-CZ', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-black text-white">${a.score}/${a.total}</div>
                        <div class="text-[8px] text-gray-500 uppercase">${Math.round((a.score/a.total)*100)}%</div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>`;
}

export function toggleHistory(quizId) {
    showingHistoryFor = (showingHistoryFor === quizId) ? null : quizId;
    renderCoupleQuiz();
}

function renderCreate() {
    return `
    <div class="bg-[#2f3136] rounded-xl border border-[#202225] overflow-hidden shadow-xl animate-scale-up">
        <div class="bg-gradient-to-r from-[#5865F2]/20 to-[#faa61a]/10 p-4 border-b border-[#202225]">
            <h2 class="font-bold text-white flex items-center gap-2">
                <i class="fas ${currentQuizId ? 'fa-edit' : 'fa-puzzle-piece'} text-[#5865F2]"></i> 
                ${currentQuizId ? 'Upravit Kvíz' : 'Nový Kvíz'}
            </h2>
            <p class="text-xs text-gray-400 mt-1">${currentQuizId ? 'Uprav své otázky nebo přidej nové' : 'Napiš otázky o sobě – partner bude hádat správné odpovědi'}</p>
        </div>

        <div class="p-5 space-y-5">
            <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Název kvízu</label>
                <input type="text" id="quiz-title" placeholder="Co víš o mně?" maxlength="60" value="${quizTitle}"
                    onchange="import('./js/modules/coupleQuiz.js').then(m => m.updateTitle(this.value))"
                    class="w-full bg-[#202225] text-white text-sm p-3 rounded-lg border border-[#202225] outline-none focus:border-[#5865F2] transition placeholder-gray-600">
            </div>

            <div>
                <div class="flex items-center justify-between mb-2">
                    <label class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Otázky</label>
                    <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.addQuestion())"
                        class="text-[10px] bg-[#5865F2] text-white px-3 py-1 rounded font-bold hover:bg-[#4752c4] transition">
                        <i class="fas fa-plus mr-1"></i> Přidat otázku
                    </button>
                </div>
                <div id="questions-container" class="space-y-4">
                    ${quizQuestions.length === 0 ? `
                        <div class="bg-[#202225] rounded-xl p-6 text-center border-2 border-dashed border-[#40444b]">
                            <p class="text-gray-500 text-sm">Přidej alespoň jednu otázku</p>
                            <p class="text-gray-600 text-xs mt-1">Např. "Moje nejoblíbenější jídlo?" nebo "Kolik hodin spím průměrně?"</p>
                        </div>
                    ` : quizQuestions.map((q, i) => `
                        <div class="bg-[#202225] rounded-xl p-4 border border-[#40444b] relative">
                            <div class="flex items-center justify-between mb-3">
                                <div class="w-6 h-6 bg-[#5865F2] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">${i + 1}</div>
                                <div class="flex items-center gap-2">
                                    <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.toggleQuestionType(${i}))"
                                        class="text-[9px] font-black px-2.5 py-1 rounded-md uppercase transition shadow-sm ${q.type === 'choice' ? 'bg-[#5865F2] text-white' : 'bg-[#36393f] text-gray-400 hover:text-white'}">
                                        <i class="fas ${q.type === 'choice' ? 'fa-th-large' : 'fa-font'} mr-1.5 opacity-70"></i>
                                        ${q.type === 'choice' ? 'Výběr' : 'Text'}
                                    </button>
                                    <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.removeQuestion(${i}))"
                                        class="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition">
                                        <i class="fas fa-times text-xs"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="flex flex-col gap-3">
                                <input type="text" value="${q.question}" placeholder="Tvá otázka..."
                                    onchange="import('./js/modules/coupleQuiz.js').then(m => m.updateQuestion(${i}, 'question', this.value))"
                                    class="w-full bg-[#2f3136] text-white text-sm p-3 rounded border border-[#40444b] outline-none focus:border-[#5865F2] transition shadow-inner">

                                ${q.type === 'choice' ? `
                                    <div class="grid grid-cols-2 gap-2 ml-9">
                                        ${[0,1,2,3].map(optIdx => `
                                            <div class="relative group">
                                                <input type="text" value="${q.options?.[optIdx] || ''}" placeholder="Možnost ${optIdx+1}"
                                                    onchange="import('./js/modules/coupleQuiz.js').then(m => m.updateOption(${i}, ${optIdx}, this.value))"
                                                    class="w-full bg-[#36393f] text-white text-xs p-2.5 rounded border ${q.correct_idx === optIdx ? 'border-[#3ba55c]' : 'border-[#40444b]'} outline-none focus:border-[#5865F2] transition">
                                                <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.setCorrectOption(${i}, ${optIdx}))"
                                                    class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#40444b] ${q.correct_idx === optIdx ? 'bg-[#3ba55c] border-[#3ba55c]' : 'bg-transparent group-hover:border-gray-500'} transition flex items-center justify-center">
                                                    ${q.correct_idx === optIdx ? '<i class="fas fa-check text-[8px] text-white"></i>' : ''}
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <p class="text-[9px] text-gray-500 ml-9 italic">Zvol správnou odpověď kliknutím na kroužek</p>
                                ` : `
                                    <div class="ml-9">
                                        <input type="text" value="${q.my_answer}" placeholder="Tvá správná odpověď..."
                                            onchange="import('./js/modules/coupleQuiz.js').then(m => m.updateQuestion(${i}, 'my_answer', this.value))"
                                            class="w-full bg-[#2f3136] text-[#3ba55c] text-sm p-2 rounded border border-[#40444b] outline-none focus:border-[#3ba55c] transition placeholder-gray-600">
                                        <p class="text-[10px] text-gray-600 mt-1">↑ Tuhle odpověď partner uvidí po vyhodnocení</p>
                                    </div>
                                `}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3 pt-2">
                <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.saveQuiz(false))"
                    class="py-3 rounded-lg border border-[#202225] text-gray-400 hover:text-white hover:bg-[#36393f] transition font-bold text-sm">
                    Uložit jako koncept
                </button>
                <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.saveQuiz(true))"
                    class="py-3 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-sm transition transform hover:scale-105 active:scale-95 shadow-lg">
                    <i class="fas fa-paper-plane mr-2"></i> Publikovat
                </button>
            </div>
            <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.cancelCreate())"
                class="w-full py-2 text-xs text-gray-500 hover:text-gray-400 transition underline">
                Zrušit a odejít
            </button>
        </div>
    </div>`;
}

export function startCreate() {
    quizView = 'create';
    quizQuestions = [];
    quizTitle = '';
    currentQuizId = null;
    renderCoupleQuiz();
}

export async function startEdit(quizId) {
    const { data: quiz } = await supabase.from('couple_quizzes').select('*').eq('id', quizId).single();
    if (!quiz) return;

    currentQuizId = quizId;
    quizView = 'create';
    quizTitle = quiz.title || '';
    quizQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];
    
    renderCoupleQuiz();
}

export function updateTitle(val) {
    quizTitle = val;
}

export function cancelCreate() {
    quizView = 'hub';
    quizQuestions = [];
    currentQuizId = null;
    renderCoupleQuiz();
}

export function addQuestion() {
    quizQuestions.push({ 
        question: '', 
        type: 'text', 
        options: ['', '', '', ''], 
        correct_idx: 0, 
        my_answer: '' 
    });
    renderCoupleQuiz();
}

export function toggleQuestionType(idx) {
    if (quizQuestions[idx]) {
        quizQuestions[idx].type = quizQuestions[idx].type === 'choice' ? 'text' : 'choice';
        renderCoupleQuiz();
    }
}

export function updateOption(qIdx, optIdx, value) {
    if (quizQuestions[qIdx]) {
        if (!quizQuestions[qIdx].options) quizQuestions[qIdx].options = ['', '', '', ''];
        quizQuestions[qIdx].options[optIdx] = value;
    }
}

export function setCorrectOption(qIdx, optIdx) {
    if (quizQuestions[qIdx]) {
        quizQuestions[qIdx].correct_idx = optIdx;
        // Also update my_answer for record Keeping
        quizQuestions[qIdx].my_answer = quizQuestions[qIdx].options[optIdx];
        renderCoupleQuiz();
    }
}

export function removeQuestion(idx) {
    quizQuestions.splice(idx, 1);
    renderCoupleQuiz();
}

export function updateQuestion(idx, field, value) {
    if (quizQuestions[idx]) {
        quizQuestions[idx][field] = value;
    }
}

export async function saveQuiz(publish = true) {
    const title = quizTitle || document.getElementById('quiz-title')?.value.trim();
    const validQuestions = quizQuestions.filter(q => q.question.trim() && (q.type === 'choice' ? q.options.some(o => o.trim()) : q.my_answer.trim()));

    if (!title) {
        if (window.showNotification) window.showNotification('Zadej název kvízu!', 'error');
        return;
    }
    if (validQuestions.length === 0) {
        if (window.showNotification) window.showNotification('Přidej alespoň jednu otázku!', 'error');
        return;
    }

    try {
        let error;
        if (currentQuizId) {
            ({ error } = await supabase.from('couple_quizzes').update({
                title,
                questions: validQuestions,
                is_published: publish,
                updated_at: new Date().toISOString()
            }).eq('id', currentQuizId));
        } else {
            ({ error } = await supabase.from('couple_quizzes').insert({
                creator_id: state.currentUser.id,
                creator_name: state.currentUser.name,
                title,
                questions: validQuestions,
                is_published: publish,
                is_active: true
            }));
        }
        
        if (error) throw error;
        triggerHaptic('success');
        if (window.showNotification) {
            const msg = publish ? (currentQuizId ? 'Kvíz publikován! 🚀' : 'Kvíz vytvořen! 🧠') : 'Uloženo jako koncept 📝';
            window.showNotification(msg, 'success');
        }
        
        quizView = 'hub';
        quizQuestions = [];
        currentQuizId = null;
        renderCoupleQuiz();
    } catch (err) {
        console.error('Failed to save quiz:', err);
        if (window.showNotification) window.showNotification('Chyba při ukládání!', 'error');
    }
}

export async function startPlay(quizId) {
    const { data: quiz } = await supabase.from('couple_quizzes').select('*').eq('id', quizId).single();
    if (!quiz) return;

    currentQuiz = quiz;
    currentAnswers = {};
    currentQuestionIdx = 0;
    renderPlayScreen();
}

function renderPlayScreen() {
    const container = document.getElementById("messages-container");
    if (!container || !currentQuiz) return;

    const questions = currentQuiz.questions;
    const total = questions.length;
    const q = questions[currentQuestionIdx];
    const progress = ((currentQuestionIdx) / total) * 100;

    container.innerHTML = `
    <div class="flex flex-col h-full animate-fade-in">
        <div class="border-b border-[#202225] bg-[#2f3136] p-4">
            <div class="max-w-xl mx-auto flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs text-gray-400 font-bold uppercase">Otázka ${currentQuestionIdx + 1} / ${total}</p>
                        <p class="text-xs text-gray-500">${currentQuiz.title}</p>
                    </div>
                    <div class="bg-[#202225] rounded-full h-2">
                        <div class="bg-gradient-to-r from-[#5865F2] to-[#eb459e] h-2 rounded-full transition-all duration-500" style="width: ${progress}%"></div>
                    </div>
                </div>
                <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.renderCoupleQuiz())"
                    class="ml-4 w-8 h-8 flex items-center justify-center rounded-full bg-[#202225] text-gray-500 hover:text-white transition shrink-0"
                    title="Ukončit kvíz">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <div class="flex-1 overflow-y-auto flex items-center justify-center p-6">
            <div class="max-w-xl w-full space-y-6">
                <div class="bg-[#2f3136] rounded-2xl border border-[#5865F2]/30 p-6 shadow-xl">
                    <div class="text-center mb-6">
                        <div class="text-4xl mb-3">🤔</div>
                        <h2 class="text-xl font-bold text-white leading-snug">${q.question}</h2>
                        <p class="text-xs text-gray-500 mt-2">Co si myslíš, jak ${currentQuiz.creator_name} odpověděl/a?</p>
                    </div>

                    ${q.type === 'choice' ? `
                        <div class="grid grid-cols-1 gap-3">
                            ${q.options.filter(o => o.trim()).map((opt, i) => `
                                <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.selectOption('${opt}'))"
                                    class="w-full p-4 rounded-xl border border-[#40444b] bg-[#202225] text-white text-left hover:border-[#5865F2] hover:bg-[#5865F2]/10 transition flex items-center justify-between group">
                                    <span class="font-medium">${opt}</span>
                                    <div class="w-6 h-6 rounded-full border-2 border-[#40444b] group-hover:border-[#5865F2] flex items-center justify-center">
                                        ${currentAnswers[currentQuestionIdx] === opt ? '<div class="w-3 h-3 bg-[#5865F2] rounded-full"></div>' : ''}
                                    </div>
                                </button>
                            `).join('')}
                        </div>
                    ` : `
                        <input type="text" id="quiz-answer-input" placeholder="Tvá odpověď..."
                            class="w-full bg-[#202225] text-white text-center text-lg p-4 rounded-xl border border-[#40444b] outline-none focus:border-[#5865F2] transition placeholder-gray-600"
                            onkeydown="if(event.key==='Enter') import('./js/modules/coupleQuiz.js').then(m => m.nextQuestion())">
                    `}
                </div>

                <div class="flex gap-3">
                    ${currentQuestionIdx > 0 ? `
                    <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.prevQuestion())"
                        class="flex-1 py-3 rounded-xl border border-[#202225] text-gray-400 hover:text-white hover:bg-[#36393f] transition font-bold">
                        <i class="fas fa-arrow-left mr-2"></i> Zpět
                    </button>` : ''}
                    <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.nextQuestion())"
                        class="flex-1 py-3 rounded-xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold transition transform hover:scale-105 active:scale-95 shadow-lg">
                        ${currentQuestionIdx < total - 1 ? 'Další <i class="fas fa-arrow-right ml-2"></i>' : 'Vyhodnotit <i class="fas fa-check ml-2"></i>'}
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    // Pre-fill if already answered
    const input = document.getElementById('quiz-answer-input');
    if (input && currentAnswers[currentQuestionIdx] !== undefined) {
        input.value = currentAnswers[currentQuestionIdx];
    }
    setTimeout(() => input?.focus(), 100);
}

export function prevQuestion() {
    const input = document.getElementById('quiz-answer-input');
    if (input) currentAnswers[currentQuestionIdx] = input.value.trim();
    currentQuestionIdx--;
    renderPlayScreen();
}

export async function selectOption(val) {
    currentAnswers[currentQuestionIdx] = val;
    nextQuestion();
}

export async function nextQuestion() {
    const input = document.getElementById('quiz-answer-input');
    if (input) {
        currentAnswers[currentQuestionIdx] = input.value.trim();
    }

    if (currentQuestionIdx < currentQuiz.questions.length - 1) {
        currentQuestionIdx++;
        renderPlayScreen();
    } else {
        // Calculate score
        const questions = currentQuiz.questions;
        let score = 0;
        questions.forEach((q, i) => {
            const correct = q.my_answer.trim().toLowerCase();
            const given = (currentAnswers[i] || '').trim().toLowerCase();
            if (correct === given || (q.type !== 'choice' && (correct.includes(given) || given.includes(correct)))) {
                score++;
            }
        });

        // Save Attempt (History)
        // Note: Using insert instead of upsert to keep history if DB allows
        try {
            await supabase.from('couple_quiz_answers').insert({
                quiz_id: currentQuiz.id,
                answerer_id: state.currentUser.id,
                answers: currentAnswers,
                score,
                total: questions.length,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            // Fallback for unique constraint
            await supabase.from('couple_quiz_answers').update({
                answers: currentAnswers,
                score,
                total: questions.length,
                updated_at: new Date().toISOString()
            }).match({ quiz_id: currentQuiz.id, answerer_id: state.currentUser.id });
        }

        // Add XP
        try {
            const xpGained = score * 10;
            if (xpGained > 0 && state.currentUser?.id) {
                await supabase.rpc('add_xp', { user_uuid: state.currentUser.id, xp_amount: xpGained });
            }
        } catch (e) { /* XP is optional */ }

        triggerHaptic('success');
        renderResults(score, questions.length);
    }
}

function renderResults(score, total) {
    const container = document.getElementById("messages-container");
    if (!container) return;

    const pct = Math.round((score / total) * 100);
    const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '😊' : '😅';
    const msg = pct === 100 ? 'Perfektní shoda!' : pct >= 70 ? 'Výborně znáte jeden druhého!' : pct >= 40 ? 'Celkem dobře!' : 'Je co zlepšovat 😄';

    container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full p-6 animate-fade-in text-center">
        <div class="text-8xl mb-4" style="animation: bounce 1s infinite;">${emoji}</div>
        <h1 class="text-4xl font-black text-white mb-2">${score} / ${total}</h1>
        <p class="text-xl text-gray-400 mb-1">${msg}</p>
        <p class="text-sm text-[#faa61a] mb-8">+${score * 10} XP získáno!</p>

        <div class="w-full max-w-sm space-y-3 mb-8">
            ${currentQuiz.questions.map((q, i) => {
                const correct = q.my_answer.trim().toLowerCase();
                const given = (currentAnswers[i] || '').trim().toLowerCase();
                const isRight = correct === given || correct.includes(given) || given.includes(correct);
                return `
                <div class="bg-[#2f3136] rounded-xl p-4 text-left border ${isRight ? 'border-[#3ba55c]/40' : 'border-red-500/30'}">
                    <p class="text-xs text-gray-400 mb-1">${q.question}</p>
                    <div class="flex items-center justify-between gap-2">
                        <div>
                            <p class="text-sm font-bold ${isRight ? 'text-[#3ba55c]' : 'text-red-400'}">${currentAnswers[i] || '(bez odpovědi)'}</p>
                        </div>
                        ${!isRight ? `<p class="text-xs text-gray-500">✓ <span class="text-[#3ba55c]">${q.my_answer}</span></p>` : ''}
                        <span class="text-lg shrink-0">${isRight ? '✅' : '❌'}</span>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <button onclick="import('./js/modules/coupleQuiz.js').then(m => m.renderCoupleQuiz())"
            class="bg-[#5865F2] hover:bg-[#4752c4] text-white px-8 py-3 rounded-xl font-bold transition transform hover:scale-105 shadow-lg">
            <i class="fas fa-home mr-2"></i> Zpět na kvízy
        </button>
    </div>`;
}

export async function deleteQuiz(id) {
    const ok = await window.showConfirmDialog('Smazat tento kvíz?', 'Smazat', 'Zrušit');
    if (!ok) return;
    await supabase.from('couple_quizzes').delete().eq('id', id);
    renderCoupleQuiz();
}
