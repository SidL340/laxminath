# 🏫 Nepal School Management System & Public Website Portal
## Complete Multi-School Setup & Deployment Guide

> **This package is a complete, self-contained software solution** containing both the **Public School Website** and the full **School Management ERP System**. You can copy this folder to any directory or computer and set it up for any school in minutes.

---

## 📁 1. Package Contents Overview

```
SCHOOL_SOFTWARE_TEMPLATE_PACKAGE/
│
├── 🌐 frontend/              # Next.js 16 (React 19, Tailwind CSS)
│   ├── src/app/page.tsx      # Official Public School Website (Homepage, Notices, Admission)
│   ├── src/app/login/        # Secure Multi-Role ERP Login Portal
│   ├── src/app/dashboard/    # Super Admin & Staff Management ERP
│   │   ├── school/           # School Profile (Name, Logo, Seal, Contact, Bank)
│   │   ├── certificates/     # Ultra HD Certificates (Character, Transfer, Bonafide)
│   │   ├── students/         # Student Admission, Ledger, ID Cards
│   │   ├── teachers/         # Teacher/Staff Records, Payroll
│   │   ├── exams/            # Admit Cards, Seat Planning, Grade Sheets
│   │   ├── finance/          # Income, Expenses, Vouchers, Fees, Reports
│   │   ├── attendance/       # Student & Staff Attendance
│   │   ├── notices/          # Notice Board (Auto-syncs with Public Website)
│   │   ├── letters/          # Official School Letterpad / Chalani System
│   │   └── ...
│   ├── src/app/student/      # Dedicated Student Portal
│   ├── src/app/teacher/      # Dedicated Teacher Portal
│   └── src/app/adhyaksha/    # SMC Chairperson / Management Portal
│
├── ⚙️ backend/               # Node.js Express API Server
│   ├── prisma/schema.prisma  # Complete PostgreSQL Database Schema (60+ models)
│   ├── prisma/seed.js        # Automated Database Initialization & Admin Setup
│   ├── src/routes/           # Secure REST API Endpoints with Role-Based Access
│   └── src/server.js         # API Server on Port 5000
│
├── 🚀 setup.bat              # One-click Windows Setup Wizard
├── 🚀 setup.sh               # One-click Linux/Mac Setup Script
├── 💻 start.bat              # One-click Launcher (Starts Backend + Frontend + Opens Browser)
└── 📄 COMPLETE_SETUP_GUIDE.md# This documentation
```

---

## ⚡ 2. Quick Setup for a New School (Step-by-Step)

### Step 1: Copy the Folder
1. Copy the `SCHOOL_SOFTWARE_TEMPLATE_PACKAGE` folder to your desired location.
2. Rename the copied folder to your new school's name, for example:
   `C:\Users\ACER\Desktop\SHREE_JANATA_SECONDARY_SCHOOL`

---

### Step 2: Configure Database Connection
This software runs on **PostgreSQL**. You can use a local database or a free cloud database.

1. Open `backend/.env` with any text editor (Notepad, VS Code, etc.).
2. Set your `DATABASE_URL`:

* **Option A: Local PostgreSQL** (Installed on computer):
  ```env
  DATABASE_URL="postgresql://postgres:your_password@localhost:5432/school_erp_db"
  ```
  *(Make sure you create an empty database named `school_erp_db` in pgAdmin or PostgreSQL)*

