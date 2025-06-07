import React, { useState, useEffect } from "react";
import Layout from "@/components/Dashboard/Layout";
import VideoProcessing from "@/components/Dashboard/VideoProcessing";
import { UploadForm } from "@/components/VideoAnalysis/UploadForm";
import { useVideoUpload } from "@/hooks/use-video-upload";
import { useToast } from "@/hooks/use-toast";

const VideoAnalysis = () => {
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const { data: uploadData, isLoading } = useVideoUpload(currentUploadId);
  const { toast } = useToast();
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  useEffect(() => {
    if (uploadData?.status && uploadData.status !== lastStatus) {
      if (lastStatus === "processing" && uploadData.status === "completed") {
        toast({
          title: "Processing Complete",
          description: "Video processing finished successfully",
          variant: "default",
        });
      } else if (uploadData.status === "failed") {
        toast({
          title: "Processing Failed",
          description: uploadData.error || "Video processing failed",
          variant: "destructive",
        });
      }
      setLastStatus(uploadData.status);
    }
  }, [uploadData?.status, lastStatus, toast]);

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Video Analysis</h1>
        <p className="text-muted-foreground">
          Upload security videos for automated analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UploadForm onUploadComplete={setCurrentUploadId} />

        {currentUploadId && (
          <VideoProcessing
            status={uploadData?.status || "pending"}
            progress={
              uploadData?.status === "processing"
                ? 50
                : uploadData?.status === "completed"
                ? 100
                : 0
            }
            outputUrl={uploadData?.processed_file_path}
            detectionResults={uploadData?.detection_results as any[]}
            onRetry={() => setCurrentUploadId(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default VideoAnalysis;
