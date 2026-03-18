
import { triggerHaptic } from '../core/utils.js';

// --- CONFESSION LOGIC ---

export function startConfession() {
    const modal = document.getElementById("final-confession-modal");
    if (!modal) return;

    modal.style.display = "flex";

    // Start typewriter effect
    runTypewriter();
}

function runTypewriter() {
    const container = document.getElementById("typing-text-container");
    if (!container) return;

    container.innerHTML = ""; // Clear

    const textParts = [
        { text: "Ahoj Klárko...", bold: true },
        { text: "Vím, že to zní šíleně, ale musím ti něco říct." },
        { text: "Už dlouho vnímám, že to mezi námi není jen o kamarádství." },
        { text: "Každá zpráva, každá hra, každý moment s tebou...", highlight: true },
        { text: "Pro mě to znamená víc." },
        { text: "Mám tě moc rád. A ne, není to vtip." },
        { text: "Nechtěla bys to se mnou zkusit?", bold: true, center: true },
    ];

    let partIndex = 0;
    let charIndex = 0;
    let currentP = null;

    function typeChar() {
        if (partIndex >= textParts.length) {
            setTimeout(() => {
                const btns = document.getElementById("confession-buttons");
                if (btns) {
                    btns.classList.remove("hidden");
                    btns.classList.add("animate-fade-in");
                }
            }, 500);
            return;
        }

        const part = textParts[partIndex];

        if (!currentP) {
            currentP = document.createElement("p");
            if (part.bold) currentP.className = "font-bold text-white text-lg";
            if (part.highlight)
                currentP.className = "text-[#eb459e] font-bold text-center text-xl my-2";
            if (part.center)
                currentP.className = "font-bold text-white text-center mt-4 text-lg";
            currentP.classList.add("typing-cursor");
            container.appendChild(currentP);
        }

        if (charIndex < part.text.length) {
            currentP.textContent = part.text.substring(0, charIndex + 1);
            charIndex++;
            setTimeout(typeChar, 60); // Faster typing speed per char
        } else {
            currentP.classList.remove("typing-cursor");
            currentP = null;
            charIndex = 0;
            partIndex++;
            setTimeout(typeChar, 600); // Shorter pause between lines
        }
    }

    typeChar();
}

export function responseYes() {
    const content = document.getElementById("final-modal-content");
    if (!content) return;

    content.innerHTML = `
                      <div class="animate-fade-in">
                          <h2 class="text-3xl font-bold text-[#eb459e] mb-2">❤️ CONNECTION ESTABLISHED! ❤️</h2>
                          <p class="text-gray-300 text-lg leading-relaxed mb-6">
                              Děkuju, že jsi mi dala šanci. Jsi moje kotva v celém tom mém chaosu a slibuju, že si toho budu vážit každý den.
                              <br><br>
                              Těším se na všechno, co nás čeká.
                          </p>
                          <div class="mt-8">
                              <button onclick="import('./js/modules/confession.js').then(m => m.closeModal('final-confession-modal')); window.switchChannel('dateplanner');" class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-4 rounded-lg font-bold text-xl shadow-lg transition transform hover:scale-105">
                                  Jít na rande
                              </button>
                          </div>
                      </div>
                  `;
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();
}

export function responseNo() {
    const content = document.getElementById("final-modal-content");
    if (!content) return;

    content.innerHTML = `
                      <div class="animate-fade-in">
                          <h2 class="text-2xl font-bold text-white mb-4">Díky za upřímnost, Klárko.</h2>
                          <p class="text-gray-300 text-lg mb-6 leading-relaxed">
                              Moc si tě vážím a jsem rád, že si můžeme dál zůstat blízcí tak, jak jsme.
                              <br><br>
                              Nic se nemění – dál budeme yappovat o teoriích a hrát Tetris. 😊
                          </p>
                          <button onclick="import('./js/modules/confession.js').then(m => m.closeModal('final-confession-modal'))" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-lg font-bold transition">
                              Zpět na server
                          </button>
                      </div>
                  `;
}

