/**
 * Fullscreen Spotify-Style Stories Player Engine
 */

import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { playFanfare, playChime, playPageFlip } from '@core/sound.js';
import { calculateCoupleWrapped } from './analytics.js';
import { buildStorySlides } from './slides.js';
import { showCardPreviewModal } from './canvas-export.js';

let currentSlideIdx = 0;
let storyTimer = null;
let isStoryPaused = false;
let currentStoryPeriod = 'all';

export function openCoupleWrappedStories(period = 'all') {
    currentStoryPeriod = period;
    currentSlideIdx = 0;
    isStoryPaused = false;
    triggerHaptic('heavy');
    playFanfare();

    const stats = calculateCoupleWrapped(period);
    const slides = buildStorySlides(stats);

    const existingModal = document.getElementById('wrapped-stories-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'wrapped-stories-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-2 sm:p-4 select-none animate-fade-in overflow-hidden';
    modal.innerHTML = `
        <div class="relative w-full max-w-sm h-full max-h-[780px] bg-[#111214] border border-white/10 rounded-[36px] overflow-hidden shadow-2xl flex flex-col justify-between p-5 text-white">
            
            <!-- Background Atmospheric Glow -->
            <div class="absolute inset-0 bg-gradient-to-br from-pink-600/10 via-purple-600/5 to-amber-600/10 pointer-events-none"></div>

            <!-- Top Header & Progress Indicators -->
            <div class="relative z-20 space-y-3">
                <div class="flex gap-1.5 w-full" id="wrapped-story-progress-bars">
                    ${slides.map((_, idx) => `
                        <div class="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div id="story-prog-${idx}" class="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-purple-400 rounded-full transition-all duration-100" style="width: 0%"></div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex justify-between items-center px-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-black uppercase text-amber-400 font-mono tracking-wider">Kiscord Stories</span>
                        <span id="wrapped-story-counter" class="text-[10px] text-gray-400 font-mono">1 / ${slides.length}</span>
                    </div>

                    <div class="flex items-center gap-1.5">
                        <button id="wrapped-pause-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-gray-300 transition" title="Pauza / Přehrát">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button id="wrapped-close-btn" class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-gray-300 transition" title="Zavřít">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Slide Content Host -->
            <div id="wrapped-slide-host" class="relative z-20 my-auto w-full flex items-center justify-center py-4">
                ${slides[0]}
            </div>

            <!-- Bottom Navigation Bar & Tap Zones -->
            <div class="relative z-20 flex justify-between items-center pt-2">
                <button id="wrapped-prev-btn" class="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-300 transition active:scale-95 flex items-center gap-1.5 font-mono">
                    <i class="fas fa-chevron-left text-[10px]"></i> Zpět
                </button>

                <div class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping"></span>
                    <span class="text-[10px] font-mono text-gray-400">Klepni pro další</span>
                </div>

                <button id="wrapped-next-btn" class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-xs font-bold text-white transition active:scale-95 flex items-center gap-1.5 font-mono shadow-lg shadow-pink-500/20">
                    Další <i class="fas fa-chevron-right text-[10px]"></i>
                </button>
            </div>

            <!-- Invisible Left/Right Screen Tap Zones for Fast Thumbs Navigation -->
            <div id="wrapped-tap-left" class="absolute top-16 bottom-16 left-0 w-1/3 z-10 cursor-pointer"></div>
            <div id="wrapped-tap-right" class="absolute top-16 bottom-16 right-0 w-2/3 z-10 cursor-pointer"></div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('#wrapped-close-btn')?.addEventListener('click', closeStoryModal);
    modal.querySelector('#wrapped-pause-btn')?.addEventListener('click', toggleStoryPause);
    modal.querySelector('#wrapped-prev-btn')?.addEventListener('click', prevStorySlide);
    modal.querySelector('#wrapped-next-btn')?.addEventListener('click', nextStorySlide);
    modal.querySelector('#wrapped-tap-left')?.addEventListener('click', prevStorySlide);
    modal.querySelector('#wrapped-tap-right')?.addEventListener('click', nextStorySlide);

    startStoryProgressTimer();

    window.addEventListener('keydown', handleStoryKeyboardNav);
}

function handleStoryKeyboardNav(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextStorySlide();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStorySlide();
    } else if (e.key === 'Escape') {
        closeStoryModal();
    }
}

export function closeStoryModal() {
    if (storyTimer) clearInterval(storyTimer);
    window.removeEventListener('keydown', handleStoryKeyboardNav);
    const modal = document.getElementById('wrapped-stories-modal');
    if (modal) modal.remove();
}

export function toggleStoryPause() {
    isStoryPaused = !isStoryPaused;
    triggerHaptic('light');
    const pauseBtn = document.getElementById('wrapped-pause-btn');
    if (pauseBtn) {
        pauseBtn.innerHTML = isStoryPaused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    }
}

export function nextStorySlide() {
    const stats = calculateCoupleWrapped(currentStoryPeriod);
    const slides = buildStorySlides(stats);

    if (currentSlideIdx < slides.length - 1) {
        currentSlideIdx++;
        playPageFlip();
        renderCurrentStorySlide();
    } else {
        triggerHaptic('success');
        triggerConfetti();
        closeStoryModal();
    }
}

export function prevStorySlide() {
    if (currentSlideIdx > 0) {
        currentSlideIdx--;
        playPageFlip();
        renderCurrentStorySlide();
    }
}

function renderCurrentStorySlide() {
    triggerHaptic('light');
    const stats = calculateCoupleWrapped(currentStoryPeriod);
    const slides = buildStorySlides(stats);

    const host = document.getElementById('wrapped-slide-host');
    if (host) host.innerHTML = slides[currentSlideIdx];

    const counter = document.getElementById('wrapped-story-counter');
    if (counter) counter.innerText = `${currentSlideIdx + 1} / ${slides.length}`;

    slides.forEach((_, idx) => {
        const bar = document.getElementById(`story-prog-${idx}`);
        if (!bar) return;
        if (idx < currentSlideIdx) {
            bar.style.width = '100%';
        } else if (idx > currentSlideIdx) {
            bar.style.width = '0%';
        } else {
            bar.style.width = '0%';
        }
    });

    if (currentSlideIdx === slides.length - 1) {
        playChime();
        triggerConfetti();
        setTimeout(() => {
            const cardBtn = document.getElementById('wrapped-open-card-preview-btn');
            if (cardBtn) {
                cardBtn.onclick = (e) => {
                    e.stopPropagation();
                    showCardPreviewModal(stats);
                };
            }
        }, 50);
    }

    startStoryProgressTimer();
}

function startStoryProgressTimer() {
    if (storyTimer) clearInterval(storyTimer);
    let progress = 0;
    const duration = 6500;
    const interval = 50;
    const step = (interval / duration) * 100;

    storyTimer = setInterval(() => {
        if (isStoryPaused) return;

        progress += step;
        const currentBar = document.getElementById(`story-prog-${currentSlideIdx}`);
        if (currentBar) {
            currentBar.style.width = `${Math.min(progress, 100)}%`;
        }

        if (progress >= 100) {
            clearInterval(storyTimer);
            nextStorySlide();
        }
    }, interval);
}
