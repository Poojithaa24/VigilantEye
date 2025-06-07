
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'alert';
  thumbnail: string;
}

interface CameraGridProps {
  cameras: Camera[];
}

const CameraGrid: React.FC<CameraGridProps> = ({ cameras }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Camera Network</CardTitle>
        <CardDescription>Live status of surveillance cameras</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cameras.map((camera) => (
            <Card key={camera.id} className="overflow-hidden border-0 shadow-none">
              <div className="relative aspect-video">
                <img
                  src={camera.thumbnail}
                  alt={camera.name}
                  className="w-full h-full object-cover rounded-t-md"
                />
                <Badge
                  className={cn(
                    'absolute top-2 right-2',
                    camera.status === 'online' && 'bg-success',
                    camera.status === 'offline' && 'bg-muted',
                    camera.status === 'alert' && 'bg-alert animate-pulse'
                  )}
                >
                  {camera.status === 'online' && 'Online'}
                  {camera.status === 'offline' && 'Offline'}
                  {camera.status === 'alert' && 'Alert'}
                </Badge>
              </div>
              <div className="p-2">
                <h3 className="font-medium text-sm truncate">{camera.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{camera.location}</p>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CameraGrid;
