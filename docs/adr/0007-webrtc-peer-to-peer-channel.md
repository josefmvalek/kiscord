# ADR-0007: WebRTC Peer-to-Peer Direct Intimacy Channel

## Status
Accepted

## Context
Pro haptické dotyky v reálném čase (Haptic Touchpad / tlukot srdce) a živé kreslení (Draw Duel) byla latence přes centrální WebSockets servery (50–150ms) příliš vysoká.

## Decision Drivers
* Okamžitá haptická a vizuální odezva (<10ms)
* Přímé spojení mezi zařízeními obou partnerů bez průchodu přes cloudové databáze
* Bezpečný a automatický fallback na Supabase Broadcast při nedostupnosti P2P

## Decision
Implementovat **P2PConnectionManager** v [js/core/webrtc.js](file:///c:/Users/Jozka/Desktop/Projekty/kiscord/js/core/webrtc.js) využívající `RTCDataChannel` s neuspořádaným doručováním bez retransmisí pro maximální rychlost.

## Consequences
### Positive
* Sub-10ms odezva pro haptické pulzy a tahy kreslení
* Žádná zátěž na databázový server při intenzivním kreslení

### Negative
* Vyžaduje STUN servery pro prostup přes NAT
