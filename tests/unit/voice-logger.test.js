import { describe, it, expect } from 'vitest';
import {
    normalizeSpokenNumbers,
    parseGymVoiceCommand,
    parseHealthVoiceCommand
} from '../../js/core/voice-logger.js';

describe('Voice Logger & Natural Language Command Parser', () => {
    it('normalizeSpokenNumbers converts Czech spoken numbers to digits', () => {
        expect(normalizeSpokenNumbers('vypil jsem dvě sklenice')).toBe('vypil jsem 2 sklenice');
        expect(normalizeSpokenNumbers('tři série')).toBe('3 série');
        expect(normalizeSpokenNumbers('osm opakování')).toBe('8 opakování');
    });

    it('parseGymVoiceCommand accurately parses exercise, weight and reps', () => {
        const cmd1 = parseGymVoiceCommand('bench press 80 kilo 8 opakování');
        expect(cmd1.type).toBe('set');
        expect(cmd1.weight_kg).toBe(80);
        expect(cmd1.reps).toBe(8);

        const cmd2 = parseGymVoiceCommand('dřep 100.5 kg 5 opáček');
        expect(cmd2.type).toBe('set');
        expect(cmd2.weight_kg).toBe(100.5);
        expect(cmd2.reps).toBe(5);

        const cmd3 = parseGymVoiceCommand('hotovo');
        expect(cmd3.type).toBe('control');
        expect(cmd3.action).toBe('complete_set');

        const cmd4 = parseGymVoiceCommand('přeskoč pauzu');
        expect(cmd4.type).toBe('control');
        expect(cmd4.action).toBe('skip_rest');
    });

    it('parseHealthVoiceCommand parses water and sleep inputs', () => {
        const waterCmd = parseHealthVoiceCommand('vypil jsem tři sklenice vody');
        expect(waterCmd.type).toBe('water');
        expect(waterCmd.amount).toBe(3);

        const sleepCmd = parseHealthVoiceCommand('spal jsem 7.5 hodiny');
        expect(sleepCmd.type).toBe('sleep');
        expect(sleepCmd.hours).toBe(7.5);
    });
});
