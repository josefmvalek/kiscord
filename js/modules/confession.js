
import { triggerHaptic } from '../core/utils.js';

// --- CONFESSION LOGIC ---

export function startConfession() {
    // Play music (if available) - typically handled in old script.js as:
    // const music1 = document.getElementById("audio-final-countdown");
    // if (music1) { music1.currentTime = 0; music1.volume = 0.5; music1.play(); }

    const modal = document.getElementById("confession-modal");
    const output = document.getElementById("terminal-output");
    const typingArea = document.getElementById("typing-area");
    const promptText = document.getElementById("prompt-text");
    const cmdCursor = document.getElementById("cmd-cursor");

    if (!modal || !output || !typingArea) return;

    // Reset CMD window
    modal.style.display = "flex";
    output.innerHTML = `<div class="text-gray-400">Microsoft Windows [Version 10.0.19045]</div><div class="text-gray-400">(c) Microsoft Corporation. All rights reserved.</div><br>`;
    typingArea.textContent = "";
    promptText.textContent = "C:\\Users\\Klárka\\Heart>";
    cmdCursor.style.display = "inline-block";

    const command = " system_patch_v2.0.exe";
    let charIndex = 0;
    const lines = [
        "Loading shared memory database...",
        "✓ Discord logs... OK",
        "✓ Co-op games... OK",
        "✓ Inside jokes... OK",
        "Running compatibility analysis...",
        ">> Humor: MATCH",
        ">> Values: SYNCED",
        "Tetris Logic: Perfect fit detected.",
        "Analysis complete.",
        "Decrypting final message...",
    ];

    function typeCommand() {
        if (charIndex < command.length) {
            typingArea.textContent += command.charAt(charIndex);
            charIndex++;
            setTimeout(typeCommand, Math.random() * 50 + 50);
        } else {
            setTimeout(runLogs, 500);
        }
    }

    function runLogs() {
        const cmdLine = document.createElement("div");
        cmdLine.innerHTML = `<span class="text-gray-300">C:\\Users\\Klárka\\Heart></span><span class="text-white">${command}</span>`;
        output.appendChild(cmdLine);
        typingArea.textContent = "";
        promptText.textContent = "";
        cmdCursor.style.display = "none";

        let lineIndex = 0;
        function printLine() {
            if (lineIndex < lines.length) {
                const div = document.createElement("div");
                div.textContent = lines[lineIndex];
                div.className = "text-gray-300";
                output.appendChild(div);
                
                const terminalBody = document.getElementById("terminal-body");
                if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
                
                lineIndex++;

                if (lineIndex === lines.length) {
                    // End of logs - wait for interaction
                    const cursorSpan = document.createElement("span");
                    cursorSpan.className = "cmd-cursor";
                    cursorSpan.innerText = " ";
                    
                    const pressKey = document.createElement("span");
                    pressKey.className = "animate-pulse text-gray-500 ml-2";
                    pressKey.innerText = "Press any key to continue...";

                    const lastLine = document.createElement("div");
                    lastLine.appendChild(pressKey);
                    lastLine.appendChild(cursorSpan);
                    output.appendChild(lastLine);

                    const proceed = () => {
                        document.removeEventListener("keydown", proceed);
                        document.removeEventListener("click", proceed);
                        modal.style.display = "none";

                        // Switch Music (if available)
                        // const music1 = document.getElementById("audio-final-countdown");
                        // const music2 = document.getElementById("audio-divka");
                        // if (music1) music1.pause();
                        // if (music2) { music2.currentTime = 0; music2.volume = 0.5; music2.play(); }

                        showFinalTypewriter();
                    };

                    setTimeout(() => {
                        document.addEventListener("keydown", proceed);
                        document.addEventListener("click", proceed);
                    }, 500);
                } else {
                    setTimeout(printLine, 400 + Math.random() * 400);
                }
            }
        }
        printLine();
    }
    typeCommand();
}

function showFinalTypewriter() {
    const finalModal = document.getElementById("final-confession-modal");
    const modalBox = document.getElementById("final-modal-box");
    const finalModalContent = document.getElementById("final-modal-content");

    if (!finalModal || !modalBox || !finalModalContent) return;

    // Reset content to original state (in case it was modified in a previous run)
    finalModalContent.innerHTML = `
        <div id="typing-container" class="text-gray-300 mb-8 text-left space-y-4 leading-relaxed min-h-[200px] mt-8"></div>
        <div id="confession-buttons" class="space-y-3 hidden">
            <button onclick="import('./js/modules/confession.js').then(m => m.responseYes())" class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-4 rounded-lg font-bold text-lg transition shadow-lg flex items-center justify-center gap-2">
                Ano, pojďme to zkusit <i class="fas fa-heart"></i>
            </button>
            <button onclick="import('./js/modules/confession.js').then(m => m.responseNo())" class="w-full bg-[#4f545c] hover:bg-[#5d6269] text-white py-3 rounded-lg transition font-medium">
                Zůstaňme kamarádi
            </button>
        </div>
    `;

    finalModal.style.display = "flex";

    setTimeout(() => {
        modalBox.classList.remove("opacity-0", "scale-95");
        modalBox.classList.add("opacity-100", "scale-100");
        setTimeout(runTypewriter, 500);
    }, 50);
}

