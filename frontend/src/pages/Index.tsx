import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Dashboard/Layout";
import StatusCard from "@/components/Dashboard/StatusCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [videoCount, setVideoCount] = useState<number>(0);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get video count from analytics table
        const { data: analyticsData, error: analyticsError } = await supabase
          .from("analytics")
          .select("*")
          .eq("id", "video_analysis_count")
          .maybeSingle();

        if (analyticsError) throw analyticsError;

        if (analyticsData) {
          setVideoCount(analyticsData.value || 0);
        }

        // Get last processed video timestamp
        const { data: lastVideoData, error: videoError } = await supabase
          .from("video_uploads")
          .select("updated_at")
          .eq("status", "completed")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (videoError) throw videoError;

        if (lastVideoData) {
          setLastProcessed(lastVideoData.updated_at);
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to SecurityVision. Monitor and analyze security footage in
          real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatusCard
          title="Active Cameras"
          value={loading ? "..." : videoCount.toString()}
          icon="camera"
          description="Currently connected cameras"
        />
        <StatusCard
          title="Videos Analyzed"
          value={loading ? "..." : videoCount.toString()}
          description={
            lastProcessed
              ? `Last analysis: ${formatDate(lastProcessed)}`
              : "No videos analyzed yet"
          }
          icon="analytics"
        />
        <StatusCard
          title="Detection Status"
          value="Active"
          description="Real-time monitoring enabled"
          icon="shield"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Link to="/live-cctv">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Live Camera Feed</CardTitle>
                  <CardDescription>
                    Access real-time camera monitoring
                  </CardDescription>
                </div>
                <Camera className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                View Live Feed
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link to="/video-analysis">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Video Analysis</CardTitle>
                  <CardDescription>
                    Upload and analyze security footage
                  </CardDescription>
                </div>
                <Video className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Start Analysis
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </Layout>
  );
};

export default Index;
