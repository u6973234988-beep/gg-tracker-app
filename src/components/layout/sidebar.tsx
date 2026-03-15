'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Settings,
  Menu,
  X,
  Clock,
} from 'lucide-react';

const navigationItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Registro',
    icon: BookOpen,
    href: '/registro',
  },
  {
    label: 'Playbook',
    icon: Target,
    href: '/playbook',
  },
  {
    label: 'Configurazioni',
    icon: Settings,
    href: '/configurazioni',
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const pathname = usePathname();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setCurrentTime(timeString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-primary-700 text-white hover:bg-primary-800 transition-colors"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-background-card border-r border-border-dark z-40 transition-all duration-300 flex flex-col',
          isCollapsed ? 'w-[70px] lg:w-[70px]' : 'w-[260px] lg:w-[260px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-dark h-16">
          {!isCollapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text text-transparent">
              GG
            </h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg bg-background-hover hover:bg-background-card text-text-secondary transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  active
                    ? 'bg-primary-700 text-white shadow-lg shadow-primary-700/50'
                    : 'text-text-secondary hover:bg-background-hover hover:text-text-primary'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            'border-t border-border-dark p-4 space-y-2',
            isCollapsed && 'flex flex-col items-center justify-center'
          )}
        >
          <div className="flex items-center gap-2 text-text-secondary">
            <Clock className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-xs font-mono">{currentTime}</span>}
          </div>
          {!isCollapsed && (
            <p className="text-xs text-text-muted">
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>
      </aside>

      <div
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[260px]'
        )}
      />
    </>
  );
}
