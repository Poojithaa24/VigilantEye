
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sidebar as ShadcnSidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { 
  Video, Shield, Settings, Home,
  Camera, User
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  to: string;
  isActive: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, text, to, isActive }) => {
  return (
    <Link to={to}>
      <Button
        variant="ghost"
        className={`w-full justify-start mb-1 ${
          isActive 
            ? 'bg-primary/20 text-primary hover:bg-primary/30'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}
      >
        <span className="mr-2">{icon}</span>
        <span>{text}</span>
        {isActive && <div className="absolute left-0 top-1/2 h-4/5 w-0.5 -translate-y-1/2 bg-primary rounded-full" />}
      </Button>
    </Link>
  );
};

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const sidebarItems = [
    { icon: <Home size={18} />, text: 'Dashboard', to: '/' },
    { icon: <Camera size={18} />, text: 'Live CCTV', to: '/live-cctv' },
    { icon: <Video size={18} />, text: 'Video Analysis', to: '/video-analysis' },
  ];

  return (
    <ShadcnSidebar>
      <SidebarHeader className="pb-4 pt-6">
        <div className="flex items-center px-4">
          <Shield className="text-primary h-6 w-6 mr-2" />
          <h1 className="text-xl font-bold text-sidebar-foreground">Vigilant<span className="text-primary">Eye</span></h1>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-2">
        <div className="mb-8">
          <p className="text-xs text-sidebar-foreground/60 mb-2 ml-3 uppercase font-semibold">
            Main
          </p>
          {sidebarItems.map((item) => (
            <SidebarItem
              key={item.text}
              icon={item.icon}
              text={item.text}
              to={item.to}
              isActive={currentPath === item.to}
            />
          ))}
        </div>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border px-2 py-4">
        <div className="mb-2">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
            <Settings size={18} className="mr-2" />
            <span>Settings</span>
          </Button>
        </div>
        <div>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
            <User size={18} className="mr-2" />
            <span>Profile</span>
          </Button>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
};

export default Sidebar;
