-- Migration: add_token_version_to_user
-- Generated: 2026-10-02
-- Purpose: FIX L-04 — Add tokenVersion for JWT revocation after password change
-- Run this against your PostgreSQL database once credentials are rotated:
--   psql $DATABASE_URL -f add_token_version_to_user.sql

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;
