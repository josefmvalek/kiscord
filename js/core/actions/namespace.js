/**
 * Kiscord Structured Global Namespace & Domain Action Registration
 * Consolidates runtime APIs under window.Kiscord and registers core actions in ActionDispatcher.
 */

import { state } from '../state.js';
import { triggerConfetti, triggerHaptic } from '../utils.js';
import { toggleTheme, toggleValentineMode, showNotification } from '../theme.js';
import { switchChannel, switchServer } from '../router.js';
import { toggleUserPopout, toggleMobileMenu } from '../app-ui.js';
import { handleLogin } from '../auth-handler.js';
import { renderSkeletonLoader, renderMetricCard, closeModal } from '../ui.js';
import { openCommandPalette, closeCommandPalette } from '../commandPalette.js';
import { ActionDispatcher, registerAction, registerActions } from './dispatcher.js';
import { repositories } from '../repositories/index.js';

import { toggleFavoriteChannel, toggleCategoryCollapse, collapseAllCategories, expandAllCategories } from '../router/channel-registry.js';

/**
 * Register core shell and navigation actions
 */
export function registerCoreActions() {
    registerActions({
        'switchChannel': (payload) => {
            const channelId = typeof payload === 'string' ? payload : (payload.channelId || payload.id || payload.channel);
            if (channelId) switchChannel(channelId);
        },
        'switchServer': (payload) => {
            const serverId = typeof payload === 'string' ? payload : (payload.serverId || payload.id || payload.server);
            const targetChannelId = payload.targetChannelId || null;
            if (serverId) switchServer(serverId, targetChannelId);
        },
        'toggleFavoriteChannel': (payload) => {
            const channelId = typeof payload === 'string' ? payload : (payload.channelId || payload.id);
            if (channelId) toggleFavoriteChannel(channelId);
        },
        'toggleCategoryCollapse': (payload) => {
            const category = typeof payload === 'string' ? payload : (payload.category || payload.name);
            if (category) toggleCategoryCollapse(category);
        },
        'collapseAllCategories': () => collapseAllCategories(),
        'expandAllCategories': () => expandAllCategories(),
        'closeModal': (payload) => {
            const modalId = typeof payload === 'string' ? payload : (payload.modalId || payload.id || payload.modal);
            if (modalId) closeModal(modalId);
        },
        'toggleTheme': (payload) => {
            const theme = typeof payload === 'string' ? payload : payload.theme;
            toggleTheme(theme);
        },
        'toggleValentineMode': () => toggleValentineMode(),
        'triggerConfetti': () => triggerConfetti(),
        'openCommandPalette': () => openCommandPalette(),
        'closeCommandPalette': () => closeCommandPalette(),
        'toggleMobileMenu': () => toggleMobileMenu(),
        'toggleUserPopout': () => toggleUserPopout(),
        'handleLogin': (payload) => handleLogin(payload.user)
    });
}

/**
 * Initializes and attaches the window.Kiscord structured namespace.
 */
export function initKiscordNamespace() {
    if (typeof window === 'undefined') return;

    registerCoreActions();
    ActionDispatcher.init();

    window.Kiscord = {
        version: '2.0.0',
        state,
        actions: ActionDispatcher,
        repositories,
        router: {
            switchChannel,
            switchServer
        },
        ui: {
            showNotification,
            toggleTheme,
            toggleValentineMode,
            closeModal,
            renderSkeletonLoader,
            renderMetricCard,
            openCommandPalette,
            closeCommandPalette,
            toggleUserPopout,
            toggleMobileMenu
        },
        utils: {
            triggerConfetti,
            triggerHaptic
        },
        auth: {
            handleLogin
        },
        domains: {
            // Lazy domain loaders attached on demand
            get fitness() { return import('@domains/fitness/health.js'); },
            get couple() { return import('@domains/couple/love-shop/index.js'); },
            get lifestyle() { return import('@domains/lifestyle/dashboard/index.js'); },
            get university() { return import('@domains/university/matura/index.js'); },
            get entertainment() { return import('@domains/entertainment/library/index.js'); },
            get archive() { return import('@domains/archive/austria-info/index.js'); },
            get system() { return import('@domains/system/settings/index.js'); }
        }
    };
}
