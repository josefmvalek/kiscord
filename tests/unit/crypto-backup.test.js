import { describe, it, expect, vi } from 'vitest';

vi.mock('../../js/core/supabase.js', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            upsert: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
    }
}));

import { encryptBackup, decryptBackup } from '../../js/core/crypto-backup.js';

describe('Client-Side AES-GCM Encrypted Backup (.kiscord)', () => {
    it('encrypts data and decrypts back to identical object with correct password', async () => {
        const payload = {
            relationship_start: '2025-12-24',
            secret_notes: 'Miluju tě nejvíc na světě! ❤️',
            coins: 500
        };
        const password = 'superSecretPassword123';

        const encrypted = await encryptBackup(payload, password);
        expect(encrypted.version).toBe('1.0.0');
        expect(typeof encrypted.salt).toBe('string');
        expect(typeof encrypted.iv).toBe('string');
        expect(typeof encrypted.ciphertext).toBe('string');

        const decrypted = await decryptBackup(encrypted, password);
        expect(decrypted).toEqual(payload);
    });

    it('fails decryption when an incorrect password is provided', async () => {
        const payload = { test: 'confidential' };
        const encrypted = await encryptBackup(payload, 'correctPassword');

        await expect(decryptBackup(encrypted, 'wrongPassword')).rejects.toThrow();
    });

    it('rejects passwords shorter than 4 characters', async () => {
        await expect(encryptBackup({ foo: 'bar' }, '123')).rejects.toThrow();
    });
});
