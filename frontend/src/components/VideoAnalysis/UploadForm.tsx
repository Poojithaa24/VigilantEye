
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateVideoFile } from "@/utils/videoValidation";
import { VideoPreview } from "./VideoPreview";
import { UploadPlaceholder } from "./UploadPlaceholder";
import { incrementAnalyticsCounter } from "@/services/analyticsService";

interface UploadFormProps {
  onUploadComplete: (uploadId: string) => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && validateVideoFile(selectedFile)) {
      setFile(selectedFile);
    }
    event.target.value = ""; // Reset input
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Step 1: Create a database entry for this upload
      const { data: uploadEntry, error: dbError } = await supabase
        .from("video_uploads")
        .insert({
          title,
          description: description || null,
          original_filename: file.name,
          original_file_path: `uploads/${Date.now()}_${file.name}`,
          status: "pending",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Notify parent component with the upload ID right away
      onUploadComplete(uploadEntry.id);

      // Step 2: Update status to processing before sending to Flask backend
      await supabase
        .from("video_uploads")
        .update({
          status: "processing",
        })
        .eq("id", uploadEntry.id);

      // Step 3: Upload the file to Flask backend
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch("http://localhost:5000/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();

      // Step 4: Update the database entry with the processing status and result
      if (result.status === "completed") {
        const { error: updateError } = await supabase
          .from("video_uploads")
          .update({
            status: "completed",
            processed_file_path: result.video_url,
            detection_results: result.detection_results || [],
          })
          .eq("id", uploadEntry.id);

        if (updateError) throw updateError;

        // Increment analytics counter for processed videos
        await incrementAnalyticsCounter();

        toast({
          title: "Upload successful",
          description: "Your video has been processed",
          variant: "default",
        });
      } else {
        throw new Error(result.message || "Processing failed");
      }
    } catch (error) {
      console.error("Processing error:", error);
      
      // Update status to failed if there was an error
      if (currentUploadId) {
        await supabase
          .from("video_uploads")
          .update({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", currentUploadId);
      }
      
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Track current upload ID
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Upload Video</CardTitle>
        <CardDescription>
          Upload a video file for AI-powered security analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter a title for this video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details about this video"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Video File</Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              {file ? (
                <VideoPreview file={file} onRemove={() => setFile(null)} />
              ) : (
                <UploadPlaceholder onFileSelect={handleFileChange} />
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!file || !title || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Process
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
