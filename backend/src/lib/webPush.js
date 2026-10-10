const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BN7naWCcJXyZegQy91z0zeR6oWuyEhxXkv_OXQZzlfCXmvUBxUJmzBiYxkKkGgVd04Ezvg3PUlzZk0ZvFD5xaz0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'uUGDtA2DUkeYzXXM59qZf6mJitTRD0DP_g3Vf-r2MZ0';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@nepalmavi.edu.np';

webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Local persistent storage for Push Subscriptions
const SUBS_FILE = path.join(__dirname, '../../uploads/push_subscriptions.json');

function loadSubscriptions() {
  try {
    if (!fs.existsSync(SUBS_FILE)) {
      const dir = path.dirname(SUBS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SUBS_FILE, JSON.stringify([]));
      return [];
    }
    const raw = fs.readFileSync(SUBS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function saveSubscriptions(subs) {
  try {
    const dir = path.dirname(SUBS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
  } catch (err) {
    console.error('[WebPush] Failed to save subscriptions file:', err.message);
  }
}

/**
 * Register or update a user's browser / phone push subscription
 */
function savePushSubscription(userId, subscription) {
  if (!userId || !subscription || !subscription.endpoint) return;
  const subs = loadSubscriptions();
  const existingIdx = subs.findIndex(
    (s) => s.endpoint === subscription.endpoint
  );

  const subObj = {
    userId: parseInt(userId),
    subscription,
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    subs[existingIdx] = subObj;
  } else {
    subs.push(subObj);
  }

  saveSubscriptions(subs);
}

/**
 * Unsubscribe a user endpoint
 */
function removePushSubscription(endpoint) {
  if (!endpoint) return;
  let subs = loadSubscriptions();
  subs = subs.filter((s) => s.subscription?.endpoint !== endpoint);
  saveSubscriptions(subs);
}

/**
 * Send real background push notification directly to user's phone / device
 */
async function sendBackgroundPush(userId, payload) {
  try {
    const subs = loadSubscriptions().filter((s) => s.userId === parseInt(userId));
    if (subs.length === 0) return;

    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

    const promises = subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payloadStr);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is invalid -> remove it
          removePushSubscription(s.subscription.endpoint);
        } else {
          console.warn('[WebPush] Push delivery warning:', err.message);
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (err) {
    console.warn('[WebPush] Failed to dispatch background push:', err.message);
  }
}

module.exports = {
  VAPID_PUBLIC_KEY,
  savePushSubscription,
  removePushSubscription,
  sendBackgroundPush,
};
