-- 1. Move all Marketing employees from SALES to OPERATIONS
UPDATE employees
SET department = 'OPERATIONS'
WHERE sub_department = 'MARKETING' AND department = 'SALES';

-- 2. Move all Marketing categories from SALES to OPERATIONS
UPDATE categories
SET department = 'OPERATIONS'
WHERE sub_department = 'MARKETING' AND department = 'SALES';

-- 3. Add marketing approval settings
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS marketing_approval_by_ops_manager boolean DEFAULT false;

-- 4. Add attachment URLs array column to tasks table (if not exists)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS attachment_urls text[] DEFAULT '{}';


-- SUPABASE STORAGE BUCKET INSTRUCTIONS
-- ----------------------------------------------------
-- 1. Go to Supabase > Storage > New Bucket
-- 2. Name: task-attachments , Public: false
-- 3. RLS Policies to create in Supabase Console for 'task-attachments':

/*
POLICY 1: "Employees can upload own attachments"
Target: INSERT, Role: authenticated
Check expression:
bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text

POLICY 2: "Authenticated users can view attachments"
Target: SELECT, Role: authenticated
Using expression:
bucket_id = 'task-attachments'

POLICY 3: "Owners can delete own attachments"
Target: DELETE, Role: authenticated
Using expression:
bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text
*/
