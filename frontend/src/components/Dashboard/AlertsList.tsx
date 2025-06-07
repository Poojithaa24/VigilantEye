
import React from 'react';
import { AlertTriangle, ArrowRight, Shield, Hand } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  type: 'weapon' | 'violence';
  location: string;
  camera: string;
  time: string;
  severity: 'high' | 'medium' | 'low';
}

interface AlertsListProps {
  alerts: Alert[];
}

const AlertItem: React.FC<Alert> = ({ type, location, camera, time, severity }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-alert/10 text-alert border-alert/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/10 text-muted border-muted/20';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'weapon':
        return <Shield className="h-5 w-5 mr-3 text-alert" />;
      case 'violence':
        return <Hand className="h-5 w-5 mr-3 text-warning" />;
      default:
        return <AlertTriangle className="h-5 w-5 mr-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={`p-3 rounded-lg mb-3 border flex items-center ${getSeverityColor(severity)}`}>
      {getAlertIcon(type)}
      <div className="flex-grow">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">
            {type === 'weapon' ? 'Weapon Detected' : 'Physical Violence Detected'}
          </p>
          <Badge variant="outline" className={`ml-2 ${getSeverityColor(severity)}`}>
            {severity.toUpperCase()}
          </Badge>
        </div>
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">{location} • {camera}</p>
          <p className="text-xs text-muted-foreground">{time}</p>
        </div>
      </div>
    </div>
  );
};

const AlertsList: React.FC<AlertsListProps> = ({ alerts }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Detected incidents requiring attention</CardDescription>
          </div>
          <Badge variant="destructive" className="animate-pulse">Live</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.map((alert) => (
          <AlertItem key={alert.id} {...alert} />
        ))}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          View All Alerts
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AlertsList;
