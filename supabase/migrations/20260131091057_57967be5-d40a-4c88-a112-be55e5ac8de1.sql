-- Create accident_report_notes table
CREATE TABLE public.accident_report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_report_id uuid NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create accident_report_files table
CREATE TABLE public.accident_report_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_report_id uuid NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- Create accident_report_reminders table
CREATE TABLE public.accident_report_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accident_report_id uuid NOT NULL REFERENCES public.accident_reports(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  reminder_text text,
  is_done boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Add new columns to accident_reports
ALTER TABLE public.accident_reports 
  ADD COLUMN IF NOT EXISTS report_number serial,
  ADD COLUMN IF NOT EXISTS deductible_amount numeric,
  ADD COLUMN IF NOT EXISTS coverage_type text,
  ADD COLUMN IF NOT EXISTS selected_policy_group_id uuid;

-- Add accident_notes column to clients
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS accident_notes text;

-- Enable RLS on new tables
ALTER TABLE public.accident_report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_report_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accident_report_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for accident_report_notes
CREATE POLICY "Authenticated users can view accident report notes" 
  ON public.accident_report_notes FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert accident report notes" 
  ON public.accident_report_notes FOR INSERT 
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update accident report notes" 
  ON public.accident_report_notes FOR UPDATE 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete accident report notes" 
  ON public.accident_report_notes FOR DELETE 
  TO authenticated USING (true);

-- RLS policies for accident_report_files
CREATE POLICY "Authenticated users can view accident report files" 
  ON public.accident_report_files FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert accident report files" 
  ON public.accident_report_files FOR INSERT 
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update accident report files" 
  ON public.accident_report_files FOR UPDATE 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete accident report files" 
  ON public.accident_report_files FOR DELETE 
  TO authenticated USING (true);

-- RLS policies for accident_report_reminders
CREATE POLICY "Authenticated users can view accident report reminders" 
  ON public.accident_report_reminders FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert accident report reminders" 
  ON public.accident_report_reminders FOR INSERT 
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update accident report reminders" 
  ON public.accident_report_reminders FOR UPDATE 
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete accident report reminders" 
  ON public.accident_report_reminders FOR DELETE 
  TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accident_report_notes_report_id ON public.accident_report_notes(accident_report_id);
CREATE INDEX IF NOT EXISTS idx_accident_report_files_report_id ON public.accident_report_files(accident_report_id);
CREATE INDEX IF NOT EXISTS idx_accident_report_reminders_report_id ON public.accident_report_reminders(accident_report_id);
CREATE INDEX IF NOT EXISTS idx_accident_report_reminders_date ON public.accident_report_reminders(reminder_date) WHERE is_done = false;