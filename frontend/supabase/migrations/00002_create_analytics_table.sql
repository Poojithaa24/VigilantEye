
-- Create a table for analytics data
CREATE TABLE IF NOT EXISTS public.analytics (
  id TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Example initial records
INSERT INTO public.analytics (id, value)
VALUES ('video_analysis_count', 0)
ON CONFLICT (id) DO NOTHING;
