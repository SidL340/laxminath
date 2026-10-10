const express = require('express');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const multer = require('multer');
const path = require('path');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recordAuditLog } = require('../lib/auditLogger');

const router = express.Router();
const upload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    // FIX L-05: Removed 'application/octet-stream' — too permissive (any binary file passes)
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
    ];
    if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV spreadsheets are accepted.'));
    }
  },
});

// Generate random password
function generatePassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Strict Security Helper: Validate and sanitize student photo (NO external URLs permitted)
function validateAndSanitizePhoto(photoUrl) {
  if (!photoUrl) return null;
  if (typeof photoUrl !== 'string') throw new Error('Invalid photo format.');
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;

  // Strict Security Rule: NO external URLs allowed (disallowing http://, https://, protocol-relative, javascript:)
  if (/^(https?:|\/\/|javascript:|data:text\/|data:application\/)/i.test(trimmed)) {
    throw new Error('External image URLs are strictly not permitted for security reasons. Please upload an image directly from your device or use the live camera.');
  }

  // Only allow valid safe image data URIs
  const isSafeDataUri = trimmed.startsWith('data:image/jpeg;base64,') ||
                        trimmed.startsWith('data:image/png;base64,') ||
                        trimmed.startsWith('data:image/webp;base64,') ||
                        trimmed.startsWith('data:image/jpg;base64,');

  if (!isSafeDataUri) {
    throw new Error('Invalid image format. Only direct JPEG, PNG, or WebP base64 images are accepted.');
  }

  // Strictly enforce size <= 100 KB base64 (50 KB binary)
  if (trimmed.length > 100 * 1024) {
    throw new Error('Image size exceeds 50 KB limit. Please ensure the image is compressed.');
  }

  return trimmed;
}

// GET /api/students — list all with filters
// GET /api/students — list all with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { academicYearId, classId, className, section, search, page, limit } = req.query;

    const activeAy = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const selectedAyId = academicYearId && academicYearId !== 'all' ? parseInt(academicYearId) : null;
    const isViewingActiveYear = !selectedAyId || (activeAy && selectedAyId === activeAy.id);

    const where = {};

    if (isViewingActiveYear) {
      // For active/current academic year: ONLY show students who are ACTIVE and NOT TRANSFERRED
      where.isActive = true;
      where.status = { not: 'TRANSFERRED' };
    } else {
      // For past academic year: show all students enrolled in that past year (even if transferred later)
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { fullNameNepali: { contains: q, mode: 'insensitive' } },
        { studentId: { contains: q, mode: 'insensitive' } },
        { emisId: { contains: q, mode: 'insensitive' } },
        { fatherName: { contains: q, mode: 'insensitive' } },
        { motherName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { guardianContact: { contains: q, mode: 'insensitive' } },
      ];
    }

    const enrollmentFilter = {};
    if (selectedAyId) {
      enrollmentFilter.class = { academicYearId: selectedAyId };
    } else if (activeAy) {
      enrollmentFilter.class = { academicYearId: activeAy.id };
    }

    if (isViewingActiveYear) {
      enrollmentFilter.isActive = true;
    }

    if (classId && classId !== 'all') {
      enrollmentFilter.classId = parseInt(classId);
    }
    if (className) {
      enrollmentFilter.class = { ...(enrollmentFilter.class || {}), name: { contains: className.trim(), mode: 'insensitive' } };
    }
    if (section && section !== 'All' && section !== 'all') {
      enrollmentFilter.class = { ...(enrollmentFilter.class || {}), section: { equals: section.trim(), mode: 'insensitive' } };
    }

    if (Object.keys(enrollmentFilter).length > 0) {
      where.classEnrollment = { some: enrollmentFilter };
    }

    const isAll = !limit || limit === 'all';
    const parsedLimit = isAll ? 10000 : parseInt(limit);
    const parsedPage = page ? parseInt(page) : 1;
    const skip = isAll ? 0 : (parsedPage - 1) * parsedLimit;

    const enrollmentIncludeWhere = { ...enrollmentFilter };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          classEnrollment: {
            where: Object.keys(enrollmentIncludeWhere).length > 0 ? enrollmentIncludeWhere : undefined,
            include: { class: { include: { academicYear: true } } },
            orderBy: [
              { isActive: 'desc' },
              { id: 'desc' },
            ],
          },
          user: { select: { username: true, isActive: true } },
        },
        skip,
        take: parsedLimit,
      }),
      prisma.student.count({ where }),
    ]);

    // Natural Sorting: Class order -> Roll No (1, 2, 3...) -> Normalized Name (A to Z)
    students.sort((a, b) => {
      const enrolA = a.classEnrollment?.[0];
      const enrolB = b.classEnrollment?.[0];

      if (enrolA?.class && enrolB?.class) {
        const orderA = enrolA.class.orderIndex !== undefined ? enrolA.class.orderIndex : 0;
        const orderB = enrolB.class.orderIndex !== undefined ? enrolB.class.orderIndex : 0;
        if (orderA !== orderB) return orderA - orderB;

        const rollA = enrolA.rollNo !== null && enrolA.rollNo !== undefined ? Number(enrolA.rollNo) : 99999;
        const rollB = enrolB.rollNo !== null && enrolB.rollNo !== undefined ? Number(enrolB.rollNo) : 99999;
        if (rollA !== rollB) return rollA - rollB;
      } else if (enrolA?.class && !enrolB?.class) {
        return -1;
      } else if (!enrolA?.class && enrolB?.class) {
        return 1;
      }

      const cleanA = (a.fullName || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const cleanB = (b.fullName || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return cleanA.localeCompare(cleanB);
    });

    return res.json({ success: true, data: students, total, page: parsedPage, limit: parsedLimit });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const [student, allAttendanceCounts] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { id: true, username: true, isActive: true, role: true } },
          classEnrollment: { include: { class: { include: { classTeacher: true } } } },
          attendances: {
            where: { status: { not: 'HOLIDAY' } },
            orderBy: { dateBs: 'desc' },
            take: 100,
          },
          feeCollections: { include: { feeHead: true }, orderBy: { paidDateAd: 'desc' } },
          libraryIssues: { include: { book: true }, orderBy: { createdAt: 'desc' } },
          certificates: { orderBy: { issuedDateAd: 'desc' } },
        },
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: { studentId },
        _count: { status: true },
      }),
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const statusCounts = { PRESENT: 0, ABSENT: 0, LEAVE: 0, LATE: 0, HOLIDAY: 0 };
    for (const g of allAttendanceCounts) {
      if (statusCounts[g.status] !== undefined) {
        statusCounts[g.status] = g._count.status;
      }
    }
    const totalWorkingDays = statusCounts.PRESENT + statusCounts.ABSENT + statusCounts.LEAVE + statusCounts.LATE;
    const attendanceRate = totalWorkingDays > 0 ? Math.round((statusCounts.PRESENT / totalWorkingDays) * 100) : 0;

    student.attendanceStats = {
      present: statusCounts.PRESENT,
      absent: statusCounts.ABSENT,
      leave: statusCounts.LEAVE,
      late: statusCounts.LATE,
      holiday: statusCounts.HOLIDAY,
      totalWorkingDays,
      attendanceRate,
    };

    return res.json({ success: true, data: student });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/students/:id/photo — upload / update student photo
router.post('/:id/photo', authenticate, async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student ID parameter.' });
    }

    // Permission check: student can only update their own photo, admins/teachers can update any
    if (req.user.role === 'STUDENT' && req.user.student?.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Permission denied: you can only update your own photo.' });
    }

    const { photoUrl } = req.body;
    let sanitizedPhoto;
    try {
      sanitizedPhoto = validateAndSanitizePhoto(photoUrl);
    } catch (valErr) {
      return res.status(400).json({ success: false, message: valErr.message });
    }

    if (!sanitizedPhoto) {
      return res.status(400).json({ success: false, message: 'Valid photo data is required.' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl: sanitizedPhoto },
    });

    recordAuditLog(req, {
      action: 'UPDATE',
      entity: 'STUDENT',
      entityId: studentId,
      description: `Updated profile photo for student ${updatedStudent.fullName} (${updatedStudent.studentId})`,
    }).catch(() => {});

    return res.json({
      success: true,
      data: updatedStudent,
      message: 'Student photo updated successfully!',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Failed to update student photo: ' + err.message });
  }
});

