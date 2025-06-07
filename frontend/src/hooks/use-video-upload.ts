
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface VideoUploadData {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_file_path: string | null;
  detection_results: Json | null;
  title: string;
  description: string | null;
  original_filename: string;
  original_file_path: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  error?: string;
}

export const useVideoUpload = (uploadId: string | null) => {
  const query = useQuery<VideoUploadData | null>({
    queryKey: ['video-upload', uploadId],
    queryFn: async () => {
      if (!uploadId) return null;
      const { data, error } = await supabase
        .from('video_uploads')
        .select('*')
        .eq('id', uploadId)
        .maybeSingle();
      
      if (error) throw error;
      return data as VideoUploadData;
    },
    enabled: !!uploadId,
    refetchInterval: (data) => {
      // Fix the error by checking data directly, not data?.status
      if (!data) return false;
      return data.status === 'processing' ? 2000 : false;
    },
    staleTime: 0,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error
  };
};
