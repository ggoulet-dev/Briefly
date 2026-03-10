-- Add emoji column to topics table
-- Run this in the Supabase SQL editor if you already have the schema
ALTER TABLE topics ADD COLUMN IF NOT EXISTS emoji TEXT;
