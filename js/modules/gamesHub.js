import { state } from '../core/state.js';
import { switchChannel } from '../main.js';

export function renderGamesHub() {
    const container = document.getElementById("messages-container");
    if (!container) return;

    container.innerHTML = `
        <div class="h-full flex flex-col items-center justify-start p-6 md:p-12 bg-[#36393f] overflow-y-auto animate-fade-in custom-scrollbar">
            <div class="max-w-4xl w-full">
                <div class="mb-10 text-center">
                    <h1 class="text-4xl font-black text-white mb-3">Herní Doupě 🎮</h1>
                    <p class="text-gray-400 text-lg">Místo, kde se o sobě dozvíte víc hravou formou.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Who's More Likely -->
                    <div onclick="switchChannel('game-who')" class="group relative overflow-hidden bg-[#2f3136] rounded-2xl border-2 border-[#202225] hover:border-[#faa61a] transition-all cursor-pointer p-1">
                        <div class="h-40 bg-[#faa61a]/10 flex items-center justify-center rounded-xl mb-4 overflow-hidden relative">
                            <i class="fas fa-question-circle text-6xl text-[#faa61a] group-hover:scale-110 transition-transform"></i>
                        </div>
                        <div class="p-4">
                            <h3 class="text-xl font-bold text-white mb-2">Kdo spíše?</h3>
                            <p class="text-gray-400 text-sm mb-4">Hlasujte, kdo z vás by spíše udělal určitou věc. Shodnete se?</p>
                            <div class="flex items-center text-[#faa61a] font-bold text-sm">
                                HRÁT TEĎ <i class="fas fa-arrow-right ml-2 text-xs group-hover:translate-x-1 transition-transform"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Draw Duel -->
                    <div onclick="switchChannel('game-draw')" class="group relative overflow-hidden bg-[#2f3136] rounded-2xl border-2 border-[#202225] hover:border-[#eb459e] transition-all cursor-pointer p-1">
                        <div class="h-40 bg-[#eb459e]/10 flex items-center justify-center rounded-xl mb-4 overflow-hidden relative">
                            <i class="fas fa-palette text-6xl text-[#eb459e] group-hover:scale-110 transition-transform"></i>
                        </div>
                        <div class="p-4">
                            <h3 class="text-xl font-bold text-white mb-2">Draw Duel</h3>
                            <p class="text-gray-400 text-sm mb-4">Společné plátno. Jeden kreslí a druhý hádá, nebo tvořte společně!</p>
                            <div class="flex items-center text-[#eb459e] font-bold text-sm">
                                HRÁT TEĎ <i class="fas fa-arrow-right ml-2 text-xs group-hover:translate-x-1 transition-transform"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Perfect Pair (Coming Soon) -->
                    <div class="group relative overflow-hidden bg-[#2f3136]/50 rounded-2xl border-2 border-[#202225] p-1 opacity-60">
                         <div class="h-40 bg-gray-500/10 flex items-center justify-center rounded-xl mb-4">
                            <i class="fas fa-heart text-6xl text-gray-500"></i>
                        </div>
                        <div class="p-4">
                            <h3 class="text-xl font-bold text-gray-400 mb-2">Perfect Pair</h3>
                            <p class="text-gray-500 text-sm mb-4">Otestujte, jak moc se vaše odpovědi shodují v různých situacích.</p>
                            <span class="text-xs font-bold text-gray-500 tracking-widest uppercase italic">Brzy v Kiscordu</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
