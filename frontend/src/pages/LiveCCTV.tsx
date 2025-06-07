import React, { useState, useRef, useEffect } from "react";
import Layout from "@/components/Dashboard/Layout";
import { useToast } from "@/hooks/use-toast";
import { io, Socket } from "socket.io-client";
import CameraView from "@/components/LiveCCTV/CameraView";
import DetectionFeed from "@/components/LiveCCTV/DetectionFeed";
import { supabase } from "@/integrations/supabase/client";

interface Detection {
  violenceDetected: boolean;
  weaponsDetected: boolean;
  timestamp: string;
  weaponConfidence?: number;
  violenceConfidence?: number;
}

const LiveCCTV = () => {
  const [connectionState, setConnectionState] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [cameraState, setCameraState] = useState<
    "inactive" | "active" | "error"
  >("inactive");
  const [detectionState, setDetectionState] = useState<
    "inactive" | "active" | "error"
  >("inactive");
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [processedFrame, setProcessedFrame] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();

  // Socket.IO Connection Management
  useEffect(() => {
    const socket = io("http://localhost:5000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
      autoConnect: true,
    });

    socketRef.current = socket;

    // Connection Events
    socket.on("connect", () => {
      setConnectionState("connected");
      toast({ title: "Connected to detection server" });
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      setCameraState("inactive");
      setDetectionState("inactive");
      toast({ variant: "destructive", title: "Disconnected from server" });
    });

    socket.on("connect_error", (err) => {
      setConnectionState("disconnected");
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: err.message,
      });
    });

    // Camera Events
    socket.on("camera_status", (status: "active" | "inactive" | "error") => {
      setCameraState(status);
      if (status === "active") toast({ title: "Camera feed activated" });
    });

    // Detection Events
    socket.on("detection_status", (status: "active" | "inactive" | "error") => {
      setDetectionState(status);
      if (status === "active") toast({ title: "Detection system activated" });
    });

    socket.on(
      "detection_data",
      (data: {
        violence_detected: boolean;
        weapons_detected: boolean;
        violence_confidence: number;
        weapon_confidence: number;
        timestamp: string;
      }) => {
        const newDetection: Detection = {
          violenceDetected: data.violence_detected,
          weaponsDetected: data.weapons_detected,
          violenceConfidence: data.violence_confidence,
          weaponConfidence: data.weapon_confidence,
          timestamp: data.timestamp,
        };

        setDetections((prev) => [newDetection, ...prev.slice(0, 49)]);

        if (data.violence_detected || data.weapons_detected) {
          handleDetectionAlert(newDetection);
        }
      }
    );

    socket.on("video_frame_processed", (data: { frame: string }) => {
      setProcessedFrame(`data:image/jpeg;base64,${data.frame}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [toast]);

  // Camera Stream Handling
  useEffect(() => {
    let stream: MediaStream | null = null;

    const handleCamera = async () => {
      try {
        if (cameraState === "active") {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
        }
      } catch (err) {
        setCameraState("error");
        toast({
          variant: "destructive",
          title: "Camera Error",
          description: "Failed to access camera device",
        });
      }
    };

    handleCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraState, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (
      cameraState === "active" &&
      detectionState === "active" &&
      videoRef.current &&
      socketRef.current
    ) {
      interval = setInterval(() => {
        const video = videoRef.current!;
        if (video.readyState === 4) {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg");
            socketRef.current!.emit("video_frame", { frame: dataUrl });
          }
        }
      }, 200); // 5 fps
    }
    return () => clearInterval(interval);
  }, [cameraState, detectionState]);

  const handleDetectionAlert = async (detection: Detection) => {
    if (isSendingAlert) return;
    setIsSendingAlert(true);

    try {
      const alertType = detection.weaponsDetected ? "weapon" : "violence";
      const confidence = Math.round(
        detection.weaponsDetected
          ? detection.weaponConfidence || 0
          : detection.violenceConfidence || 0
      );

      const { error } = await supabase.functions.invoke("send-sms-alert", {
        body: {
          message: `${alertType.toUpperCase()} detected with ${confidence}% confidence`,
          detectionType: alertType,
          timestamp: detection.timestamp,
        },
      });

      if (error) throw error;

      toast({
        title: "Alert Sent",
        description: `${
          alertType.charAt(0).toUpperCase() + alertType.slice(1)
        } detection notified`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Alert Failed",
        description: `Could not send SMS: ${(err as Error).message}`,
      });
    } finally {
      setIsSendingAlert(false);
    }
  };

  const toggleCamera = () => {
    if (connectionState !== "connected") {
      toast({
        variant: "destructive",
        title: "Not Connected",
        description: "Connect to server first",
      });
      return;
    }

    const newState = cameraState === "active" ? "inactive" : "active";
    socketRef.current?.emit("camera_control", newState);
    setCameraState(newState);
  };

  const toggleDetection = () => {
    if (cameraState !== "active") {
      toast({
        variant: "destructive",
        title: "Camera Inactive",
        description: "Start camera first",
      });
      return;
    }

    const newState = detectionState === "active" ? "inactive" : "active";
    socketRef.current?.emit("detection_control", newState);
    setDetectionState(newState);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Live CCTV Feed</h1>
        <p className="text-muted-foreground">
          {connectionState === "connected"
            ? `Status: ${cameraState} / ${detectionState}`
            : "Server connection required"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CameraView
          isStreaming={cameraState === "active"}
          isDetecting={detectionState === "active"}
          isConnected={connectionState === "connected"}
          videoRef={videoRef}
          onToggleCamera={toggleCamera}
          onToggleDetection={toggleDetection}
        />
        <DetectionFeed
          isConnected={connectionState === "connected"}
          isDetecting={detectionState === "active"}
          isStreaming={cameraState === "active"}
          detections={detections}
        />
      </div>

      {processedFrame && (
        <div style={{ marginTop: 16 }}>
          <h3>Processed Frame (from backend)</h3>
          <img
            src={processedFrame}
            alt="Processed Frame"
            style={{ maxWidth: "100%", border: "2px solid #333" }}
          />
        </div>
      )}
    </Layout>
  );
};

export default LiveCCTV;
