import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, RefreshCw, Shield, Sword } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface Detection {
  timestamp: number; // Timestamp in seconds
  type: "weapon" | "violence";
  confidence: number;
}

interface VideoProcessingProps {
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  outputUrl?: string;
  detectionResults?: Detection[];
  onRetry?: () => void;
}

const VideoProcessing: React.FC<VideoProcessingProps> = ({
  status,
  progress = 0,
  outputUrl,
  detectionResults = [],
  onRetry,
}) => {
  const [videoError, setVideoError] = useState(false);
  const [videoKey, setVideoKey] = useState(Date.now());
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (outputUrl) {
      setVideoError(false);
      setVideoKey(Date.now());
    }
  }, [outputUrl, status]);

  const getVideoUrl = () => {
    if (!outputUrl) return "";

    const baseUrl = outputUrl.startsWith("/")
      ? "http://localhost:5000" + outputUrl
      : outputUrl;
    const cacheBuster = `t=${Date.now()}`;
    if (outputUrl.includes("?")) {
      return `${baseUrl}&${cacheBuster}`;
    } else {
      return `${baseUrl}?${cacheBuster}`;
    }
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    console.error("Video error:", {
      error: video.error,
      src: video.currentSrc,
      networkState: video.networkState,
      outputUrl,
    });
    setVideoError(true);
  };

  const reloadVideo = () => {
    setRetryCount((prev) => prev + 1);
    setVideoKey(Date.now());
    setVideoError(false);
  };

  const formatTimestamp = (seconds: number | string) => {
    // If the timestamp is a string (e.g., "2.77s"), remove 's' and convert it to a number
    if (typeof seconds === "string") {
      seconds = parseFloat(seconds.replace("s", "").trim());
    }

    // Check if the final value is a valid number
    if (typeof seconds !== "number" || isNaN(seconds)) {
      console.error("Invalid timestamp (not a valid number):", seconds);
      return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const handleDetectionClick = (timestamp: string) => {
    // Convert timestamp to a number
    const timestampNumber = parseFloat(timestamp);

    // Ensure the timestamp is a valid number and is finite
    if (isNaN(timestampNumber) || !isFinite(timestampNumber)) {
      console.error("Invalid timestamp:", timestampNumber);
      return; // Exit the function if the timestamp is invalid
    }

    // Assuming `videoElement` is your HTML video element
    const videoElement = document.getElementById(
      "your-video-element-id"
    ) as HTMLMediaElement;

    if (videoElement) {
      videoElement.currentTime = timestampNumber; // Set the current time to the timestamp
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Video Analysis</CardTitle>
          <Badge
            variant={
              status === "completed"
                ? "default"
                : status === "processing"
                ? "secondary"
                : status === "failed"
                ? "destructive"
                : "outline"
            }
          >
            {status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "processing" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm text-muted-foreground">
                Processing your video... {Math.round(progress)}%
              </p>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {status === "completed" && (
          <div className="space-y-4">
            {videoError ? (
              <div className="bg-red-50 p-4 rounded-md text-red-600">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="font-medium">Video Playback Failed</h3>
                </div>
                <p className="text-sm">
                  The processed video couldn't be loaded. This might be because:
                </p>
                <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
                  <li>File format is not supported</li>
                  <li>Video file is still being processed</li>
                  <li>Network issues preventing access</li>
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button onClick={reloadVideo} variant="outline" size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" /> Reload Video (
                    {retryCount})
                  </Button>
                  {onRetry && (
                    <Button onClick={onRetry} variant="outline" size="sm">
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="relative aspect-video bg-black rounded-md overflow-hidden">
                  <video
                    key={videoKey}
                    src={getVideoUrl()}
                    controls
                    className="w-full h-full"
                    playsInline
                    preload="auto"
                    onError={handleError}
                    onCanPlay={() => setVideoError(false)}
                  >
                    <source src={getVideoUrl()} type="video/mp4" />
                    Your browser does not support HTML5 video.
                  </video>
                </div>

                {detectionResults && detectionResults.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Detection Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-2">
                          {detectionResults.map((detection, index) => {
                            return (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 border rounded-md cursor-pointer"
                                onClick={() =>
                                  handleDetectionClick(detection.timestamp)
                                }
                              >
                                <div className="flex items-center gap-2">
                                  {detection.type === "weapon" ? (
                                    <Shield className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <Sword className="h-4 w-4 text-orange-500" />
                                  )}
                                  <span className="font-medium">
                                    {formatTimestamp(detection.timestamp)}
                                  </span>
                                </div>
                                <Badge
                                  variant={
                                    detection.type === "weapon"
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {detection.type.toUpperCase()} (
                                  {Math.round(
                                    (detection.confidence || 0) * 100
                                  )}
                                  % )
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {status === "failed" && (
          <div className="bg-red-50 p-4 rounded-md text-red-600">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-medium">Processing Failed</h3>
            </div>
            <p className="text-sm">
              The video analysis couldn't be completed. Please check:
            </p>
            <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
              <li>Your network connection</li>
              <li>Video file format and size</li>
              <li>Server status</li>
            </ul>
            {onRetry && (
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Retry Upload
              </Button>
            )}
          </div>
        )}

        {status === "pending" && (
          <p className="text-sm text-muted-foreground">
            Upload a video to begin detection process.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoProcessing;
