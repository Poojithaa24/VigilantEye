
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Detection {
  violenceDetected: boolean;
  weaponsDetected: boolean;
  timestamp: string;
  weaponConfidence?: number;
  violenceConfidence?: number;
}

interface DetectionFeedProps {
  isConnected: boolean;
  isDetecting: boolean;
  isStreaming: boolean;
  detections: Detection[];
}

const DetectionFeed = ({ isConnected, isDetecting, isStreaming, detections }: DetectionFeedProps) => {
  const formatTimestamp = (timestamp: string): string => {
    try {
      // Make sure we have a valid timestamp
      if (!timestamp || timestamp === "undefined") {
        return "Unknown time";
      }
      
      // Create a valid date object from the timestamp
      const date = new Date(timestamp);
      
      // Check if date is valid before formatting
      if (isNaN(date.getTime())) {
        return "Unknown time";
      }
      
      // Format as HH:MM:SS
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: false 
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error, "Value:", timestamp);
      return "Unknown time";
    }
  };
  
  // Helper function to format confidence values
  const formatConfidence = (confidence?: number): string => {
    if (confidence === undefined || isNaN(confidence)) {
      return "Unknown";
    }
    return `${Math.round(confidence)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection Feed</CardTitle>
        <CardDescription>Real-time security alerts</CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="text-center py-8 text-destructive">
            <p className="font-medium">Server connection required</p>
            <p className="text-sm">Detection features unavailable</p>
          </div>
        ) : detections.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {detections.map((detection, index) => (
              <div key={index} className="border rounded-md p-3 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-destructive mr-2" />
                    <span className="font-medium">
                      {detection.weaponsDetected ? "Weapon Alert" : "Violence Alert"}
                    </span>
                  </div>
                  <Badge variant="outline">{formatTimestamp(detection.timestamp)}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {detection.weaponsDetected && (
                    <div>Potential weapon detected - Confidence: {formatConfidence(detection.weaponConfidence)}</div>
                  )}
                  {detection.violenceDetected && (
                    <div>Potential violent activity detected - Confidence: {formatConfidence(detection.violenceConfidence)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {isDetecting ? (
              <p>No detections yet. Monitoring activity...</p>
            ) : (
              <p>
                {isStreaming
                  ? "Start detection to begin monitoring"
                  : "Start the camera to begin"}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetectionFeed;
