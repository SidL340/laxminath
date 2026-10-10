const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_MASTER_SEEDS = [
  // 1. TEACHER_TYPE
  { category: 'TEACHER_TYPE', code: 'RASTRIYA', title: 'स्थायी / सरकारी (Permanent / Government)', titleNepali: 'स्थायी / सरकारी', displayOrder: 1, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'ASTHAYI', title: 'अस्थायी (Temporary)', titleNepali: 'अस्थायी', displayOrder: 2, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'RAHAT', title: 'राहत शिक्षक अनुदान (Rahat Grant)', titleNepali: 'राहत अनुदान', displayOrder: 3, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'KARAR', title: 'करार सेवा (Contract Staff)', titleNepali: 'करार सेवा', displayOrder: 4, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'BALVIKAS', title: 'प्रारम्भिक बालविकास (ECED / Pre-Primary)', titleNepali: 'बालविकास (ECED)', displayOrder: 5, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'NIJI_SROTH', title: 'निजी स्रोत (Private / School Source)', titleNepali: 'निजी स्रोत', displayOrder: 6, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'SWAYAMSEWAK', title: 'शिक्षण स्वयंसेवक (Teaching Volunteer)', titleNepali: 'शिक्षण स्वयंसेवक', displayOrder: 7, isSystem: true },
  { category: 'TEACHER_TYPE', code: 'SPECIAL_GRANT', title: 'विशेष अनुदान / प्राविधिक धार (Special Grant)', titleNepali: 'विशेष अनुदान', displayOrder: 8, isSystem: true },

  // 2. POST (पद / पदवी)
  { category: 'POST', code: 'HEADMASTER', title: 'प्रधानाध्यापक (Headmaster / Principal)', titleNepali: 'प्रधानाध्यापक', displayOrder: 1, isSystem: true },
  { category: 'POST', code: 'ASSISTANT_HEADMASTER', title: 'सहायक प्रधानाध्यापक (Assistant Headmaster / Vice Principal)', titleNepali: 'सहायक प्रधानाध्यापक', displayOrder: 2, isSystem: true },
  { category: 'POST', code: 'SECONDARY_TEACHER', title: 'माध्यमिक तह शिक्षक (Secondary Teacher)', titleNepali: 'माध्यमिक शिक्षक', displayOrder: 3, isSystem: true },
  { category: 'POST', code: 'LOWER_SECONDARY_TEACHER', title: 'निम्न माध्यमिक तह शिक्षक (Lower Secondary Teacher)', titleNepali: 'निम्न माध्यमिक शिक्षक', displayOrder: 4, isSystem: true },
  { category: 'POST', code: 'PRIMARY_TEACHER', title: 'प्राथमिक तह शिक्षक (Primary Teacher)', titleNepali: 'प्राथमिक शिक्षक', displayOrder: 5, isSystem: true },
  { category: 'POST', code: 'ECED_TEACHER', title: 'बालविकास सहजकर्ता (ECED Facilitator)', titleNepali: 'बालविकास सहजकर्ता', displayOrder: 6, isSystem: true },
  { category: 'POST', code: 'ACCOUNTANT', title: 'लेखापाल (Accountant / Admin Head)', titleNepali: 'लेखापाल', displayOrder: 7, isSystem: true },
  { category: 'POST', code: 'OFFICE_ASSISTANT', title: 'कार्यालय सहायक / कम्प्युटर अपरेटर (Office Assistant)', titleNepali: 'कार्यालय सहायक', displayOrder: 8, isSystem: true },
  { category: 'POST', code: 'OFFICE_HELPER', title: 'कार्यालय सहयोगी / पियन (Office Helper / Peon)', titleNepali: 'कार्यालय सहयोगी', displayOrder: 9, isSystem: true },
  { category: 'POST', code: 'SECURITY_GUARD', title: 'सुरक्षा गार्ड / सहयोगी (Security Guard)', titleNepali: 'सुरक्षा गार्ड', displayOrder: 10, isSystem: true },

  // 3. INCHARGE_ROLE (जिम्मेवारी / पदभार)
  { category: 'INCHARGE_ROLE', code: 'PRINCIPAL', title: 'प्रधानाध्यापक (Principal)', titleNepali: 'प्रधानाध्यापक', displayOrder: 1, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'VICE_PRINCIPAL', title: 'सहायक प्रधानाध्यापक (Vice Principal)', titleNepali: 'सहायक प्रधानाध्यापक', displayOrder: 2, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'SECONDARY_INCHARGE', title: 'माध्यमिक तह इन्चार्ज (Secondary Incharge)', titleNepali: 'मावि इन्चार्ज', displayOrder: 3, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'LOWER_SECONDARY_INCHARGE', title: 'निम्न माध्यमिक तह इन्चार्ज (Lower Sec Incharge)', titleNepali: 'निमावि इन्चार्ज', displayOrder: 4, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'PRIMARY_INCHARGE', title: 'प्राथमिक तह इन्चार्ज (Primary Incharge)', titleNepali: 'प्रावि इन्चार्ज', displayOrder: 5, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'EXAM_INCHARGE', title: 'परीक्षा शाखा प्रमुख (Exam Incharge)', titleNepali: 'परीक्षा शाखा प्रमुख', displayOrder: 6, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'ACCOUNTANT', title: 'लेखापाल / आर्थिक प्रशासन प्रमुख (Accountant)', titleNepali: 'लेखा प्रमुख', displayOrder: 7, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'LIBRARIAN', title: 'पुस्तकालय प्रमुख (Librarian)', titleNepali: 'पुस्तकालय प्रमुख', displayOrder: 8, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'DISCIPLINE_INCHARGE', title: 'अनुशासन प्रमुख (Discipline Incharge)', titleNepali: 'अनुशासन प्रमुख', displayOrder: 9, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'ECA_INCHARGE', title: 'अतिरिक्त क्रियाकलाप तथा खेलकुद प्रमुख (ECA Incharge)', titleNepali: 'अतिरिक्त क्रियाकलाप प्रमुख', displayOrder: 10, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'LAB_INCHARGE', title: 'विज्ञान तथा कम्प्युटर ल्याब इन्चार्ज (Lab Incharge)', titleNepali: 'ल्याब इन्चार्ज', displayOrder: 11, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'ACADEMIC_COORDINATOR', title: 'शैक्षिक संयोजक (Academic Coordinator)', titleNepali: 'शैक्षिक संयोजक', displayOrder: 12, isSystem: true },
  { category: 'INCHARGE_ROLE', code: 'OTHER', title: 'अन्य विशेष जिम्मेवारी (Other Incharge Role)', titleNepali: 'अन्य जिम्मेवारी', displayOrder: 13, isSystem: true },

  // 4. TAHA (तह / Level)
  { category: 'TAHA', code: 'माध्यमिक तह', title: 'माध्यमिक तह (Secondary Level 9-12)', titleNepali: 'माध्यमिक तह', displayOrder: 1, isSystem: true },
  { category: 'TAHA', code: 'निम्न माध्यमिक तह', title: 'निम्न माध्यमिक तह (Lower Secondary Level 6-8)', titleNepali: 'निम्न माध्यमिक तह', displayOrder: 2, isSystem: true },
  { category: 'TAHA', code: 'प्राथमिक तह', title: 'प्राथमिक तह (Primary Level 1-5)', titleNepali: 'प्राथमिक तह', displayOrder: 3, isSystem: true },
  { category: 'TAHA', code: 'पूर्व प्राथमिक तह', title: 'पूर्व प्राथमिक तह (Early Childhood ECED)', titleNepali: 'पूर्व प्राथमिक तह', displayOrder: 4, isSystem: true },
  { category: 'TAHA', code: 'प्रशासन तथा प्राविधिक तह', title: 'प्रशासन तथा प्राविधिक तह (Admin/IT)', titleNepali: 'प्रशासन तथा प्राविधिक', displayOrder: 5, isSystem: true },
  { category: 'TAHA', code: 'कार्यालय सहयोगी तह', title: 'कार्यालय सहयोगी तह (Support Staff)', titleNepali: 'कार्यालय सहयोगी तह', displayOrder: 6, isSystem: true },

  // 5. SHRENI (श्रेणी / Category)
  { category: 'SHRENI', code: 'प्रथम श्रेणी', title: 'प्रथम श्रेणी (First Class)', titleNepali: 'प्रथम श्रेणी', displayOrder: 1, isSystem: true },
  { category: 'SHRENI', code: 'द्वितीय श्रेणी', title: 'द्वितीय श्रेणी (Second Class)', titleNepali: 'द्वितीय श्रेणी', displayOrder: 2, isSystem: true },
  { category: 'SHRENI', code: 'तृतीय श्रेणी', title: 'तृतीय श्रेणी (Third Class)', titleNepali: 'तृतीय श्रेणी', displayOrder: 3, isSystem: true },
  { category: 'SHRENI', code: 'विशिष्ट श्रेणी', title: 'विशिष्ट श्रेणी (Special Class)', titleNepali: 'विशिष्ट श्रेणी', displayOrder: 4, isSystem: true },
  { category: 'SHRENI', code: 'पाँचौं तह', title: 'पाँचौं तह (5th Level)', titleNepali: 'पाँचौं तह', displayOrder: 5, isSystem: true },
  { category: 'SHRENI', code: 'चौथो तह', title: 'चौथो तह (4th Level)', titleNepali: 'चौथो तह', displayOrder: 6, isSystem: true },
  { category: 'SHRENI', code: 'श्रेणीविहीन', title: 'श्रेणीविहीन (Non-Graded / Non-Teaching)', titleNepali: 'श्रेणीविहीन', displayOrder: 7, isSystem: true },

  // 6. BANK_NAME (बैंकहरूको नाम)
  { category: 'BANK_NAME', code: 'MBL', title: 'Machhapuchchhre Bank Ltd (माछापुच्छ्रे बैंक)', titleNepali: 'माछापुच्छ्रे बैंक लिमिटेड', displayOrder: 1, isSystem: true },
  { category: 'BANK_NAME', code: 'RBB', title: 'Rastriya Banijya Bank (राष्ट्रिय वाणिज्य बैंक)', titleNepali: 'राष्ट्रिय वाणिज्य बैंक', displayOrder: 2, isSystem: true },
  { category: 'BANK_NAME', code: 'NBL', title: 'Nepal Bank Limited (नेपाल बैंक लिमिटेड)', titleNepali: 'नेपाल बैंक लिमिटेड', displayOrder: 3, isSystem: true },
  { category: 'BANK_NAME', code: 'ADBL', title: 'Agricultural Development Bank (कृषि विकास बैंक)', titleNepali: 'कृषि विकास बैंक', displayOrder: 4, isSystem: true },
  { category: 'BANK_NAME', code: 'NIC_ASIA', title: 'NIC Asia Bank Ltd (एनआईसी एशिया बैंक)', titleNepali: 'एनआईसी एशिया बैंक लिमिटेड', displayOrder: 5, isSystem: true },
  { category: 'BANK_NAME', code: 'NABIL', title: 'Nabil Bank Ltd (नबिल बैंक)', titleNepali: 'नबिल बैंक लिमिटेड', displayOrder: 6, isSystem: true },
  { category: 'BANK_NAME', code: 'GLOBAL_IME', title: 'Global IME Bank Ltd (ग्लोबल आईएमई बैंक)', titleNepali: 'ग्लोबल आईएमई बैंक लिमिटेड', displayOrder: 7, isSystem: true },
  { category: 'BANK_NAME', code: 'PRABHU', title: 'Prabhu Bank Ltd (प्रभु बैंक)', titleNepali: 'प्रभु बैंक लिमिटेड', displayOrder: 8, isSystem: true },
  { category: 'BANK_NAME', code: 'EVEREST', title: 'Everest Bank Ltd (एभरेष्ट बैंक)', titleNepali: 'एभरेष्ट बैंक लिमिटेड', displayOrder: 9, isSystem: true },
  { category: 'BANK_NAME', code: 'SANIMA', title: 'Sanima Bank Ltd (सानिमा बैंक)', titleNepali: 'सानिमा बैंक लिमिटेड', displayOrder: 10, isSystem: true },
  { category: 'BANK_NAME', code: 'CITIZENS', title: 'Citizens Bank International (सिटिजन्स बैंक)', titleNepali: 'सिटिजन्स बैंक इन्टरनेसनल', displayOrder: 11, isSystem: true },
  { category: 'BANK_NAME', code: 'HIMALAYAN', title: 'Himalayan Bank Ltd (हिमालयन बैंक)', titleNepali: 'हिमालयन बैंक लिमिटेड', displayOrder: 12, isSystem: true },
];

