#!/bin/bash
set -e

echo "==============================================================================="
echo "           NEPAL SCHOOL MANAGEMENT SYSTEM & ERP - SETUP SCRIPT"
echo "==============================================================================="

echo ""
echo "Step 1: Installing backend dependencies..."
cd backend
npm install

echo ""
echo "Step 2: Generating Prisma Client..."
npx prisma generate

echo ""
echo "Step 3: Setting up Database Schema..."
npx prisma db push

echo ""
echo "Step 4: Seeding Initial School & Super Admin Account..."
node prisma/seed.js

echo ""
echo "Step 5: Installing frontend dependencies..."
cd ../frontend
npm install

cd ..
echo ""
echo "==============================================================================="
echo "                    SETUP COMPLETED SUCCESSFULLY!"
echo "==============================================================================="
echo ""
echo " Default Login Credentials:"
echo "   Username: admin"
echo "   Password: Admin@123"
echo ""
echo " To start backend:  cd backend && npm run dev"
echo " To start frontend: cd frontend && npm run dev"
echo ""