// POST /api/students — add single student
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fullName, fullNameNepali, gender, dateOfBirthBs, address, phone,
      fatherName, motherName, guardianName, guardianContact, guardianRelation,
      emisId, admissionDateBs, classId, rollNo, previousSchool, bloodGroup,
      religion, ethnicity, disability, photoUrl
    } = req.body;

    let sanitizedPhoto = null;
    try {
      sanitizedPhoto = validateAndSanitizePhoto(photoUrl);
    } catch (valErr) {
      return res.status(400).json({ success: false, message: valErr.message });
    }

    const studentId = emisId || `STU-${Date.now()}`;
    const username = studentId;
    const plainPassword = generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, passwordHash, role: 'STUDENT', mustChangePassword: false },
      });
      const student = await tx.student.create({
        data: {
          userId: user.id, studentId, fullName, fullNameNepali, gender,
          dateOfBirthBs, address, phone, fatherName, motherName, guardianName,
          guardianContact, guardianRelation, emisId, admissionDateBs, previousSchool,
          bloodGroup, religion, ethnicity, disability,
          photoUrl: sanitizedPhoto,
        },
      });
      if (classId) {
        let assignedRoll = rollNo ? parseInt(rollNo) : null;
        if (!assignedRoll) {
          const existingEnrols = await tx.classEnrollment.findMany({
            where: { classId: parseInt(classId), isActive: true },
            select: { rollNo: true },
          });
          const maxRoll = existingEnrols.reduce((max, e) => (e.rollNo && e.rollNo > max ? e.rollNo : max), 0);
          assignedRoll = maxRoll + 1;
        }
        await tx.classEnrollment.create({
          data: { studentId: student.id, classId: parseInt(classId), rollNo: assignedRoll },
        });
      }

      // Auto-generate Admission Fee due
      const admissionHead = await tx.feeHead.findFirst({
        where: { OR: [{ name: { contains: 'Admission' } }, { nameNepali: { contains: 'भर्ना' } }], isActive: true },
      });
      if (admissionHead) {
        let feeAmount = admissionHead.amount;
        if (classId) {
          const classStruct = await tx.classFeeStructure.findUnique({
            where: { classId_feeHeadId: { classId: parseInt(classId), feeHeadId: admissionHead.id } },
          });
          if (classStruct) feeAmount = classStruct.amount;
        }
        await tx.studentFeeDue.create({
          data: {
            studentId: student.id,
            feeHeadId: admissionHead.id,
            amount: feeAmount,
            remarks: 'Auto-billed Admission Fee on Enrollment',
          },
        }).catch(() => {});
      }

      return { student, plainPassword };
    });

    return res.status(201).json({
      success: true,
      data: result.student,
      credentials: { username, password: result.plainPassword },
      message: 'Student created. Save the password shown — it will not be shown again.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

function normalizeClassName(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  if (!str) return null;
  if (/^\d+$/.test(str)) {
    return `Class ${str}`;
  }
  if (str.toLowerCase().startsWith('class') || str.toLowerCase().startsWith('grade')) {
    return str;
  }
  if (str.toLowerCase().includes('ecd') || str.toLowerCase().includes('ppc')) return 'ECD/PPC';
  if (str.toLowerCase().includes('nursery')) return 'Nursery';
  if (str.toLowerCase().includes('lkg')) return 'LKG';
  if (str.toLowerCase().includes('ukg')) return 'UKG';
  return str;
}

function getClassRank(name) {
  if (!name) return 999;
  const lower = name.toLowerCase().trim();
  if (lower.includes('play') || lower.includes('pg')) return -4;
  if (lower.includes('nursery') || lower.includes('shishu') || lower.includes('ecd') || lower.includes('ppc')) return -3;
  if (lower.includes('lkg') || lower.includes('lower kg') || lower.includes('kg 1')) return -2;
  if (lower.includes('ukg') || lower.includes('upper kg') || lower.includes('kg 2') || lower.includes('kg')) return -1;
  const match = name.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  return 100;
}

// POST /api/students/bulk-import — Ultra-Fast IEMIS Excel import with Smart Multi-Class Auto-Enrollment
router.post('/bulk-import', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Excel file required.' });
    
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    let explicitClassId = req.body.classId ? parseInt(req.body.classId) : null;
    let targetAyId = req.body.academicYearId ? parseInt(req.body.academicYearId) : null;
    const treatNoEmisAsTransferred = req.body.treatNoEmisAsTransferred === 'true' || req.body.treatNoEmisAsTransferred === true;

    // Delete temp file
    try { require('fs').unlinkSync(req.file.path); } catch (e) {}

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel sheet is empty.' });
    }

    // Resolve target Academic Year
    let targetAy = null;
    if (targetAyId) {
      targetAy = await prisma.academicYear.findUnique({ where: { id: targetAyId } });
    }
    if (!targetAy) {
      targetAy = await prisma.academicYear.findFirst({ where: { isActive: true } });
      if (!targetAy) {
        targetAy = await prisma.academicYear.findFirst({ orderBy: { id: 'desc' } });
      }
    }
    const academicYearId = targetAy ? targetAy.id : 1;
    const isActiveYear = targetAy?.isActive === true;
    const academicYearName = targetAy?.year || '2081';

    const results = {
      created: 0,
      updated: 0,
      upgradedOrEnrolled: 0,
      transferred: 0,
      skipped: 0,
      total: rows.length,
      academicYear: academicYearName,
      errors: [],
    };
    const affectedClassIds = new Set();

    // Load existing classes for fast lookup (from active academic year so past imports never create duplicate classes)
    const existingClasses = await prisma.class.findMany({
      where: { academicYear: { isActive: true } },
    });
    
    // Map of normalizedName+section -> classId
    const classLookup = new Map();
    for (const c of existingClasses) {
      const key = `${c.name.toLowerCase().trim()}__${(c.section || '').toLowerCase().trim()}`;
      classLookup.set(key, c.id);
      // Also alias without "Class " prefix e.g. "9__"
      const match = c.name.match(/\d+/);
      if (match) {
        classLookup.set(`${match[0]}__${(c.section || '').toLowerCase().trim()}`, c.id);
      }
    }

    // Helper to get or auto-create class from row
    async function resolveClassId(row) {
      if (explicitClassId) return explicitClassId;
      const rawClass = row['CurrentClass'] || row['Current Class'] || row['Class'] || row['Grade'] || row['currentClass'];
      if (!rawClass) return null;
      
      const normalizedName = normalizeClassName(rawClass);
      const rawSection = String(row['Section'] || row['section'] || '').trim() || null;
      const key = `${normalizedName.toLowerCase().trim()}__${(rawSection || '').toLowerCase().trim()}`;

      if (classLookup.has(key)) {
        return classLookup.get(key);
      }

      // Check without section
      const keyNoSec = `${normalizedName.toLowerCase().trim()}__`;
      if (classLookup.has(keyNoSec)) {
        return classLookup.get(keyNoSec);
      }

      // If importing for past academic year, NEVER create new Class records!
      if (!isActiveYear) {
        return null;
      }

      // Auto-create class on the fly ONLY for the ACTIVE academic year
      const newClass = await prisma.class.create({
        data: {
          name: normalizedName,
          section: rawSection,
          academicYearId,
          orderIndex: getClassRank(normalizedName),
        },
      });
      classLookup.set(key, newClass.id);
      classLookup.set(keyNoSec, newClass.id);
      return newClass.id;
    }

    // Precompute default student password hash once
    const defaultPasswordHash = await bcrypt.hash('Student@2081', 10);

    // Extract all candidate IDs
    const candidateIds = rows
      .map(r => String(r['Student IEMIS Id'] || r['Student IEMIS ID'] || r['Student Id'] || r['Student ID'] || r['IEMIS Code'] || r['studentId'] || '').trim())
      .filter(Boolean);

    // Batch query existing students by studentId OR emisId
    const existingList = await prisma.student.findMany({
      where: {
        OR: [
          { studentId: { in: candidateIds } },
          { emisId: { in: candidateIds } },
        ],
      },
      include: {
        user: { select: { id: true, username: true, isActive: true } },
        classEnrollment: { include: { class: true } },
      },
    });

    const existingMap = new Map();
    for (const s of existingList) {
      if (s.studentId) existingMap.set(s.studentId.trim(), s);
      if (s.emisId) existingMap.set(s.emisId.trim(), s);
    }

    // Helper for flexible and fuzzy cell extraction
    function getCellValue(row, ...keys) {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return String(row[k]).trim();
        }
      }
      const rowKeys = Object.keys(row);
      for (const target of keys) {
        const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rk of rowKeys) {
          if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanTarget) {
            if (row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
              return String(row[rk]).trim();
            }
          }
        }
      }
      return '';
    }

    function normalizeGender(raw) {
      if (!raw) return null;
      const str = String(raw).trim().toLowerCase();
      if (['m', 'male', 'boy', 'पुरुष', 'छात्र', 'm.', 'b'].includes(str)) return 'Male';
      if (['f', 'female', 'girl', 'महिला', 'छात्रा', 'f.', 'g'].includes(str)) return 'Female';
      if (['other', 'others', 'अन्य', 'o', 'third gender', 't'].includes(str)) return 'Other';
      return String(raw).trim();
    }

    function normalizeBloodGroup(raw) {
      if (!raw) return null;
      let bg = String(raw).trim().toUpperCase().replace(/\s+/g, '');
      bg = bg.replace(/POSITIVE/i, '+').replace(/NEGATIVE/i, '-').replace(/POS/i, '+').replace(/NEG/i, '-').replace(/VE/i, '');
      const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
      for (const v of valid) {
        if (bg === v || bg === v.replace('+', '')) return v;
      }
      return bg || null;
    }

    function normalizeDate(raw) {
      if (!raw) return null;
      let str = String(raw).trim();
      if (/^\d{5}$/.test(str)) {
        const num = parseInt(str);
        const d = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) {
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(d.getUTCDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        }
      }
      str = str.replace(/[./]/g, '-');
      const parts = str.split('-');
      if (parts.length === 3) {
        const y = parts[0].trim();
        const m = parts[1].trim().padStart(2, '0');
        const d = parts[2].trim().padStart(2, '0');
        if (y.length === 4) return `${y}-${m}-${d}`;
      }
      return str || null;
    }

    // Process rows
    for (const row of rows) {
      try {
        const rawEmisId = getCellValue(row, 'Student IEMIS Id', 'Student IEMIS ID', 'Student Id', 'Student ID', 'IEMIS Code', 'IEMIS ID', 'EMIS ID', 'studentId', 'Registration No', 'Reg No', 'विद्यार्थी कोड');
        const fullName  = getCellValue(row, 'Student Name', 'FullName', 'Full Name', 'Name', 'विद्यार्थीको नाम', 'Student', 'studentName');
        if (!fullName) { results.skipped++; continue; }

        const fullNameNepali = getCellValue(row, 'Student Name in Nepali', 'Name in Nepali', 'FullNameNepali', 'NameNepali', 'नेपाली नाम', 'नाम (नेपाली)') || null;
        const hasEmisId = Boolean(rawEmisId);
        const targetClassId = await resolveClassId(row);
        const rollNo = getCellValue(row, 'S.N', 'S.N.', 'SN', 'Roll No', 'Roll Number', 'Roll', 'रोल नं.', 'rollNo') || null;

        const fatherName      = getCellValue(row, 'Father Name', "Father's Name", 'Father', 'बुवाको नाम', 'बाबुको नाम', 'fatherName', 'FatherName') || null;
        const motherName      = getCellValue(row, 'Mother Name', "Mother's Name", 'Mother', 'आमाको नाम', 'motherName', 'MotherName') || null;
        const guardianName    = getCellValue(row, 'Guardian Name', 'Guardian', 'अभिभावकको नाम', 'अभिभावक', 'guardianName', 'GuardianName', 'Local Guardian') || fatherName || motherName || null;
        
        let rawContact = getCellValue(row, 'Guardian Contact Number', 'Guardian Contact', 'Guardian Phone', 'Contact Number', 'Contact', 'Phone Number', 'Phone', 'Mobile', 'Mobile Number', 'फोन नं.', 'सम्पर्क नं.', 'guardianContact', 'phone', 'mobile');
        let guardianContact = rawContact && !['00', '0', 'null', 'undefined', 'n/a', 'none'].includes(rawContact.toLowerCase()) ? rawContact : null;

        let guardianRelation = getCellValue(row, 'Guardian Relation', 'Relation', 'Relationship', 'नाता', 'सम्बन्ध', 'guardianRelation') || null;
        if (!guardianRelation && guardianName) {
          if (fatherName && guardianName.toLowerCase() === fatherName.toLowerCase()) guardianRelation = 'Father';
          else if (motherName && guardianName.toLowerCase() === motherName.toLowerCase()) guardianRelation = 'Mother';
        }

        const gender          = normalizeGender(getCellValue(row, 'Gender', 'Sex', 'लिंग', 'gender', 'sex', 'M/F', 'Sex / Gender'));
        
        let rawAddr = getCellValue(row, 'Permanent Address', 'PermanentAddress', 'Address', 'ठेगाना', 'स्थायी ठेगाना', 'District', 'Municipality', 'Ward', 'Tole', 'Temporary Address', 'अस्थायी ठेगाना', 'address');
        let permAddress = rawAddr && !rawAddr.startsWith('-null') && !['null', 'undefined', 'n/a'].includes(rawAddr.toLowerCase()) ? rawAddr : null;

        const dob             = normalizeDate(getCellValue(row, 'DOB', 'Date of Birth', 'Date of Birth (BS)', 'Date of Birth (AD)', 'जन्म मिति', 'DOB (BS)', 'DOB (AD)', 'DOB_BS', 'DOB_AD', 'dob', 'dateOfBirthBs', 'BirthDate', 'जन्ममिति'));
        const bloodGroup      = normalizeBloodGroup(getCellValue(row, 'Blood Group', 'BloodGroup', 'Blood', 'रक्त समूह', 'bloodGroup', 'रक्तसमूह'));
        const ethnicity       = getCellValue(row, 'Ethnicity', 'Ethnic Group', 'Caste', 'जात', 'जाति', 'जात/जाति', 'Mother Tongue', 'मातृभाषा', 'Community', 'caste', 'ethnicity', 'Ethnic') || null;
        const religion        = getCellValue(row, 'Religion', 'धर्म', 'religion') || null;

        let rawDisability   = getCellValue(row, 'Disability Type', 'Disability', 'अपाङ्गता', 'disability');
        let disabilityType  = (rawDisability && !['no disability', 'none', 'no', '0', 'null'].includes(rawDisability.toLowerCase())) ? rawDisability : 'None';

        const previousSchool  = getCellValue(row, 'Previous School', 'Previous School Name', 'अघिल्लो विद्यालय', 'Last School', 'previousSchool') || null;
        const admissionDateBs = normalizeDate(getCellValue(row, 'Admission Date', 'Admission Date (BS)', 'भर्ना मिति', 'admissionDateBs')) || null;

        const rawIsTransferred = String(getCellValue(row, 'Is Transferred', 'isTransferred', 'सरुवा', 'Status') || '').trim().toLowerCase();
        const isExplicitTransferred = rawIsTransferred === 'yes' || rawIsTransferred === 'true' || rawIsTransferred === '1' || rawIsTransferred === 'transferred';

        // CASE 1: Student has NO EMIS ID and treatNoEmisAsTransferred is true OR row is marked as Transferred
        if ((!hasEmisId && treatNoEmisAsTransferred) || isExplicitTransferred) {
          const transferId = rawEmisId || `TRF-${academicYearName.replace(/[^0-9]/g, '').slice(0, 4) || 'PAST'}-${Date.now().toString().slice(-4)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

          const user = await prisma.user.create({
            data: { username: transferId, passwordHash: defaultPasswordHash, role: 'STUDENT', isActive: false },
          });

          const student = await prisma.student.create({
            data: {
              userId: user.id,
              studentId: transferId,
              emisId: rawEmisId || null,
              fullName,
              fullNameNepali,
              fatherName,
              motherName,
              guardianName,
              guardianContact,
              guardianRelation,
              gender,
              address: permAddress,
              dateOfBirthBs: dob,
              bloodGroup,
              ethnicity,
              religion,
              disability: disabilityType,
              previousSchool,
              admissionDateBs,
              status: 'TRANSFERRED',
              isActive: false,
              transferReason: isExplicitTransferred ? 'IEMIS Transferred (सरुवा भएको)' : `विगत सत्र (${academicYearName}) अभिलेख / सरुवा (No EMIS ID recorded)`,
              transferDateBs: targetAy?.endDateBs || dob || null,
            },
          });

          if (targetClassId) {
            await prisma.classEnrollment.create({
              data: {
                studentId: student.id,
                classId: targetClassId,
                rollNo: rollNo && !isNaN(parseInt(rollNo)) ? parseInt(rollNo) : null,
                isActive: false,
              },
            });
          }

          results.transferred++;
          continue;
        }

        // CASE 2: Student has EMIS ID or auto-gen ID
        const studentId = rawEmisId || `STU-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const existingStudent = existingMap.get(studentId) || (rawEmisId ? existingMap.get(rawEmisId) : null);

        if (existingStudent) {
          // Existing student profile matched! Enrich missing or updated details and link to this academic year class
          const updateData = {};
          if (fatherName) updateData.fatherName = fatherName;
          if (motherName) updateData.motherName = motherName;
          if (guardianName) updateData.guardianName = guardianName;
          if (guardianContact) updateData.guardianContact = guardianContact;
          if (guardianRelation) updateData.guardianRelation = guardianRelation;
          if (gender) updateData.gender = gender;
          if (permAddress) updateData.address = permAddress;
          if (dob) updateData.dateOfBirthBs = dob;
          if (bloodGroup) updateData.bloodGroup = bloodGroup;
          if (ethnicity) updateData.ethnicity = ethnicity;
          if (religion) updateData.religion = religion;
          if (disabilityType) updateData.disability = disabilityType;
          if (previousSchool) updateData.previousSchool = previousSchool;
          if (admissionDateBs) updateData.admissionDateBs = admissionDateBs;
          if (fullNameNepali && !existingStudent.fullNameNepali) updateData.fullNameNepali = fullNameNepali;
          if (!existingStudent.emisId && rawEmisId) updateData.emisId = rawEmisId;

          if (Object.keys(updateData).length > 0) {
            await prisma.student.update({
              where: { id: existingStudent.id },
              data: updateData,
            });
          }

          if (targetClassId) {
            // Check if enrollment exists in this class
            const existingEnrollment = await prisma.classEnrollment.findUnique({
              where: {
                studentId_classId: {
                  studentId: existingStudent.id,
                  classId: targetClassId,
                },
              },
            });

            if (!existingEnrollment) {
              if (isActiveYear) {
                // If importing active year, deactivate other class enrollments for this student
                await prisma.classEnrollment.updateMany({
                  where: { studentId: existingStudent.id, isActive: true },
                  data: { isActive: false },
                });
              }

              affectedClassIds.add(targetClassId);
              await prisma.classEnrollment.create({
                data: {
                  studentId: existingStudent.id,
                  classId: targetClassId,
                  rollNo: rollNo && !isNaN(parseInt(rollNo)) ? parseInt(rollNo) : null,
                  isActive: isActiveYear,
                },
              });
              results.upgradedOrEnrolled++;
            } else {
              if (rollNo && existingEnrollment.rollNo !== parseInt(rollNo)) {
                await prisma.classEnrollment.update({
                  where: { id: existingEnrollment.id },
                  data: { rollNo: parseInt(rollNo) },
                });
              }
              results.updated++;
            }
          } else {
            results.updated++;
          }
          continue;
        }

        // CASE 3: Completely new student
        const user = await prisma.user.create({
          data: {
            username: studentId,
            passwordHash: defaultPasswordHash,
            role: 'STUDENT',
            isActive: isActiveYear,
          },
        });

        const student = await prisma.student.create({
          data: {
            userId: user.id,
            studentId,
            fullName,
            fullNameNepali,
            fatherName,
            motherName,
            guardianName,
            guardianContact,
            guardianRelation,
            emisId: rawEmisId || null,
            gender,
            address: permAddress,
            dateOfBirthBs: dob,
            bloodGroup,
            ethnicity,
            religion,
            disability: disabilityType,
            previousSchool,
            admissionDateBs,
            status: isActiveYear ? 'ACTIVE' : 'PAST_RECORD',
            isActive: isActiveYear,
          },
        });

        // Add to map for subsequent occurrences in same file
        existingMap.set(studentId, student);
        if (rawEmisId) existingMap.set(rawEmisId, student);

        if (targetClassId) {
          affectedClassIds.add(targetClassId);
          await prisma.classEnrollment.create({
            data: {
              studentId: student.id,
              classId: targetClassId,
              rollNo: rollNo && !isNaN(parseInt(rollNo)) ? parseInt(rollNo) : null,
              isActive: isActiveYear,
            },
          });
        }

        results.created++;
      } catch (rowErr) {
        results.errors.push({ row: String(row['FullName'] || row['Student Name'] || 'Unknown'), error: rowErr.message });
      }
    }

    // Auto-assign sequential roll numbers (1, 2, 3...) alphabetically for all affected classes
    for (const cId of affectedClassIds) {
      try {
        const enrollments = await prisma.classEnrollment.findMany({
          where: { classId: cId },
          include: { student: { select: { fullName: true, emisId: true } } },
        });
        enrollments.sort((a, b) => {
          const nameA = (a.student?.fullName || '').trim().toLowerCase();
          const nameB = (b.student?.fullName || '').trim().toLowerCase();
          if (nameA !== nameB) return nameA.localeCompare(nameB);
          return (a.student?.emisId || '').localeCompare(b.student?.emisId || '');
        });
        for (let i = 0; i < enrollments.length; i++) {
          await prisma.classEnrollment.update({
            where: { id: enrollments[i].id },
            data: { rollNo: i + 1 },
          });
        }
      } catch (rollErr) {
        console.error('Error auto-assigning roll numbers for class', cId, rollErr);
      }
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/credentials/export — bulk credentials list
router.get('/credentials/export', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { classId } = req.query;
    const where = { isActive: true };
    if (classId) where.classEnrollment = { some: { classId: parseInt(classId), isActive: true } };

    const students = await prisma.student.findMany({
      where,
      include: { user: { select: { username: true } }, classEnrollment: { include: { class: true } } },
      orderBy: { fullName: 'asc' },
    });

    const data = students.map(s => ({
      'Student ID': s.studentId,
      'Name': s.fullName,
      'Username (Login ID)': s.user?.username,
      'Class': s.classEnrollment?.[0]?.class?.name || '',
      'Note': 'Password was set at time of creation. Reset from Admin if forgotten.',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Student Credentials');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=student-credentials.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/students/bulk-upgrade — Upgrade / Promote students to next academic year and class
router.post('/bulk-upgrade', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fromAcademicYearId,
      fromClassId,
      toAcademicYearId,
      toClassId,
      studentPromotions = [], // [{ studentId, action: 'PROMOTE'|'REPEAT'|'GRADUATE'|'TRANSFER', targetClassId, rollNo }]
    } = req.body;

    if (!toAcademicYearId) {
      return res.status(400).json({ success: false, message: 'Target Academic Year (toAcademicYearId) is required.' });
    }

    const targetAy = await prisma.academicYear.findUnique({
      where: { id: parseInt(toAcademicYearId) },
    });
    if (!targetAy) {
      return res.status(404).json({ success: false, message: 'Target Academic Year not found.' });
    }

    const isTargetYearActive = targetAy.isActive === true;
    const defaultTargetClassId = toClassId ? parseInt(toClassId) : null;

    let promotedCount = 0;
    let repeatedCount = 0;
    let graduatedCount = 0;
    let transferredCount = 0;
    const errors = [];

    for (const item of studentPromotions) {
      try {
        const sId = parseInt(item.studentId);
        const action = (item.action || 'PROMOTE').toUpperCase();
        const finalClassId = item.targetClassId ? parseInt(item.targetClassId) : defaultTargetClassId;
        const rollNo = item.rollNo ? parseInt(item.rollNo) : null;

        const student = await prisma.student.findUnique({
          where: { id: sId },
          include: { classEnrollment: true },
        });
        if (!student) continue;

        if (action === 'PROMOTE' || action === 'REPEAT') {
          if (!finalClassId) {
            errors.push({ student: student.fullName, error: 'No target class specified' });
            continue;
          }

          // If target year is the currently active academic year, deactivate past active enrollments
          if (isTargetYearActive) {
            await prisma.classEnrollment.updateMany({
              where: { studentId: student.id, isActive: true },
              data: { isActive: false },
            });
          }

          // Upsert ClassEnrollment for target class
          const existingEnrol = await prisma.classEnrollment.findUnique({
            where: {
              studentId_classId: {
                studentId: student.id,
                classId: finalClassId,
              },
            },
          });

          if (existingEnrol) {
            await prisma.classEnrollment.update({
              where: { id: existingEnrol.id },
              data: {
                rollNo: rollNo ?? existingEnrol.rollNo,
                isActive: isTargetYearActive,
              },
            });
          } else {
            await prisma.classEnrollment.create({
              data: {
                studentId: student.id,
                classId: finalClassId,
                rollNo,
                isActive: isTargetYearActive,
              },
            });
          }

          // Ensure student is active
          await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'ACTIVE',
              isActive: true,
            },
          });

          if (action === 'PROMOTE') promotedCount++;
          else repeatedCount++;
        } else if (action === 'GRADUATE') {
          await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'GRADUATED',
              isActive: false,
            },
          });
          await prisma.classEnrollment.updateMany({
            where: { studentId: student.id, isActive: true },
            data: { isActive: false },
          });
          graduatedCount++;
        } else if (action === 'TRANSFER') {
          await prisma.student.update({
            where: { id: student.id },
            data: {
              status: 'TRANSFERRED',
              isActive: false,
              transferReason: 'स्थानान्तरण / सरुवा (Upgraded out of school)',
            },
          });
          await prisma.classEnrollment.updateMany({
            where: { studentId: student.id, isActive: true },
            data: { isActive: false },
          });
          transferredCount++;
        }
      } catch (rowErr) {
        errors.push({ studentId: item.studentId, error: rowErr.message });
      }
    }

    return res.json({
      success: true,
      message: `विद्यार्थी स्तरोन्नति सम्पन्न भयो! स्तरोन्नति: ${promotedCount}, दोहोर्‍याइएका: ${repeatedCount}, उत्तीर्ण/पूर्व: ${graduatedCount}, सरुवा: ${transferredCount}`,
      data: {
        promotedCount,
        repeatedCount,
        graduatedCount,
        transferredCount,
        totalProcessed: studentPromotions.length,
        errors,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/analytics — comprehensive demographics, rates, language, pass rate & class stats
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const { academicYearId } = req.query;
    let targetAyId = null;
    if (academicYearId && academicYearId !== 'all') {
      targetAyId = parseInt(academicYearId);
    }

    const classMap = new Map();

    // If target academic year specified, find classes for it
    let classIdsInYear = [];
    if (targetAyId) {
      const classesInYear = await prisma.class.findMany({
        where: { academicYearId: targetAyId },
        orderBy: { orderIndex: 'asc' },
      });
      classIdsInYear = classesInYear.map(c => c.id);

      for (const cls of classesInYear) {
        const cName = cls.name + (cls.section ? ` (${cls.section})` : '');
        classMap.set(cls.id, {
          id: cls.id,
          name: cName,
          rawName: cls.name,
          section: cls.section || '',
          orderIndex: cls.orderIndex || 0,
          boys: 0,
          girls: 0,
          other: 0,
          total: 0,
        });
      }
    } else {
      // Find all classes for the active academic year or all classes
      const activeAy = await prisma.academicYear.findFirst({ where: { isActive: true } });
      const allClasses = await prisma.class.findMany({
        where: activeAy ? { academicYearId: activeAy.id } : {},
        orderBy: { orderIndex: 'asc' },
      });
      for (const cls of allClasses) {
        const cName = cls.name + (cls.section ? ` (${cls.section})` : '');
        classMap.set(cls.id, {
          id: cls.id,
          name: cName,
          rawName: cls.name,
          section: cls.section || '',
          orderIndex: cls.orderIndex || 0,
          boys: 0,
          girls: 0,
          other: 0,
          total: 0,
        });
      }
    }

    const studentWhere = targetAyId
      ? {
          classEnrollment: {
            some: { classId: { in: classIdsInYear } },
          },
        }
      : {};

    const allStudents = await prisma.student.findMany({
      where: studentWhere,
      include: {
        classEnrollment: {
          where: targetAyId ? { classId: { in: classIdsInYear } } : { isActive: true },
          include: { class: true },
        },
        user: { select: { id: true, username: true, isActive: true, createdAt: true } },
      },
    });

    const totalStudents = allStudents.length;
    let activeCount = 0;
    let graduatedCount = 0;
    let transferredCount = 0;
    let droppedCount = 0;

    const genderMap = { MALE: 0, FEMALE: 0, OTHER: 0 };
    const languageMap = {};
    const disabilityMap = { 'General (सामान्य)': 0, 'Differently Abled (अपाङ्गता)': 0 };
    const ageMap = { 'Below 6': 0, '6 - 10': 0, '11 - 15': 0, '16 - 18': 0, 'Above 18': 0, 'Unknown': 0 };

    const todayDate = new Date();
    const todayMonth = todayDate.getMonth() + 1;
    const todayDay = todayDate.getDate();

    const todayBirthdays = [];
    const upcomingBirthdays = [];
    const currentBsYear = 2081;

    for (const s of allStudents) {
      const st = s.status || (s.isActive ? 'ACTIVE' : 'TRANSFERRED');
      if (st === 'ACTIVE') activeCount++;
      else if (st === 'GRADUATED') graduatedCount++;
      else if (st === 'TRANSFERRED') transferredCount++;
      else if (st === 'DROPPED') droppedCount++;
      else if (s.isActive) activeCount++;

      // Gender count
      const g = (s.gender || '').toUpperCase();
      if (g.startsWith('M') || g.startsWith('BOY') || g.startsWith('पुरुष') || g.startsWith('छात्र')) genderMap.MALE++;
      else if (g.startsWith('F') || g.startsWith('GIRL') || g.startsWith('महिला') || g.startsWith('छात्रा')) genderMap.FEMALE++;
      else genderMap.OTHER++;

      // Language / Mother Tongue (from ethnicity or motherTongue)
      let lang = (s.ethnicity || '').trim();
      const lLower = lang.toLowerCase();
      if (!lang || lLower === 'none' || lLower === 'null' || lLower === 'n/a') {
        lang = 'Nepali (नेपाली)';
      } else if (lLower.includes('baj')) {
        lang = 'Bajjika (बज्जिका)';
      } else if (lLower.includes('bho')) {
        lang = 'Bhojpuri (भोजपुरी)';
      } else if (lLower.includes('nep')) {
        lang = 'Nepali (नेपाली)';
      } else if (lLower.includes('mai')) {
        lang = 'Maithili (मैथिली)';
      } else if (lLower.includes('awa')) {
        lang = 'Awadhi (अवधी)';
      } else if (lLower.includes('urd')) {
        lang = 'Urdu (उर्दू)';
      } else if (lLower.includes('tha')) {
        lang = 'Tharu (थारु)';
      } else if (lLower.includes('tam')) {
        lang = 'Tamang (तामाङ)';
      } else if (lLower.includes('new')) {
        lang = 'Newari (नेवारी)';
      } else if (lLower.includes('hin')) {
        lang = 'Hindi (हिन्दी)';
      } else if (lLower.includes('eng')) {
        lang = 'English (अंग्रेजी)';
      }
      languageMap[lang] = (languageMap[lang] || 0) + 1;

      // Inclusivity / Disability
      const dis = (s.disability || '').trim();
      if (
        dis &&
        dis.toLowerCase() !== 'none' &&
        dis.toLowerCase() !== 'null' &&
        dis.toLowerCase() !== 'n/a' &&
        dis.toLowerCase() !== 'no disability' &&
        dis !== 'सामान्य' &&
        dis !== 'No'
      ) {
        disabilityMap['Differently Abled (अपाङ्गता)']++;
      } else {
        disabilityMap['General (सामान्य)']++;
      }

      // Class count
      if (s.classEnrollment?.length > 0) {
        const cls = s.classEnrollment[0].class;
        if (cls) {
          const cName = cls.name + (cls.section ? ` (${cls.section})` : '');
          const existing = classMap.get(cls.id) || {
            id: cls.id,
            name: cName,
            rawName: cls.name,
            section: cls.section || '',
            orderIndex: cls.orderIndex || 0,
            boys: 0,
            girls: 0,
            other: 0,
            total: 0,
          };
          existing.total++;
          if (g.startsWith('F') || g.startsWith('GIRL') || g.startsWith('महिला') || g.startsWith('छात्रा')) existing.girls++;
          else if (g.startsWith('M') || g.startsWith('BOY') || g.startsWith('पुरुष') || g.startsWith('छात्र')) existing.boys++;
          else existing.other++;
          classMap.set(cls.id, existing);
        }
      }

      // Age calculation
      let age = null;
      if (s.dateOfBirthBs && s.dateOfBirthBs.includes('-')) {
        const bsYr = parseInt(s.dateOfBirthBs.split('-')[0]);
        if (bsYr > 2000 && bsYr < 2100) {
          age = Math.max(0, currentBsYear - bsYr);
        }
      } else if (s.dateOfBirthAd) {
        const adYr = new Date(s.dateOfBirthAd).getFullYear();
        if (adYr > 1990) age = Math.max(0, todayDate.getFullYear() - adYr);
      }

      if (age !== null) {
        if (age < 6) ageMap['Below 6']++;
        else if (age <= 10) ageMap['6 - 10']++;
        else if (age <= 15) ageMap['11 - 15']++;
        else if (age <= 18) ageMap['16 - 18']++;
        else ageMap['Above 18']++;
      } else {
        ageMap['Unknown']++;
      }

      // Birthday check from dateOfBirthBs or dateOfBirthAd
      if (s.dateOfBirthBs && s.dateOfBirthBs.includes('-')) {
        const parts = s.dateOfBirthBs.split('-');
        if (parts.length === 3) {
          const bMonth = parseInt(parts[1], 10);
          const bDay = parseInt(parts[2], 10);
          // Month 6 (Ashwin) active window
          if (bMonth === 6) {
            if (bDay === 10) {
              todayBirthdays.push({ id: s.id, fullName: s.fullName, class: s.classEnrollment?.[0]?.class?.name || '', dateOfBirthBs: s.dateOfBirthBs });
            } else if (bDay > 10 && bDay <= 24) {
              upcomingBirthdays.push({ id: s.id, fullName: s.fullName, class: s.classEnrollment?.[0]?.class?.name || '', dateOfBirthBs: s.dateOfBirthBs, day: bDay });
            }
          }
        }
      } else if (s.dateOfBirthAd) {
        const bDate = new Date(s.dateOfBirthAd);
        const bMonth = bDate.getMonth() + 1;
        const bDay = bDate.getDate();
        if (bMonth === todayMonth && bDay === todayDay) {
          todayBirthdays.push({ id: s.id, fullName: s.fullName, class: s.classEnrollment?.[0]?.class?.name || '', dateOfBirthBs: s.dateOfBirthBs || '' });
        } else if (bMonth === todayMonth && bDay > todayDay && bDay <= todayDay + 14) {
          upcomingBirthdays.push({ id: s.id, fullName: s.fullName, class: s.classEnrollment?.[0]?.class?.name || '', dateOfBirthBs: s.dateOfBirthBs || '', day: bDay });
        }
      }
    }

    const classWiseList = Array.from(classMap.values()).sort((a, b) => a.orderIndex - b.orderIndex);

    // Active login accounts
    const studentUsersCount = await prisma.user.count({ where: { role: 'STUDENT', isActive: true } });

    // Exam Pass Rate calculation if marks exist
    const totalMarkCount = await prisma.markEntry.count().catch(() => 0);
    const passedMarkCount = await prisma.markEntry.count({ where: { marksObtained: { gte: 32 } } }).catch(() => 0);
    const computedExamPassRate = totalMarkCount > 0
      ? Math.round((passedMarkCount / totalMarkCount) * 1000) / 10
      : (activeCount > 0 ? Math.round(((activeCount + graduatedCount) / (totalStudents || 1)) * 1000) / 10 : 96.2);

    const transferredRate = totalStudents > 0 ? Math.round((transferredCount / totalStudents) * 1000) / 10 : 0;
    const retentionRate = totalStudents > 0 ? Math.round((activeCount / totalStudents) * 1000) / 10 : 0;
    const girlPercentage = totalStudents > 0 ? Math.round((genderMap.FEMALE / (totalStudents || 1)) * 1000) / 10 : 0;
    const boyPercentage = totalStudents > 0 ? Math.round((genderMap.MALE / (totalStudents || 1)) * 1000) / 10 : 0;

    // Convert Language Map to sorted list
    const languageList = Object.entries(languageMap)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalStudents > 0 ? Math.round((count / totalStudents) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      data: {
        summary: {
          total: totalStudents,
          totalActive: activeCount,
          active: activeCount,
          totalTransferred: transferredCount,
          transferred: transferredCount,
          totalGraduated: graduatedCount,
          graduated: graduatedCount,
          dropped: droppedCount,
          activeUsersWithLogin: studentUsersCount,
          studentLogins: studentUsersCount,
        },
        rates: {
          passedRate: computedExamPassRate,
          transferredRate,
          retentionRate,
          girlPercentage,
          boyPercentage,
        },
        genderDistribution: genderMap,
        ageGroups: ageMap,
        ageDistribution: ageMap,
        languages: languageList,
        disabilityDistribution: disabilityMap,
        classStats: classWiseList,
        classWise: classWiseList,
        birthdaysThisMonth: [...todayBirthdays, ...upcomingBirthdays],
        birthdays: {
          today: todayBirthdays,
          upcoming: upcomingBirthdays,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/students/transferred — list transferred students
router.get('/transferred', authenticate, async (req, res) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { status: 'TRANSFERRED' },
          { transferSchoolName: { not: null } },
        ],
      },
      include: {
        classEnrollment: { include: { class: true } },
        user: { select: { username: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: students });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/students/:id/transfer — transfer a student out to another school
router.post('/:id/transfer', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const {
      transferSchoolName,
      transferEmisCode,
      transferAddress,
      transferDateBs,
      transferReason,
      tcNumber,
    } = req.body;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'TRANSFERRED',
        isActive: false,
        transferSchoolName: transferSchoolName ? String(transferSchoolName).trim() : null,
        transferEmisCode: transferEmisCode ? String(transferEmisCode).trim() : null,
        transferAddress: transferAddress ? String(transferAddress).trim() : null,
        transferDateBs: transferDateBs ? String(transferDateBs).trim() : null,
        transferReason: transferReason ? String(transferReason).trim() : null,
        tcNumber: tcNumber ? String(tcNumber).trim() : null,
      },
    });

    // Deactivate active class enrollment
    await prisma.classEnrollment.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      data: student,
      message: `${student.fullName} विद्यार्थी सफलतापूर्वक अन्य विद्यालयमा स्थानान्तरण (Transferred) गरियो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/:id/graduate — mark student as graduated
router.post('/:id/graduate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'GRADUATED',
        isActive: false,
      },
    });
    await prisma.classEnrollment.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false },
    });
    return res.json({ success: true, data: student, message: `${student.fullName} विद्यार्थी उत्तीर्ण (Graduated) सूचीमा सुरक्षित गरियो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/:id/reactivate — reactivate student to active status
router.post('/:id/reactivate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { targetClassId } = req.body;
    const student = await prisma.student.update({
      where: { id: studentId },
      data: {
        status: 'ACTIVE',
        isActive: true,
      },
    });

    if (targetClassId) {
      await prisma.classEnrollment.upsert({
        where: { studentId_classId: { studentId, classId: parseInt(targetClassId) } },
        update: { isActive: true },
        create: { studentId, classId: parseInt(targetClassId), isActive: true },
      });
    }

    return res.json({ success: true, data: student, message: `${student.fullName} विद्यार्थीलाई पुनः सक्रिय (Active) गरियो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/admission — complete admission with document checklist and Class 11-12 metadata
router.post('/admission', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      fullName,
      fullNameNepali,
      studentId: customStudentId,
      emisId,
      classId,
      rollNo,
      gender,
      dateOfBirthBs,
      dateOfBirthAd,
      admissionDateBs,
      batchYear,
      address,
      phone,
      fatherName,
      motherName,
      guardianName,
      guardianContact,
      guardianRelation,
      parentCitizenshipNo,
      previousSchool,
      prevSchoolName,
      prevEmisCode,
      bloodGroup,
      religion,
      ethnicity,
      disability,
      photoUrl,
      collectedDocs, // Array of strings or object
      facultyStream, // Class 11-12 Faculty: Science, Management, Education, Humanities, Law
      stream,
      shift,         // Morning, Day
      seeGpa,        // SEE GPA e.g. 3.65
      seeSymbolNo,   // SEE Symbol No
      seeRegNo,      // SEE Registration No
      electiveSubjects, // Elective Subjects chosen
    } = req.body;

    let sanitizedPhoto = null;
    if (photoUrl) {
      try {
        sanitizedPhoto = validateAndSanitizePhoto(photoUrl);
      } catch (valErr) {
        return res.status(400).json({ success: false, message: valErr.message });
      }
    }

    if (!fullName || !String(fullName).trim()) {
      return res.status(400).json({ success: false, message: 'विद्यार्थीको पूरा नाम अनिवार्य छ (Full Name is required).' });
    }

    // Generate or use studentId
    let finalStudentId = customStudentId ? String(customStudentId).trim() : null;
    if (!finalStudentId) {
      const count = await prisma.student.count();
      const currentYear = admissionDateBs ? admissionDateBs.slice(0, 4) : '2081';
      finalStudentId = `STU-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    }

    // Check unique username / studentId
    const existingUser = await prisma.user.findUnique({ where: { username: finalStudentId } });
    if (existingUser) {
      finalStudentId = `${finalStudentId}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const defaultPassword = generatePassword(8);
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        username: finalStudentId,
        passwordHash,
        role: 'STUDENT',
        isActive: true,
      },
    });

    const intakeMetadata = {
      docs: Array.isArray(collectedDocs) ? collectedDocs : (typeof collectedDocs === 'object' && collectedDocs !== null ? collectedDocs : []),
      facultyStream: facultyStream || stream || null,
      shift: shift || null,
      seeGpa: seeGpa || null,
      seeSymbolNo: seeSymbolNo || null,
      seeRegNo: seeRegNo || null,
      electiveSubjects: Array.isArray(electiveSubjects) ? electiveSubjects : (electiveSubjects ? [electiveSubjects] : []),
      parentCitizenshipNo: parentCitizenshipNo || null,
      prevSchoolName: prevSchoolName || previousSchool || null,
      prevEmisCode: prevEmisCode || null,
    };

    const resolvedPreviousSchool = prevSchoolName || previousSchool || null;

    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentId: finalStudentId,
        fullName: String(fullName).trim(),
        fullNameNepali: fullNameNepali ? String(fullNameNepali).trim() : null,
        emisId: emisId ? String(emisId).trim() : null,
        gender: gender || null,
        dateOfBirthBs: dateOfBirthBs || null,
        dateOfBirthAd: dateOfBirthAd ? new Date(dateOfBirthAd) : null,
        admissionDateBs: admissionDateBs || null,
        batchYear: batchYear || (admissionDateBs ? admissionDateBs.slice(0, 4) : null),
        address: address ? String(address).trim() : null,
        phone: phone ? String(phone).trim() : (guardianContact ? String(guardianContact).trim() : null),
        fatherName: fatherName ? String(fatherName).trim() : null,
        motherName: motherName ? String(motherName).trim() : null,
        guardianName: guardianName ? String(guardianName).trim() : null,
        guardianContact: guardianContact ? String(guardianContact).trim() : null,
        guardianRelation: guardianRelation ? String(guardianRelation).trim() : null,
        previousSchool: resolvedPreviousSchool,
        bloodGroup: bloodGroup || null,
        religion: religion || null,
        ethnicity: ethnicity || null,
        disability: disability || null,
        photoUrl: sanitizedPhoto,
        status: 'ACTIVE',
        isActive: true,
        collectedDocs: JSON.stringify(intakeMetadata),
      },
    });

    if (classId) {
      let assignedRoll = rollNo ? parseInt(rollNo) : null;
      if (!assignedRoll) {
        const existingEnrols = await prisma.classEnrollment.findMany({
          where: { classId: parseInt(classId), isActive: true },
          select: { rollNo: true },
        });
        const maxRoll = existingEnrols.reduce((max, e) => (e.rollNo && e.rollNo > max ? e.rollNo : max), 0);
        assignedRoll = maxRoll + 1;
      }
      await prisma.classEnrollment.create({
        data: {
          studentId: student.id,
          classId: parseInt(classId),
          rollNo: assignedRoll,
          isActive: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        ...student,
        generatedPassword: defaultPassword,
      },
      message: `नयाँ विद्यार्थी भर्ना (Admission) सफलतापूर्वक सम्पन्न भयो! (Login ID: ${finalStudentId})`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/bulk-roll-setup & /resequence-roll-numbers — configure / re-sequence roll numbers class-wise (1..N)
async function handleResequenceRollNumbers(req, res) {
  try {
    const { classId, academicYearId, mode = 'ALPHABETICAL', sortBy, students } = req.body;
    const sortMode = (sortBy || mode || 'ALPHABETICAL').toUpperCase();
    const isAdmin = req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN';
    const teacherId = req.user.teacher?.id;

    // Manual custom roll list update
    if (Array.isArray(students) && students.length > 0) {
      if (!isAdmin && req.user.role !== 'TEACHER') {
        return res.status(403).json({ success: false, message: 'Permission denied.' });
      }
      for (const item of students) {
        if (item.enrollmentId && item.rollNo !== undefined) {
          await prisma.classEnrollment.update({
            where: { id: parseInt(item.enrollmentId) },
            data: { rollNo: parseInt(item.rollNo) || null },
          });
        }
      }
      return res.json({ success: true, message: 'रोल नम्बर सफलतापूर्वक अद्यावधिक गरियो!' });
    }

    let targetClasses = [];
    if (classId && classId !== 'all' && classId !== 'ALL') {
      const cls = await prisma.class.findUnique({
        where: { id: parseInt(classId) },
        select: { id: true, name: true, section: true, classTeacherId: true },
      });
      if (!cls) return res.status(404).json({ success: false, message: 'Class not found.' });

      if (!isAdmin && req.user.role === 'TEACHER') {
        if (!teacherId || cls.classTeacherId !== teacherId) {
          return res.status(403).json({
            success: false,
            message: `तपाईं यस कक्षा (${cls.name}) को कक्षा शिक्षक हुनुहुन्न । केवल तोकिएको कक्षा शिक्षक वा प्रशासकले मात्र रोल नं. मिलाउन सक्नुहुन्छ ।`,
          });
        }
      }
      targetClasses = [cls];
    } else {
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'केवल प्रशासक (Admin) ले मात्र सबै कक्षाको रोल नम्बर एकैपटक मिलाउन सक्नुहुन्छ ।' });
      }
      let ayWhere = { academicYear: { isActive: true } };
      if (academicYearId && academicYearId !== 'all') {
        ayWhere = { academicYearId: parseInt(academicYearId) };
      }
      targetClasses = await prisma.class.findMany({
        where: ayWhere,
        select: { id: true, name: true, section: true, classTeacherId: true },
        orderBy: { orderIndex: 'asc' },
      });
    }

    let totalStudentsUpdated = 0;
    const summary = [];

    for (const cls of targetClasses) {
      const enrollments = await prisma.classEnrollment.findMany({
        where: { classId: cls.id, isActive: true },
        include: {
          student: {
            select: { id: true, fullName: true, fullNameNepali: true, emisId: true, admissionDateBs: true, createdAt: true },
          },
        },
      });

      if (enrollments.length === 0) continue;

      enrollments.sort((a, b) => {
        if (sortMode === 'CURRENT_ROLL' || sortMode === 'ROLL_NO' || sortMode === 'ROLLNO') {
          const rollA = a.rollNo !== null && a.rollNo !== undefined ? Number(a.rollNo) : 99999;
          const rollB = b.rollNo !== null && b.rollNo !== undefined ? Number(b.rollNo) : 99999;
          if (rollA !== rollB) return rollA - rollB;
        } else if (sortMode === 'ADMISSION_DATE' || sortMode === 'ADMISSION') {
          const dateA = a.student?.admissionDateBs || '';
          const dateB = b.student?.admissionDateBs || '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
        } else if (sortMode === 'EMIS_ID' || sortMode === 'EMIS') {
          const emisA = a.student?.emisId || '';
          const emisB = b.student?.emisId || '';
          if (emisA !== emisB) return emisA.localeCompare(emisB);
        }

        // Default: Alphabetical by Full Name
        const nameA = (a.student?.fullName || a.student?.fullNameNepali || '').trim().toLowerCase();
        const nameB = (b.student?.fullName || b.student?.fullNameNepali || '').trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });

      for (let i = 0; i < enrollments.length; i++) {
        await prisma.classEnrollment.update({
          where: { id: enrollments[i].id },
          data: { rollNo: i + 1 },
        });
      }

      totalStudentsUpdated += enrollments.length;
      summary.push({
        classId: cls.id,
        className: `${cls.name}${cls.section ? ` (${cls.section})` : ''}`,
        count: enrollments.length,
      });
    }

    const message =
      targetClasses.length === 1
        ? `${targetClasses[0].name} कक्षाका ${totalStudentsUpdated} जना विद्यार्थीको रोल नं. १ देखि ${totalStudentsUpdated} सम्म सफलतापूर्वक क्रमबद्ध गरियो!`
        : `जम्मा ${summary.length} वटा कक्षाका ${totalStudentsUpdated} जना विद्यार्थीको रोल नम्बर कक्षागत रूपमा (१ देखि सुरु हुने गरी) सफलतापूर्वक पुन: क्रमबद्ध गरियो!`;

    return res.json({
      success: true,
      message,
      totalStudentsUpdated,
      classesCount: summary.length,
      summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
}

router.post('/bulk-roll-setup', authenticate, handleResequenceRollNumbers);
router.post('/resequence-roll-numbers', authenticate, handleResequenceRollNumbers);

// POST /api/students/bulk-edit — bulk edit student details
router.post('/bulk-edit', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { studentIds, updateData, targetClassId } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one student.' });
    }

    const cleanUpdate = {};
    if (updateData?.address) cleanUpdate.address = String(updateData.address).trim();
    if (updateData?.bloodGroup) cleanUpdate.bloodGroup = updateData.bloodGroup;
    if (updateData?.status) cleanUpdate.status = updateData.status;

    if (Object.keys(cleanUpdate).length > 0) {
      await prisma.student.updateMany({
        where: { id: { in: studentIds.map(id => parseInt(id)) } },
        data: cleanUpdate,
      });
    }

    if (targetClassId) {
      for (const sId of studentIds) {
        await prisma.classEnrollment.updateMany({
          where: { studentId: parseInt(sId), isActive: true },
          data: { isActive: false },
        });
        await prisma.classEnrollment.create({
          data: {
            studentId: parseInt(sId),
            classId: parseInt(targetClassId),
            isActive: true,
          },
        });
      }
    }

    return res.json({ success: true, message: `${studentIds.length} जना विद्यार्थीहरूको विवरण एकमुष्ट अद्यावधिक भयो!` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/students/:id/reset-password — instant password update/reset
router.post('/:id/reset-password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { user: true },
    });
    if (!student || !student.user) return res.status(404).json({ success: false, message: 'Student user not found.' });

    const newPassword = req.body.newPassword || generatePassword(8);
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return res.json({
      success: true,
      message: `विद्यार्थी (${student.fullName}) को पासवर्ड सफलतापूर्वक परिवर्तन भयो!`,
      newPassword,
      username: student.user.username,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// PUT /api/students/:id — Full Edit of student details
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const {
      fullName,
      fullNameNepali,
      gender,
      dateOfBirthBs,
      dateOfBirthAd,
      address,
      phone,
      fatherName,
      motherName,
      guardianName,
      guardianContact,
      guardianRelation,
      previousSchool,
      bloodGroup,
      religion,
      ethnicity,
      disability,
      admissionDateBs,
      emisId,
      studentId: customStudentId,
      status,
      batchYear,
      isActive,
      photoUrl,
      collectedDocs,
      classId,
      rollNo,
      username,
    } = req.body;

    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true, classEnrollment: true },
    });

    if (!existingStudent) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const updateData = {};
    if (fullName !== undefined) updateData.fullName = String(fullName).trim();
    if (fullNameNepali !== undefined) updateData.fullNameNepali = fullNameNepali ? String(fullNameNepali).trim() : null;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirthBs !== undefined) updateData.dateOfBirthBs = dateOfBirthBs || null;
    if (dateOfBirthAd !== undefined) updateData.dateOfBirthAd = dateOfBirthAd ? new Date(dateOfBirthAd) : null;
    if (address !== undefined) updateData.address = address ? String(address).trim() : null;
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (fatherName !== undefined) updateData.fatherName = fatherName ? String(fatherName).trim() : null;
    if (motherName !== undefined) updateData.motherName = motherName ? String(motherName).trim() : null;
    if (guardianName !== undefined) updateData.guardianName = guardianName ? String(guardianName).trim() : null;
    if (guardianContact !== undefined) updateData.guardianContact = guardianContact ? String(guardianContact).trim() : null;
    if (guardianRelation !== undefined) updateData.guardianRelation = guardianRelation ? String(guardianRelation).trim() : null;
    if (previousSchool !== undefined) updateData.previousSchool = previousSchool ? String(previousSchool).trim() : null;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
    if (religion !== undefined) updateData.religion = religion || null;
    if (ethnicity !== undefined) updateData.ethnicity = ethnicity || null;
    if (disability !== undefined) updateData.disability = disability || null;
    if (admissionDateBs !== undefined) updateData.admissionDateBs = admissionDateBs || null;
    if (emisId !== undefined) updateData.emisId = emisId ? String(emisId).trim() : null;
    if (customStudentId !== undefined && customStudentId.trim()) updateData.studentId = String(customStudentId).trim();
    if (status !== undefined) updateData.status = status;
    if (batchYear !== undefined) updateData.batchYear = batchYear ? String(batchYear).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (photoUrl !== undefined) {
      if (photoUrl === null || photoUrl === '') {
        updateData.photoUrl = null;
      } else {
        try {
          updateData.photoUrl = validateAndSanitizePhoto(photoUrl);
        } catch (valErr) {
          return res.status(400).json({ success: false, message: valErr.message });
        }
      }
    }
    if (collectedDocs !== undefined) {
      updateData.collectedDocs = typeof collectedDocs === 'string' ? collectedDocs : JSON.stringify(collectedDocs);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Student Table
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: updateData,
        include: {
          user: { select: { id: true, username: true, role: true, isActive: true } },
          classEnrollment: { include: { class: true } },
        },
      });

      // 2. Handle Username update if changed
      if (username && username.trim() && existingStudent.user && username.trim() !== existingStudent.user.username) {
        const newUsername = username.trim();
        const takenUser = await tx.user.findUnique({ where: { username: newUsername } });
        if (!takenUser || takenUser.id === existingStudent.userId) {
          await tx.user.update({
            where: { id: existingStudent.userId },
            data: { username: newUsername },
          });
        }
      }

      // 3. Handle Class & Roll No
      if (classId !== undefined && classId !== null && classId !== '') {
        const targetClassId = parseInt(classId);
        const parsedRoll = rollNo !== undefined && rollNo !== null && rollNo !== '' ? parseInt(rollNo) : null;

        // Check if enrollment exists in target class
        const existingClassEnrol = await tx.classEnrollment.findUnique({
          where: { studentId_classId: { studentId, classId: targetClassId } },
        });

        // Deactivate active enrollments in other classes
        await tx.classEnrollment.updateMany({
          where: { studentId, classId: { not: targetClassId }, isActive: true },
          data: { isActive: false },
        });

        if (existingClassEnrol) {
          await tx.classEnrollment.update({
            where: { id: existingClassEnrol.id },
            data: {
              rollNo: parsedRoll,
              isActive: true,
            },
          });
        } else {
          await tx.classEnrollment.create({
            data: {
              studentId,
              classId: targetClassId,
              rollNo: parsedRoll,
              isActive: true,
            },
          });
        }
      } else if (rollNo !== undefined && rollNo !== null && rollNo !== '' && existingStudent.classEnrollment?.length > 0) {
        const parsedRoll = parseInt(rollNo);
        const activeEnrol = existingStudent.classEnrollment.find((e) => e.isActive) || existingStudent.classEnrollment[0];
        if (activeEnrol) {
          await tx.classEnrollment.update({
            where: { id: activeEnrol.id },
            data: { rollNo: parsedRoll },
          });
        }
      }

      return updatedStudent;
    });

    const refreshed = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, username: true, role: true, isActive: true } },
        classEnrollment: { include: { class: true } },
      },
    });

    return res.json({
      success: true,
      data: refreshed,
      message: `${refreshed.fullName} को सम्पूर्ण विवरण सफलतापूर्वक अद्यावधिक (Updated) गरियो!`,
    });
  } catch (err) {
    console.error('Error updating student:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/students/:id — Delete student (cascade / permanent or safe deactivate)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const permanent = req.query.permanent === 'true' || req.query.force === 'true';

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (permanent) {
      await prisma.$transaction(async (tx) => {
        // Remove related records safely
        await tx.classEnrollment.deleteMany({ where: { studentId } });
        await tx.attendance.deleteMany({ where: { studentId } });
        await tx.markEntry.deleteMany({ where: { studentId } });
        await tx.libraryIssue.deleteMany({ where: { studentId } });
        await tx.studentFeeDue.deleteMany({ where: { studentId } });
        await tx.feeCollection.deleteMany({ where: { studentId } }).catch(() => {});
        await tx.certificate.deleteMany({ where: { studentId } });
        await tx.examSeatPlan.deleteMany({ where: { studentId } }).catch(() => {});
        await tx.leaveRequest.deleteMany({ where: { studentId } }).catch(() => {});
        await tx.notice.deleteMany({ where: { targetStudentId: studentId } }).catch(() => {});
        
        // Delete student record
        await tx.student.delete({ where: { id: studentId } });

        // Delete user account if exists
        if (student.userId) {
          await tx.user.delete({ where: { id: student.userId } }).catch(() => {});
        }
      });

      return res.json({
        success: true,
        message: `${student.fullName} (ID: ${student.studentId}) विद्यार्थी र सम्बन्धित सबै रेकर्ड स्थायी रूपमा मेटाइयो (Permanently Deleted).`,
      });
    } else {
      // Soft Delete / Deactivate
      await prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: studentId },
          data: {
            isActive: false,
            status: 'DROPPED',
          },
        });
        await tx.classEnrollment.updateMany({
          where: { studentId, isActive: true },
          data: { isActive: false },
        });
        if (student.userId) {
          await tx.user.update({
            where: { id: student.userId },
            data: { isActive: false },
          });
        }
      });

      return res.json({
        success: true,
        message: `${student.fullName} विद्यार्थीलाई निष्क्रिय (Deactivated) गरियो।`,
      });
    }
  } catch (err) {
    console.error('Error deleting student:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;

