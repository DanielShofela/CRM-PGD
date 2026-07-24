/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utility for Web Push Notifications & Audio Chime (WhatsApp-style)

export function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // WhatsApp-like dual chime tones (E5 -> A5)
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn("Audio chime failed or was blocked by browser policy:", e);
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    alert("Votre navigateur ne supporte pas les notifications Push.");
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      playNotificationSound();
      localStorage.setItem('penta_push_enabled', 'true');
    }
    return permission;
  } catch (err) {
    console.error("Erreur demande autorisation notification :", err);
    return 'denied';
  }
}

export function isPushPermissionGranted(): boolean {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted' && localStorage.getItem('penta_push_enabled') === 'true';
}

export function sendPushNotification(title: string, body: string, iconUrl?: string) {
  // Always play notification chime if sound enabled
  playNotificationSound();

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: iconUrl || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'penta-chat-' + Date.now(),
        requireInteraction: false
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn("Could not dispatch Browser Notification:", e);
    }
  }
}
