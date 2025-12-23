-- ================================================
-- SESI 1: STRUCTURE & HR DATA
-- ================================================

-- 1. Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS job_title text,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Create shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- RLS policies for shifts
CREATE POLICY "Authenticated users can view active shifts"
ON public.shifts
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage shifts"
ON public.shifts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Developers can manage all shifts"
ON public.shifts
FOR ALL
USING (public.has_role(auth.uid(), 'developer'));

-- 3. Add shift_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.shifts(id);

-- 4. Create trigger for updated_at on shifts
CREATE TRIGGER update_shifts_updated_at
BEFORE UPDATE ON public.shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Insert default shift (optional)
INSERT INTO public.shifts (name, start_time, end_time)
VALUES ('Regular (08:00 - 17:00)', '08:00:00', '17:00:00')
ON CONFLICT DO NOTHING;