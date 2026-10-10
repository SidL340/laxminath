const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recordAuditLog } = require('../lib/auditLogger');

const router = express.Router();

// Helper to generate strong readable temporary password
function generateTemporaryPassword(role = 'USER') {
  const cleanRole = (role || 'USER').replace(/[^a-zA-Z]/g, '');
  const capitalized = cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase();
  const year = '2083';
  const randomDigits = Math.floor(100 + Math.random() * 900);
  return `${capitalized}@${year}#${randomDigits}`;
}

// ── 1. LIST USERS ────────────────────────────────────────────────────────────
// GET /api/users?role=&q=&isActive=&page=&limit=
router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { role, q, isActive, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (role && role !== 'ALL') {
      if (role === 'TEACHER') {
        where.OR = [{ role: 'TEACHER' }, { teacher: { isNot: null } }];
      } else if (role === 'LIBRARIAN') {
        where.OR = [{ role: 'LIBRARIAN' }, { teacher: { inchargeRole: { contains: 'LIBRARIAN' } } }];
      } else if (role === 'ACCOUNTANT') {
        where.OR = [{ role: 'ACCOUNTANT' }, { teacher: { inchargeRole: { contains: 'ACCOUNTANT' } } }];
      } else if (role === 'ADMIN') {
        where.role = { in: ['SUPER_ADMIN', 'ADMIN'] };
      } else {
        where.role = role;
      }
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (q && q.trim()) {
      const search = q.trim();
      const searchConditions = [
        { username: { contains: search } },
        { teacher: { fullName: { contains: search } } },
        { student: { fullName: { contains: search } } },
        { student: { studentId: { contains: search } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          teacher: {
            select: {
              id: true,
              fullName: true,
              fullNameNepali: true,
              phone: true,
              email: true,
              type: true,
              post: true,
              shreni: true,
              inchargeRole: true,
              inchargeTitle: true,
              isTeachingStaff: true,
              photoUrl: true,
            },
          },
          student: {
            select: {
              id: true,
              studentId: true,
              fullName: true,
              fullNameNepali: true,
              phone: true,
              guardianContact: true,
              photoUrl: true,
              classEnrollment: {
                where: { isActive: true },
                select: { rollNo: true, class: { select: { id: true, name: true, section: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    // Aggregate counts by role for fast tab badges
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const [
      totalTeachers,
      totalStudents,
      totalLibrarians,
      totalAccountants,
      totalAdmins,
      pendingResetCount,
      totalAllUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { OR: [{ role: 'TEACHER' }, { teacher: { isNot: null } }] } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { OR: [{ role: 'LIBRARIAN' }, { teacher: { inchargeRole: { contains: 'LIBRARIAN' } } }] } }),
      prisma.user.count({ where: { OR: [{ role: 'ACCOUNTANT' }, { teacher: { inchargeRole: { contains: 'ACCOUNTANT' } } }] } }),
      prisma.user.count({ where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } }),
      prisma.passwordResetRequest.count({ where: { status: 'PENDING' } }),
      prisma.user.count(),
    ]);

    return res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / take),
        stats: {
          totalUsers: totalAllUsers,
          teachers: totalTeachers,
          students: totalStudents,
          librarians: totalLibrarians,
          accountants: totalAccountants,
          admins: totalAdmins,
          pendingResetRequests: pendingResetCount,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 2. CREATE NEW USER ───────────────────────────────────────────────────────
// POST /api/users
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      username,
      password,
      role = 'TEACHER',
      fullName,
      phone,
      email,
      isActive = true,
      mustChangePassword = false,
      teacherId,
      studentId,
    } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    // Check unique username
    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Username "${username}" is already in use. Please choose another username.`,
      });
    }

    // Determine initial password
    const rawPassword = password && password.trim() ? password.trim() : generateTemporaryPassword(role);
    const passwordHash = await bcrypt.hash(rawPassword, 12); // FIX L-01: cost 12 everywhere

    // Create User record
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        passwordHash,
        role: role.toUpperCase(),
        isActive: Boolean(isActive),
        mustChangePassword: Boolean(mustChangePassword),
      },
    });

    // If teacherId provided, link teacher to this user
    if (teacherId) {
      await prisma.teacher.update({
        where: { id: parseInt(teacherId) },
        data: { userId: user.id },
      });
    }

    // If studentId provided, link student to this user
    if (studentId) {
      await prisma.student.update({
        where: { id: parseInt(studentId) },
        data: { userId: user.id },
      });
    }

    // If creating a fresh Librarian or Staff without existing teacher profile, create basic teacher/staff record
    if (role === 'TEACHER' && !teacherId && fullName) {
      await prisma.teacher.create({
        data: {
          userId: user.id,
          fullName: fullName.trim(),
          phone: phone || null,
          email: email || null,
          type: 'NIJI_SROTH',
          post: 'Teacher',
        },
      });
    }

    const createdUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { teacher: true, student: true },
    });

    recordAuditLog(req, {
      action: 'CREATE',
      entity: 'USER',
      entityId: user.id,
      description: `Created new user account "${user.username}" with role ${user.role}`,
      details: {
        userId: user.id,
        username: user.username,
        role: user.role,
        fullName: fullName || null,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      data: {
        user: createdUser,
        credentials: {
          username: user.username,
          temporaryPassword: rawPassword,
          role: user.role,
        },
      },
      message: `User account for "${user.username}" created successfully!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 3. UPDATE USER ───────────────────────────────────────────────────────────
// PUT /api/users/:id
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, role, isActive, mustChangePassword, inchargeRole, inchargeTitle, fullName, phone, email } = req.body;

    const data = {};
    if (username) data.username = username.trim();
    if (role) data.role = role.toUpperCase();
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (mustChangePassword !== undefined) data.mustChangePassword = Boolean(mustChangePassword);

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: { teacher: true, student: true },
    });

    // If teacher profile exists, update teacher inchargeRole / title / phone / etc. if provided
    if (updated.teacher && (inchargeRole !== undefined || inchargeTitle !== undefined || fullName !== undefined || phone !== undefined || email !== undefined)) {
      const teacherData = {};
      if (inchargeRole !== undefined) teacherData.inchargeRole = inchargeRole;
      if (inchargeTitle !== undefined) teacherData.inchargeTitle = inchargeTitle;
      if (fullName !== undefined) teacherData.fullName = fullName.trim();
      if (phone !== undefined) teacherData.phone = phone;
      if (email !== undefined) teacherData.email = email;

      await prisma.teacher.update({
        where: { id: updated.teacher.id },
        data: teacherData,
      });
    }

    const finalUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            phone: true,
            email: true,
            type: true,
            post: true,
            shreni: true,
            inchargeRole: true,
            inchargeTitle: true,
            isTeachingStaff: true,
            photoUrl: true,
          },
        },
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            fullNameNepali: true,
            phone: true,
            photoUrl: true,
          },
        },
      },
    });

    recordAuditLog(req, {
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      description: `Updated user account "${finalUser.username}" (${finalUser.role})`,
      details: {
        userId,
        username: finalUser.username,
        role: finalUser.role,
        isActive: finalUser.isActive,
      },
    }).catch(() => {});

    return res.json({
      success: true,
      data: finalUser,
      message: `User "${finalUser.username}" updated successfully!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CHANGE MY OWN PASSWORD ──────────────────────────────────────────────────
// POST /api/users/change-my-password
router.post('/change-my-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    // Verify old password if provided (for clients that send it)
    if (oldPassword && typeof oldPassword === 'string') {
      const freshUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } });
      if (!freshUser) return res.status(404).json({ success: false, message: 'User not found.' });

      const validOld = await bcrypt.compare(oldPassword, freshUser.passwordHash);
      if (!validOld) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      if (oldPassword === newPassword.trim()) {
        return res.status(400).json({ success: false, message: 'New password must be different from the current password.' });
      }
    }

    // FIX L-01: cost 12
    const passwordHash = await bcrypt.hash(newPassword.trim(), 12);
    await prisma.user.update({
      where: { id: req.user.id },
      // FIX L-04: Increment tokenVersion to invalidate existing JWTs
      data: { passwordHash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });

    recordAuditLog(req, {
      action: 'PASSWORD_CHANGE',
      entity: 'USER',
      entityId: req.user.id,
      description: `User "${req.user.username}" changed their own password`,
    }).catch(() => {});

    return res.json({ success: true, message: 'Your password has been changed successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});

// ── 4. ADMIN RESET USER PASSWORD ────────────────────────────────────────────
// POST /api/users/:id/reset-password
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { newPassword } = req.body;
    const rawPassword = newPassword && newPassword.trim() ? newPassword.trim() : generateTemporaryPassword(user.role);
    const passwordHash = await bcrypt.hash(rawPassword, 12); // FIX L-01: cost 12

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
        tokenVersion: { increment: 1 }, // FIX M-3: Invalidate existing JWTs after admin reset
      },
    });

    // Also mark any open reset request for this user as RESOLVED
    // FIX C-05: Never store plaintext password in DB
    await prisma.passwordResetRequest.updateMany({
      where: { userId, status: 'PENDING' },
      data: {
        status: 'RESOLVED',
        temporaryPassword: null, // FIX C-05: cleared — not stored in plaintext
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
        adminNotes: 'Password reset directly by Administrator.',
      },
    });

    const displayName = user.teacher?.fullName || user.student?.fullName || user.username;

    recordAuditLog(req, {
      action: 'PASSWORD_RESET',
      entity: 'USER',
      entityId: userId,
      description: `Administrator reset password for user "${user.username}" (${displayName})`,
      details: {
        userId,
        username: user.username,
        role: user.role,
      },
    }).catch(() => {});

    return res.json({
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        displayName,
        role: user.role,
        temporaryPassword: rawPassword,
      },
      message: `Password for "${user.username}" (${displayName}) was reset successfully!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 4B. BULK RESET ALL PASSWORDS ─────────────────────────────────────────────
// POST /api/users/bulk-reset-passwords
router.post('/bulk-reset-passwords', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { targetRole = 'ALL', classId } = req.body;
    const where = { isActive: true };

    if (targetRole && targetRole !== 'ALL') {
      where.role = targetRole;
    }
    // Exclude current logged in admin from accidental mass reset
    where.id = { not: req.user.id };

    const usersToReset = await prisma.user.findMany({
      where,
      include: {
        teacher: { select: { fullName: true, phone: true } },
        student: {
          select: {
            fullName: true,
            studentId: true,
            classEnrollment: {
              where: { isActive: true },
              select: { rollNo: true, class: { select: { id: true, name: true, section: true } } },
            },
          },
        },
      },
    });

    const resetTasks = usersToReset.map(async (u) => {
      if (classId && u.role === 'STUDENT') {
        const studentClassId = u.student?.classEnrollment?.[0]?.class?.id;
        if (studentClassId !== parseInt(classId)) return null;
      }

      // FIX L-01: Use cost 12 for all bcrypt operations
      const rawPassword = u.role === 'STUDENT' ? `SSB@${generateTemporaryPassword('STUDENT')}` : generateTemporaryPassword(u.role);
      const passwordHash = await bcrypt.hash(rawPassword, 12);

      await prisma.user.update({
        where: { id: u.id },
        data: { passwordHash, mustChangePassword: true },
      });

      const className = u.student?.classEnrollment?.[0]?.class
        ? `${u.student.classEnrollment[0].class.name} (${u.student.classEnrollment[0].class.section || 'A'})`
        : u.teacher?.post || u.role;

      const rollNo = u.student?.classEnrollment?.[0]?.rollNo || '—';
      return {
        id: u.id,
        username: u.username,
        role: u.role,
        fullName: u.teacher?.fullName || u.student?.fullName || u.username,
        studentId: u.student?.studentId || '—',
        className,
        rollNo,
        temporaryPassword: rawPassword,
      };
    });

    const results = await Promise.all(resetTasks);
    const resetResults = results.filter(Boolean);

    return res.json({
      success: true,
      data: resetResults,
      count: resetResults.length,
      message: `Successfully reset passwords for ${resetResults.length} users!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── 5. DELETE / DEACTIVATE USER ─────────────────────────────────────────────
// ── 5. PERMANENT DELETE USER ────────────────────────────────────────────────
const deleteUserHandler = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID.' });
    }

    if (req.user.id === userId) {
      return res.status(400).json({ success: false, message: 'तपाईं हाल लगइन रहेको आफ्नै एडमिन खाता मेटाउन सक्नुहुन्न (Cannot delete your own active administrator account).' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true, student: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Clean up all child relations
    if (prisma.passwordResetRequest) {
      await prisma.passwordResetRequest.deleteMany({ where: { userId } }).catch(() => {});
    }
    if (prisma.userLoginLog) {
      await prisma.userLoginLog.deleteMany({ where: { userId } }).catch(() => {});
    }
    if (prisma.userNotification) {
      await prisma.userNotification.deleteMany({ where: { userId } }).catch(() => {});
    }
    if (prisma.systemAuditLog) {
      await prisma.systemAuditLog.deleteMany({ where: { userId } }).catch(() => {});
    }

    if (user.teacher) {
      const teacherId = user.teacher.id;
      if (prisma.teacherSubject) await prisma.teacherSubject.deleteMany({ where: { teacherId } }).catch(() => {});
      if (prisma.classSubject) await prisma.classSubject.updateMany({ where: { teacherId }, data: { teacherId: null } }).catch(() => {});
      if (prisma.teacherBankAccount) await prisma.teacherBankAccount.deleteMany({ where: { teacherId } }).catch(() => {});
      if (prisma.staffTask) await prisma.staffTask.deleteMany({ where: { assignedToId: teacherId } }).catch(() => {});
      if (prisma.teacher) await prisma.teacher.delete({ where: { id: teacherId } }).catch(() => {});
    }
    if (user.student) {
      const studentId = user.student.id;
      if (prisma.classEnrollment) await prisma.classEnrollment.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.attendance) await prisma.attendance.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.markEntry) await prisma.markEntry.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.libraryIssue) await prisma.libraryIssue.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.studentFeeDue) await prisma.studentFeeDue.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.feeCollection) await prisma.feeCollection.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.certificate) await prisma.certificate.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.examSeatPlan) await prisma.examSeatPlan.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.leaveRequest) await prisma.leaveRequest.deleteMany({ where: { studentId } }).catch(() => {});
      if (prisma.notice) await prisma.notice.deleteMany({ where: { targetStudentId: studentId } }).catch(() => {});
      if (prisma.student) await prisma.student.delete({ where: { id: studentId } }).catch(() => {});
    }

    await prisma.user.delete({ where: { id: userId } });

    recordAuditLog(req, {
      action: 'DELETE',
      entity: 'USER',
      entityId: userId,
      description: `Permanently deleted user account "${user.username}" (${user.role})`,
    }).catch(() => {});

    return res.json({
      success: true,
      message: `प्रयोगकर्ता "${user.username}" (${user.role}) सफलतापूर्वक मेटाइयो!`,
    });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to delete user.' });
  }
};

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteUserHandler);
router.post('/:id/delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteUserHandler);

// ── 6. PASSWORD RESET REQUESTS QUEUE ─────────────────────────────────────────
// GET /api/users/reset-requests/list?status=
router.get('/reset-requests/list', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const requests = await prisma.passwordResetRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            teacher: { select: { fullName: true, phone: true } },
            student: { select: { fullName: true, studentId: true, phone: true, guardianContact: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return res.json({ success: true, data: requests });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'An internal server error occurred.' });
  }
});


// POST /api/users/reset-requests/:id/resolve
router.post('/reset-requests/:id/resolve', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { action = 'APPROVE', adminNotes, newPassword } = req.body;

    const request = await prisma.passwordResetRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Reset request not found.' });
    }

    if (action === 'REJECT') {
      const updated = await prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          adminNotes: adminNotes || 'Rejected by Administrator.',
          resolvedAt: new Date(),
          resolvedBy: req.user.id,
        },
      });
      return res.json({
        success: true,
        data: updated,
        message: 'Password reset request was rejected.',
      });
    }

    // Action === 'APPROVE'
    // Find target user either via userId relation or matching identifier
    let targetUser = request.user;
    if (!targetUser && request.userId) {
      targetUser = await prisma.user.findUnique({ where: { id: request.userId } });
    }
    if (!targetUser && request.identifier) {
      targetUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: request.identifier.trim() },
            { student: { studentId: request.identifier.trim() } },
            { student: { emisId: request.identifier.trim() } },
            { teacher: { phone: request.identifier.trim() } },
          ],
        },
        include: { teacher: true, student: true },
      });
    }

    if (!targetUser) {
      return res.status(400).json({
        success: false,
        message: `Could not automatically locate user account for "${request.identifier}". Please verify user account from User list.`,
      });
    }

    const rawPassword = newPassword && newPassword.trim()
      ? newPassword.trim()
      : generateTemporaryPassword(targetUser.role || request.role);

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Update user password
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        isActive: true,
      },
    });

    // FIX C-05: Never store plaintext password in DB — return it only in the API response
    const updatedRequest = await prisma.passwordResetRequest.update({
      where: { id: requestId },
      data: {
        status: 'RESOLVED',
        userId: targetUser.id,
        temporaryPassword: null, // FIX C-05: cleared — not persisted in plaintext
        adminNotes: adminNotes || 'Approved and reset by Administrator.',
        resolvedAt: new Date(),
        resolvedBy: req.user.id,
      },
    });

    return res.json({
      success: true,
      data: {
        request: updatedRequest,
        credentials: {
          username: targetUser.username,
          temporaryPassword: rawPassword,
          role: targetUser.role,
          displayName: request.fullName || targetUser.username,
        },
      },
      message: `Password for "${targetUser.username}" was reset successfully! Temporary password generated.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/users/:id/reset-2fa (Admin only — resets/disables 2FA for a user who lost their device)
router.post('/:id/reset-2fa', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID.' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        tokenVersion: { increment: 1 }, // Invalidate any active session
      },
    });

    return res.json({
      success: true,
      message: `User "${targetUser.username}" को 2FA सफलतापूर्वक निष्क्रिय गरिएको छ। (2FA reset successfully).`,
    });
  } catch (err) {
    console.error('Reset 2FA error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset 2FA.' });
  }
});

module.exports = router;
