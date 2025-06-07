
import React from "react";
import { Button } from "@/components/ui/button";
import { FileVideo } from "lucide-react";

interface VideoPreviewProps {
  file: File;
  onRemove: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ file, onRemove }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <FileVideo className="h-8 w-8 text-primary" />
      <span className="text-sm font-medium">{file.name}</span>
      <span className="text-xs text-muted-foreground">
        {(file.size / (1024 * 1024)).toFixed(2)} MB
      </span>
      <Button 
        type="button" 
        variant="secondary" 
        size="sm"
        onClick={onRemove}
      >
        Change File
      </Button>
    </div>
  );
};
