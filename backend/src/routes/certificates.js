const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recordAuditLog } = require('../lib/auditLogger');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const certUploadDir = path.join(__dirname, '../../uploads/certificates');
if (!fs.existsSync(certUploadDir)) {
  fs.mkdirSync(certUploadDir, { recursive: true });
}

const certUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const type = req.query.type === 'seal' ? 'seal' : 'background';
    cb(null, `cert_${type}_${Date.now()}${ext}`);
  },
});

const uploadCertAsset = multer({
  storage: certUploadStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for ultra HD assets
});

const CERT_LAYOUT_FILE = path.join(__dirname, '../../certificate_layout_settings.json');

const DEFAULT_NSSB_CONFIG = {
  pagePaddingTopMm: 16,
  pagePaddingBottomMm: 12,
  pagePaddingSideMm: 24,

  schoolNameText: 'SCHOOL NAME',
  schoolAddressText: 'SCHOOL ADDRESS',
  schoolProvinceText: 'PROVINCE, NEPAL',
  schoolEstdText: 'ESTD: 2060 B.S.',

  schoolTitleFont: 'Algerian, "Cinzel Decorative", "Playfair Display", serif',
  schoolTitleSize: 32,
  schoolTitleColor: '#dc2626',
  schoolTitleLetterSpacing: 1.0,
  schoolTitleWeight: '900',

  schoolSubtitleFont: '"Times New Roman", Times, "Noto Serif", serif',
  schoolSubtitleSize: 12.5,
  schoolSubtitleColor: '#1e3a5f',

  schoolProvinceFont: '"Times New Roman", Times, "Noto Serif", serif',
  schoolProvinceSize: 10.5,
  schoolProvinceColor: '#1e3a5f',

  schoolEstdFont: '"Times New Roman", Times, "Noto Serif", serif',
  schoolEstdSize: 11,
  schoolEstdColor: '#1e3a5f',

  headerSpacingBottom: 4,

  showIemisBadge: true,
  iemisBadgeText: 'IEMIS',
  iemisBadgeSize: 10.5,
  iemisBadgeColor: '#0284c7',
  showSeal: true,
  sealSize: 110,
  customSealUrl: '',

  backgroundMode: 'default',
  customBackgroundUrl: '',
  bgApplyToAll: true,
  bgApplyToBonafide: true,
  bgApplyToAppreciation: true,

  certTitleFont: 'Algerian, "Cinzel Decorative", "Playfair Display", serif',
  certTitleSize: 18,
  certTitleColor: '#581c87',
  certTitleLetterSpacing: 2.5,
  certTitleTextTransform: 'uppercase',
  certTitleShadow: true,
  certTitleMarginTop: 10,
  certTitleMarginBottom: 6,

  showPhotoFrame: true,
  photoFrameWidth: 88,
  photoFrameHeight: 108,
  photoFrameBorderColor: '#1f2937',
  photoFrameBorderRadius: 2,
  photoOffsetX: 0,
  photoOffsetY: 0,

  bodyFont: '"Amasis MT Pro", "Amasis MT", "Merriweather", Georgia, serif',
  bodyFontSizeP1: 13.5,
  bodyFontSizeP2: 13.5,
  bodyFontSizeP3: 13.5,
  bodyLineHeight: 2.1,
  bodyTextColor: '#111827',
  bodyTextAlign: 'justify',
  bodyIndent: 28,
  bodyIndentP1: 28,
  bodyIndentP2: 28,
  bodyIndentP3: 28,
  bodyParagraphSpacing: 6,

  showParticularsBox: true,
  particularsFont: 'sans-serif',
  particularsFontSize: 12,
  particularsColor: '#1e3a5f',
  particularsLayout: 'vertical',
  particularsMarginTop: 4,
  particularsMarginBottom: 8,

  footerMarginTop: 14,
  sigLineStyle: 'none',
  sigFont: 'Algerian, "Cinzel Decorative", "Playfair Display", serif',
  sigFontSize: 12,
  sigTextColor: '#86198f',
  preparedByLabel: 'Prepared By:',
  sealCenterLabel: 'Seal of School',
  principalLabel: 'Principal',

  showDateOfIssue: true,
  dateOfIssuePosition: 'left',
  dateOfIssueFontSize: 10.5,
  dateOfIssueColor: '#111827',
};

