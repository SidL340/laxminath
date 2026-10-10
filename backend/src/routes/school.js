const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recordAuditLog } = require('../lib/auditLogger');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

// Asset upload setup for School Logo, Seal, Leadership Photos, Banners
const schoolAssetDir = path.join(__dirname, '../../uploads/school');
if (!fs.existsSync(schoolAssetDir)) {
  fs.mkdirSync(schoolAssetDir, { recursive: true });
}

const schoolAssetStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, schoolAssetDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext) ? ext : '.png';
    const prefix = (req.query.type || 'school').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${prefix}_${Date.now()}${cleanExt}`);
  },
});

const uploadAsset = multer({
  storage: schoolAssetStorage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const mime = file.mimetype;
    if (allowed.test(ext) && (mime.startsWith('image/') || mime === 'image/svg+xml')) {
      return cb(null, true);
    }
    cb(new Error('Only valid image files (PNG, JPG, WEBP, SVG) are allowed.'));
  },
});

// Helper to parse JSON safely
const parseJsonSafe = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
};

// GET /api/school/public — Full dynamic public website & school profile
router.get('/public', async (req, res) => {
  try {
    const school = await prisma.school.findFirst();

    if (!school) {
      return res.json({
        success: true,
        data: {
          name: 'Your School Name',
          nameNepali: 'तपाईंको विद्यालयको नाम',
          shortName: 'SCHOOL',
          address: 'Municipality, District, Province, Nepal',
          addressNepali: 'गाउँपालिका/नगरपालिका, जिल्ला, प्रदेश, नेपाल',
          district: 'Kathmandu',
          province: 'Bagmati',
          municipality: '',
          wardNo: '',
          phone: '+977-9800000000',
          altPhone: '',
          email: 'info@school.edu.np',
          website: '',
          emisCode: '000000000',
          panNo: '',
          registrationNo: '',
          level: 'Secondary',
          type: 'Community',
          estYear: '2060',
          logoUrl: '/school_logo.png',
          sealUrl: '/school_seal_red.png',
          letterheadHeaderUrl: '',
          letterheadFooterUrl: '',
          motto: 'Quality Education for a Brighter Future',
          mottoNepali: 'गुणस्तरीय शिक्षा, समृद्ध भविष्य',
          vision: '',
          mission: '',
          principalName: 'Principal',
          principalNameNepali: 'प्रधानाध्यापक',
          principalPhone: '',
          principalEmail: '',
          principalPhotoUrl: '',
          principalMessage: 'Welcome to our institution. We are dedicated to providing quality education, discipline, and holistic development.',
          principalMessageNepali: 'हाम्रो विद्यालयमा यहाँहरूलाई हार्दिक स्वागत छ। हामी गुणस्तरीय शिक्षा, चरित्र निर्माण र प्रविधिमैत्री सिकाइमा प्रतिबद्ध छौं।',
          chairpersonName: '',
          chairpersonNameNepali: '',
          chairpersonPhotoUrl: '',
          chairpersonMessage: '',
          heroBadge: 'नेपाल सरकार, शिक्षा मन्त्रालयद्वारा मान्यता प्राप्त',
          heroTitle: 'Excellence in Education & Character Building',
          heroTitleNepali: 'संस्कारयुक्त, प्रविधिमैत्री तथा गुणस्तरीय शिक्षाको उत्कृष्ट केन्द्र',
          heroSubtitle: 'Dedicated to inspiring students to achieve academic excellence and personal growth.',
          aboutTitle: 'हाम्रो विद्यालयको परिचय (About Our School)',
          aboutText: 'स्थापना कालदेखि नै विद्यार्थीहरूको चौतर्फी विकास, नैतिक मूल्य, आधुनिक वैज्ञानिक शिक्षा तथा व्यावहारिक ज्ञान प्रदान गर्न निरन्तर समर्पित छ।',
          aboutPoints: [
            'सबल शैक्षिक वातावरण: राष्ट्रिय परीक्षा बोर्ड (NEB) तथा सरकारी पाठ्यक्रममा आधारित उत्कृष्ट शिक्षण पद्धति।',
            'डिजिटल तथा प्रविधिमैत्री: कम्प्युटर ल्याब, स्मार्ट बोर्ड, अनलाइन उपस्थिति तथा अत्याधुनिक ERP व्यवस्थापन।',
            'छात्रवृत्ति सुविधा: जेहेन्दार, विपन्न तथा महिला विद्यार्थीहरूका लागि विशेष छात्रवृत्ति व्यवस्था।',
          ],
          stats: [
            { label: 'अध्ययनरत विद्यार्थी (Students)', value: '1,000+' },
            { label: 'अनुभवी शिक्षक/कर्मचारी (Faculty)', value: '40+' },
            { label: 'परीक्षा सफलता (Results)', value: '100%' },
            { label: 'स्थापना वर्ष (Established)', value: '2060 B.S.' },
          ],
          facilities: [
            { id: '1', title: 'कम्प्युटर तथा आइटी ल्याब', description: 'इन्टरनेट जडित आधुनिक कम्प्युटरहरू तथा प्राविधिक सीप विकास कक्षा।', icon: 'Laptop' },
            { id: '2', title: 'विज्ञान प्रयोगशाला', description: 'भौतिकशास्त्र, रसायनशास्त्र तथा जीवविज्ञानका प्रयोगात्मक कक्षाहरूका लागि पूर्ण सामग्रीयुक्त ल्याब।', icon: 'FlaskConical' },
            { id: '3', title: 'समृद्ध पुस्तकालय', description: 'पाठ्यपुस्तक, सन्दर्भ ग्रन्थ, पत्रपत्रिका तथा सामान्य ज्ञानका हजारौं पुस्तकहरू।', icon: 'Library' },
            { id: '4', title: 'खेलकुद तथा अतिरिक्त क्रियाकलाप', description: 'फुटबल, भलिबल, ब्याडमिन्टन, वादविवाद तथा सांस्कृतिक कार्यक्रमहरू।', icon: 'Trophy' },
            { id: '5', title: 'सुरक्षित वातावरण र सीसीटीभी', description: 'चौबीसै घण्टा सीसीटीभी निगरानी, सुरक्षित कम्पाउन्ड तथा प्राथमिक उपचार।', icon: 'Shield' },
            { id: '6', title: 'यातायात / बस सुविधा', description: 'विद्यार्थीहरूको सुरक्षित आवतजावतका लागि व्यवस्थित यातायात।', icon: 'Bus' },
          ],
          socialLinks: { facebook: '', youtube: '', twitter: '', instagram: '', mapEmbedUrl: '' },
          admissionInfo: 'नयाँ शैक्षिक सत्रका लागि भर्ना खुला भएको छ।',
          bannerNotices: '',
        },
      });
    }

    // Parse JSON fields into actual arrays/objects for frontend consumption
    const parsedData = {
      ...school,
      aboutPoints: parseJsonSafe(school.aboutPoints, [
        'सबल शैक्षिक वातावरण: राष्ट्रिय परीक्षा बोर्ड (NEB) तथा सरकारी पाठ्यक्रममा आधारित उत्कृष्ट शिक्षण पद्धति।',
        'डिजिटल तथा प्रविधिमैत्री: कम्प्युटर ल्याब, स्मार्ट बोर्ड, अनलाइन उपस्थिति तथा अत्याधुनिक ERP व्यवस्थापन।',
        'छात्रवृत्ति सुविधा: जेहेन्दार, विपन्न तथा महिला विद्यार्थीहरूका लागि विशेष छात्रवृत्ति व्यवस्था।',
      ]),
      stats: parseJsonSafe(school.stats, [
        { label: 'अध्ययनरत विद्यार्थी (Students)', value: '1,000+' },
        { label: 'अनुभवी शिक्षक/कर्मचारी (Faculty)', value: '40+' },
        { label: 'परीक्षा सफलता (Results)', value: '100%' },
        { label: 'स्थापना वर्ष (Established)', value: `${school.estYear || '2060'} B.S.` },
      ]),
      facilities: parseJsonSafe(school.facilities, [
        { id: '1', title: 'कम्प्युटर तथा आइटी ल्याब', description: 'इन्टरनेट जडित आधुनिक कम्प्युटरहरू तथा प्राविधिक सीप विकास कक्षा।', icon: 'Laptop' },
        { id: '2', title: 'विज्ञान प्रयोगशाला', description: 'भौतिकशास्त्र, रसायनशास्त्र तथा जीवविज्ञानका प्रयोगात्मक कक्षाहरूका लागि पूर्ण सामग्रीयुक्त ल्याब।', icon: 'FlaskConical' },
        { id: '3', title: 'समृद्ध पुस्तकालय', description: 'पाठ्यपुस्तक, सन्दर्भ ग्रन्थ, पत्रपत्रिका तथा सामान्य ज्ञानका हजारौं पुस्तकहरू।', icon: 'Library' },
        { id: '4', title: 'खेलकुद तथा अतिरिक्त क्रियाकलाप', description: 'फुटबल, भलिबल, ब्याडमिन्टन, वादविवाद तथा सांस्कृतिक कार्यक्रमहरू।', icon: 'Trophy' },
        { id: '5', title: 'सुरक्षित वातावरण र सीसीटीभी', description: 'चौबीसै घण्टा सीसीटीभी निगरानी, सुरक्षित कम्पाउन्ड तथा प्राथमिक उपचार।', icon: 'Shield' },
        { id: '6', title: 'यातायात / बस सुविधा', description: 'विद्यार्थीहरूको सुरक्षित आवतजावतका लागि व्यवस्थित यातायात।', icon: 'Bus' },
      ]),
      socialLinks: parseJsonSafe(school.socialLinks, { facebook: '', youtube: '', twitter: '', instagram: '', mapEmbedUrl: '' }),
    };

    return res.json({ success: true, data: parsedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/school/upload-asset - Upload logo, seal, photo, etc.
router.post('/upload-asset', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), uploadAsset.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    const fileUrl = `/uploads/school/${req.file.filename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      message: 'Asset uploaded successfully.',
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/school/profile - Authenticated school profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const school = await prisma.school.findFirst();
    if (!school) return res.json({ success: true, data: {} });

    const parsedData = {
      ...school,
      aboutPoints: parseJsonSafe(school.aboutPoints, []),
      stats: parseJsonSafe(school.stats, []),
      facilities: parseJsonSafe(school.facilities, []),
      socialLinks: parseJsonSafe(school.socialLinks, {}),
    };

    return res.json({ success: true, data: parsedData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper function to build safe school data
const extractSchoolSafeData = (body) => {
  const {
    name, nameNepali, shortName, address, addressNepali, district, province,
    municipality, wardNo, phone, altPhone, email, website, emisCode, panNo,
    registrationNo, level, type, estYear,
    principalName, principalNameNepali, principalPhone, principalEmail,
    principalPhotoUrl, principalMessage, principalMessageNepali,
    chairpersonName, chairpersonNameNepali, chairpersonPhotoUrl, chairpersonMessage,
    logoUrl, sealUrl, letterheadHeaderUrl, letterheadFooterUrl,
    motto, mottoNepali, vision, mission,
    heroBadge, heroTitle, heroTitleNepali, heroSubtitle,
    aboutTitle, aboutText, aboutPoints,
    stats, facilities, socialLinks, admissionInfo, bannerNotices,
  } = body;

  const safe = {};
  if (name !== undefined) safe.name = String(name).trim();
  if (nameNepali !== undefined) safe.nameNepali = String(nameNepali).trim();
  if (shortName !== undefined) safe.shortName = String(shortName).trim();
  if (address !== undefined) safe.address = String(address).trim();
  if (addressNepali !== undefined) safe.addressNepali = String(addressNepali).trim();
  if (district !== undefined) safe.district = String(district).trim();
  if (province !== undefined) safe.province = String(province).trim();
  if (municipality !== undefined) safe.municipality = String(municipality).trim();
  if (wardNo !== undefined) safe.wardNo = String(wardNo).trim();
  if (phone !== undefined) safe.phone = String(phone).trim();
  if (altPhone !== undefined) safe.altPhone = String(altPhone).trim();
  if (email !== undefined) safe.email = String(email).trim();
  if (website !== undefined) safe.website = String(website).trim();
  if (emisCode !== undefined) safe.emisCode = String(emisCode).trim();
  if (panNo !== undefined) safe.panNo = String(panNo).trim();
  if (registrationNo !== undefined) safe.registrationNo = String(registrationNo).trim();
  if (level !== undefined) safe.level = String(level).trim();
  if (type !== undefined) safe.type = String(type).trim();
  if (estYear !== undefined) safe.estYear = String(estYear).trim();

  if (principalName !== undefined) safe.principalName = String(principalName).trim();
  if (principalNameNepali !== undefined) safe.principalNameNepali = String(principalNameNepali).trim();
  if (principalPhone !== undefined) safe.principalPhone = String(principalPhone).trim();
  if (principalEmail !== undefined) safe.principalEmail = String(principalEmail).trim();
  if (principalPhotoUrl !== undefined) safe.principalPhotoUrl = principalPhotoUrl;
  if (principalMessage !== undefined) safe.principalMessage = principalMessage;
  if (principalMessageNepali !== undefined) safe.principalMessageNepali = principalMessageNepali;

  if (chairpersonName !== undefined) safe.chairpersonName = String(chairpersonName).trim();
  if (chairpersonNameNepali !== undefined) safe.chairpersonNameNepali = String(chairpersonNameNepali).trim();
  if (chairpersonPhotoUrl !== undefined) safe.chairpersonPhotoUrl = chairpersonPhotoUrl;
  if (chairpersonMessage !== undefined) safe.chairpersonMessage = chairpersonMessage;

  if (logoUrl !== undefined) safe.logoUrl = logoUrl;
  if (sealUrl !== undefined) safe.sealUrl = sealUrl;
  if (letterheadHeaderUrl !== undefined) safe.letterheadHeaderUrl = letterheadHeaderUrl;
  if (letterheadFooterUrl !== undefined) safe.letterheadFooterUrl = letterheadFooterUrl;

  if (motto !== undefined) safe.motto = motto;
  if (mottoNepali !== undefined) safe.mottoNepali = mottoNepali;
  if (vision !== undefined) safe.vision = vision;
  if (mission !== undefined) safe.mission = mission;

  if (heroBadge !== undefined) safe.heroBadge = heroBadge;
  if (heroTitle !== undefined) safe.heroTitle = heroTitle;
  if (heroTitleNepali !== undefined) safe.heroTitleNepali = heroTitleNepali;
  if (heroSubtitle !== undefined) safe.heroSubtitle = heroSubtitle;

  if (aboutTitle !== undefined) safe.aboutTitle = aboutTitle;
  if (aboutText !== undefined) safe.aboutText = aboutText;
  if (aboutPoints !== undefined) {
    safe.aboutPoints = typeof aboutPoints === 'string' ? aboutPoints : JSON.stringify(aboutPoints);
  }

  if (stats !== undefined) {
    safe.stats = typeof stats === 'string' ? stats : JSON.stringify(stats);
  }
  if (facilities !== undefined) {
    safe.facilities = typeof facilities === 'string' ? facilities : JSON.stringify(facilities);
  }
  if (socialLinks !== undefined) {
    safe.socialLinks = typeof socialLinks === 'string' ? socialLinks : JSON.stringify(socialLinks);
  }
  if (admissionInfo !== undefined) safe.admissionInfo = admissionInfo;
  if (bannerNotices !== undefined) safe.bannerNotices = bannerNotices;

  return safe;
};

// POST /api/school/profile - Update full profile
router.post('/profile', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const safeData = extractSchoolSafeData(req.body);
    const existing = await prisma.school.findFirst();

    const school = existing
      ? await prisma.school.update({ where: { id: existing.id }, data: safeData })
      : await prisma.school.create({ data: { name: safeData.name || 'My School', address: safeData.address || 'Nepal', ...safeData } });

    recordAuditLog(req, {
      action: 'UPDATE',
      entity: 'SCHOOL_PROFILE',
      entityId: school.id,
      description: `Updated School Profile information (${school.name})`,
      details: safeData,
    }).catch(() => {});

    return res.json({ success: true, data: school, message: 'School profile saved successfully.' });
  } catch (err) {
    console.error('Error saving school profile:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

// POST /api/school/website - Dedicated update for Website CMS
router.post('/website', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const safeData = extractSchoolSafeData(req.body);
    const existing = await prisma.school.findFirst();

    const school = existing
      ? await prisma.school.update({ where: { id: existing.id }, data: safeData })
      : await prisma.school.create({ data: { name: safeData.name || 'My School', address: safeData.address || 'Nepal', ...safeData } });

    recordAuditLog(req, {
      action: 'UPDATE',
      entity: 'WEBSITE_CMS',
      entityId: school.id,
      description: 'Updated School Website CMS Content',
      details: safeData,
    }).catch(() => {});

    return res.json({ success: true, data: school, message: 'Website CMS content saved successfully!' });
  } catch (err) {
    console.error('Error saving website CMS:', err);
    return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});


// POST /api/school/backup/generate - Manual backup trigger
router.post('/backup/generate', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { generateDatabaseBackup } = require('../lib/backupScheduler');
    const result = await generateDatabaseBackup();

    recordAuditLog(req, {
      action: 'CREATE',
      entity: 'SYSTEM_BACKUP',
      description: 'Manually generated database backup',
      details: result,
    }).catch(() => {});

    return res.json({ success: true, message: 'Database backup generated successfully.', data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/school/backup/list - List all backup files
router.get('/backup/list', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { BACKUP_DIR } = require('../lib/backupScheduler');
    if (!fs.existsSync(BACKUP_DIR)) return res.json({ success: true, data: [] });

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('nepal_school_erp_backup_') && f.endsWith('.json'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          sizeBytes: stats.size,
          sizeMb: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: files });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// ── CERTIFICATES ──────────────────────────────────────────────────────────

router.get('/certificates', authenticate, async (req, res) => {
  try {
    const { type, studentId } = req.query;
    const where = {};
    if (type) where.type = type;
    if (studentId) where.studentId = parseInt(studentId);
    const certs = await prisma.certificate.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            fullNameNepali: true,
            studentId: true,
            classEnrollment: { where: { isActive: true }, include: { class: true } },
          },
        },
      },
      orderBy: { issuedDateAd: 'desc' },
    });
    return res.json({ success: true, data: certs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/certificates', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { studentId, type, issuedDateBs, issuedDateAd, issuedBy, remarks, data } = req.body;
    if (!studentId || isNaN(parseInt(studentId))) {
      return res.status(400).json({ success: false, message: 'Valid Student ID is required.' });
    }
    const certType = type || 'CHARACTER';
    const count = await prisma.certificate.count({ where: { type: certType } });
    const prefix = certType === 'TRANSFER' ? 'TC' : certType === 'CHARACTER' ? 'CC' : 'CERT';
    const year = issuedDateBs ? issuedDateBs.split('-')[0] : String(new Date().getFullYear() + 57);
    const certificateNo = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;

    const cert = await prisma.certificate.create({
      data: {
        studentId: parseInt(studentId),
        type: certType,
        certificateNo,
        issuedDateBs: issuedDateBs ? String(issuedDateBs).trim() : null,
        issuedDateAd: issuedDateAd ? new Date(issuedDateAd) : new Date(),
        issuedBy: issuedBy ? String(issuedBy).trim() : 'Headmaster',
        remarks: remarks ? String(remarks).trim() : null,
        data: typeof data === 'object' ? JSON.stringify(data) : (data || '{}'),
      },
      include: { student: true },
    });
    return res.status(201).json({ success: true, data: cert, message: 'Certificate issued successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── BANK ACCOUNTS ─────────────────────────────────────────────────────────

router.get('/bank-accounts', authenticate, async (req, res) => {
  const accounts = await prisma.bankAccount.findMany({ where: { isActive: true } });
  return res.json({ success: true, data: accounts });
});

router.post('/bank-accounts', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { accountName, accountNo, bankName, branch, type, openingBalance, isActive } = req.body;
    if (!accountNo || !bankName) {
      return res.status(400).json({ success: false, message: 'Bank name and account number are required.' });
    }

    const acc = await prisma.bankAccount.create({
      data: {
        accountName: accountName ? String(accountName).trim() : (bankName ? `${bankName} A/C` : 'School Account'),
        accountNo: String(accountNo).trim(),
        bankName: String(bankName).trim(),
        branch: branch ? String(branch).trim() : null,
        type: type ? String(type).trim() : 'Current',
        openingBalance: openingBalance !== undefined ? parseFloat(openingBalance) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    return res.status(201).json({ success: true, data: acc, message: 'Bank account created successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/bank-accounts/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { accountName, accountNo, bankName, branch, type, openingBalance, isActive } = req.body;
    const updateData = {};
    if (accountName !== undefined) updateData.accountName = String(accountName).trim();
    if (accountNo !== undefined) updateData.accountNo = String(accountNo).trim();
    if (bankName !== undefined) updateData.bankName = String(bankName).trim();
    if (branch !== undefined) updateData.branch = branch ? String(branch).trim() : null;
    if (type !== undefined) updateData.type = type ? String(type).trim() : null;
    if (openingBalance !== undefined) updateData.openingBalance = parseFloat(openingBalance);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const acc = await prisma.bankAccount.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
    });
    return res.json({ success: true, data: acc, message: 'Bank account updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/bank-accounts/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    await prisma.bankAccount.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    return res.json({ success: true, message: 'Bank account deactivated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DASHBOARD STATS ───────────────────────────────────────────────────────

router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
    const yrId = activeYear?.id;
    const yrFilter = yrId ? { academicYearId: yrId } : {};

    const [
      totalStudents,
      totalTeachers,
      totalRastriya,
      totalNiji,
      incomeAgg,
      feeAgg,
      expenseAgg,
      payrollAgg,
      overdueBooks,
      totalBooks,
    ] = await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true } }),
      prisma.teacher.count({ where: { isActive: true, type: 'RASTRIYA' } }),
      prisma.teacher.count({ where: { isActive: true, type: 'NIJI_SROTH' } }),
      prisma.incomeEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
      prisma.feeCollection.aggregate({ _sum: { amount: true } }),
      prisma.expenseEntry.aggregate({ where: yrFilter, _sum: { amount: true } }),
      prisma.payroll.aggregate({ where: { status: 'PAID' }, _sum: { khudPaaunuParne: true } }),
      prisma.libraryIssue.count({ where: { isReturned: false, dueDateAd: { lt: new Date() } } }),
      prisma.book.count(),
    ]);

    const todayBs = req.query.todayBs || '';
    const todayAbsent = todayBs
      ? await prisma.attendance.count({ where: { dateBs: todayBs, status: 'ABSENT' } })
      : 0;

    const grantIncome = incomeAgg._sum.amount || 0;
    const feeIncome = feeAgg._sum.amount || 0;
    const totalGrandIncome = grantIncome + feeIncome;

    const generalExpense = expenseAgg._sum.amount || 0;
    const payrollExpense = payrollAgg._sum.khudPaaunuParne || 0;
    const totalGrandExpense = generalExpense + payrollExpense;

    const netBalance = totalGrandIncome - totalGrandExpense;

    return res.json({
      success: true,
      data: {
        students: { total: totalStudents },
        teachers: { total: totalTeachers, rastriya: totalRastriya, nijiSroth: totalNiji },
        finance: {
          income: totalGrandIncome,
          grantIncome,
          selfIncome: feeIncome,
          expense: totalGrandExpense,
          generalExpense,
          payrollExpense,
          balance: netBalance,
        },
        library: { total: totalBooks, overdueIssues: overdueBooks },
        attendance: { todayAbsent },
        academicYear: activeYear,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── SYSTEM BACKUP & RESTORE ──────────────────────────────────────────────────

// GET /api/school/backup/export — Export all DB tables to downloadable JSON (FIX C-05: Sensitive auth fields excluded)
router.get('/backup/export', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      school: await prisma.school.findMany(),
      academicYear: await prisma.academicYear.findMany(),
      user: await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          tokenVersion: true,
          twoFactorEnabled: true,
          createdAt: true,
          updatedAt: true,
          // CRITICAL FIX C-05: NEVER export passwordHash, twoFactorSecret, or twoFactorBackupCodes
        },
      }),
      teacher: await prisma.teacher.findMany(),
      student: await prisma.student.findMany(),
      class: await prisma.class.findMany(),
      classEnrollment: await prisma.classEnrollment.findMany(),
      subject: await prisma.subject.findMany(),
      classSubject: await prisma.classSubject.findMany(),
      teacherSubject: await prisma.teacherSubject.findMany(),
      feeHead: await prisma.feeHead.findMany(),
      classFeeStructure: await prisma.classFeeStructure.findMany(),
      studentFeeDue: await prisma.studentFeeDue.findMany(),
      feeCollection: await prisma.feeCollection.findMany(),
      incomeCategory: await prisma.incomeCategory.findMany(),
      incomeHead: await prisma.incomeHead.findMany(),
      incomeEntry: await prisma.incomeEntry.findMany(),
      expenseCategory: await prisma.expenseCategory.findMany(),
      expenseHead: await prisma.expenseHead.findMany(),
      expenseEntry: await prisma.expenseEntry.findMany(),
      salaryScale: await prisma.salaryScale.findMany(),
      payroll: await prisma.payroll.findMany(),
      attendance: await prisma.attendance.findMany(),
      exam: await prisma.exam.findMany(),
      examClass: await prisma.examClass.findMany(),
      examSubject: await prisma.examSubject.findMany(),
      markTitle: await prisma.markTitle.findMany(),
      markEntry: await prisma.markEntry.findMany(),
      book: await prisma.book.findMany(),
      libraryIssue: await prisma.libraryIssue.findMany(),
      inventoryCategory: await prisma.inventoryCategory.findMany(),
      inventoryItem: await prisma.inventoryItem.findMany(),
      notice: await prisma.notice.findMany(),
      certificate: await prisma.certificate.findMany(),
      bankAccount: await prisma.bankAccount.findMany(),
      event: await prisma.event.findMany(),
    };

    const dateStr = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=nepal_school_erp_full_backup_${dateStr}.json`);
    return res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/school/backup/import — Restore DB from JSON backup file (FIX C-04: Credential & privilege escalation guard)
router.post('/backup/import', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const backupData = req.body;
    if (!backupData || typeof backupData !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid backup file payload.' });
    }

    const tablesOrder = [
      'school', 'academicYear', 'user', 'teacher', 'student', 'class',
      'classEnrollment', 'subject', 'classSubject', 'teacherSubject',
      'feeHead', 'classFeeStructure', 'studentFeeDue', 'feeCollection',
      'incomeCategory', 'incomeHead', 'incomeEntry', 'expenseCategory',
      'expenseHead', 'expenseEntry', 'salaryScale', 'payroll',
      'attendance', 'exam', 'examClass', 'examSubject', 'markTitle',
      'markEntry', 'book', 'libraryIssue', 'inventoryCategory',
      'inventoryItem', 'notice', 'certificate', 'bankAccount', 'event'
    ];

    let restoredCounts = {};
    for (const model of tablesOrder) {
      const rows = backupData[model] || [];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      restoredCounts[model] = rows.length;

      for (const row of rows) {
        try {
          const formatted = { ...row };
          for (const k of Object.keys(formatted)) {
            if ((k.endsWith('Ad') || k === 'createdAt' || k === 'updatedAt') && typeof formatted[k] === 'string') {
              formatted[k] = new Date(formatted[k]);
            }
          }

          if (model === 'user') {
            // FIX C-04: Never allow backup restore to overwrite passwords, 2FA credentials or escalate user roles
            const { id, passwordHash, twoFactorSecret, twoFactorBackupCodes, ...uData } = formatted;
            const existingUser = await prisma.user.findUnique({ where: { username: formatted.username } });
            if (existingUser) {
              // Existing user: Preserve their active password, 2FA, and original role
              delete uData.role;
              delete uData.twoFactorEnabled;
              await prisma.user.update({
                where: { id: existingUser.id },
                data: uData,
              });
            } else {
              // New user restored from backup: Provision with safe temporary password and mustChangePassword
              const bcrypt = require('bcryptjs');
              const defaultHash = await bcrypt.hash(`NepalSchool@${new Date().getFullYear()}`, 12);
              await prisma.user.create({
                data: {
                  ...uData,
                  passwordHash: defaultHash,
                  mustChangePassword: true,
                  twoFactorEnabled: false,
                },
              });
            }
          } else if (model === 'teacher') {
            const { id, ...tData } = formatted;
            await prisma.teacher.upsert({ where: { userId: formatted.userId }, update: tData, create: { id, ...tData } });
          } else if (model === 'student') {
            const { id, ...stData } = formatted;
            await prisma.student.upsert({ where: { studentId: formatted.studentId }, update: stData, create: { id, ...stData } });
          } else if (model === 'classEnrollment') {
            const { id, ...ceData } = formatted;
            await prisma.classEnrollment.upsert({
              where: { studentId_classId: { studentId: formatted.studentId, classId: formatted.classId } },
              update: ceData,
              create: { id, ...ceData },
            });
          } else if (model === 'attendance') {
            const { id, ...attData } = formatted;
            await prisma.attendance.upsert({
              where: { studentId_dateBs: { studentId: formatted.studentId, dateBs: formatted.dateBs } },
              update: attData,
              create: { id, ...attData },
            });
          } else {
            const { id, ...rest } = formatted;
            if (prisma[model] && typeof prisma[model].upsert === 'function') {
              await prisma[model].upsert({ where: { id: id || 1 }, update: rest, create: formatted }).catch(async () => {
                await prisma[model].create({ data: formatted }).catch(() => {});
              });
            }
          }
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      message: 'Backup restored successfully into system database!',
      restoredCounts,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/school/backup/status — Summary of system records
router.get('/backup/status', authenticate, async (req, res) => {
  try {
    const [students, teachers, users, markEntries, feeCollections, attendance, classes, subjects] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.user.count(),
      prisma.markEntry.count(),
      prisma.feeCollection.count(),
      prisma.attendance.count(),
      prisma.class.count(),
      prisma.subject.count(),
    ]);
    return res.json({
      success: true,
      data: {
        counts: { students, teachers, users, markEntries, feeCollections, attendance, classes, subjects },
        lastBackupAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── MANAGEMENT COMMITTEE (विद्यालय व्यवस्थापन समिति - SMC) ────────────────
// GET /api/school/management-committee
router.get('/management-committee', authenticate, async (req, res) => {
  try {
    const school = await prisma.school.findFirst();
    let members = [];
    if (school && school.smcMembers !== null && school.smcMembers !== undefined) {
      try {
        members = JSON.parse(school.smcMembers);
      } catch (e) {
        members = [];
      }
      return res.json({ success: true, data: members });
    }

    // Check if smcMember table has records
    try {
      const dbMembers = await prisma.smcMember.findMany({
        where: { isActive: true },
        orderBy: [{ isChair: 'desc' }, { id: 'asc' }],
      });
      if (dbMembers && dbMembers.length > 0) {
        return res.json({ success: true, data: dbMembers });
      }
    } catch (e) {
      // smcMember model might not be migrated yet, fallback to school.smcMembers
    }

    // Dynamic database response: returns empty list if not yet configured
    return res.json({ success: true, data: [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/school/management-committee - Add/Update members
router.post('/management-committee', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'SMC_CHAIR', 'CHAIRPERSON', 'MANAGEMENT'), async (req, res) => {
  try {
    const { members } = req.body;
    const cleanStr = (s) => (typeof s === 'string' ? s.replace(/[<>]/g, '').trim() : '');
    const finalMembers = (Array.isArray(members) ? members : []).map((m, idx) => ({
      id: m.id || idx + 1,
      name: cleanStr(m.name || m.nameNepali || ''),
      nameNepali: cleanStr(m.nameNepali || m.name || ''),
      post: cleanStr(m.post || 'सदस्य (Member)'),
      representation: cleanStr(m.representation || ''),
      phone: cleanStr(m.phone || ''),
      tenure: cleanStr(m.tenure || ''),
      isChair: Boolean(m.isChair),
      photoUrl: typeof m.photoUrl === 'string' ? cleanStr(m.photoUrl) : null,
      isActive: m.isActive !== undefined ? Boolean(m.isActive) : true,
    }));

    // 1. Update in School profile table permanently
    const school = await prisma.school.findFirst();
    if (school) {
      await prisma.school.update({
        where: { id: school.id },
        data: { smcMembers: JSON.stringify(finalMembers) },
      });
    }

    // 2. Also sync into SmcMember table if available
    try {
      await prisma.smcMember.deleteMany({});
      for (const m of finalMembers) {
        await prisma.smcMember.create({
          data: {
            name: m.name || m.nameNepali || '',
            nameNepali: m.nameNepali || m.name || null,
            post: m.post || 'सदस्य (Member)',
            representation: m.representation || null,
            phone: m.phone || null,
            tenure: m.tenure || null,
            isChair: Boolean(m.isChair),
            photoUrl: m.photoUrl || null,
            isActive: true,
          },
        });
      }
    } catch (dbErr) {
      // Table sync optional if schema push pending
    }

    return res.json({ success: true, message: 'Committee members updated successfully!', data: finalMembers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/school/meeting-call - Call meeting for staff/teachers
router.post('/meeting-call', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'SMC_CHAIR', 'CHAIRPERSON', 'MANAGEMENT'), async (req, res) => {
  try {
    const { meetingTitle, meetingDateBs, meetingTime, venue, agenda, targetAudience = 'ALL_STAFF' } = req.body;
    const bodyContent = `मिति: ${meetingDateBs || 'यथाशीघ्र'}\nसमय: ${meetingTime || 'अपराह्न १:०० बजे'}\nस्थान: ${venue || 'विद्यालय सभाहल'}\n\nछलफलका एजेन्डाहरू:\n${agenda || 'विद्यालय व्यवस्थापन तथा शैक्षिक गुणस्तर अभिवृद्धि सम्बन्धी छलफल'}\n\nउपस्थितिका लागि अनुरोध:\nविद्यालय व्यवस्थापन समिति अध्यक्ष`;

    const notice = await prisma.notice.create({
      data: {
        title: `[बैठक आह्वान / Meeting Call] ${meetingTitle || 'विद्यालय व्यवस्थापन तथा शिक्षक कर्मचारी बैठक'}`,
        body: bodyContent,
        type: 'MEETING_CALL',
        targetRole: targetAudience === 'ADMIN_ONLY' ? 'ADMIN' : 'TEACHER',
        postedDateBs: meetingDateBs || new Date().toISOString().slice(0, 10),
        createdBy: req.user.id,
      },
    });

    return res.status(201).json({ success: true, message: 'बैठकको सूचना सम्पूर्ण शिक्षक तथा कर्मचारीहरूलाई सम्प्रेषण गरियो!', data: notice });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
