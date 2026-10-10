require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────────────────────────────
// FIX M-09: Explicit CSP — no wildcard sources
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
}));

// FIX H-01: CORS must have an explicit origin — no wildcard with credentials
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: Origin "${origin}" not allowed.`));
  },
  credentials: true,
}));

app.use(compression());
const cookieSecret = process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'nepal_mavi_erp_secure_cookie_secret_salt_2083';
app.use(cookieParser(cookieSecret));
// FIX L-03: 2MB JSON limit — use specific routes for large uploads
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
// FIX L-02: Use 'combined' log format in production
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── STATIC UPLOADS (SECURE SANDBOX) ─────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', (req, res, next) => {
  // Prevent direct code execution & disable iframe embedding/XSS
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}, express.static(path.resolve(uploadDir), {
  dotfiles: 'ignore',
  index: false,
  setHeaders: (res, filePath) => {
    // Force download for executable or script-like extensions
    const dangerousExts = ['.html', '.htm', '.js', '.mjs', '.php', '.py', '.sh', '.exe', '.bat', '.svg'];
    const ext = path.extname(filePath).toLowerCase();
    if (dangerousExts.includes(ext)) {
      res.setHeader('Content-Disposition', 'attachment');
    }
  },
}));

// ── ROUTES ─────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/school',     require('./routes/school'));
// FIX I-01: Removed duplicate /api/bank-accounts → school route (dead/confused route)
app.use('/api/students',   require('./routes/students'));
app.use('/api/teachers',   require('./routes/teachers'));
app.use('/api/staff-masters', require('./routes/staffMasters').router);
app.use('/api/classes',    require('./routes/classes'));
app.use('/api/income',     require('./routes/income'));
app.use('/api/expense',    require('./routes/expense'));
app.use('/api/payroll',    require('./routes/payroll'));
app.use('/api/peshki',     require('./routes/peshki'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/exams',      require('./routes/exams'));
app.use('/api/library',    require('./routes/library'));
app.use('/api/inventory',  require('./routes/inventory'));
app.use('/api/notices',    require('./routes/notices'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/events',     require('./routes/events'));
app.use('/api/parties',    require('./routes/parties'));
app.use('/api/financial-years', require('./routes/financialYears').router);
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/letters',     require('./routes/letters'));
app.use('/api/routine',     require('./routes/routine'));
app.use('/api/seat-plans',  require('./routes/seatPlans'));
app.use('/api/budget',      require('./routes/budget'));
app.use('/api/finance-reports', require('./routes/financeReports'));
app.use('/api/leaves',      require('./routes/leaves'));
app.use('/api/staff-tasks', require('./routes/staff-tasks').router);
app.use('/api/daily-logs',  require('./routes/dailyLogs'));
app.use('/api/usage-tracking', require('./routes/usageTracking'));

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Nepal School ERP API' });
});

// ── 404 ───────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── ERROR HANDLER (NEVER LEAK STACK TRACES OR DATABASE SCHEMAS) ───────────
app.use((err, req, res, next) => {
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, err.stack || err.message);

  const status = err.status || err.statusCode || 500;
  let safeMessage = 'An unexpected system error occurred. Please try again or contact administration.';

  if (err.code === 'P2002') {
    safeMessage = 'A duplicate record already exists with the provided unique information.';
  } else if (err.code === 'P2025') {
    safeMessage = 'The requested record was not found.';
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    safeMessage = 'Uploaded file exceeds the maximum allowed size limit.';
  } else if (err.message && (err.message.includes('Invalid') || err.message.includes('required') || err.message.includes('Permission'))) {
    safeMessage = err.message;
  }

  res.status(status).json({
    success: false,
    message: safeMessage,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🏫 Nepal School ERP Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    try {
      require('../../scripts/safe_bank_migration');
    } catch (e) {
      try {
        require('../scripts/safe_bank_migration');
      } catch (e2) {}
    }

    const prisma = require('./lib/prisma');
    const bcrypt = require('bcryptjs');

    // Ensure school profile exists without overwriting any custom edits made by administrators
    const existingSchool = await prisma.school.findFirst();
    if (!existingSchool) {
      await prisma.school.create({
        data: {
          name: 'Nepal Secondary School',
          nameNepali: 'नेपाल माध्यमिक विद्यालय',
          address: 'वृन्दावन न.पा.-२, विश्रामपुर, रौतहट',
          district: 'रौतहट',
          province: 'मधेश प्रदेश',
          emisCode: '320160005',
          phone: '',
          email: '',
          level: 'Secondary',
          type: 'Community',
          estYear: '2007',
          principalName: '',
        },
      });
    }

    // Deduplicate Academic Years and ensure active 2083-84 (2026 AD) exists
    try {
      const allYears = await prisma.academicYear.findMany({ orderBy: { id: 'asc' } });
      const seen = new Map();
      const toDelete = [];

      for (const yr of allYears) {
        const normalized = (yr.year || '').trim();
        if (!seen.has(normalized)) {
          seen.set(normalized, yr);
        } else {
          const primary = seen.get(normalized);
          const duplicateId = yr.id;
          await prisma.expenseEntry.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.incomeEntry.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.classEnrollment.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.class.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.exam.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          await prisma.payroll.updateMany({ where: { academicYearId: duplicateId }, data: { academicYearId: primary.id } }).catch(() => {});
          toDelete.push(duplicateId);
        }
      }

      if (toDelete.length > 0) {
        await prisma.academicYear.deleteMany({ where: { id: { in: toDelete } } });
        console.log(`🧹 Cleaned up ${toDelete.length} duplicate academic years.`);
      }

      // Ensure active 2083-84 exists
      let active2083 = await prisma.academicYear.findFirst({ where: { year: { in: ['2083-84', '2083/84', '2083'] } } });
      if (!active2083) {
        active2083 = await prisma.academicYear.create({
          data: {
            year: '2083-84',
            startDateBs: '2083-01-01',
            endDateBs: '2083-12-30',
            isActive: true,
          },
        });
      }

      // Ensure 2083-84 is marked as isActive
      const currentActive = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!currentActive || currentActive.year !== '2083-84') {
        await prisma.academicYear.updateMany({ data: { isActive: false } });
        await prisma.academicYear.update({
          where: { id: active2083.id },
          data: { isActive: true },
        });
      }

      // Ensure standard past fiscal / academic years exist for accounting records
      const standardYears = [
        { year: '2083-84', startDateBs: '2083-01-01', endDateBs: '2083-12-30' },
        { year: '2082-83', startDateBs: '2082-01-01', endDateBs: '2082-12-30' },
        { year: '2081-82', startDateBs: '2081-01-01', endDateBs: '2081-12-30' },
        { year: '2080-81', startDateBs: '2080-01-01', endDateBs: '2080-12-30' },
        { year: '2079-80', startDateBs: '2079-01-01', endDateBs: '2079-12-30' },
      ];

      for (const sy of standardYears) {
        const existing = await prisma.academicYear.findFirst({ where: { year: sy.year } });
        if (!existing) {
          await prisma.academicYear.create({
            data: {
              year: sy.year,
              startDateBs: sy.startDateBs,
              endDateBs: sy.endDateBs,
              isActive: sy.year === '2083-84',
            },
          });
        }
      }

      // ── SEED DEDICATED FINANCIAL YEARS (साउन १ – असार ३१/३२) ─────────────────
      const { getFiscalYearFromBS } = require('./routes/financialYears');
      const standardFiscalYears = [
        { year: '2083/84', startDateBs: '2083-04-01', endDateBs: '2084-03-32', isActive: true },
        { year: '2082/83', startDateBs: '2082-04-01', endDateBs: '2083-03-32', isActive: false },
        { year: '2081/82', startDateBs: '2081-04-01', endDateBs: '2082-03-32', isActive: false },
        { year: '2080/81', startDateBs: '2080-04-01', endDateBs: '2081-03-32', isActive: false },
        { year: '2079/80', startDateBs: '2079-04-01', endDateBs: '2080-03-32', isActive: false },
      ];

      for (const sfy of standardFiscalYears) {
        const existingFy = await prisma.financialYear.findFirst({
          where: { year: { in: [sfy.year, sfy.year.replace('/', '-')] } }
        });
        if (!existingFy) {
          await prisma.financialYear.create({
            data: {
              year: sfy.year,
              startDateBs: sfy.startDateBs,
              endDateBs: sfy.endDateBs,
              isActive: sfy.isActive,
            }
          });
        } else {
          // Keep start and end dates accurate
          await prisma.financialYear.update({
            where: { id: existingFy.id },
            data: {
              startDateBs: sfy.startDateBs,
              endDateBs: sfy.endDateBs,
            }
          });
        }
      }

      // Ensure 2083/84 is marked active if no active FY
      const activeFy = await prisma.financialYear.findFirst({ where: { isActive: true } });
      if (!activeFy) {
        const fy2083 = await prisma.financialYear.findFirst({ where: { year: { contains: '2083' } } });
        if (fy2083) {
          await prisma.financialYear.update({ where: { id: fy2083.id }, data: { isActive: true } });
        }
      }

      // Auto-backfill and re-assign all accounting records strictly by BS date
      const allFiscalYears = await prisma.financialYear.findMany();
      const fyMapByYear = new Map();
      allFiscalYears.forEach(fy => {
        fyMapByYear.set(fy.year, fy);
        fyMapByYear.set(fy.year.replace('/', '-'), fy);
      });

      // 1. Backfill Expenses
      const allExpenses = await prisma.expenseEntry.findMany({ select: { id: true, expenseDateBs: true, financialYearId: true } });
      for (const exp of allExpenses) {
        if (exp.expenseDateBs) {
          const derived = getFiscalYearFromBS(exp.expenseDateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => exp.expenseDateBs >= f.startDateBs && exp.expenseDateBs <= f.endDateBs);
          if (targetFy && exp.financialYearId !== targetFy.id) {
            await prisma.expenseEntry.update({
              where: { id: exp.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }

      // 2. Backfill Incomes
      const allIncomes = await prisma.incomeEntry.findMany({ select: { id: true, receivedDateBs: true, financialYearId: true } });
      for (const inc of allIncomes) {
        if (inc.receivedDateBs) {
          const derived = getFiscalYearFromBS(inc.receivedDateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => inc.receivedDateBs >= f.startDateBs && inc.receivedDateBs <= f.endDateBs);
          if (targetFy && inc.financialYearId !== targetFy.id) {
            await prisma.incomeEntry.update({
              where: { id: inc.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }

      // 3. Backfill Fee Collections
      const allFees = await prisma.feeCollection.findMany({ select: { id: true, paidDateBs: true, financialYearId: true } });
      for (const fee of allFees) {
        if (fee.paidDateBs) {
          const derived = getFiscalYearFromBS(fee.paidDateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => fee.paidDateBs >= f.startDateBs && fee.paidDateBs <= f.endDateBs);
          if (targetFy && fee.financialYearId !== targetFy.id) {
            await prisma.feeCollection.update({
              where: { id: fee.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }

      // 4. Backfill Payrolls
      const allPayrolls = await prisma.payroll.findMany({ select: { id: true, monthFrom: true, financialYearId: true } });
      for (const pay of allPayrolls) {
        if (pay.monthFrom) {
          const dateBs = pay.monthFrom.includes('-') && pay.monthFrom.split('-').length === 2 ? `${pay.monthFrom}-15` : pay.monthFrom;
          const derived = getFiscalYearFromBS(dateBs);
          const targetFy = fyMapByYear.get(derived) || allFiscalYears.find(f => dateBs >= f.startDateBs && dateBs <= f.endDateBs);
          if (targetFy && pay.financialYearId !== targetFy.id) {
            await prisma.payroll.update({
              where: { id: pay.id },
              data: { financialYearId: targetFy.id }
            }).catch(() => {});
          }
        }
      }
      console.log('✅ Financial Year auto-backfill completed for all accounting records.');
    } catch (yrErr) {
      console.error('Academic/Financial year verification error:', yrErr.message);
    }

    // FIX C-02: Admin user is only CREATED if it doesn't exist — never overwrite existing password.
    // Password comes from ADMIN_INITIAL_PASSWORD env var — never hardcoded.
    const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!initialAdminPassword || initialAdminPassword === 'CHANGE_THIS_TO_A_STRONG_PASSWORD') {
      console.warn('⚠️  ADMIN_INITIAL_PASSWORD is not set or is still the default placeholder.');
      console.warn('   Set a strong password in your .env file. Skipping admin seed.');
    } else {
      const adminHash = await bcrypt.hash(initialAdminPassword, 12);

      const adminUsername = process.env.INITIAL_ADMIN_USERNAME || 'admin';
      const existingAdmin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!existingAdmin) {
        await prisma.user.create({
          data: { username: adminUsername, passwordHash: adminHash, role: 'SUPER_ADMIN', isActive: true },
        });
        console.log(`✅ Super Admin created: ${adminUsername} (password configured in .env)`);
      } else {
        console.log(`✅ Super Admin account verified: ${adminUsername} (existing password preserved).`);
      }
    }

    // FIX C-03: Synchronize PostgreSQL sequences safely using whitelist validation
    // Table names cannot be SQL parameters ($1), so we validate against a strict whitelist
    // then use them directly. This is safe because only hardcoded names pass validation.
    try {
      const KNOWN_TABLES = [
        'User', 'Teacher', 'Student', 'Class', 'ClassEnrollment', 'Subject', 'ClassSubject',
        'FeeHead', 'FeeCollection', 'IncomeCategory', 'IncomeHead', 'IncomeEntry',
        'ExpenseCategory', 'ExpenseHead', 'ExpenseEntry', 'SalaryScale', 'Payroll',
        'Party', 'BankAccount', 'Attendance', 'Exam', 'ExamResult', 'Notice',
        'Certificate', 'LibraryBook', 'LibraryTransaction', 'InventoryItem',
        'Event', 'Leave', 'StaffTask', 'DailyLog', 'FinancialYear', 'AcademicYear',
        'School', 'PasswordResetRequest', 'Notification', 'Peshki', 'Budget',
        'Routine', 'SeatPlan', 'Letter', 'UserLoginLog', 'SystemAuditLog',
      ];

      const tables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'id'
          AND column_default LIKE 'nextval%';
      `;

      for (const t of tables) {
        // Whitelist check — ONLY process known table names, reject everything else
        if (!KNOWN_TABLES.includes(t.table_name)) continue;
        // At this point t.table_name is guaranteed to be one of our hardcoded strings
        const safeName = t.table_name; // validated above — not user input
        try {
          const maxRes = await prisma.$queryRawUnsafe(
            `SELECT COALESCE(MAX(id), 0) as max_id FROM "${safeName}";`
          );
          const nextVal = Number(maxRes[0]?.max_id || 0) + 1;
          const seqRes = await prisma.$queryRawUnsafe(
            `SELECT pg_get_serial_sequence('"${safeName}"', 'id') as seq;`
          );
          const seqName = seqRes[0]?.seq;
          if (!seqName) continue;
          // nextVal is a JS number (not user input) — safe to interpolate
          await prisma.$queryRawUnsafe(`SELECT setval('${seqName}', ${nextVal}, false);`);
        } catch (_err) {
          // Silently skip tables that don't have a sequence
        }
      }
      console.log('✅ PostgreSQL auto-increment sequences verified & synchronized.');
    } catch (_seqErr) {
      console.warn('⚠️  Sequence sync skipped:', _seqErr.message);
    }


    // Initialize Automatic Daily Backup Scheduler
    const { initBackupScheduler } = require('./lib/backupScheduler');
    initBackupScheduler();
  } catch (err) {
    console.error('⚠️ Auto-seed notice:', err.message);
  }
});

module.exports = app;
