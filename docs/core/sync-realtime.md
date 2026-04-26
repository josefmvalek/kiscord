# Sync a Realtime

Kiscord klade velký důraz na pocit sounáležitosti obou uživatelů. Aby aplikace působila „živě“, využívá pokročilé real-time funkce platformy Supabase.

## 1. Dva typy synchronizace
Aplikace rozlišuje mezi **trvalou synchronizací dat** (změny v databázi) a **pomíjivými událostmi** (broadcasty).

### A. Database Sync (Postgres Changes)
Tento systém sleduje změny přímo v tabulkách databáze. Jakmile Jožka nebo Klárka změní záznam (např. v Bucket listu), Supabase pošle notifikaci druhému zařízení.

- **Implementace**: `supabase.channel('schema-db-changes')`
- **Využití**: 
    - Achievementy (animace odemčení u partnera)
    - Bucket list (zaškrtnutí položky)
    - Kalendář (přidání rande)
    - Tier Listy (přesouvání položek)

### B. Broadcast Channel (Ephemeral Events)
Broadcasty se neukládají do databáze. Jsou to rychlé zprávy poslané přímo mezi prohlížeči. Jsou ideální pro akce, které mají okamžitý vizuální efekt, ale nemusí být v logu.

- **Implementace**: `js/core/sync.js`
- **Využití**:
    - **Health Updates**: Když partner pohne sliderem nálady, emoji na slunečnici partnera se okamžitě změní.
    - **Sunlight Aura**: Poslání „slunečního paprsku“ vyvolá na druhém zařízení déšť konfet a vizuální auru.
    - **Draw Strokes**: Tahy v modulu Kreslení se přenáší v reálném čase.

## 2. Broadcast API Helper
V `js/core/sync.js` je definována funkce `broadcastToPartner`, která zjednodušuje odesílání událostí:

```javascript
export function broadcastToPartner(event, payload) {
    const channel = supabase.channel('kiscord-broadcast');
    channel.send({
        type: 'broadcast',
        event: event,
        payload: payload
    });
}
```

## 3. Realtime Listenery a Cleanup
Protože Realtime kanály spotřebovávají zdroje, je kritické je správně zavírat při odchodu z modulu. Router automaticky volá cleanup funkce registrované na objektu `window` (např. `drawCleanup`), které odhlásí daný kanál.

## 4. Presence (Kdo je online)
Systém dokáže detekovat, zda je partner právě aktivní v aplikaci. To je využito například u slunečnice na Dashboardu, která „spí“, pokud jsou oba uživatelé neaktivní (nebo je noc).
