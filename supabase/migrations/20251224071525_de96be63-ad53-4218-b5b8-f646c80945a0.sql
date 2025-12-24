-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('cuti', 'izin', 'sakit')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable RLS on leave_requests
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leave_requests
CREATE POLICY "Users can view their own leave requests"
ON public.leave_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all leave requests in company"
ON public.leave_requests FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND 
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.company_id = (
      SELECT p.company_id FROM profiles p WHERE p.user_id = leave_requests.user_id
    )
  )
);

CREATE POLICY "Developers can view all leave requests"
ON public.leave_requests FOR SELECT
USING (has_role(auth.uid(), 'developer'));

CREATE POLICY "Admins can update leave requests in company"
ON public.leave_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') AND 
  EXISTS (
    SELECT 1 FROM profiles admin_profile
    WHERE admin_profile.user_id = auth.uid()
    AND admin_profile.company_id = (
      SELECT p.company_id FROM profiles p WHERE p.user_id = leave_requests.user_id
    )
  )
);

CREATE POLICY "Developers can update all leave requests"
ON public.leave_requests FOR UPDATE
USING (has_role(auth.uid(), 'developer'));

-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on holidays
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for holidays
CREATE POLICY "Authenticated users can view active holidays"
ON public.holidays FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage holidays"
ON public.holidays FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Developers can manage all holidays"
ON public.holidays FOR ALL
USING (has_role(auth.uid(), 'developer'));

-- Triggers for updated_at
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holidays_updated_at
BEFORE UPDATE ON public.holidays
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();