// Helper to ensure default master seeds exist
async function ensureMasterSeeds() {
  const count = await prisma.staffMasterOption.count();
  if (count === 0) {
    for (const item of DEFAULT_MASTER_SEEDS) {
      await prisma.staffMasterOption.create({
        data: {
          ...item,
          isActive: true,
        },
      }).catch(() => {});
    }
  }
}

// ── GET /api/teachers/masters/options — Fetch all or by category ────────────────
router.get('/options', authenticate, async (req, res) => {
  try {
    await ensureMasterSeeds();
    const { category, includeInactive } = req.query;
    const where = {};
    if (category) where.category = category;
    if (includeInactive !== 'true') where.isActive = true;

    const options = await prisma.staffMasterOption.findMany({
      where,
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    });

    // Group by category
    const grouped = options.reduce((acc, opt) => {
      if (!acc[opt.category]) acc[opt.category] = [];
      acc[opt.category].push(opt);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: options,
      grouped,
    });
  } catch (err) {
    console.error('Error fetching master options:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teachers/masters/options — Create new dropdown head/option ────────
router.post('/options', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const { category, code, title, titleNepali, description, displayOrder = 0, isActive = true } = req.body;

    if (!category || !code || !title) {
      return res.status(400).json({ success: false, message: 'Category, Code र Title अनिवार्य छन्।' });
    }

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await prisma.staffMasterOption.findUnique({
      where: { category_code: { category, code: cleanCode } },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `यो शीर्षक वा कोड "${cleanCode}" पहिले नै दर्ता भइसकेको छ।` });
    }

    const newOpt = await prisma.staffMasterOption.create({
      data: {
        category,
        code: cleanCode,
        title: title.trim(),
        titleNepali: titleNepali ? titleNepali.trim() : title.trim(),
        description: description ? description.trim() : null,
        displayOrder: parseInt(displayOrder) || 0,
        isActive: Boolean(isActive),
        isSystem: false,
      },
    });

    return res.status(201).json({
      success: true,
      data: newOpt,
      message: `नयाँ मास्टर शीर्षक "${newOpt.title}" सफलतापूर्वक थपियो!`,
    });
  } catch (err) {
    console.error('Error creating master option:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/teachers/masters/options/:id — Update existing master option ───────
router.put('/options/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, titleNepali, description, displayOrder, isActive } = req.body;

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (titleNepali !== undefined) data.titleNepali = titleNepali.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (displayOrder !== undefined) data.displayOrder = parseInt(displayOrder);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await prisma.staffMasterOption.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: updated,
      message: `मास्टर शीर्षक "${updated.title}" सफलतापूर्वक अद्यावधिक गरियो।`,
    });
  } catch (err) {
    console.error('Error updating master option:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/teachers/masters/options/:id — Delete master option ────────────
router.delete('/options/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.staffMasterOption.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

    await prisma.staffMasterOption.delete({ where: { id } });
    return res.json({ success: true, message: `मास्टर शीर्षक "${existing.title}" सफलतापूर्वक हटाइयो।` });
  } catch (err) {
    console.error('Error deleting master option:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/teachers/masters/seed-defaults — Reset / Seed all standard defaults
router.post('/seed-defaults', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    let seeded = 0;
    for (const item of DEFAULT_MASTER_SEEDS) {
      const exists = await prisma.staffMasterOption.findUnique({
        where: { category_code: { category: item.category, code: item.code } },
      });
      if (!exists) {
        await prisma.staffMasterOption.create({
          data: { ...item, isActive: true },
        });
        seeded++;
      }
    }

    const allOptions = await prisma.staffMasterOption.findMany({
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }, { id: 'asc' }],
    });

    return res.json({
      success: true,
      data: allOptions,
      message: `नेपाल सरकार तथा विद्यालय मानक मास्टर शीर्षकहरू सुरक्षित गरियो! (${seeded} नयाँ थपिए)`,
    });
  } catch (err) {
    console.error('Error seeding defaults:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = {
  router,
  ensureMasterSeeds,
  DEFAULT_MASTER_SEEDS,
};
