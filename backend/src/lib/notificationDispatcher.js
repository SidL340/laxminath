const prisma = require('./prisma');
const { sendBackgroundPush } = require('./webPush');

// Helper for BS date string
function getTodayBs() {
  const now = new Date();
  return `2083-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Send a notification directly to a specific user account by userId with smart deduplication.
 * Dispatches both DB in-app record and real background device push.
 */
async function sendUserNotification({ userId, title, message, type = 'NOTICE', link = null, noticeId = null }) {
  try {
    if (!userId) return null;
    const cleanTitle = String(title).trim();
    const cleanMessage = String(message).trim();
    const cleanType = String(type).toUpperCase();
    const todayBs = getTodayBs();

    // Deduplication check: prevent identical notification within recent time (last 30 mins)
    const recentDuplicate = await prisma.userNotification.findFirst({
      where: {
        userId: parseInt(userId),
        title: cleanTitle,
        message: cleanMessage,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes
        },
      },
    });

    if (recentDuplicate) {
      return recentDuplicate;
    }

    const notif = await prisma.userNotification.create({
      data: {
        userId: parseInt(userId),
        title: cleanTitle,
        message: cleanMessage,
        type: cleanType,
        link: link || null,
        noticeId: noticeId ? parseInt(noticeId) : null,
        createdAt: new Date(),
        createdAtBs: todayBs,
      },
    });

    // Real background push to user's phone / device
    sendBackgroundPush(userId, {
      title: cleanTitle,
      body: cleanMessage,
      icon: '/icon-192.png',
      badge: '/favicon-32x32.png',
      tag: `notif-${cleanType.toLowerCase()}-${userId}`,
      data: { url: link || '/' },
    }).catch(() => {});

    return notif;
  } catch (err) {
    console.error('[NotificationDispatcher] Failed to send user notification:', err.message);
    return null;
  }
}

/**
 * Automatically dispatch in-app notifications and real background mobile push to target users when a notice is posted.
 */
async function dispatchNoticeNotifications(notice) {
  try {
    if (!notice || !notice.id) return;
    const todayBs = notice.postedDateBs || getTodayBs();
    let prefix = '📌 सूचना:';
    if (notice.type === 'ABSENT_ALERT') prefix = '🚨 अनुपस्थित सूचना:';
    else if (notice.type === 'EXAM') prefix = '📢 परीक्षा सूचना:';
    else if (notice.type === 'FEE_REMINDER' || notice.type === 'FEE') prefix = '💰 शुल्क सूचना:';
    else if (notice.type === 'HOLIDAY') prefix = '🏖️ बिदा सम्बन्धी सूचना:';
    else if (notice.type === 'EVENT') prefix = '🎉 कार्यक्रम सूचना:';

    const cleanTitle = `${prefix} ${notice.title.replace(/^(📌|🚨|📢|💰|🏖️|🎉)\s*(सूचना:|Absent Notice —|Absence Alert:)?\s*/i, '').trim()}`;
    const cleanBody = notice.body || '';

    // 1. Direct Target Student
    if (notice.targetStudentId) {
      const student = await prisma.student.findUnique({
        where: { id: parseInt(notice.targetStudentId) },
        select: { userId: true },
      });
      if (student?.userId) {
        await sendUserNotification({
          userId: student.userId,
          title: cleanTitle,
          message: cleanBody,
          type: notice.type || 'NOTICE',
          link: '/student',
          noticeId: notice.id,
        });
      }
      return;
    }

    // 2. Class-specific notice -> notify all active students in that class
    if (notice.targetClassId) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: {
          classId: parseInt(notice.targetClassId),
          isActive: true,
        },
        include: {
          student: { select: { userId: true } },
        },
      });

      const uniqueUserIds = Array.from(
        new Set(enrollments.map((e) => e.student?.userId).filter(Boolean))
      );

      for (const uId of uniqueUserIds) {
        await sendUserNotification({
          userId: uId,
          title: cleanTitle,
          message: cleanBody,
          type: notice.type || 'NOTICE',
          link: '/student',
          noticeId: notice.id,
        });
      }
      return;
    }

    // 3. Role-specific or General broadcast notice
    let userWhere = { isActive: true };
    if (notice.targetRole && notice.targetRole !== 'ALL') {
      userWhere.role = notice.targetRole;
    }

    const targetUsers = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, role: true },
      take: 2000,
    });

    for (const u of targetUsers) {
      const link = u.role === 'STUDENT' ? '/student' : (u.role === 'TEACHER' ? '/teacher' : '/dashboard/notices');
      await sendUserNotification({
        userId: u.id,
        title: cleanTitle,
        message: cleanBody,
        type: notice.type || 'NOTICE',
        link,
        noticeId: notice.id,
      });
    }
  } catch (err) {
    console.error('[NotificationDispatcher] Notice broadcast error:', err.message);
  }
}

/**
 * Dispatch absent alert notification to student's user account and mobile push
 */
async function dispatchAbsentAlert({ studentId, dateBs, customMessage }) {
  try {
    if (!studentId) return null;
    const student = await prisma.student.findUnique({
      where: { id: parseInt(studentId) },
      select: { id: true, fullName: true, userId: true, guardianContact: true },
    });

    if (!student) return null;

    const title = `🚨 अनुपस्थित सूचना (Absent Alert)`;
    const message = customMessage || `${student.fullName} आज मिति ${dateBs} मा विद्यालयमा अनुपस्थित हुनुभएको छ।`;

    // 1. In-app & Push notification if student has user account
    if (student.userId) {
      await sendUserNotification({
        userId: student.userId,
        title,
        message,
        type: 'ATTENDANCE',
        link: '/student?tab=attendance',
      });
    }

    return true;
  } catch (err) {
    console.error('[NotificationDispatcher] Absent alert dispatch error:', err.message);
    return null;
  }
}

module.exports = {
  sendUserNotification,
  dispatchNoticeNotifications,
  dispatchAbsentAlert,
};

