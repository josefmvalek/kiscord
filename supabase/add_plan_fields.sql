-- Add new fields to planned_dates to support the Quick Plan confirmation workflow
ALTER TABLE public.planned_dates 
ADD COLUMN IF NOT EXISTS proposed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS status text DEFAULT 'idea',
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS backup_plan text,
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

-- Ensure RLS is still open (based on current setup)
DROP POLICY IF EXISTS "All can manage planned dates" ON public.planned_dates;
CREATE POLICY "All can manage planned dates" ON public.planned_dates FOR ALL USING (true);

-- Enable realtime for this table if not already enabled
-- Note: Requires manual activation in Supabase Dashboard -> Realtime -> Select Table
