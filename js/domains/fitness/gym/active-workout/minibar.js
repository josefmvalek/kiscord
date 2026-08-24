import { triggerHaptic } from '@core/utils.js';
import {
    activeWorkout,
    saveActiveWorkoutToStorage,
    isRestTimerRunning,
    restTimeRemaining
} from '../shared.js';

export function minimizeWorkout(renderGymFn) {
    triggerHaptic('light');
    if (activeWorkout) {
        activeWorkout.isMinimized = true;
    }
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.remove('hidden');
    if (renderGymFn) renderGymFn();
}

export function restoreWorkout(renderGymFn) {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.add('hidden');
    if (renderGymFn) renderGymFn();
}

export function restoreWorkoutGlobal() {
    triggerHaptic('medium');
    if (activeWorkout) {
        activeWorkout.isMinimized = false;
    }
    saveActiveWorkoutToStorage();
    document.getElementById('floating-settings-btn')?.classList.add('hidden');
    if (typeof window.switchChannel === 'function') {
        window.switchChannel('gym-tracker');
    } else {
        import('@core/router.js').then(r => r.switchChannel('gym-tracker'));
    }
}

export function renderMinimizedBanner() {
    if (!activeWorkout || !activeWorkout.isMinimized) return '';

    let totalSets = 0;
    let completedSets = 0;
    activeWorkout.exercises.forEach(e => {
        totalSets += e.sets.length;
        completedSets += e.sets.filter(s => s.completed).length;
    });

    return `
        <div class="bg-gradient-to-r from-[#faa61a]/10 via-[#faa61a]/5 to-[#faa61a]/10 border border-[#faa61a]/20 p-4 rounded-3xl mb-6 flex justify-between items-center animate-pulse shadow-xl relative overflow-hidden select-none">
            <div class="absolute inset-0 bg-[#faa61a]/2 pointer-events-none"></div>
            <div class="flex items-center gap-3 relative z-10">
                <div class="w-10 h-10 rounded-xl bg-[#faa61a]/10 flex items-center justify-center text-xl text-[#faa61a] animate-bounce-slow">
                    ⚡
                </div>
                <div>
                    <span class="text-[9px] font-black uppercase text-white/40 tracking-widest block mb-0.5 font-sans">Probíhající trénink</span>
                    <h4 class="text-xs font-black text-white leading-tight mt-0.5">${activeWorkout.name} • Splněno ${completedSets} z ${totalSets} sérií</h4>
                </div>
            </div>
            
            <button onclick="window.Gym.restoreWorkout()" class="px-5 py-2.5 rounded-xl bg-[#faa61a] hover:bg-[#e09216] text-black font-black text-xs uppercase tracking-wider transition shadow-lg transform active:scale-95 relative z-10 flex items-center gap-1.5 font-sans">
                <i class="fas fa-expand-alt"></i> Otevřít trénink
            </button>
        </div>
    `;
}

