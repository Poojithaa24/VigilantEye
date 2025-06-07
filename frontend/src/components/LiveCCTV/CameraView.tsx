import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";
import CameraControls from "./CameraControls";

interface CameraViewProps {
  isStreaming: boolean;
  isDetecting: boolean;
  isConnected: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  onToggleCamera: () => void;
  onToggleDetection: () => void;
}

const CameraView = ({
  isStreaming,
  isDetecting,
  isConnected,
  videoRef,
  onToggleCamera,
  onToggleDetection,
}: CameraViewProps) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Primary Camera</CardTitle>
            <CardDescription>Live feed from device camera</CardDescription>
          </div>
          <div className="flex gap-2">
            {isStreaming && <Badge variant="secondary">CAMERA ACTIVE</Badge>}
            {isDetecting && (
              <Badge variant="destructive" className="animate-pulse">
                DETECTING
              </Badge>
            )}
            {!isConnected && <Badge variant="destructive">DISCONNECTED</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          <CameraControls
            isStreaming={isStreaming}
            isDetecting={isDetecting}
            isConnected={isConnected}
            onToggleCamera={onToggleCamera}
            onToggleDetection={onToggleDetection}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraView;
