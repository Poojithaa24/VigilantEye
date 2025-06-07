
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Maximize2, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface Detection {
  type: 'weapon' | 'violence';
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface VideoFeedProps {
  title: string;
  description?: string;
  isLive?: boolean;
  src?: string;
  detections?: Detection[];
}

const VideoFeed: React.FC<VideoFeedProps> = ({
  title,
  description,
  isLive = true,
  src = 'https://i.imgur.com/K3XTlZS.jpeg', // This would be a real video stream in production
  detections = [],
}) => {
  const [isPlaying, setIsPlaying] = useState(isLive);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {isLive && <Badge variant="destructive" className="animate-pulse">LIVE</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="feed" className="w-full">
          <div className="px-6 pt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="feed">Live Feed</TabsTrigger>
              <TabsTrigger value="detections">Detections</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="feed" className="m-0">
            <div className="relative bg-black aspect-video">
              {/* Video Player */}
              <img 
                src={src} 
                alt="Video Feed" 
                className="w-full h-full object-cover"
              />
              
              {/* Detection Overlays */}
              {detections.map((detection, index) => (
                <div 
                  key={index}
                  className={`absolute border-2 ${
                    detection.type === 'weapon' ? 'border-alert' : 'border-warning'
                  } rounded-md flex items-center justify-center`}
                  style={{
                    left: `${detection.boundingBox.x * 100}%`,
                    top: `${detection.boundingBox.y * 100}%`,
                    width: `${detection.boundingBox.width * 100}%`,
                    height: `${detection.boundingBox.height * 100}%`,
                  }}
                >
                  <Badge className={detection.type === 'weapon' ? 'bg-alert' : 'bg-warning'}>
                    {detection.type === 'weapon' ? 'Weapon' : 'Violence'}: {detection.confidence}%
                  </Badge>
                </div>
              ))}
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                <div className="flex items-center justify-between text-white mb-2">
                  <div className="text-sm">00:23 / 05:12</div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white">
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mb-2">
                  <Slider defaultValue={[35]} max={100} step={1} className="h-1" />
                </div>
                
                <div className="flex items-center justify-center space-x-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white/20 text-white" onClick={togglePlayback}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="detections" className="p-6 space-y-4">
            <div className="text-center text-muted-foreground">
              {detections.length > 0 ? (
                <div className="space-y-2">
                  {detections.map((detection, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center">
                        <Badge className={detection.type === 'weapon' ? 'bg-alert mr-2' : 'bg-warning mr-2'}>
                          {detection.type.toUpperCase()}
                        </Badge>
                        <span>Confidence: {detection.confidence}%</span>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No detections in current view</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="p-6">
            <div className="text-center text-muted-foreground">
              <p>Detection history will appear here</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VideoFeed;
