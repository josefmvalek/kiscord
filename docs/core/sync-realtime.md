# Real-Time Synchronization & Presence

> Kiscord prioritizes a responsive, shared experience for both users. To make the app feel alive and interactive, it utilizes real-time features provided by Supabase.

---

## 1. Two Synchronization Modalities

The application distinguishes between **persistent database synchronization** (persisted PostgreSQL updates) and **ephemeral broadcast events**.

### A. Database Synchronization (Postgres Changes)
Listens for change events directly on database tables. Whenever Josef or Klárka modifies a record (e.g. updating a Bucket List item or logging a workout), Supabase pushes a WebSocket notification to the partner's device.

- **Implementation**: `supabase.channel('schema-db-changes')`
- **Use Cases**:
  - Unlocked achievements (animated celebration modal on partner's device)
  - Bucket list item check-offs
  - Calendar event additions and date responses
  - Tier list rank updates

---

### B. Broadcast Channel (Ephemeral Events)
Broadcasts bypass the database completely, transmitting rapid peer-to-peer WebSocket payloads between active clients.

- **Implementation**: `js/core/sync.js`
- **Use Cases**:
  - **Health Updates**: Moving the mood slider immediately rotates and updates the partner's sunflower emoji.
  - **Sunlight Aura**: Tapping the "Send Sunlight" button triggers a screen confetti rain and glowing aura on the partner's phone.
  - **Draw Strokes**: Pen strokes in Draw Duel are streamed in real time for cooperative sketching.

---

## 2. Broadcast API Helper

In `js/core/sync.js`, the helper function `broadcastToPartner` streamlines real-time event dispatching:

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

---

## 3. Realtime Listeners & Cleanup Lifecycle

Because open WebSocket channels consume client and server resources, it is essential to disconnect them when leaving a channel. The router automatically invokes cleanup routines (e.g. `drawCleanup()`) registered on the global `window` object.

---

## 4. User Presence

The application tracks whether the partner is currently active in Kiscord. For example, the sunflower on the Dashboard enters a "sleeping" animation if both users are inactive or if it is nighttime.

---

## 5. Native Background Web Push Notifications (`js/core/notifications.js` & `public/sw.js`)

When either user is inactive, asleep, or has their device screen locked, live WebSockets are paused by the mobile OS. Kiscord bridges this with **Native Web Push Notifications**:

- **Device Subscription (`initPushSubscription`)**: VAPID public key subscription stored in PostgreSQL table `push_subscriptions`.
- **Server Dispatch (`sendPushToPartner`)**: Dispatches push packets via Supabase Edge Function `send-push` to Apple APNs and Google FCM gateways.
- **Automated Reminders (`cron-reminders`)**: Server-side `pg_cron` runs every 15 minutes (Europe/Prague timezone) to check medication schedules, hydration targets, and bedtime alerts.
- **Service Worker Deep Linking (`public/sw.js`)**: Wakes the device, displays native lock-screen banner, and navigates directly to the target channel (e.g. `/?channel=daily-questions`) upon interaction.