export function planDate() {
    // Create content HTML for planning
    const content = `
                      <div class="animate-fade-in">
                          <div class="text-4xl mb-2">📅</div>
                          <h2 class="text-xl font-bold text-white mb-4">Plánovač Rande v2.0</h2>
                          <div class="space-y-4 text-left">
                              <div>
                                  <label class="block text-[#b9bbbe] text-xs font-bold uppercase mb-1">Kdy máš čas?</label>
                                  <select id="date-select" class="w-full bg-[#202225] text-white p-2.5 rounded border border-[#202225] focus:border-[#5865F2] focus:outline-none transition">
                                      <option value="Co nejdříve">Co nejdříve! 🚀</option>
                                      <option value="Tento víkend">Tento víkend</option>
                                      <option value="Příští týden">Příští týden</option>
                                      <option value="Po zkouškách">Až po zkouškách</option>
                                      <option value="Jindy">Jindy (napišu ti)</option>
                                  </select>
                              </div>
                              <div>
                                  <label class="block text-[#b9bbbe] text-xs font-bold uppercase mb-1">Co podnikneme?</label>
                                  <div class="grid grid-cols-2 gap-2">
                                      <button type="button" onclick="import('./js/modules/confession.js').then(m => m.selectActivity(this, 'Kino'))" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Kino 🍿</button>
                                      <button type="button" onclick="import('./js/modules/confession.js').then(m => m.selectActivity(this, 'Kavárna'))" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Kavárna ☕</button>
                                      <button type="button" onclick="import('./js/modules/confession.js').then(m => m.selectActivity(this, 'Procházka'))" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Procházka 🌲</button>
                                      <button type="button" onclick="import('./js/modules/confession.js').then(m => m.selectActivity(this, 'Chill'))" class="activity-btn bg-[#2f3136] hover:bg-[#40444b] text-white p-3 rounded text-sm font-medium transition border border-transparent hover:border-[#5865F2]">Chill u mě 🎮</button>
                                  </div>
                              </div>
                              <div>
                                  <label class="block text-[#b9bbbe] text-xs font-bold uppercase mb-1">Detaily / Poznámka</label>
                                  <textarea id="custom-note" class="w-full bg-[#202225] text-white p-2.5 rounded border border-[#202225] focus:border-[#5865F2] focus:outline-none transition text-sm h-20 resize-none" placeholder="Např. na co máš chuť, jaký film..."></textarea>
                              </div>
                          </div>
                          <button onclick="import('./js/modules/confession.js').then(m => m.confirmDate())" class="mt-6 w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded font-bold transition transform active:scale-95 shadow-md"><i class="fas fa-paper-plane mr-2"></i> Odeslat návrh</button>
                      </div>
                  `;

    // Replace only content inside the box
    document.getElementById("final-modal-content").innerHTML = content;
}

export function selectActivity(btn, act) {
    document.querySelectorAll(".activity-btn").forEach((b) => {
        b.classList.remove("bg-[#5865F2]", "border-[#5865F2]", "selected");
        b.classList.add("bg-[#2f3136]");
    });
    btn.classList.remove("bg-[#2f3136]");
    btn.classList.add("bg-[#5865F2]", "selected");
    btn.dataset.value = act;
}

export function confirmDate() {
    const date = document.getElementById("date-select").value;
    const actBtn = document.querySelector(".activity-btn.selected");
    const activity = actBtn ? actBtn.dataset.value : "Něco vymyslíme";
    const note = document.getElementById("custom-note").value;
    const message = `📅 **NÁVRH RANDE**\n\n🕒 **Kdy:** ${date}\n🎭 **Co:** ${activity}\n📝 **Poznámka:** ${note || "Bez poznámky"}\n\n*Odesláno z Kiscordu*`;

    const fallbackCopy = (text) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand("copy");
            showRedirect();
        } catch (err) {
            if (window.showNotification) window.showNotification("Chyba", "error");
        }
        document.body.removeChild(textArea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard
            .writeText(message)
            .then(showRedirect)
            .catch(() => fallbackCopy(message));
    else fallbackCopy(message);
}

function showRedirect() {
    const confModal = document.getElementById("final-confession-modal");
    const redirModal = document.getElementById("redirect-modal");

    if (confModal) confModal.style.display = "none";
    if (redirModal) redirModal.style.display = "flex";
}

export function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = "none";
}