const DEFAULT_NSSB_PROFILES = [
  {
    id: 'preset-nssb',
    name: 'NSSB',
    icon: '🎨',
    isCustom: true,
    updatedAt: '2083/01/01',
    config: DEFAULT_NSSB_CONFIG,
  },
];

const router = express.Router();

async function getDynamicDefaultConfig() {
  const school = await prisma.school.findFirst();
  return {
    ...DEFAULT_NSSB_CONFIG,
    schoolNameText: school?.name ? school.name.toUpperCase() : 'NEPAL SECONDARY SCHOOL',
    schoolAddressText: school?.address ? school.address.toUpperCase() : '',
    schoolProvinceText: school?.province ? `${school.province.toUpperCase()}, NEPAL` : 'NEPAL',
    schoolEstdText: school?.estYear ? `ESTD: ${school.estYear} B.S.` : '',
    customSealUrl: school?.sealUrl || school?.logoUrl || '',
  };
}

// GET /api/certificates/layout-settings — fetch global saved certificate layout profiles from Cloud PostgreSQL / disk
router.get('/layout-settings', async (req, res) => {
  try {
    const dynamicDefaultConfig = await getDynamicDefaultConfig();
    const dynamicDefaultProfiles = [
      {
        id: 'preset-nssb',
        name: 'Official School Certificate',
        icon: '🎨',
        isCustom: true,
        updatedAt: '2083/01/01',
        config: dynamicDefaultConfig,
      },
    ];

    const setting = await prisma.certificateLayoutSetting.findFirst({
      orderBy: { id: 'desc' },
    });
    if (setting) {
      let savedProfiles = [];
      let layoutConfig = null;
      try { savedProfiles = JSON.parse(setting.savedProfiles); } catch (e) {}
      try { layoutConfig = JSON.parse(setting.layoutConfig); } catch (e) {}
      return res.json({
        success: true,
        data: {
          activeProfileId: setting.activeProfileId,
          savedProfiles: Array.isArray(savedProfiles) && savedProfiles.length > 0 ? savedProfiles : dynamicDefaultProfiles,
          layoutConfig: layoutConfig || dynamicDefaultConfig,
          updatedAt: setting.updatedAt,
        },
      });
    }

    // Fallback: Check local disk file
    if (fs.existsSync(CERT_LAYOUT_FILE)) {
      try {
        const fileContent = fs.readFileSync(CERT_LAYOUT_FILE, 'utf8');
        const parsed = JSON.parse(fileContent);
        return res.json({
          success: true,
          data: {
            activeProfileId: parsed.activeProfileId || 'preset-nssb',
            savedProfiles: Array.isArray(parsed.savedProfiles) && parsed.savedProfiles.length > 0 ? parsed.savedProfiles : dynamicDefaultProfiles,
            layoutConfig: parsed.layoutConfig || dynamicDefaultConfig,
            updatedAt: parsed.updatedAt || new Date(),
          },
        });
      } catch (fileErr) {
        console.warn('Failed reading layout settings backup file:', fileErr);
      }
    }

    return res.json({
      success: true,
      data: {
        activeProfileId: 'preset-nssb',
        savedProfiles: dynamicDefaultProfiles,
        layoutConfig: dynamicDefaultConfig,
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Failed to read certificate layout settings', err);
    return res.json({
      success: true,
      data: {
        activeProfileId: 'preset-nssb',
        savedProfiles: DEFAULT_NSSB_PROFILES,
        layoutConfig: DEFAULT_NSSB_CONFIG,
        updatedAt: new Date(),
      },
    });
  }
});

// POST /api/certificates/upload-asset — Upload high-resolution background or seal permanently
router.post('/upload-asset', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), uploadCertAsset.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const assetUrl = `/uploads/certificates/${req.file.filename}`;
    const assetType = req.query.type || 'background';

    // If background, also sync to frontend public certificate_bg.jpg and certificate_bg_hd.jpg
    if (assetType === 'background') {
      try {
        const publicBgPath = path.join(__dirname, '../../../frontend/public/certificate_bg.jpg');
        fs.copyFileSync(req.file.path, publicBgPath);
        const publicBgHdPath = path.join(__dirname, '../../../frontend/public/certificate_bg_hd.jpg');
        fs.copyFileSync(req.file.path, publicBgHdPath);
      } catch (cpErr) {
        // Ignored if different filesystem
      }
    }

    // If seal, also sync to frontend public school_seal_custom.png
    if (assetType === 'seal') {
      try {
        const publicSealPath = path.join(__dirname, '../../../frontend/public/school_seal_custom.png');
        fs.copyFileSync(req.file.path, publicSealPath);
      } catch (cpErr) {
        // Ignored if different filesystem
      }
    }

    recordAuditLog(req, {
      action: 'CERTIFICATE_ASSET_UPLOAD',
      details: { filename: req.file.filename, assetType, size: req.file.size },
    });

    return res.json({
      success: true,
      url: assetUrl,
      filename: req.file.filename,
      message: 'Certificate asset uploaded and saved permanently!',
    });
  } catch (err) {
    console.error('Failed to upload certificate asset:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload asset' });
  }
});

