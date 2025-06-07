
-- Create a table for analytics
CREATE TABLE IF NOT EXISTS public.analytics (
  id TEXT PRIMARY KEY,
  value INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but with public access for now
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- Create policy that allows all operations (for simplicity in this demo)
CREATE POLICY "Allow all operations on analytics" 
  ON public.analytics 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Initial entry for video analysis count
INSERT INTO public.analytics (id, value)
VALUES ('video_analysis_count', 0)
ON CONFLICT (id) DO NOTHING;
