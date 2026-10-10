const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Nepal School ERP database...');

  // ── School Profile ──────────────────────────────────────────────────────
  await prisma.school.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Nepal Model Secondary School',
      nameNepali: 'नेपाल आदर्श माध्यमिक विद्यालय',
      shortName: 'NMSS',
      address: 'Kathmandu, Bagmati Province, Nepal',
      addressNepali: 'काठमाडौं, बागमती प्रदेश, नेपाल',
      district: 'Kathmandu',
      province: 'Bagmati',
      municipality: 'Kathmandu Metropolitan City',
      wardNo: '01',
      emisCode: '320160001',
      phone: '+977-01-4000000',
      email: 'info@school.edu.np',
      website: 'https://school.edu.np',
      level: 'Secondary (माध्यमिक १-१२)',
      type: 'Community (सामुदायिक)',
      estYear: '2060',
      logoUrl: '/school_logo.png',
      sealUrl: '/school_seal_red.png',
      motto: 'Quality Education for a Brighter Tomorrow',
      mottoNepali: 'गुणस्तरीय शिक्षा, समृद्ध भविष्य',
      principalName: 'Principal',
      principalNameNepali: 'प्रधानाध्यापक',
      principalMessage: 'Welcome to our institution. We are committed to fostering academic excellence, moral discipline, and 21st-century modern technology skills in our students.',
      principalMessageNepali: 'यस विद्यालयमा यहाँहरूलाई हार्दिक स्वागत गर्दछौं। हामी हाम्रा विद्यार्थीहरूलाई चरित्रवान, अनुशासित, सिर्जनशील तथा आधुनिक वैज्ञानिक प्रविधिमा अब्बल बनाउन निरन्तर समर्पित छौं।',
      heroBadge: 'नेपाल सरकार, शिक्षा मन्त्रालयद्वारा मान्यता प्राप्त',
      heroTitle: 'Excellence in Education & Character Building',
      heroTitleNepali: 'संस्कारयुक्त, प्रविधिमैत्री तथा गुणस्तरीय शिक्षाको उत्कृष्ट केन्द्र',
      heroSubtitle: 'Dedicated to inspiring students to achieve academic excellence and holistic personal development.',
      aboutTitle: 'हाम्रो विद्यालयको परिचय (About Our School)',
      aboutText: 'यस विद्यालय स्थापना कालदेखि नै विद्यार्थीहरूको चौतर्फी विकास, नैतिक मूल्य, आधुनिक वैज्ञानिक शिक्षा तथा व्यावहारिक ज्ञान प्रदान गर्न निरन्तर समर्पित छ।',
      aboutPoints: JSON.stringify([
        'सबल शैक्षिक वातावरण: राष्ट्रिय परीक्षा बोर्ड (NEB) तथा सरकारी पाठ्यक्रममा आधारित उत्कृष्ट शिक्षण पद्धति।',
        'डिजिटल तथा प्रविधिमैत्री: कम्प्युटर ल्याब, स्मार्ट बोर्ड, अनलाइन उपस्थिति तथा अत्याधुनिक ERP व्यवस्थापन।',
        'छात्रवृत्ति सुविधा: जेहेन्दार, विपन्न तथा महिला विद्यार्थीहरूका लागि विशेष छात्रवृत्ति व्यवस्था।',
      ]),
      stats: JSON.stringify([
        { label: 'अध्ययनरत विद्यार्थी (Students)', value: '1,200+' },
        { label: 'अनुभवी शिक्षक/कर्मचारी (Faculty)', value: '45+' },
        { label: 'परीक्षा सफलता (Results)', value: '100%' },
        { label: 'स्थापना वर्ष (Established)', value: '2060 B.S.' },
      ]),
      facilities: JSON.stringify([
        { id: '1', title: 'कम्प्युटर तथा आइटी ल्याब', description: 'इन्टरनेट जडित आधुनिक कम्प्युटरहरू तथा प्राविधिक सीप विकास कक्षा।', icon: 'Laptop' },
        { id: '2', title: 'विज्ञान प्रयोगशाला', description: 'भौतिकशास्त्र, रसायनशास्त्र तथा जीवविज्ञानका प्रयोगात्मक कक्षाहरूका लागि पूर्ण सामग्रीयुक्त ल्याब।', icon: 'FlaskConical' },
        { id: '3', title: 'समृद्ध पुस्तकालय', description: 'पाठ्यपुस्तक, सन्दर्भ ग्रन्थ, पत्रपत्रिका तथा सामान्य ज्ञानका हजारौं पुस्तकहरू।', icon: 'Library' },
        { id: '4', title: 'खेलकुद तथा अतिरिक्त क्रियाकलाप', description: 'फुटबल, भलिबल, ब्याडमिन्टन, वादविवाद तथा सांस्कृतिक कार्यक्रमहरू।', icon: 'Trophy' },
        { id: '5', title: 'सुरक्षित वातावरण र सीसीटीभी', description: 'चौबीसै घण्टा सीसीटीभी निगरानी, सुरक्षित कम्पाउन्ड तथा प्राथमिक उपचार।', icon: 'Shield' },
        { id: '6', title: 'यातायात / बस सुविधा', description: 'विद्यार्थीहरूको सुरक्षित आवतजावतका लागि व्यवस्थित यातायात।', icon: 'Bus' },
      ]),
      socialLinks: JSON.stringify({ facebook: '', youtube: '', twitter: '', instagram: '', mapEmbedUrl: '' }),
      admissionInfo: 'नयाँ शैक्षिक सत्रका लागि भर्ना खुला भएको छ।',
    },
  });
  console.log('✅ School profile seeded with full dynamic CMS content');

  // ── Academic Year ───────────────────────────────────────────────────────
  const year = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: {},
    create: { year: '2081-82', startDateBs: '2081-04-01', endDateBs: '2082-03-31', isActive: true },
  });
  console.log('✅ Academic year seeded:', year.year);

  // ── Admin User ──────────────────────────────────────────────────────────
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123';
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminHash, role: 'SUPER_ADMIN' },
    create: { username: 'admin', passwordHash: adminHash, role: 'SUPER_ADMIN' },
  });
  console.log(`✅ Default Super Admin created:`);
  console.log(`   Username: admin`);
  console.log(`   Password: ${adminPassword}`);

  // ── Income Categories & Heads ────────────────────────────────────────────
  const govBudgetCat = await prisma.incomeCategory.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Government Budget', nameNepali: 'सरकारी बजेट', type: 'GOVERNMENT_BUDGET' },
  });
  const ownSourceCat = await prisma.incomeCategory.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Own Source', nameNepali: 'आफ्नो स्रोत', type: 'OWN_SOURCE' },
  });
  const feeCat = await prisma.incomeCategory.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'Student Fee', nameNepali: 'विद्यार्थी शुल्क', type: 'STUDENT_FEE' },
  });
  console.log('✅ Income categories seeded');

  // Government budget heads
  const govHeads = [
    'Salary Budget (तलब)', 'Scholarship / SIP (छात्रवृत्ति)',
    'ICT Budget (सूचना प्रविधि)', 'Building Construction (भवन निर्माण)',
    'Book Corner (पुस्तक कुना)', 'Books / Diwakhaja (किताब)', 'Lab Budget (प्रयोगशाला)',
    'Maintenance (मर्मत सम्भार)', 'Internet (इन्टरनेट)',
  ];
  for (let i = 0; i < govHeads.length; i++) {
    await prisma.incomeHead.upsert({
      where: { id: 10 + i },
      update: {},
      create: { id: 10 + i, categoryId: govBudgetCat.id, name: govHeads[i] },
    });
  }

  // Own source heads
  const ownHeads = ['Pond Lease (पोखरी)', 'Land Lease (जग्गा)', 'Room Rent (कोठा भाडा)', 'Other Property Income'];
  for (let i = 0; i < ownHeads.length; i++) {
    await prisma.incomeHead.upsert({
      where: { id: 20 + i },
      update: {},
      create: { id: 20 + i, categoryId: ownSourceCat.id, name: ownHeads[i] },
    });
  }
  console.log('✅ Income heads seeded');

  // ── Expense Categories & Heads ───────────────────────────────────────────
  const expCats = [
    { id: 1, name: 'Salary', nameNepali: 'तलब भत्ता' },
    { id: 2, name: 'Scholarship / SIP', nameNepali: 'छात्रवृत्ति' },
    { id: 3, name: 'ICT & Internet', nameNepali: 'सूचना प्रविधि' },
    { id: 4, name: 'Stationery', nameNepali: 'स्टेशनरी' },
    { id: 5, name: 'Electricity & Water', nameNepali: 'बिजुली र पानी' },
    { id: 6, name: 'Maintenance', nameNepali: 'मर्मत सम्भार' },
    { id: 7, name: 'Construction', nameNepali: 'निर्माण' },
    { id: 8, name: 'Library', nameNepali: 'पुस्तकालय' },
    { id: 9, name: 'Lab', nameNepali: 'प्रयोगशाला' },
    { id: 10, name: 'Tour / Excursion', nameNepali: 'भ्रमण' },
    { id: 11, name: 'Events & Program', nameNepali: 'कार्यक्रम' },
    { id: 12, name: 'Bhata & Allowances', nameNepali: 'भत्ता' },
    { id: 13, name: 'SSK & Nagarik Lagani', nameNepali: 'संचय कोष र नागरिक लगानी' },
    { id: 14, name: 'Insurance (Bema)', nameNepali: 'बीमा' },
    { id: 15, name: 'Advance (Peshki)', nameNepali: 'पेश्की' },
    { id: 16, name: 'Other', nameNepali: 'अन्य' },
  ];
  for (const cat of expCats) {
    await prisma.expenseCategory.upsert({ where: { id: cat.id }, update: {}, create: cat });
  }

  const expHeads = [
    { categoryId: 1, name: 'Rastriya Teacher Salary' },
    { categoryId: 1, name: 'Niji Sroth Teacher Salary' },
    { categoryId: 1, name: 'Staff Salary' },
    { categoryId: 2, name: 'Scholarship Diwakhaja' },
    { categoryId: 2, name: 'Book Scholarship' },
    { categoryId: 3, name: 'ICT Equipment' },
    { categoryId: 3, name: 'Internet Bill' },
    { categoryId: 4, name: 'Paper & Stationery' },
    { categoryId: 4, name: 'Printer Ink / Toner' },
    { categoryId: 4, name: 'Registers & Files' },
    { categoryId: 5, name: 'Electricity Bill' },
    { categoryId: 5, name: 'Water Bill' },
    { categoryId: 6, name: 'Building Maintenance' },
    { categoryId: 6, name: 'Furniture Repair' },
    { categoryId: 6, name: 'Equipment Repair' },
    { categoryId: 7, name: 'Room Construction' },
    { categoryId: 7, name: 'Boundary Wall' },
    { categoryId: 7, name: 'Toilet Construction' },
    { categoryId: 8, name: 'Book Purchase' },
    { categoryId: 9, name: 'Lab Equipment' },
    { categoryId: 9, name: 'Lab Chemicals' },
    { categoryId: 10, name: 'Educational Tour' },
    { categoryId: 11, name: 'Prize Distribution' },
    { categoryId: 11, name: 'Atithi Satkar' },
    { categoryId: 11, name: 'Annual Program' },
    { categoryId: 12, name: 'Travel Allowance' },
    { categoryId: 12, name: 'Daily Allowance' },
    { categoryId: 13, name: 'Sanchaya Kosh Employer 20%' },
    { categoryId: 13, name: 'Nagarik Lagani Kosh' },
    { categoryId: 13, name: 'SSK Sapati' },
    { categoryId: 14, name: 'Life Insurance (Bema)' },
    { categoryId: 15, name: 'Peshki Given' },
    { categoryId: 16, name: 'Miscellaneous' },
  ];
  for (let i = 0; i < expHeads.length; i++) {
    await prisma.expenseHead.upsert({
      where: { id: 100 + i },
      update: {},
      create: { id: 100 + i, ...expHeads[i] },
    });
  }
  console.log('✅ Expense categories and heads seeded');

  // ── Fee Heads ───────────────────────────────────────────────────────────
  const feeHeads = [
    { name: 'Admission Fee', amount: 500 },
    { name: 'Monthly Fee', amount: 0 },
    { name: 'Exam Fee', amount: 200 },
    { name: 'ID Card Fee', amount: 100 },
    { name: 'Belt / Tie Fee', amount: 150 },
    { name: 'Lab Fee', amount: 300 },
    { name: 'Library Fee', amount: 100 },
    { name: 'Form Fee', amount: 50 },
    { name: 'Certificate Fee', amount: 200 },
    { name: 'Migration Fee', amount: 500 },
  ];
  for (let i = 0; i < feeHeads.length; i++) {
    await prisma.feeHead.upsert({
      where: { id: 200 + i },
      update: {},
      create: { id: 200 + i, ...feeHeads[i] },
    });
  }
  console.log('✅ Fee heads seeded');

  // ── Salary Scales (Nepal Government Standard Teacher Pay Scale) ──────────
  const scales = [
    { id: 1,  taha: 'मा.वि. प्रथम श्रेणी (MABI 1st)',         shreni: 'प्रथम',   moolTalab: 52270, gradeAmount: 1743 },
    { id: 2,  taha: 'मा.वि. द्वितीय श्रेणी (MABI 2nd)',       shreni: 'द्वितीय',  moolTalab: 43689, gradeAmount: 1457 },
    { id: 3,  taha: 'मा.वि. तृतीय श्रेणी (MABI 3rd)',        shreni: 'तृतीय',   moolTalab: 34730, gradeAmount: 1158 },
    { id: 4,  taha: 'नि.मा.वि. प्रथम श्रेणी (NIMABI 1st)',    shreni: 'प्रथम',   moolTalab: 34730, gradeAmount: 1158 },
    { id: 5,  taha: 'नि.मा.वि. द्वितीय श्रेणी (NIMABI 2nd)',  shreni: 'द्वितीय',  moolTalab: 32902, gradeAmount: 1097 },
    { id: 6,  taha: 'नि.मा.वि. तृतीय श्रेणी (NIMABI 3rd)',   shreni: 'तृतीय',   moolTalab: 30200, gradeAmount: 1007 },
    { id: 7,  taha: 'प्रा.वि. प्रथम श्रेणी (PRABI 1st)',      shreni: 'प्रथम',   moolTalab: 32902, gradeAmount: 1097 },
    { id: 8,  taha: 'प्रा.वि. द्वितीय श्रेणी (PRABI 2nd)',    shreni: 'द्वितीय',  moolTalab: 30200, gradeAmount: 1007 },
    { id: 9,  taha: 'प्रा.वि. तृतीय श्रेणी (PRABI 3rd)',     shreni: 'तृतीय',   moolTalab: 28610, gradeAmount: 954 },
    { id: 10, taha: 'उच्च मा.वि. राहत / करार (11-12 Rahat)', shreni: 'राहत',    moolTalab: 43689, gradeAmount: 1457 },
    { id: 11, taha: 'मा.वि. राहत शिक्षक (MABI Rahat)',        shreni: 'राहत',    moolTalab: 34730, gradeAmount: 1158 },
    { id: 12, taha: 'नि.मा.वि. राहत शिक्षक (NIMABI Rahat)',   shreni: 'राहत',    moolTalab: 30200, gradeAmount: 1007 },
    { id: 13, taha: 'प्रा.वि. राहत शिक्षक (PRABI Rahat)',     shreni: 'राहत',    moolTalab: 28610, gradeAmount: 954 },
    { id: 14, taha: 'बालविकास सहजकर्ता (ECD Teacher)',        shreni: 'करार',    moolTalab: 15000, gradeAmount: 500 },
    { id: 15, taha: 'निजी स्रोत शिक्षक (Private / Niji)',     shreni: 'निजी',    moolTalab: 25000, gradeAmount: 600 },
    { id: 16, taha: 'विद्यालय कर्मचारी / लेखापाल (Accountant)', shreni: 'प्रशासन',  moolTalab: 30200, gradeAmount: 1007 },
    { id: 17, taha: 'कार्यालय सहयोगी / पियन (Office Assistant)', shreni: 'सहयोगी', moolTalab: 24702, gradeAmount: 824 },
  ];
  for (const s of scales) {
    await prisma.salaryScale.upsert({
      where: { id: s.id },
      update: s,
      create: s,
    });
  }
  console.log('✅ Salary scales seeded (all Nepal school levels)');

  // ── Inventory Categories ─────────────────────────────────────────────────
  const invCats = ['Furniture', 'Electronics', 'Lab Equipment', 'Sports Equipment', 'Office Equipment', 'Musical Instruments'];
  for (let i = 0; i < invCats.length; i++) {
    await prisma.inventoryCategory.upsert({
      where: { id: i + 1 },
      update: {},
      create: { id: i + 1, name: invCats[i] },
    });
  }
  console.log('✅ Inventory categories seeded');

  // ── Subjects ─────────────────────────────────────────────────────────────
  const subjects = [
    { name: 'Nepali', nameNepali: 'नेपाली', code: 'NEP' },
    { name: 'English', nameNepali: 'अङ्ग्रेजी', code: 'ENG' },
    { name: 'Mathematics', nameNepali: 'गणित', code: 'MAT' },
    { name: 'Science', nameNepali: 'विज्ञान', code: 'SCI' },
    { name: 'Social Studies', nameNepali: 'सामाजिक अध्ययन', code: 'SOC' },
    { name: 'Health & Physical Education', nameNepali: 'स्वास्थ्य तथा शारीरिक शिक्षा', code: 'HPE' },
    { name: 'Computer Science', nameNepali: 'कम्प्युटर विज्ञान', code: 'COM' },
    { name: 'Optional Mathematics', nameNepali: 'ऐच्छिक गणित', code: 'OPM', isElective: true },
    { name: 'Account', nameNepali: 'लेखा', code: 'ACC', isElective: true },
    { name: 'Economics', nameNepali: 'अर्थशास्त्र', code: 'ECO', isElective: true },
  ];
  for (let i = 0; i < subjects.length; i++) {
    await prisma.subject.upsert({
      where: { id: i + 1 },
      update: {},
      create: { id: i + 1, ...subjects[i] },
    });
  }
  console.log('✅ Subjects seeded');

  // ── Classes ───────────────────────────────────────────────────────────────
  const classNames = [
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10',
    'Class 11', 'Class 12'
  ];
  const classMap = new Map();
  for (let i = 0; i < classNames.length; i++) {
    const cls = await prisma.class.upsert({
      where: { id: i + 1 },
      update: {},
      create: {
        id: i + 1,
        name: classNames[i],
        nameNepali: `कक्षा ${i + 1}`,
        section: 'A',
        academicYearId: year.id,
        orderIndex: i + 1,
      },
    });
    classMap.set(classNames[i], cls.id);
  }
  console.log('✅ Classes (1-12) seeded');

  // ── Sample Teachers ───────────────────────────────────────────────────────
  const teacherUsersData = [
    { username: 'premlalprasadraut@gmail.com', fullName: 'Premlal Prasad Raut', post: 'Head Teacher', type: 'RASTRIYA' },
    { username: 'ram.sharma', fullName: 'Ram Kumar Sharma', post: 'Subject Teacher', type: 'RASTRIYA' },
    { username: 'sita.dahal', fullName: 'Sita Kumari Dahal', post: 'Subject Teacher', type: 'NIJI_SROTH' },
  ];
  const defaultTeacherHash = await bcrypt.hash('#%Gautam9845', 10);
  const teacherList = [];

  for (const tData of teacherUsersData) {
    const tUser = await prisma.user.upsert({
      where: { username: tData.username },
      update: {},
      create: { username: tData.username, passwordHash: defaultTeacherHash, role: 'TEACHER' },
    });
    const teacher = await prisma.teacher.upsert({
      where: { userId: tUser.id },
      update: {},
      create: {
        userId: tUser.id,
        fullName: tData.fullName,
        post: tData.post,
        type: tData.type,
        phone: '9845000000',
      },
    });
    teacherList.push(teacher);
  }
  console.log('✅ Sample teachers seeded');

  // Assign Class 10 teacher
  if (classMap.has('Class 10') && teacherList.length > 0) {
    await prisma.class.update({
      where: { id: classMap.get('Class 10') },
      data: { classTeacherId: teacherList[0].id },
    });
  }

  // ── Demo Students ────────────────────────────────────────────────────────
  const studentUsersData = [
    { username: '320160005', studentId: '320160005', fullName: 'Aadity Kumar Patel', rollNo: 1 },
    { username: '320160006', studentId: '320160006', fullName: 'Rahul Prasad Raut', rollNo: 2 },
    { username: '320160007', studentId: '320160007', fullName: 'Priya Kumari Shah', rollNo: 3 },
  ];
  const defaultStudentHash = await bcrypt.hash('Student@2081', 10);
  const class10Id = classMap.get('Class 10');

  for (const sData of studentUsersData) {
    const sUser = await prisma.user.upsert({
      where: { username: sData.username },
      update: {},
      create: { username: sData.username, passwordHash: defaultStudentHash, role: 'STUDENT' },
    });
    const student = await prisma.student.upsert({
      where: { userId: sUser.id },
      update: {},
      create: {
        userId: sUser.id,
        studentId: sData.studentId,
        emisId: sData.studentId,
        fullName: sData.fullName,
        gender: 'Male',
        dateOfBirthBs: '2068-04-15',
        address: 'Bishrampur, Rautahat',
      },
    });
    if (class10Id) {
      await prisma.classEnrollment.upsert({
        where: { studentId_classId: { studentId: student.id, classId: class10Id } },
        update: {},
        create: { studentId: student.id, classId: class10Id, rollNo: sData.rollNo, isActive: true },
      });
    }
  }
  console.log('✅ Demo students seeded & enrolled in Class 10');

  // ── Sample Exam & Published Results ─────────────────────────────────────
  const exam = await prisma.exam.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'First Terminal Examination 2081',
      nameNepali: 'पहिलो त्रैमासिक परीक्षा २०८१',
      academicYearId: year.id,
      startDateBs: '2081-05-01',
      endDateBs: '2081-05-10',
    },
  });

  if (class10Id) {
    await prisma.examClass.upsert({
      where: { examId_classId: { examId: exam.id, classId: class10Id } },
      update: { isPublished: true, publishedAt: new Date() },
      create: { examId: exam.id, classId: class10Id, isPublished: true, publishedAt: new Date() },
    });

    const nepaliSub = await prisma.subject.findFirst({ where: { code: 'NEP' } });
    const englishSub = await prisma.subject.findFirst({ where: { code: 'ENG' } });
    const mathSub = await prisma.subject.findFirst({ where: { code: 'MAT' } });
    const sciSub = await prisma.subject.findFirst({ where: { code: 'SCI' } });

    const subsToSeed = [nepaliSub, englishSub, mathSub, sciSub].filter(Boolean);

    for (const sub of subsToSeed) {
      let examSub = await prisma.examSubject.findFirst({
        where: { examId: exam.id, subjectId: sub.id },
      });
      if (!examSub) {
        examSub = await prisma.examSubject.create({
          data: {
            examId: exam.id,
            subjectId: sub.id,
          },
        });
      }

      let markTitle = await prisma.markTitle.findFirst({
        where: { examSubjectId: examSub.id },
      });
      if (!markTitle) {
        markTitle = await prisma.markTitle.create({
          data: {
            examSubjectId: examSub.id,
            title: 'Theory',
            fullMark: 75,
            passMarkPct: 36,
          },
        });
      }

      const enrolledStudents = await prisma.student.findMany({
        where: { classEnrollment: { some: { classId: class10Id } } },
      });

      for (const st of enrolledStudents) {
        const existingMark = await prisma.markEntry.findFirst({
          where: { examSubjectId: examSub.id, markTitleId: markTitle.id, studentId: st.id },
        });
        if (!existingMark) {
          await prisma.markEntry.create({
            data: {
              examSubjectId: examSub.id,
              markTitleId: markTitle.id,
              studentId: st.id,
              marksObtained: 65,
              teacherId: teacherList[0]?.id || 1,
            },
          });
        }
      }
    }
    console.log('✅ Exam, ExamClass (Published), ExamSubjects, and MarkEntries seeded!');
  }

  console.log('\n🎉 Database seeding complete!');
  console.log(`🔑 Default admin login: admin / ${process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123'}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
