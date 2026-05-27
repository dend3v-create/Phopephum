-- Migration 005: Update knowledge_base category check constraint
-- This migration updates the allowed categories for the knowledge base to match the UI dropdown options.

-- 1. Drop the existing constraint
ALTER TABLE knowledge_base 
DROP CONSTRAINT IF EXISTS knowledge_base_category_check;

-- 2. Add the updated constraint with all 11 categories
ALTER TABLE knowledge_base 
ADD CONSTRAINT knowledge_base_category_check 
CHECK (category IN (
  'phopephum_meaning',
  'definition',
  'prediction_guideline',
  'reading_logic',
  'seven_base_9_stars',
  'hora_tai_noo',
  'thai_astrology',
  'attakarn_hora',
  'psychology_philosophy',
  'chakra_energy',
  'therapy_life_guide'
));
