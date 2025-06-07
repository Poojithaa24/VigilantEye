
import React from 'react';
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Play, Pause } from "lucide-react";

interface CameraControlsProps {
  isStreaming: boolean;
  isDetecting: boolean;
  isConnected: boolean;
  onToggleCamera: () => void;
  onToggleDetection: () => void;
}

const CameraControls = ({
  isStreaming,
  isDetecting,
  isConnected,
  onToggleCamera,
  onToggleDetection,
}: CameraControlsProps) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-6 flex justify-center gap-4">
      <Button
        variant="outline"
        size="lg"
        className="bg-background/20 border-white/20 hover:bg-background/40 text-white"
        onClick={onToggleCamera}
        disabled={!isConnected}
      >
        {isStreaming ? (
          <>
            <CameraOff className="mr-2" /> Stop Camera
          </>
        ) : (
          <>
            <Camera className="mr-2" /> Start Camera
          </>
        )}
      </Button>

      <Button
        variant={isDetecting ? "destructive" : "default"}
        size="lg"
        className="text-white"
        onClick={onToggleDetection}
        disabled={!isStreaming}
      >
        {isDetecting ? (
          <>
            <Pause className="mr-2" /> Stop Detection
          </>
        ) : (
          <>
            <Play className="mr-2" /> Start Detection
          </>
        )}
      </Button>
    </div>
  );
};

export default CameraControls;
