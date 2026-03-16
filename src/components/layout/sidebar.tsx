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
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed left-4 top-4 z-50 lg:hidden flex items-center justify-center h-10 w-10 rounded-lg bg-primary-700 text-white hover:bg-primary-800 transition-colors shadow-lg shadow-primary-700/25"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-40 transition-all duration-300 flex flex-col',
          'bg-white dark:bg-[#0e0e16] border-r border-gray-200/80 dark:border-[#1e1e2e]',
          isCollapsed ? 'w-[70px] lg:w-[70px]' : 'w-[260px] lg:w-[260px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-[#1e1e2e] h-16">
          {!isCollapsed && (
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 dark:from-primary-400 dark:to-primary-600 bg-clip-text text-transparent">
              GG Tracker
            </h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center h-8 w-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a24] hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                  active
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 text-white shadow-lg shadow-primary-700/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1a24] hover:text-gray-900 dark:hover:text-white'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  active ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                )} />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Clock & Date */}
        <div
          className={cn(
            'border-t border-gray-200/80 dark:border-[#1e1e2e] p-4 space-y-1.5',
            isCollapsed && 'flex flex-col items-center justify-center'
          )}
        >
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Clock className="h-4 w-4 flex-shrink-0 text-primary-500/60 dark:text-primary-500/40" />
            {!isCollapsed && <span className="text-xs font-mono tabular-nums">{currentTime}</span>}
          </div>
          {!isCollapsed && (
            <p className="text-xs text-gray-400 dark:text-gray-600 pl-6">
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          )}
        </div>
      </aside>

      {/* Spacer for content offset */}
      <div
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[260px]'
        )}
      />
    </>
  );
}
