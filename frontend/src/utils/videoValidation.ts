
import { toast } from "@/hooks/use-toast";

export const VIDEO_SIZE_LIMIT = 100 * 1024 * 1024; // 100MB

export const validateVideoFile = (file: File): boolean => {
  // Check if it's a video file
  if (!file.type.startsWith("video/")) {
    toast({
      title: "Invalid file type",
      description: "Please select a video file",
      variant: "destructive",
    });
    return false;
  }
  
  // Check file size
  if (file.size > VIDEO_SIZE_LIMIT) {
    toast({
      title: "File too large",
      description: "Please select a file smaller than 100MB",
      variant: "destructive",
    });
    return false;
  }
  
  return true;
};
