
import React from 'react';
import { BarChart3, ArrowUp, ArrowDown, Camera, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatusCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: 'camera' | 'alert' | 'shield' | 'analytics';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  value,
  description,
  icon,
  trend,
  className,
}) => {
  const getIcon = () => {
    switch (icon) {
      case 'camera':
        return <Camera className="h-5 w-5" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5" />;
      case 'shield':
        return <Shield className="h-5 w-5" />;
      case 'analytics':
        return <BarChart3 className="h-5 w-5" />;
      default:
        return <Camera className="h-5 w-5" />;
    }
  };

  const getIconColor = () => {
    switch (icon) {
      case 'camera':
        return 'text-primary bg-primary/10';
      case 'alert':
        return 'text-alert bg-alert/10';
      case 'shield':
        return 'text-success bg-success/10';
      case 'analytics':
        return 'text-warning bg-warning/10';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  const getTrendColor = (isPositive: boolean) => {
    if (icon === 'alert') {
      return isPositive ? 'text-alert' : 'text-success';
    }
    
    return isPositive ? 'text-success' : 'text-alert';
  };

  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('p-2 rounded-full', getIconColor())}>
          {getIcon()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={cn('flex items-center', getTrendColor(trend.isPositive))}>
                {trend.isPositive ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                {trend.value}%
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusCard;
