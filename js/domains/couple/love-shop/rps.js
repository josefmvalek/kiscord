/**
 * Love Shop Realtime Rock-Paper-Scissors (Rozstřel o Kompromis)
 */

import { supabase } from '@core/supabase.js';
import { state } from '@core/state.js';
import { triggerHaptic, triggerConfetti } from '@core/utils.js';
import { getRpsState } from './state.js';

let rpsChannel = null;
let renderCallback = null;

export function setupRpsChannel(onUpdate) {
    renderCallback = onUpdate;
    if (rpsChannel) return;

    const rpsState = getRpsState();
    
    rpsChannel = supabase.channel('love-shop-rps')
        .on('broadcast', { event: 'rps-start' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            triggerHaptic('medium');
            rpsState.active = true;
            rpsState.myChoice = null;
            rpsState.partnerChoice = null;
            rpsState.countdown = null;
            rpsState.result = null;
            if (typeof renderCallback === 'function') renderCallback();
        })
        .on('broadcast', { event: 'rps-choice' }, (payload) => {
            if (payload.payload.from === state.currentUser?.id) return;
            rpsState.partnerChoice = payload.payload.choice;
            
            if (rpsState.myChoice) {
                evaluateRps();
            } else if (typeof renderCallback === 'function') {
                renderCallback();
            }
        })
        .subscribe();
}

export function cleanupRpsChannel() {
    if (rpsChannel) {
        supabase.removeChannel(rpsChannel);
        rpsChannel = null;
    }
}

export async function startRps() {
    triggerHaptic('medium');
    const rpsState = getRpsState();
    rpsState.active = true;
    rpsState.myChoice = null;
    rpsState.partnerChoice = null;
    rpsState.countdown = null;
    rpsState.result = null;
    if (typeof renderCallback === 'function') renderCallback();

    if (rpsChannel) {
        await rpsChannel.send({
            type: 'broadcast',
            event: 'rps-start',
            payload: { from: state.currentUser?.id }
        });
    }
}

export async function makeRpsChoice(choice) {
    triggerHaptic('light');
    const rpsState = getRpsState();
    rpsState.myChoice = choice;
    if (typeof renderCallback === 'function') renderCallback();

    if (rpsChannel) {
        await rpsChannel.send({
            type: 'broadcast',
            event: 'rps-choice',
            payload: { 
                from: state.currentUser?.id,
                choice: choice
            }
        });
    }

    if (rpsState.partnerChoice) {
        evaluateRps();
    }
}

export function evaluateRps() {
    const rpsState = getRpsState();
    rpsState.countdown = "3... 2... 1... 🔥";
    if (typeof renderCallback === 'function') renderCallback();

    setTimeout(() => {
        const my = rpsState.myChoice;
        const partner = rpsState.partnerChoice;

        if (my === partner) {
            rpsState.result = "Remíza! Zkuste to znovu. 🤝";
        } else if (
            (my === 'rock' && partner === 'scissors') ||
            (my === 'paper' && partner === 'rock') ||
            (my === 'scissors' && partner === 'paper')
        ) {
            rpsState.result = "Vyhrál/a jsi! Volba kompromisu je na tobě! 🏆🎉";
            triggerConfetti();
            triggerHaptic('success');
        } else {
            rpsState.result = "Vyhrál partner! Respektuj výsledek. 😔";
            triggerHaptic('error');
        }
        
        rpsState.countdown = null;
        if (typeof renderCallback === 'function') renderCallback();
    }, 1200);
}
