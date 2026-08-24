/**
 * Client-Side AES-GCM Encrypted Backup & Restore Engine (.kiscord)
 * Uses Web Crypto API with PBKDF2 key derivation and AES-GCM 256-bit encryption.
 */

import { state, saveStateToCache } from './state.js';

const BACKUP_VERSION = '1.0.0';
const PBKDF2_ITERATIONS = 100000;

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function deriveKey(password, saltBuffer) {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBuffer,
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a data object with password
 * @param {object} data
 * @param {string} password
 * @returns {Promise<{ version: string, salt: string, iv: string, ciphertext: string, created_at: string }>}
 */
export async function encryptBackup(data, password) {
    if (!password || password.length < 4) {
        throw new Error('Password must be at least 4 characters long.');
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);

    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(JSON.stringify(data));

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintextBuffer
    );

    return {
        version: BACKUP_VERSION,
        created_at: new Date().toISOString(),
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
        ciphertext: bufferToBase64(ciphertextBuffer)
    };
}

/**
 * Decrypt a backup package with password
 * @param {{ salt: string, iv: string, ciphertext: string }} backupPackage
 * @param {string} password
 * @returns {Promise<any>} Decrypted JSON data
 */
export async function decryptBackup(backupPackage, password) {
    if (!backupPackage || !backupPackage.salt || !backupPackage.iv || !backupPackage.ciphertext) {
        throw new Error('Invalid backup file format.');
    }

    const salt = base64ToBuffer(backupPackage.salt);
    const iv = base64ToBuffer(backupPackage.iv);
    const ciphertext = base64ToBuffer(backupPackage.ciphertext);

    const key = await deriveKey(password, salt);

    try {
        const decryptedBuffer = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedBuffer));
    } catch {
        throw new Error('Dešifrování selhalo. Nesprávné heslo nebo poškozený soubor.');
    }
}

/**
 * Creates and downloads an encrypted .kiscord backup file of the current state
 * @param {string} password
 */
export async function exportEncryptedBackup(password) {
    const backupData = {
        shifts: state.shifts,
        healthData: state.healthData,
        timelineEvents: state.timelineEvents,
        dateLocations: state.dateLocations,
        achievements: state.achievements,
        coopQuests: state.coopQuests,
        dailyQuestion: state.dailyQuestion,
        dailyAnswers: state.dailyAnswers,
        tetris: state.tetris,
        library: state.library,
        watchlist: state.watchlist,
        watchHistory: state.watchHistory,
        gymExercises: state.gymExercises,
        gymLogs: state.gymLogs,
        gymPRs: state.gymPRs,
        gymBodyMeasurements: state.gymBodyMeasurements,
        loveCoins: state.loveCoins,
        inventory: state.inventory,
        shopItems: state.shopItems,
        nutritionLogs: state.nutritionLogs,
        settings: state.settings
    };

    const encryptedPackage = await encryptBackup(backupData, password);
    const jsonStr = JSON.stringify(encryptedPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `kiscord-backup-${dateStr}.kiscord`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Restores state from a decrypted backup object
 * @param {object} decryptedData
 */
export async function restoreStateFromData(decryptedData) {
    if (!decryptedData || typeof decryptedData !== 'object') {
        throw new Error('Neplatná data pro obnovu.');
    }

    Object.assign(state, decryptedData);
    await saveStateToCache();

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kiscord-state-restored'));
    }
    return true;
}
