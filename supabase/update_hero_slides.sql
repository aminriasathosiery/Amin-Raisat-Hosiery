-- ==============================================================================
-- Amin Raisat Hosiery — Hero Slides Update & Sync
-- Correctly maps Desktop & Mobile slides to Supabase Storage WebP images
-- ==============================================================================

-- 1. Ensure Slider 1 Desktop & Mobile images
UPDATE public.hero_slides 
SET 
  desktop_image = 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793359084816_31qsz_gemini_generated_image_6674d26674d26674.webp',
  mobile_image = 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793359758572_t7ke1_gemini_generated_image_taq3vgtaq3vgtaq3.webp',
  is_active = true,
  updated_at = NOW()
WHERE display_order = 1 AND (device_type = 'desktop' OR device_type IS NULL);

UPDATE public.hero_slides 
SET 
  desktop_image = 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793359084816_31qsz_gemini_generated_image_6674d26674d26674.webp',
  mobile_image = 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793359758572_t7ke1_gemini_generated_image_taq3vgtaq3vgtaq3.webp',
  is_active = true,
  updated_at = NOW()
WHERE display_order = 1 AND device_type = 'mobile';

-- 2. Update Slider 2 Desktop record with correct desktop and mobile replacement images
UPDATE public.hero_slides 
SET 
  title = 'Slider 2',
  desktop_image = 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793359616170_1cbyc_gemini_generated_image_v73md7v73md7v73m.webp',
  mobile_image = 'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793360031167_9e1z2_gemini_generated_image_19c81v19c81v19c8.webp',
  is_active = true,
  updated_at = NOW()
WHERE id = '1798332a-3451-40ed-a3a2-fff9e57ad59e' OR (display_order = 2 AND (device_type = 'desktop' OR device_type IS NULL));

-- 3. Upsert dedicated Mobile Slider 2 record
INSERT INTO public.hero_slides (
  id,
  device_type,
  title,
  subtitle,
  link,
  button_text,
  desktop_image,
  mobile_image,
  display_order,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'd0000000-0000-0000-0000-000000000012',
  'mobile',
  'Mobile Slider 2',
  'Summer Collection',
  '/shop',
  'Shop Now',
  'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793359616170_1cbyc_gemini_generated_image_v73md7v73md7v73m.webp',
  'https://pqjpgexmupcuuqfzchhc.supabase.co/storage/v1/object/public/hero-slides/1793360031167_9e1z2_gemini_generated_image_19c81v19c81v19c8.webp',
  2,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  desktop_image = EXCLUDED.desktop_image,
  mobile_image = EXCLUDED.mobile_image,
  is_active = true,
  updated_at = NOW();
