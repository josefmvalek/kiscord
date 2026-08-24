/**
 * Kiscord WebRTC Peer-to-Peer Direct DataChannel
 * Provides ultra low latency (<10ms) direct device-to-device communication for Haptics & Draw Duel.
 */

import { supabase } from './supabase.js';

const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export class P2PConnectionManager {
    constructor() {
        /** @type {RTCPeerConnection|null} */
        this.peerConnection = null;
        /** @type {RTCDataChannel|null} */
        this.dataChannel = null;
        /** @type {'disconnected'|'connecting'|'connected'|'failed'} */
        this.state = 'disconnected';
        /** @type {Record<string, Array<(data: any) => void>>} */
        this._handlers = {};
        this._signalingChannel = null;
    }

    /**
     * Initialize signaling channel via Supabase Realtime
     * @param {string} currentUserId
     * @param {string} partnerUserId
     */
    async initSignaling(currentUserId, partnerUserId) {
        if (!currentUserId || !partnerUserId) return;

        const channelId = `webrtc:${[currentUserId, partnerUserId].sort().join('-')}`;
        this._signalingChannel = supabase.channel(channelId);

        this._signalingChannel
            .on('broadcast', { event: 'signal' }, async ({ payload }) => {
                if (payload.sender === currentUserId) return;
                await this._handleSignal(payload);
            })
            .subscribe();
    }

    /**
     * Creates and opens peer connection
     * @param {boolean} isInitiator
     */
    async start(isInitiator = false) {
        if (typeof RTCPeerConnection === 'undefined') {
            console.warn('[P2P] WebRTC not supported in this environment');
            this.state = 'failed';
            return;
        }

        try {
            this.peerConnection = new RTCPeerConnection(RTC_CONFIG);
            this.state = 'connecting';

            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate && this._signalingChannel) {
                    this._signalingChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: { type: 'candidate', candidate: event.candidate }
                    });
                }
            };

            this.peerConnection.onconnectionstatechange = () => {
                const s = this.peerConnection.connectionState;
                if (s === 'connected') this.state = 'connected';
                else if (s === 'disconnected' || s === 'closed') this.state = 'disconnected';
                else if (s === 'failed') this.state = 'failed';
                this._emit('stateChange', this.state);
            };

            if (isInitiator) {
                this.dataChannel = this.peerConnection.createDataChannel('kiscord-p2p', {
                    ordered: false,
                    maxRetransmits: 0
                });
                this._setupDataChannel(this.dataChannel);

                const offer = await this.peerConnection.createOffer();
                await this.peerConnection.setLocalDescription(offer);

                if (this._signalingChannel) {
                    this._signalingChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: { type: 'offer', sdp: offer }
                    });
                }
            } else {
                this.peerConnection.ondatachannel = (event) => {
                    this.dataChannel = event.channel;
                    this._setupDataChannel(this.dataChannel);
                };
            }
        } catch (err) {
            console.error('[P2P] Failed to start WebRTC session:', err);
            this.state = 'failed';
        }
    }

    _setupDataChannel(channel) {
        channel.onopen = () => {
            console.log('[P2P] DataChannel opened.');
            this.state = 'connected';
            this._emit('stateChange', 'connected');
        };

        channel.onclose = () => {
            console.log('[P2P] DataChannel closed.');
            this.state = 'disconnected';
            this._emit('stateChange', 'disconnected');
        };

        channel.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message && message.type) {
                    this._emit(message.type, message.payload);
                }
            } catch (err) {
                console.warn('[P2P] Failed to parse DataChannel message:', err);
            }
        };
    }

    async _handleSignal(payload) {
        if (!this.peerConnection) return;

        try {
            if (payload.type === 'offer') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
                const answer = await this.peerConnection.createAnswer();
                await this.peerConnection.setLocalDescription(answer);

                if (this._signalingChannel) {
                    this._signalingChannel.send({
                        type: 'broadcast',
                        event: 'signal',
                        payload: { type: 'answer', sdp: answer }
                    });
                }
            } else if (payload.type === 'answer') {
                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            } else if (payload.type === 'candidate') {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
        } catch (err) {
            console.error('[P2P] Signal handling error:', err);
        }
    }

    /**
     * Send direct P2P message
     * @param {string} type
     * @param {any} payload
     * @returns {boolean} Success
     */
    send(type, payload) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
            return true;
        }
        return false;
    }

    /**
     * Send real-time haptic pulse
     */
    sendHapticPulse(x, y, intensity = 1) {
        return this.send('hapticPulse', { x, y, intensity });
    }

    /**
     * Send real-time draw stroke
     */
    sendDrawStroke(point) {
        return this.send('drawStroke', point);
    }

    /**
     * Subscribe to P2P event
     * @param {string} type
     * @param {(payload: any) => void} handler
     */
    on(type, handler) {
        if (!this._handlers[type]) this._handlers[type] = [];
        this._handlers[type].push(handler);
        return () => {
            this._handlers[type] = (this._handlers[type] || []).filter(h => h !== handler);
        };
    }

    _emit(type, payload) {
        (this._handlers[type] || []).forEach(handler => {
            try { handler(payload); } catch (e) { console.error('[P2P] Handler error:', e); }
        });
    }

    /**
     * Close connection and cleanup
     */
    close() {
        if (this.dataChannel) {
            try { this.dataChannel.close(); } catch {}
            this.dataChannel = null;
        }
        if (this.peerConnection) {
            try { this.peerConnection.close(); } catch {}
            this.peerConnection = null;
        }
        this.state = 'disconnected';
    }
}

export const p2pManager = new P2PConnectionManager();
