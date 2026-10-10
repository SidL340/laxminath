const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { sendUserNotification } = require('../lib/notificationDispatcher');

const router = express.Router();

// ── 1. GET CURRENT USER'S NOTIFICATIONS ─────────────────────────────────────
// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 30, unreadOnly } = req.query;

    // Automatically remove notifications for deleted/inactive notices
    try {
      const inactiveNotices = await prisma.notice.findMany({
        where: { isActive: false },
        select: { id: true },
      });
      if (inactiveNotices.length > 0) {
        const inactiveIds = inactiveNotices.map((n) => n.id);
        await prisma.userNotification.deleteMany({
          where: { noticeId: { in: inactiveIds } },
        });
      }
    } catch (cleanErr) {
      console.warn('Auto-cleanup of inactive notice notifications skipped:', cleanErr.message);
    }

    const where = { userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit) || 30, 100),
      }),
      prisma.userNotification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    console.error('Failed to fetch user notifications:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

// ── 2. MARK SPECIFIC NOTIFICATION AS READ ───────────────────────────────────
// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const notification = await prisma.userNotification.findFirst({
      where: { id, userId: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const updated = await prisma.userNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

// ── 3. MARK ALL MY NOTIFICATIONS AS READ ────────────────────────────────────
// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', authenticate, async (req, res) => {
  try {
    await prisma.userNotification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Failed to mark all notifications as read:', err);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

// ── 4. DELETE A SPECIFIC NOTIFICATION ────────────────────────────────────────
// DELETE /api/notifications/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid ID.' });

    await prisma.userNotification.deleteMany({
      where: { id, userId: req.user.id },
    });

    return res.json({ success: true, message: 'Notification removed successfully.' });
  } catch (err) {
    console.error('Failed to delete notification:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.' });
  }
});

// ── 5. CLEAR ALL NOTIFICATIONS FOR CURRENT USER ───────────────────────────────
// DELETE /api/notifications/clear-all
router.delete('/clear-all', authenticate, async (req, res) => {
  try {
    await prisma.userNotification.deleteMany({
      where: { userId: req.user.id },
    });

    return res.json({ success: true, message: 'All notifications cleared successfully.' });
  } catch (err) {
    console.error('Failed to clear notifications:', err);
    return res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
  }
});

// ── 6. DIRECT SEND NOTIFICATION TO A USER ID (ADMIN/TEACHER ONLY) ───────────
// POST /api/notifications/send-direct
router.post('/send-direct', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const { userId, title, message, type = 'NOTICE', link } = req.body;
    if (!userId || !title || !message) {
      return res.status(400).json({ success: false, message: 'userId, title, and message are required.' });
    }

    const result = await sendUserNotification({
      userId: parseInt(userId),
      title: String(title).trim(),
      message: String(message).trim(),
      type: String(type).toUpperCase(),
      link,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: 'Notification sent directly to user ID!',
    });
  } catch (err) {
    console.error('Failed to send direct notification:', err);
    return res.status(500).json({ success: false, message: 'Failed to send notification.' });
  }
});

// ── 7. GET VAPID PUBLIC KEY FOR PWA PUSH REGISTRATION ────────────────────────
// GET /api/notifications/vapid-public-key
router.get('/vapid-public-key', (req, res) => {
  const { VAPID_PUBLIC_KEY } = require('../lib/webPush');
  return res.json({ success: true, data: { publicKey: VAPID_PUBLIC_KEY } });
});

// ── 8. REGISTER WEB PUSH SUBSCRIPTION ────────────────────────────────────────
// POST /api/notifications/subscribe
router.post('/subscribe', authenticate, (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Valid subscription object required.' });
    }
    const { savePushSubscription } = require('../lib/webPush');
    savePushSubscription(req.user.id, subscription);
    return res.json({ success: true, message: 'Push subscription registered successfully.' });
  } catch (err) {
    console.error('Failed to save push subscription:', err);
    return res.status(500).json({ success: false, message: 'Failed to save subscription.' });
  }
});

module.exports = router;