* **Option B: Free Cloud PostgreSQL** (Recommended for instant online access):
  Create a free database on [Neon.tech](https://neon.tech), [Supabase.com](https://supabase.com), or [Render.com](https://render.com), then paste the connection string:
  ```env
  DATABASE_URL="postgresql://username:password@ep-cool-host.neon.tech/neondb?sslmode=require"
  ```

---

### Step 3: Run Automated Setup

#### On Windows (Double-Click):
Simply **double-click `setup.bat`**. The wizard will automatically:
1. Install all backend dependencies
2. Generate Prisma Client
3. Push the database tables to your PostgreSQL database
4. Seed the initial Super Admin account & default academic year
5. Install all frontend dependencies

#### On Mac / Linux (Terminal):
```bash
chmod +x setup.sh
./setup.sh
```

#### Manual Commands (If preferred):
```bash
# In Backend:
cd backend
npm install
npx prisma generate
npx prisma db push
node prisma/seed.js

# In Frontend:
cd ../frontend
npm install
```

---

### Step 4: Start the System

#### On Windows (Double-Click):
Simply **double-click `start.bat`**.
* Backend will start on `http://localhost:5000`
* Frontend will start on `http://localhost:3000`
* Your browser will automatically open to `http://localhost:3000`

#### Manual Launch:
* **Terminal 1 (Backend):**
  ```bash
  cd backend
  npm run dev
  ```
* **Terminal 2 (Frontend):**
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🔑 3. Default Login Credentials

After setup and seed, log in using:
* **Login URL:** `http://localhost:3000/login`
* **Username:** `admin`
* **Password:** `Admin@123`
* **Role:** `SUPER_ADMIN` (Full administrative rights)

*(You can change the admin password at any time in **Dashboard > Users**)*

---

## 🎨 4. Personalizing for Any New School (100% Dynamic - Zero Code Edits!)

You do NOT need to edit any code to customize the software for any new school. Everything is customized dynamically directly from the Admin Panel:

### 1. Update Institutional Profile & Official Legal Data
1. Log in as `admin`.
2. Go to **Dashboard > School Profile (`/dashboard/school`)**.
3. Fill in the school's administrative and legal details:
   * **School Name (English & Nepali)**
   * **EMIS Code, Affiliation (NEB / CTEVT / MoEST)**
   * **Location:** Province, District, Municipality, Ward No., Postal Code
   * **Contact Information:** Phone numbers, Official Email, Website URL
   * **Bank Account Details:** For billing, vouchers, and payment receipts
   * **Official Seal / Stamp (विद्यालयको छाप):** Upload round or oval seal
4. Click **Save Changes**.

### 2. Website CMS & Brand Customization Studio (`/dashboard/website`)
Customize the entire public-facing website, hero sliders, stats, leadership messages, and facilities visually:
1. Go to **Dashboard > Website CMS Studio (`/dashboard/website`)**.
2. **Hero & Branding Tab:**
   * Hero Badge text (e.g. `🇳🇵 Ministry of Education Approved`)
   * Hero Title (English & Nepali)
   * Hero Subtitle description
   * Live uploaders for School Logo and Official Stamp
3. **Statistics Counters Tab:**
   * Configure 4 dynamic metrics (Students, Teachers, Pass Rate, Established Year or custom metrics)
4. **About Us & Highlights Tab:**
   * About Section Title & Body Text
   * 4 dynamic highlight bullet points showcasing academic excellence
5. **Leadership Messages Tab:**
   * **Principal (प्रधानाध्यापक):** Full name (EN & NP), direct phone, email, photo upload, and comprehensive welcome message
   * **SMC Chairperson (विद्यालय व्यवस्थापन समिति अध्यक्ष):** Full name (EN & NP), photo upload, and strategic message
6. **Facilities Tab (सुविधाहरू):**
   * Add, edit, or remove school facilities (Science Lab, Computer Lab, Library, Sports, Safe Transport, Cafeteria, etc.)
   * Choose icons (Flask, Laptop, BookOpen, Trophy, Bus, Shield, Wifi, etc.)
7. **Contact & Social Tab:**
   * Physical reception hours, Google Maps embed URL
   * Facebook, YouTube, Twitter/X, Instagram social handles
8. Click **Save Changes** — All changes appear instantly on the homepage and portals!

### 🌟 What Happens Automatically Everywhere:
* **Public Website (`/`):** Instantly reflects all colors, messages, counters, facilities, and leadership profiles!
* **Sidebar & Topbar:** Displays the dynamic school short name, full name in Nepali, and custom logo.
* **Ultra HD Certificates (`/dashboard/certificates`):** All character, transfer, and bonafide certificates automatically feature the new school name, address, EMIS, and official stamp!
* **Fee Receipts & Vouchers (`/dashboard/finance`):** Auto-branded with official school letterhead and seal!
* **Admit Cards & Exam Slips (`/dashboard/exams`):** Formatted with dynamic school details!
* **Official Letterpads (`/dashboard/letters`):** Chalani and patra sankhya letterheads use the new school's credentials!
* **Student/Teacher/SMC Portals & Slips:** Automatically adopt the active school branding.

---

## 🌐 5. Public Website Features Included

The public website at `http://localhost:3000/` is 100% database-driven:
1. **Header & Navigation:** Responsive with mobile menu, school logo, contact bar.
2. **Dynamic Hero Presentation:** Custom badge, titles, EMIS code, and CTA buttons.
3. **Key Stats Bar:** Dynamic counters with animated icons.
4. **About the School:** Mission, vision, core educational values, and highlight points.
5. **Leadership Messages:** Dedicated cards for both Principal and SMC Chairperson with photos.
6. **Facilities Grid:** Fully dynamic cards with customizable icons and descriptions.
7. **Notice Board (सूचना पाटी):** Displays latest active announcements posted in `/dashboard/notices`.
8. **Online Admission Inquiry:** Parents and prospective students can submit an admission inquiry directly from the homepage.
9. **ERP Login Shortcut:** One-click button in navbar and footer leading to `/login`.

---

## 🚢 6. Production Deployment Guide (Going Live Online)

When you are ready to host the school's software on the internet with a custom domain (e.g. `yourschool.edu.np`):

### A. Deploy Backend (API Server)
1. Push the `backend` folder to a GitHub repository.
2. Deploy on [Render.com](https://render.com) (or Railway / DigitalOcean / VPS):
   * Build Command: `npm install && npx prisma generate`
   * Start Command: `node src/server.js`
   * Environment Variables:
     * `DATABASE_URL`: Your cloud PostgreSQL URL
     * `JWT_SECRET`: A long random secret string
     * `NODE_ENV`: `production`
     * `PORT`: `5000`

### B. Deploy Frontend (Website & ERP Portal)
1. Push the `frontend` folder to a GitHub repository.
2. Deploy on [Vercel.com](https://vercel.com):
   * Framework Preset: `Next.js`
   * Environment Variable:
     * `NEXT_PUBLIC_API_URL`: Your deployed backend URL + `/api` (e.g. `https://api.yourschool.edu.np/api`)
3. Connect your school's domain (e.g. `yourschool.edu.np`) in Vercel settings!

---

## 📞 Support & Maintenance
* All database changes are handled cleanly via Prisma: `npx prisma db push`
* All uploaded files are stored safely in `backend/uploads/` and synced with `frontend/public/`
* Built with 100% Nepali educational compliance (NEB Grade Point, Bikram Sambat dates, IEMIS standard)
