/**
 * Discord Slash Commands Engine for Kiscord
 * Provides fast CLI/Power-User interactions through the Command Palette (/voda, /rande, /posli-mince, etc.)
 */

import { state, saveStateToCache, stateEvents } from './state.js';
import { showNotification } from './theme.js';
import { safeUpsert } from './offline.js';

export class SlashCommandRegistry {
    constructor() {
        /** @type {Map<string, { name: string, description: string, syntax: string, handler: (args: string[]) => Promise<string|void>|string|void }>} */
        this.commands = new Map();
        this._initDefaultCommands();
    }

    /**
     * Register a new slash command
     * @param {string} name - Command name without leading slash
     * @param {string} description
     * @param {string} syntax
     * @param {(args: string[]) => Promise<string|void>|string|void} handler
     */
    register(name, description, syntax, handler) {
        this.commands.set(name.toLowerCase(), { name: name.toLowerCase(), description, syntax, handler });
    }

    /**
     * Get all registered slash commands
     */
    getAll() {
        return Array.from(this.commands.values());
    }

    /**
     * Execute a slash command string (e.g. "/voda 2")
     * @param {string} input
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    async execute(input) {
        const trimmed = (input || '').trim();
        if (!trimmed.startsWith('/')) {
            return { success: false, message: 'Příkaz musí začínat lomítkem /' };
        }

        const parts = trimmed.slice(1).split(/\s+/);
        const name = parts[0]?.toLowerCase();
        const args = parts.slice(1);

        const cmd = this.commands.get(name);
        if (!cmd) {
            return { success: false, message: `Neznámý příkaz /${name}. Napiš / pro seznam příkazů.` };
        }

        try {
            const res = await cmd.handler(args);
            return { success: true, message: res || `Příkaz /${name} byl úspěšně proveden! ✨` };
        } catch (err) {
            console.error(`[SlashCommands] Error executing /${name}:`, err);
            return { success: false, message: `Chyba při spuštění /${name}: ${err?.message || err}` };
        }
    }

    _initDefaultCommands() {
        // /voda [pocet=1]
        this.register('voda', 'Přidá sklenice vody do dnešního logu', '/voda [počet]', async (args) => {
            const count = args[0] ? parseInt(args[0], 10) : 1;
            const today = new Date().toISOString().split('T')[0];
            if (!state.healthData[today]) state.healthData[today] = { water: 0 };
            state.healthData[today].water = (state.healthData[today].water || 0) + count;
            
            saveStateToCache();
            stateEvents.emit('health');
            if (typeof showNotification === 'function') {
                showNotification(`+${count} sklenic vody zapsáno! 💧`, 'health');
            }
            return `Zapsáno +${count} sklenic vody na dnešní den.`;
        });

        // /spanek <hodiny>
        this.register('spanek', 'Zaznamená délku spánku za dnešek', '/spanek <hodiny>', async (args) => {
            const hours = args[0] ? parseFloat(args[0]) : 8;
            const today = new Date().toISOString().split('T')[0];
            if (!state.healthData[today]) state.healthData[today] = {};
            state.healthData[today].sleep = hours;

            saveStateToCache();
            stateEvents.emit('health');
            if (typeof showNotification === 'function') {
                showNotification(`Spánek (${hours}h) uložen! 🌙`, 'health');
            }
            return `Uloženo ${hours} hodin spánku.`;
        });

        // /rande <nazev>
        this.register('rande', 'Navrhne nový plán rande do kalendáře', '/rande <název>', async (args) => {
            if (args.length === 0) throw new Error('Zadej název rande (např. /rande Piknik u přehrady)');
            const name = args.join(' ');
            const today = new Date().toISOString().split('T')[0];
            const newDate = {
                id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `d-${Date.now()}`,
                date_key: today,
                name,
                cat: 'romantic',
                status: 'pending',
                proposed_by: state.currentUser?.id || 'josef'
            };

            if (!state.plannedDates) state.plannedDates = {};
            state.plannedDates[today] = newDate;

            saveStateToCache();
            safeUpsert('planned_dates', newDate);
            stateEvents.emit('calendar');

            if (typeof showNotification === 'function') {
                showNotification(`Návrh rande "${name}" vytvořen! 🥂`, 'date');
            }
            return `Návrh na rande "${name}" byl vytvořen a čeká na potvrzení.`;
        });

        // /posli-mince <pocet> [duvod]
        this.register('posli-mince', 'Převede Love Coins partnerovi', '/posli-mince <počet> [důvod]', async (args) => {
            const amount = parseInt(args[0], 10);
            if (isNaN(amount) || amount <= 0) throw new Error('Zadej platný počet mincí (např. /posli-mince 20 za hezký den)');
            const reason = args.slice(1).join(' ') || 'jen tak z lásky ❤️';

            import('./state.js').then(s => s.awardLoveCoinsToCurrentUser?.(amount, reason));
            return `Odesláno ${amount} Love Coins partnerovi! 🪙✨`;
        });
    }
}

export const slashCommands = new SlashCommandRegistry();