let isTypingActive = false;

function runTypewriter() {
    if (isTypingActive) return;
    isTypingActive = true;

    const container = document.getElementById("typing-container");
    if (!container) return;

    const textParts = [
        { text: "Klárko,", bold: true },
        { text: "hrozně si vážím toho, co mezi sebou máme. Máme podobné hodnoty, ve všem si rozumíme a jsi neuvěřitelně inteligentní a klidná." },
        { text: "Hlavně jsi ale člověk, se kterým můžu být naprosto sám sebou, protože vím, že mě bereš přesně takového, jaký jsem." },
        { text: "Mám tě hrozně rád.", highlight: true },
        { text: "Naše přátelství pro mě znamená strašně moc a nikdy o něj nechci přijít. Zároveň ale cítím, že k tobě mám mnohem blíž, a byl bych moc rád, kdybychom to spolu zkusili i jako pár." },
        { text: "Nechtěla bys to se mnou zkusit?", bold: true, center: true },
    ];

    let partIndex = 0;
    let charIndex = 0;
    let currentP = null;

    function typeChar() {
        // Stop if container is no longer in the document (modal closed or content replaced)
        if (!document.body.contains(container)) {
            isTypingActive = false;
            return;
        }

        if (partIndex >= textParts.length) {
            setTimeout(() => {
                const btns = document.getElementById("confession-buttons");
                if (btns && document.body.contains(btns)) {
                    btns.classList.remove("hidden");
                    btns.classList.add("animate-fade-in");
                }
                isTypingActive = false;
            }, 500);
            return;
        }

        const part = textParts[partIndex];

        if (!currentP) {
            currentP = document.createElement("p");
            if (part.bold) currentP.className = "font-bold text-white text-lg";
            if (part.highlight)
                currentP.className = "text-[#eb459e] font-bold text-center text-xl my-4";
            if (part.center)
                currentP.className = "font-bold text-white text-center mt-6 text-xl";
            
            // Re-apply Indent style for normal paragraphs
            if (!part.bold && !part.highlight && !part.center) {
                currentP.className = "text-gray-300 leading-relaxed";
            }

            currentP.classList.add("typing-cursor");
            container.appendChild(currentP);
        }

        if (charIndex < part.text.length) {
            currentP.textContent = part.text.substring(0, charIndex + 1);
            charIndex++;
            setTimeout(typeChar, 40); // Natural typing speed
        } else {
            currentP.classList.remove("typing-cursor");
            currentP = null;
            charIndex = 0;
            partIndex++;
            setTimeout(typeChar, 800); // Pause between segments
        }
    }

    typeChar();
}

export function responseYes() {
    isTypingActive = false;
    const content = document.getElementById("final-modal-content");
    if (!content) return;

    triggerHaptic("success");
    if (typeof window.triggerConfetti === 'function') window.triggerConfetti();

    content.innerHTML = `
        <div class="animate-fade-in py-8 px-4 text-center">
            <h2 class="text-3xl font-black text-[#eb459e] mb-4">❤️ VÍDÁME SE! ❤️</h2>
            <p class="text-gray-200 text-lg leading-relaxed mb-8">
                Děkuju, že jsi mi dala šanci. Jsi moje kotva v celém tom mém chaosu a slibuju, že si toho budu vážit každý den.
                <br><br>
                Těším se na všechno, co nás čeká.
            </p>
            <div class="space-y-3">
                <button onclick="import('./js/modules/confession.js').then(m => m.closeModal('final-confession-modal')); window.switchChannel('dateplanner');" class="w-full bg-gradient-to-r from-[#eb459e] to-[#5865F2] hover:opacity-90 text-white py-4 rounded-xl font-bold text-xl shadow-lg transition transform hover:scale-105 active:scale-95">
                    Naplánovat první rande 🥂
                </button>
            </div>
        </div>
    `;
}

export function responseNo() {
    isTypingActive = false;
    const content = document.getElementById("final-modal-content");
    if (!content) return;

    triggerHaptic("medium");

    content.innerHTML = `
        <div class="animate-fade-in py-8 px-4 text-center">
            <h2 class="text-2xl font-bold text-white mb-4">Díky za upřímnost, Klárko.</h2>
            <p class="text-gray-300 text-lg mb-8 leading-relaxed">
                Moc si tě vážím a jsem rád, že si můžeme dál zůstat blízcí tak, jak jsme.
                <br><br>
                Nic se nemění – dál budeme yappovat o teoriích a hrát Tetris. 😊
            </p>
            <button onclick="import('./js/modules/confession.js').then(m => m.closeModal('final-confession-modal'))" class="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white py-3 rounded-xl font-bold transition">
                Zpět na server
            </button>
        </div>
    `;
}

export function closeModal(id) {
    const m = document.getElementById(id);
    if (m) {
        if (id === 'final-confession-modal') {
            const box = document.getElementById('final-modal-box');
            if (box) {
                box.classList.add("opacity-0", "scale-95");
                setTimeout(() => { m.style.display = "none"; }, 300);
            } else {
                m.style.display = "none";
            }
        } else {
            m.style.display = "none";
        }
    }
}
