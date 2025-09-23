import React from 'react';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from './ui/sidebar';
import { Users, MessageSquare, BookOpen, History, Edit } from 'lucide-react';

interface AppSidebarProps {
  userRole: 'mentor' | 'student';
  selectedView: string;
  onSelectView: (view: string) => void;
  className?: string;
}

export function AppSidebar({ userRole, selectedView, onSelectView, className }: AppSidebarProps) {
  const mentorMenuItems = [
    { id: 'students', label: '学生', icon: Users },
    { id: 'knowledge', label: '知識ベース', icon: BookOpen },
  ];

  const studentMenuItems = [
    { id: 'chat', label: 'チャット', icon: MessageSquare },
    { id: 'history', label: '履歴', icon: History },
    { id: 'feedback', label: 'メンター添削', icon: Edit },
  ];

  // Show role-specific menu items
  const menuItems = userRole === 'mentor' ? mentorMenuItems : studentMenuItems;

  return (
    <Sidebar className={className}>
      <SidebarHeader className="border-b p-4">
        <h2 className="font-semibold">{userRole === 'mentor' ? 'メンターポータル' : '学生ポータル'}</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map(item => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => onSelectView(item.id)}
                className={selectedView === item.id ? 'bg-accent' : ''}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