// POST /api/certificates/layout-settings — save global certificate layout profiles to Cloud PostgreSQL and disk
router.post('/layout-settings', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { savedProfiles, activeProfileId, layoutConfig } = req.body;

    if (!savedProfiles || !layoutConfig) {
      return res.status(400).json({ success: false, message: 'savedProfiles and layoutConfig are required.' });
    }

    const profilesStr = typeof savedProfiles === 'string' ? savedProfiles : JSON.stringify(savedProfiles);
    const configStr = typeof layoutConfig === 'string' ? layoutConfig : JSON.stringify(layoutConfig);

    if (profilesStr.length > 25 * 1024 * 1024 || configStr.length > 25 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'Payload size exceeds maximum allowed 25MB limit.' });
    }

    // Save to PostgreSQL DB
    const existing = await prisma.certificateLayoutSetting.findFirst({
      orderBy: { id: 'desc' },
    });

    let record;
    if (existing) {
      record = await prisma.certificateLayoutSetting.update({
        where: { id: existing.id },
        data: {
          activeProfileId: activeProfileId || 'preset-nssb',
          savedProfiles: profilesStr,
          layoutConfig: configStr,
        },
      });
    } else {
      record = await prisma.certificateLayoutSetting.create({
        data: {
          activeProfileId: activeProfileId || 'preset-nssb',
          savedProfiles: profilesStr,
          layoutConfig: configStr,
        },
      });
    }

    // Also persist to disk as backup
    try {
      fs.writeFileSync(CERT_LAYOUT_FILE, JSON.stringify({
        activeProfileId: record.activeProfileId,
        savedProfiles: typeof savedProfiles === 'object' ? savedProfiles : JSON.parse(profilesStr),
        layoutConfig: typeof layoutConfig === 'object' ? layoutConfig : JSON.parse(configStr),
        updatedAt: record.updatedAt,
      }, null, 2), 'utf8');
    } catch (fErr) {
      console.warn('Could not write CERT_LAYOUT_FILE backup', fErr);
    }

    recordAuditLog(req, {
      action: 'UPDATE',
      entity: 'CERTIFICATE_LAYOUT',
      entityId: record.activeProfileId,
      description: `Updated certificate layout configuration (${record.activeProfileId})`,
      details: { activeProfileId: record.activeProfileId },
    }).catch(() => {});

    return res.json({
      success: true,
      message: 'Certificate layout saved globally in PostgreSQL database (सबै कम्प्युटरमा सुरक्षित गरियो)',
      data: {
        activeProfileId: record.activeProfileId,
        savedProfiles: typeof savedProfiles === 'object' ? savedProfiles : JSON.parse(profilesStr),
        layoutConfig: typeof layoutConfig === 'object' ? layoutConfig : JSON.parse(configStr),
        updatedAt: record.updatedAt,
      },
    });
  } catch (err) {
    console.error('Failed to write certificate layout settings to database', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Default built-in templates
const DEFAULT_TEMPLATES = [
  {
    type: 'CHARACTER',
    name: 'Character Certificate (चारित्रिक प्रमाणपत्र)',
    nameNepali: 'चारित्रिक प्रमाणपत्र',
    titleText: 'CHARACTER CERTIFICATE / चारित्रिक प्रमाणपत्र',
    bodyTemplate: 'This is to certify that Mr./Ms. {{studentName}}, son/daughter of Mr. {{fatherName}} and Mrs. {{motherName}}, resident of {{address}}, was a bonafide student of this school in Class {{class}} (Roll No: {{rollNo}}, EMIS ID: {{emisId}}). According to school records, his/her date of birth is {{dobBs}} B.S. ({{dobAd}} A.D.). During his/her stay at this institution, his/her conduct, moral character, and academic diligence were found to be {{character}}.\n\nWe wish him/her all the best and great success in all future educational pursuits.',
    borderStyle: 'CLASSIC_GOLD',
    signatory1Title: 'Class Teacher / कक्षा शिक्षक',
    signatory2Title: 'Exam Controller / परीक्षा नियन्त्रक',
    signatory3Title: 'Headmaster / प्रधानाध्यापक',
  },
  {
    type: 'TRANSFER',
    name: 'Transfer Certificate (स्थानान्तरण प्रमाणपत्र / TC)',
    nameNepali: 'स्थानान्तरण प्रमाणपत्र',
    titleText: 'TRANSFER / SCHOOL LEAVING CERTIFICATE',
    bodyTemplate: 'This is to certify that {{studentName}}, son/daughter of {{fatherName}}, studying in Class {{class}} (Roll No: {{rollNo}}) has left this school on {{issuedDateBs}} B.S. due to {{reason}}.\n\nAll school fees, library books, and other dues up to {{dueClearedUpto}} have been duly cleared. His/her character during the period was {{character}}.\n\nHe/She is hereby granted this Transfer Certificate to seek admission in any recognized institution.',
    borderStyle: 'MODERN_BLUE',
    signatory1Title: 'Class Teacher / कक्षा शिक्षक',
    signatory2Title: 'Accountant / लेखापाल',
    signatory3Title: 'Headmaster / प्रधानाध्यापक',
  },
  {
    type: 'BONAFIDE',
    name: 'Bonafide Student Certificate (प्रमाणीकरण पत्र)',
    nameNepali: 'अध्ययनरत प्रमाणीकरण प्रमाणपत्र',
    titleText: 'BONAFIDE STUDENT CERTIFICATE',
    bodyTemplate: 'This is to certify that {{studentName}} (EMIS ID: {{emisId}}), child of {{fatherName}}, is a regular and bonafide student of this institution currently studying in Class {{class}} for the academic session {{academicYear}}.\n\nThis certificate is issued upon guardian request for the purpose of {{purpose}}.',
    borderStyle: 'ORNATE',
    signatory1Title: 'Prepared By / तयार गर्ने',
    signatory2Title: 'Exam Incharge / परीक्षा संयोजक',
    signatory3Title: 'Principal / प्रधानाध्यापक',
  },
  {
    type: 'APPRECIATION',
    name: 'Certificate of Appreciation / Merit (प्रशंसा पत्र)',
    nameNepali: 'प्रशंसा पत्र / सम्मान पत्र',
    titleText: 'CERTIFICATE OF APPRECIATION',
    bodyTemplate: 'This certificate of appreciation is proudly presented to {{studentName}} of Class {{class}} in recognition of outstanding performance, excellence, and exceptional dedication demonstrated in {{eventOrSubject}} during the academic year {{academicYear}}.\n\nWe commend this remarkable achievement and encourage continuous pursuit of excellence.',
    borderStyle: 'ROYAL_RED',
    signatory1Title: 'Event Coordinator / संयोजक',
    signatory2Title: 'Vice Principal / सहायक प्र.अ.',
    signatory3Title: 'Principal / प्रधानाध्यापक',
  },
];

// GET /api/certificates — list all issued certificates
router.get('/', authenticate, async (req, res) => {
  try {
    const { type, search, page = 1, limit = 50 } = req.query;
    const where = {};
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { certificateNo: { contains: search } },
        { student: { fullName: { contains: search } } },
        { student: { studentId: { contains: search } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          student: {
            include: {
              classEnrollment: { where: { isActive: true }, include: { class: true } },
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.certificate.count({ where }),
    ]);

    const mappedCertificates = certificates.map((cert) => {
      let parsedData = {};
      try {
        if (cert.data) {
          parsedData = typeof cert.data === 'string' ? JSON.parse(cert.data) : cert.data;
        }
      } catch (e) {}
      return {
        ...cert,
        parsedData,
        printCount: Number(parsedData?.printCount) || 1,
      };
    });

    return res.json({ success: true, data: mappedCertificates, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/certificates/templates — list customizable templates
router.get('/templates', authenticate, async (req, res) => {
  try {
    let templates = await prisma.certificateTemplate.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    // Auto-seed default templates if none exist
    if (templates.length === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        await prisma.certificateTemplate.create({ data: t }).catch(() => {});
      }
      templates = await prisma.certificateTemplate.findMany({ orderBy: { id: 'asc' } });
    }

    return res.json({ success: true, data: templates });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/certificates/templates — save / update a certificate template
router.post('/templates', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const {
      type,
      name,
      nameNepali,
      titleText,
      bodyTemplate,
      borderStyle,
      watermarkEnabled,
      showQrCode,
      signatory1Title,
      signatory2Title,
      signatory3Title,
    } = req.body;

    if (!type || !bodyTemplate) {
      return res.status(400).json({ success: false, message: 'Template type and body are required.' });
    }

    const template = await prisma.certificateTemplate.upsert({
      where: { type },
      update: {
        name,
        nameNepali,
        titleText,
        bodyTemplate,
        borderStyle: borderStyle || 'CLASSIC_GOLD',
        watermarkEnabled: watermarkEnabled !== undefined ? watermarkEnabled : true,
        showQrCode: showQrCode !== undefined ? showQrCode : true,
        signatory1Title,
        signatory2Title,
        signatory3Title,
      },
      create: {
        type,
        name: name || `${type} Certificate`,
        nameNepali,
        titleText: titleText || `${type} CERTIFICATE`,
        bodyTemplate,
        borderStyle: borderStyle || 'CLASSIC_GOLD',
        watermarkEnabled: watermarkEnabled !== undefined ? watermarkEnabled : true,
        showQrCode: showQrCode !== undefined ? showQrCode : true,
        signatory1Title,
        signatory2Title,
        signatory3Title,
      },
    });

    recordAuditLog(req, {
      action: 'UPDATE',
      entity: 'CERTIFICATE_TEMPLATE',
      entityId: template.type,
      description: `Updated certificate template ${template.type} (${template.name || ''})`,
      details: { type: template.type, name: template.name },
    }).catch(() => {});

    return res.json({ success: true, data: template, message: 'प्रमाणपत्र ढाँचा (Template) सफलतापूर्वक सुरक्षित भयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/certificates/issue — issue a certificate to a student
router.post('/issue', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const {
      studentId,
      type,
      certificateNo,
      issuedDateBs,
      issuedDateAd,
      issuedBy,
      remarks,
      customData,
    } = req.body;

    let targetStudentId = studentId ? parseInt(studentId) : null;
    const manualName = req.body.manualStudentName || req.body.studentName;

    if (!targetStudentId) {
      if (!manualName) {
        return res.status(400).json({ success: false, message: 'Student Name or Selection is required.' });
      }
      // Create or find an alumni/legacy record
      const studentCode = req.body.nebRegNo || req.body.studentIdManual || `ALUMNI-${Date.now().toString().slice(-6)}`;
      let existing = await prisma.student.findFirst({
        where: { studentId: studentCode },
      });
      if (!existing) {
        existing = await prisma.student.create({
          data: {
            studentId: studentCode,
            fullName: String(manualName).trim(),
            fatherName: req.body.fatherName || null,
            motherName: req.body.motherName || null,
            address: req.body.permanentAddress || null,
            status: 'ALUMNI',
            gender: req.body.gender || 'OTHER',
          },
        });
      }
      targetStudentId = existing.id;
    }

    let finalCertNo = certificateNo ? String(certificateNo).trim() : null;
    if (!finalCertNo) {
      const count = await prisma.certificate.count();
      const yr = issuedDateBs ? issuedDateBs.slice(0, 4) : '2081';
      finalCertNo = `CERT-${type.slice(0, 4)}-${yr}-${String(count + 1).padStart(4, '0')}`;
    }

    let certPayload = customData || req.body.data || {};
    if (typeof certPayload === 'string') {
      try { certPayload = JSON.parse(certPayload); } catch (e) { certPayload = {}; }
    }
    if (!certPayload.printCount) {
      certPayload.printCount = 1;
    }
    if (!Array.isArray(certPayload.printHistory)) {
      certPayload.printHistory = [
        { printedAt: new Date().toISOString(), printedBy: issuedBy || 'Initial Issue', count: 1 }
      ];
    }

    const certificate = await prisma.certificate.create({
      data: {
        studentId: targetStudentId,
        type,
        certificateNo: finalCertNo,
        issuedDateBs: issuedDateBs || '2081-01-01',
        issuedDateAd: issuedDateAd ? new Date(issuedDateAd) : new Date(),
        issuedBy: issuedBy || 'Examination Section',
        remarks: remarks || null,
        data: JSON.stringify(certPayload),
      },
      include: {
        student: {
          include: {
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
      },
    });

    recordAuditLog(req, {
      action: 'ISSUE',
      entity: 'CERTIFICATE',
      entityId: certificate.id,
      description: `Issued ${type} Certificate #${finalCertNo} for student ${certificate.student?.fullName || targetStudentId}`,
      details: {
        certificateNo: finalCertNo,
        type,
        studentId: targetStudentId,
        studentName: certificate.student?.fullName,
      },
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      data: certificate,
      message: `प्रमाणपत्र नं. ${finalCertNo} सफलतापूर्वक जारी गरियो!`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// GET /api/certificates/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const cert = await prisma.certificate.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        student: {
          include: {
            classEnrollment: { include: { class: true } },
          },
        },
      },
    });
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// POST /api/certificates/:id/record-print — Increment print/re-issue count
router.post('/:id/record-print', authenticate, async (req, res) => {
  try {
    const certId = parseInt(req.params.id);
    const existing = await prisma.certificate.findUnique({ where: { id: certId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    let certData = {};
    try {
      if (existing.data) certData = JSON.parse(existing.data);
    } catch (e) {}

    const newPrintCount = (Number(certData.printCount) || 1) + 1;
    certData.printCount = newPrintCount;
    if (!Array.isArray(certData.printHistory)) {
      certData.printHistory = [
        { printedAt: existing.createdAt, printedBy: existing.issuedBy || 'Initial Issue', count: 1 }
      ];
    }
    certData.printHistory.push({
      printedAt: new Date().toISOString(),
      printedBy: req.user?.username || req.body?.printedBy || 'Staff',
      count: newPrintCount,
      reason: req.body?.reason || 'Re-print / Duplicate Copy',
    });

    const updated = await prisma.certificate.update({
      where: { id: certId },
      data: {
        data: JSON.stringify(certData),
      },
      include: {
        student: {
          include: {
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
      },
    });

    recordAuditLog(req, {
      action: 'REPRINT',
      entity: 'CERTIFICATE',
      entityId: certId,
      description: `Re-printed ${existing.type} Certificate #${existing.certificateNo} (Issue Count: ${newPrintCount})`,
      details: { certificateNo: existing.certificateNo, printCount: newPrintCount },
    }).catch(() => {});

    return res.json({
      success: true,
      message: `प्रमाणपत्र पुनः प्रिन्ट रेकर्ड गरियो (कुल ${newPrintCount} पटक जारी)`,
      data: updated,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

// DELETE /api/certificates/:id
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const certId = parseInt(req.params.id);
    const existing = await prisma.certificate.findUnique({ where: { id: certId } });
    await prisma.certificate.delete({ where: { id: certId } });

    recordAuditLog(req, {
      action: 'DELETE',
      entity: 'CERTIFICATE',
      entityId: certId,
      description: `Deleted certificate #${existing?.certificateNo || certId}`,
      details: existing,
    }).catch(() => {});

    return res.json({ success: true, message: 'प्रमाणपत्र सफलतापूर्वक हटाइयो!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
});

module.exports = router;
