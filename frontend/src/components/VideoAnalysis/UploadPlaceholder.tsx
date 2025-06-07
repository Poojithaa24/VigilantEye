
import React from "react";
import { Button } from "@/components/ui/button";
import { FileVideo } from "lucide-react";
import { Input } from "@/components/ui/input";

interface UploadPlaceholderProps {
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const UploadPlaceholder: React.FC<UploadPlaceholderProps> = ({ onFileSelect }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <FileVideo className="h-8 w-8 text-muted-foreground" />
      <div className="text-sm text-muted-foreground">
        Drag and drop a video file, or click to browse
      </div>
      <Input
        id="video"
        type="file"
        accept="video/*"
        onChange={onFileSelect}
        className="hidden"
      />
      <Button 
        type="button" 
        variant="secondary" 
        onClick={() => document.getElementById("video")?.click()}
      >
        Select File
      </Button>
    </div>
  );
};
