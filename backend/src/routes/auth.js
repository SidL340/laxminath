const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const otplib = require('otplib');
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { sendAdminLoginAlert } = require('../lib/emailService');

// ── 2FA / TOTP Universal Helpers (compatible across otplib versions) ─────────
function generate2FASecret() {
  if (typeof otplib.generateSecret === 'function') {
    return otplib.generateSecret();
  }
  if (otplib.authenticator && typeof otplib.authenticator.generateSecret === 'function') {
    return otplib.authenticator.generateSecret();
  }
  return crypto.randomBytes(20).toString('hex').toUpperCase();
}

function generate2FAKeyURI(account, issuer, secret) {
  if (typeof otplib.generateURI === 'function') {
    return otplib.generateURI({ issuer, label: account, secret });
  }
  if (otplib.authenticator && typeof otplib.authenticator.keyuri === 'function') {
    return otplib.authenticator.keyuri(account, issuer, secret);
  }
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
}

function verify2FAToken(token, secret) {
  try {
    if (typeof otplib.verifySync === 'function') {
      const res = otplib.verifySync({ token: String(token).trim(), secret: String(secret).trim() });
      return !!(res && (res.valid === true || res === true));
    }
    if (typeof otplib.verify === 'function') {
      const res = otplib.verify({ token: String(token).trim(), secret: String(secret).trim() });
      return !!(res && (res.valid === true || res === true));
    }
    if (otplib.authenticator && typeof otplib.authenticator.verify === 'function') {
      return !!otplib.authenticator.verify({ token: String(token).trim(), secret: String(secret).trim() });
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Helper: Generate readable backup recovery codes (e.g. NSS-XXXX-XXXX)
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`NSS-${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

const router = express.Router();

// ── FIX H-04 / M-07: Rate limiting on all auth endpoints ──────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true,
});

const resetRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  message: { success: false, message: 'Too many reset requests. Please try again in an hour.' },
});

// Helper: set JWT as HttpOnly cookie (FIX H-06)
function setAuthCookie(res, token) {
  res.cookie('erp_jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/',
  });
}

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid username and password are required.' });
    }

    const rawInput = String(username).trim();
    const rawPass = String(password).trim();

    if (rawInput.length === 0 || rawInput.length > 100 || rawPass.length === 0 || rawPass.length > 128) {
      return res.status(400).json({ success: false, message: 'Invalid credentials format.' });
    }

    // Exact targeted lookup (Username, Email, Phone, Student ID, or EMIS ID)
    let user = await prisma.user.findFirst({
      where: {
        isActive: true,
        OR: [
          { username: { equals: rawInput, mode: 'insensitive' } },
          { teacher: { email: { equals: rawInput, mode: 'insensitive' } } },
          { teacher: { phone: { equals: rawInput } } },
          { student: { studentId: { equals: rawInput, mode: 'insensitive' } } },
          { student: { emisId: { equals: rawInput, mode: 'insensitive' } } },
          { student: { phone: { equals: rawInput } } },
        ],
      },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            photoUrl: true,
            email: true,
            phone: true,
            inchargeRole: true,
            inchargeTitle: true,
            shreni: true,
            post: true,
            type: true,
            isTeachingStaff: true,
          },
        },
        student: { select: { id: true, fullName: true, studentId: true, emisId: true, photoUrl: true, phone: true } },
      },
    });

    // Fallback: Direct lookup in Student table if user record was not directly resolved
    let studentObj = user?.student || null;
    if (!user) {
      const studentMatch = await prisma.student.findFirst({
        where: {
          OR: [
            { studentId: { equals: rawInput, mode: 'insensitive' } },
            { emisId: { equals: rawInput, mode: 'insensitive' } },
            { phone: { equals: rawInput } },
          ],
        },
        include: {
          user: true,
        },
      });

      if (studentMatch) {
        studentObj = {
          id: studentMatch.id,
          fullName: studentMatch.fullName,
          studentId: studentMatch.studentId,
          emisId: studentMatch.emisId,
          photoUrl: studentMatch.photoUrl,
          phone: studentMatch.phone,
        };

        if (studentMatch.user && studentMatch.user.isActive) {
          user = studentMatch.user;
          user.student = studentObj;
        } else if (!studentMatch.userId || !studentMatch.user) {
          // FIX H-02: Auto-provision uses a UNIQUE random password per student, NOT a shared default
          const crypto = require('crypto');
          const uniquePass = `Stu@${crypto.randomBytes(6).toString('base64url')}`;
          const defaultHash = await bcrypt.hash(uniquePass, 12); // FIX L-01: cost 12
          const newUsername = studentMatch.studentId || studentMatch.emisId || `STU-${studentMatch.id}`;

          user = await prisma.user.create({
            data: {
              username: newUsername,
              passwordHash: defaultHash,
              role: 'STUDENT',
              isActive: true,
              mustChangePassword: true, // Force password change on first login
            },
          });
          await prisma.student.update({
            where: { id: studentMatch.id },
            data: { userId: user.id },
          });
          user.student = studentObj;
          // NOTE: uniquePass is intentionally not returned — admin must reset via admin panel
        }
      }
    }

    // FIX C-04: Removed plaintext password fallback — bcrypt only, always
    if (!user || !user.isActive || !user.passwordHash) {
      // Dummy hash comparison to prevent timing attacks
      await bcrypt.compare(rawPass, '$2a$12$dummyHashToPreventTimingAttacksXXXXXXXXXXXXXXX').catch(() => {});
      return res.status(401).json({ success: false, message: 'प्रयोगकर्ता नाम वा पासवर्ड मिलेन (Invalid username or password).' });
    }

    // Verify password — bcrypt only, no plaintext fallback
    let valid = false;
    const isHashed = user.passwordHash.startsWith('$2a$') ||
                     user.passwordHash.startsWith('$2b$') ||
                     user.passwordHash.startsWith('$2y$');

    if (!isHashed) {
      // FIX C-04: Plain-text passwords in DB are rejected — admin must reset
      console.warn(`[AUTH] User "${user.username}" has an unhashed password. Forcing mustChangePassword and rejecting login. Admin must reset.`);
      await prisma.user.update({
        where: { id: user.id },
        data: { mustChangePassword: true, isActive: false },
      }).catch(() => {});
      return res.status(401).json({
        success: false,
        message: 'Your account requires a security upgrade. Please contact the administrator to reset your password.',
      });
    }

    try {
      valid = await bcrypt.compare(rawPass, user.passwordHash);
    } catch (bcryptErr) {
      console.error('Bcrypt comparison error:', bcryptErr.message);
      valid = false;
    }

    if (!valid) {
      return res.status(401).json({ success: false, message: 'प्रयोगकर्ता नाम वा पासवर्ड मिलेन (Invalid username or password).' });
    }

    // Guarantee student object is attached for STUDENT role
    if (user.role === 'STUDENT' && !studentObj) {
      studentObj = await prisma.student.findFirst({
        where: { OR: [{ userId: user.id }, { studentId: user.username }] },
        select: { id: true, fullName: true, studentId: true, emisId: true, photoUrl: true, phone: true },
      }).catch(() => null);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'CHANGE_TO_A_64_BYTE_RANDOM_HEX_STRING_RUN_COMMAND_ABOVE') {
      console.error('[AUTH] JWT_SECRET is not configured! Set a strong secret in .env');
      return res.status(500).json({ success: false, message: 'Server configuration error. Contact administrator.' });
    }

    // Check if Two-Factor Authentication is enabled for this account
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = jwt.sign(
        { id: user.id, is2FAPending: true, v: user.tokenVersion || 0 },
        secret,
        { expiresIn: '5m' }
      );
      return res.json({
        success: true,
        require2FA: true,
        tempToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          fullName: user.teacher?.fullName || studentObj?.fullName || user.username,
        },
        message: 'दुई-तह प्रमाणीकरण (2FA) कोड आवश्यक छ। (Two-Factor Authentication code required).',
      });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const token = jwt.sign(
      { id: user.id, role: user.role, v: user.tokenVersion || 0 },
      secret,
      { expiresIn }
    );

    // FIX H-06: Set JWT as HttpOnly cookie in addition to returning in body
    setAuthCookie(res, token);

    // FIX H-07: Await fire-and-forget login tracking properly
    try {
      const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || 'Unknown Browser';
      let deviceType = 'Desktop';
      if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
      else if (/tablet|ipad/i.test(userAgent)) deviceType = 'Tablet';

      const now = new Date();
      const dateBs = getBsDateString(now);
      const fullName = user.teacher?.fullName || studentObj?.fullName || user.username;

      // Use Promise.allSettled so failures in logging don't block the login response
      await Promise.allSettled([
        prisma.userLoginLog.create({
          data: {
            userId: user.id,
            username: user.username,
            role: user.role,
            fullName,
            ipAddress,
            userAgent,
            deviceType,
            loginAt: now,
            loginDateBs: dateBs,
            lastActiveAt: now,
            isOnline: true,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now, lastActiveAt: now },
        }),
      ]);

      // Security Email Alert for Admin / Finance Logins
      if (['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role)) {
        sendAdminLoginAlert({
          username: user.username,
          fullName,
          role: user.role,
          ipAddress,
          deviceType,
          userAgent,
          loginTimeBs: dateBs,
        }).catch(() => {});
      }
    } catch (logErr) {
      console.error('Login tracking error:', logErr.message);
    }

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword || false,
        teacher: user.teacher || null,
        student: studentObj,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = req.user;
  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      teacher: user.teacher,
      student: user.student,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  // FIX H-06: Clear the HttpOnly cookie on logout
  res.clearCookie('erp_jwt', { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// ── TWO-FACTOR AUTHENTICATION (2FA / TOTP) ENDPOINTS ────────────────────────

// POST /api/auth/2fa/login-verify (Public with rate limiter — completes 2FA login)
router.post('/2fa/login-verify', loginLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Temporary token and verification code are required.' });
    }

    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(tempToken, secret);
    } catch (jwtErr) {
      return res.status(401).json({ success: false, message: '2FA session expired. Please log in again.' });
    }

    if (!decoded || !decoded.is2FAPending || !decoded.id) {
      return res.status(401).json({ success: false, message: 'Invalid 2FA session token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        teacher: {
          select: {
            id: true, fullName: true, fullNameNepali: true, photoUrl: true, email: true, phone: true,
            inchargeRole: true, inchargeTitle: true, shreni: true, post: true, type: true, isTeachingStaff: true,
          },
        },
        student: { select: { id: true, fullName: true, studentId: true, emisId: true, photoUrl: true, phone: true } },
      },
    });

    if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(401).json({ success: false, message: '2FA is not enabled or available for this account.' });
    }

    // Check tokenVersion revocation
    if (decoded.v !== undefined && decoded.v < (user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    let isValid = false;
    let usedBackupCode = false;

    // 1. Try TOTP 6-digit verification
    if (/^\d{6}$/.test(cleanCode)) {
      isValid = verify2FAToken(cleanCode, user.twoFactorSecret);
    }

    // 2. Try Emergency Backup Codes (e.g. NSS-XXXX-XXXX or standard alphanumeric)
    if (!isValid && user.twoFactorBackupCodes) {
      try {
        let backupCodes = JSON.parse(user.twoFactorBackupCodes);
        if (Array.isArray(backupCodes)) {
          const matchIdx = backupCodes.findIndex(bc => bc.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanCode.replace(/[^A-Z0-9]/g, ''));
          if (matchIdx !== -1) {
            isValid = true;
            usedBackupCode = true;
            // Remove used backup code from DB
            backupCodes.splice(matchIdx, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
            });
          }
        }
      } catch (parseErr) {
        console.error('Error checking backup codes:', parseErr);
      }
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'गलत 2FA कोड वा रिकभरी कोड (Invalid 2FA code or backup recovery code).' });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
    const finalToken = jwt.sign(
      { id: user.id, role: user.role, v: user.tokenVersion || 0 },
      secret,
      { expiresIn }
    );

    setAuthCookie(res, finalToken);

    // Login activity tracking
    try {
      const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const userAgent = req.headers['user-agent'] || 'Unknown Browser';
      let deviceType = 'Desktop';
      if (/mobile/i.test(userAgent)) deviceType = 'Mobile';
      else if (/tablet|ipad/i.test(userAgent)) deviceType = 'Tablet';

      const now = new Date();
      const dateBs = getBsDateString(now);
      const fullName = user.teacher?.fullName || user.student?.fullName || user.username;

      await Promise.allSettled([
        prisma.userLoginLog.create({
          data: {
            userId: user.id,
            username: user.username,
            role: user.role,
            fullName,
            ipAddress,
            userAgent,
            deviceType,
            loginAt: now,
            loginDateBs: dateBs,
            lastActiveAt: now,
            isOnline: true,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: now, lastActiveAt: now },
        }),
      ]);

      // Security Email Alert for Admin / Finance Logins
      if (['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'].includes(user.role)) {
        sendAdminLoginAlert({
          username: user.username,
          fullName,
          role: user.role,
          ipAddress,
          deviceType,
          userAgent,
          loginTimeBs: dateBs,
        }).catch(() => {});
      }
    } catch (logErr) {
      console.error('Login tracking error:', logErr.message);
    }

    return res.json({
      success: true,
      token: finalToken,
      usedBackupCode,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword || false,
        twoFactorEnabled: user.twoFactorEnabled,
        teacher: user.teacher || null,
        student: user.student || null,
      },
    });
  } catch (err) {
    console.error('2FA login verify error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify 2FA code. Please try again.' });
  }
});

// GET /api/auth/2fa/status (Protected)
router.get('/2fa/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { twoFactorEnabled: true, twoFactorBackupCodes: true },
    });
    let remainingBackupCodes = 0;
    if (user?.twoFactorBackupCodes) {
      try {
        const codes = JSON.parse(user.twoFactorBackupCodes);
        if (Array.isArray(codes)) remainingBackupCodes = codes.length;
      } catch (_) {}
    }
    return res.json({
      success: true,
      twoFactorEnabled: !!user?.twoFactorEnabled,
      remainingBackupCodes,
    });
  } catch (err) {
    console.error('2FA status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch 2FA status.' });
  }
});

// POST /api/auth/2fa/setup (Protected — Generates new QR Code and Secret)
router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const secret = generate2FASecret();
    const serviceName = 'Nepal Secondary School';
    const otpauth = generate2FAKeyURI(req.user.username, serviceName, secret);
    const qrCodeUrl = await QRCode.toDataURL(otpauth, { margin: 2, width: 260 });

    return res.json({
      success: true,
      secret,
      qrCodeUrl,
      otpauth,
      issuer: serviceName,
      account: req.user.username,
    });
  } catch (err) {
    console.error('2FA setup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate 2FA setup.' });
  }
});

// POST /api/auth/2fa/enable (Protected — Confirms setup with 6-digit code)
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    const { secret, code } = req.body;
    if (!secret || !code) {
      return res.status(400).json({ success: false, message: 'Secret and verification code are required.' });
    }

    const cleanCode = String(code).trim();
    const isValid = verify2FAToken(cleanCode, String(secret).trim());

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid 6-digit code. Please ensure your device clock is correct and try again.',
      });
    }

    const backupCodes = generateBackupCodes(8);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: String(secret).trim(),
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      },
    });

    return res.json({
      success: true,
      backupCodes,
      message: 'Two-Factor Authentication is now enabled for your account!',
    });
  } catch (err) {
    console.error('2FA enable error:', err);
    return res.status(500).json({ success: false, message: 'Failed to enable 2FA.' });
  }
});

// POST /api/auth/2fa/disable (Protected — Disables 2FA with password or 2FA code)
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password, code } = req.body;
    if (!password && !code) {
      return res.status(400).json({ success: false, message: 'Please provide your account password or current 2FA code to disable 2FA.' });
    }

    let isAuthorized = false;

    // 1. Password verification
    if (password) {
      isAuthorized = await bcrypt.compare(String(password).trim(), req.user.passwordHash);
    }

    // 2. TOTP code fallback
    if (!isAuthorized && code && req.user.twoFactorSecret) {
      isAuthorized = verify2FAToken(String(code).trim(), req.user.twoFactorSecret);
    }

    if (!isAuthorized) {
      return res.status(401).json({ success: false, message: 'Incorrect password or 2FA code.' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    return res.json({
      success: true,
      message: 'Two-Factor Authentication has been disabled.',
    });
  } catch (err) {
    console.error('2FA disable error:', err);
    return res.status(500).json({ success: false, message: 'Failed to disable 2FA.' });
  }
});

// POST /api/auth/2fa/regenerate-backup-codes (Protected)
router.post('/2fa/regenerate-backup-codes', authenticate, async (req, res) => {
  try {
    const { code, password } = req.body;
    let isAuthorized = false;

    if (password) {
      isAuthorized = await bcrypt.compare(String(password).trim(), req.user.passwordHash);
    }
    if (!isAuthorized && code && req.user.twoFactorSecret) {
      isAuthorized = verify2FAToken(String(code).trim(), req.user.twoFactorSecret);
    }

    if (!isAuthorized) {
      return res.status(401).json({ success: false, message: 'Confirmation password or 2FA code is required to regenerate backup codes.' });
    }

    const backupCodes = generateBackupCodes(8);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
    });

    return res.json({
      success: true,
      backupCodes,
      message: 'New emergency backup recovery codes generated successfully.',
    });
  } catch (err) {
    console.error('Regenerate backup codes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to regenerate backup codes.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // FIX M-03: Validate newPassword
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }
    if (!oldPassword || typeof oldPassword !== 'string') {
      return res.status(400).json({ success: false, message: 'Current password is required.' });
    }

    const valid = await bcrypt.compare(oldPassword, req.user.passwordHash);
    if (!valid)
      return res.status(400).json({ success: false, message: 'Old password is incorrect.' });

    const hash = await bcrypt.hash(newPassword.trim(), 12);
    await prisma.user.update({
      where: { id: req.user.id },
      // FIX L-04: Increment tokenVersion to invalidate existing JWTs after password change
      data: { passwordHash: hash, mustChangePassword: false, tokenVersion: { increment: 1 } },
    });
    // FIX H-06: Rotate cookie after password change
    const secret = process.env.JWT_SECRET;
    if (secret) {
      const newToken = jwt.sign({ id: req.user.id, role: req.user.role, v: (req.user.tokenVersion || 0) + 1 }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
      setAuthCookie(res, newToken);
      return res.json({ success: true, message: 'Password changed successfully.', token: newToken });
    }
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
});

// POST /api/auth/reset-password (Admin only - resets any user password)
// FIX M-05: Use authorize() middleware instead of manual role check
router.post('/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // FIX M-03: Validate newPassword
    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({ success: false, message: 'Valid userId is required.' });
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    const hash = await bcrypt.hash(newPassword.trim(), 12);
    await prisma.user.update({
      where: { id: parseInt(userId) },
      // FIX L-04: Increment tokenVersion to invalidate old JWTs
      data: { passwordHash: hash, mustChangePassword: true, tokenVersion: { increment: 1 } },
    });
    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred.' });
  }
});

// POST /api/auth/request-password-reset (Public — FIX M-07: rate limited)
router.post('/request-password-reset', resetRequestLimiter, async (req, res) => {
  try {
    const { identifier, fullName, role, contactInfo, reason } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username, Student ID, Email, or Phone number is required to request a password reset.',
      });
    }

    const cleanIdentifier = identifier.trim();

    // Try to find matching user
    const matchedUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanIdentifier },
          { student: { studentId: cleanIdentifier } },
          { student: { emisId: cleanIdentifier } },
          { teacher: { phone: cleanIdentifier } },
          { teacher: { email: cleanIdentifier } },
        ],
      },
      include: { teacher: true, student: true },
    });

    const finalFullName =
      fullName ||
      matchedUser?.teacher?.fullName ||
      matchedUser?.student?.fullName ||
      'Self-Service User';

    const finalRole = role || matchedUser?.role || 'STUDENT';

    await prisma.passwordResetRequest.create({
      data: {
        userId: matchedUser ? matchedUser.id : null,
        identifier: cleanIdentifier,
        fullName: finalFullName,
        role: finalRole,
        contactInfo: contactInfo || matchedUser?.teacher?.phone || matchedUser?.student?.phone || null,
        reason: reason || 'Forgot password request submitted by user.',
        status: 'PENDING',
      },
    });

    // FIX M-02: Always return the same message regardless of whether user was found
    return res.status(201).json({
      success: true,
      message: 'Password reset request submitted successfully! School administrator has been notified.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to submit reset request. Please try again.' });
  }
});

// ── Helper: Get a Nepali BS date string (FIX M-08: dynamic year) ──────────────
function getBsDateString(date) {
  // This is a placeholder using a simple AD→BS approximation.
  // For production accuracy, use a proper BS conversion library (e.g. bikram-sambat).
  // The Nepali year offset is approximately +56/57 years from AD.
  const adYear = date.getFullYear();
  const bsYear = adYear + 56; // Approximate — replace with real conversion
  return `${bsYear}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

module.exports = router;
