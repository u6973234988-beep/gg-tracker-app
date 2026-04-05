'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Clock,
  Activity,
} from 'lucide-react';

const navigationItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    description: 'Panoramica generale',
  },
  {
    label: 'Registro',
    icon: BookOpen,
    href: '/registro',
    description: 'Storico operazioni',
  },
  {
    label: 'Playbook',
    icon: Target,
    href: '/playbook',
    description: 'Le tue strategie',
  },
  {
    label: 'Configurazioni',
    icon: Settings,
    href: '/configurazioni',
    description: 'Preferenze',
  },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + '/'),
    [pathname]
  );

  const activeIndex = navigationItems.findIndex((item) => isActive(item.href));
  const indicatorTop = activeIndex >= 0 ? activeIndex * 58 : 0;

  return (
    <>
      {/* ── Mobile toggle ── */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className={cn(
          'fixed z-50 lg:hidden flex items-center justify-center transition-all duration-300',
          isMobileOpen
            ? 'left-[232px] top-5 h-8 w-8 rounded-full bg-[#46265F]/30 text-[#c4a0e8] border border-[#6A3D8F]/40'
            : 'left-4 top-4 h-10 w-10 rounded-lg bg-[#46265F] text-[#F8F8FF] shadow-lg shadow-[rgba(106,61,143,0.3)]'
        )}
      >
        {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Mobile backdrop ── */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── Sidebar ─── */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'sidebar-glass',
          isCollapsed ? 'w-[72px]' : 'w-[260px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Right edge — sottile glow viola */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-[#2D2D32] via-[#6A3D8F]/20 to-[#2D2D32]" />

        {/* ── Logo Area ── */}
        <div className={cn(
          'relative flex items-center h-[68px] shrink-0 border-b border-[#2D2D32]',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        )}>
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden border border-[#2D2D32] group-hover:border-[#6A3D8F] group-hover:shadow-[0_0_20px_rgba(106,61,143,0.3)] transition-all duration-200">
              <Image
                src="/logo.png"
                alt="GG Tracker"
                width={40}
                height={40}
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 rounded-lg bg-[#6A3D8F]/10 animate-ping-slow" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <span className="text-[15px] font-bold tracking-widest text-[#F8F8FF] leading-none font-mono uppercase">
                  GG Tracker
                </span>
                <span className="text-[10px] text-[#80808A] font-mono mt-1 leading-none tracking-wider">
                  TRADING JOURNAL
                </span>
              </motion.div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex items-center justify-center h-7 w-7 rounded-md text-[#80808A] hover:text-[#c4a0e8] hover:bg-[#46265F]/20 border border-transparent hover:border-[#6A3D8F]/30 transition-all duration-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-5 px-3">
          <div ref={navRef} className="relative flex flex-col gap-1.5">

            {/* Animated active indicator (expanded mode) */}
            <AnimatePresence>
              {activeIndex >= 0 && !isCollapsed && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 right-0 z-0 pointer-events-none"
                  initial={false}
                  animate={{ top: indicatorTop, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                  style={{ height: 52 }}
                >
                  <div className="h-full w-full rounded-lg bg-[#46265F]/20 border border-[#6A3D8F]/25" />
                  {/* Left accent nub */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-[#6A3D8F] shadow-[0_0_10px_rgba(106,61,143,0.6)]" />
                </motion.div>
              )}
            </AnimatePresence>

            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative z-10 flex items-center h-[52px] rounded-lg transition-all duration-200',
                    isCollapsed ? 'justify-center px-0' : 'px-3.5 gap-3.5',
                    active
                      ? 'text-[#F8F8FF]'
                      : 'text-[#80808A] hover:text-[#c4a0e8] hover:bg-[#46265F]/10'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {/* Collapsed: active accent bar */}
                  {isCollapsed && active && (
                    <motion.div
                      layoutId="sidebar-collapsed-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-[#6A3D8F] shadow-[0_0_10px_rgba(106,61,143,0.6)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}

                  {/* Icon container */}
                  <div className={cn(
                    'relative flex items-center justify-center w-9 h-9 rounded-md transition-all duration-200 shrink-0',
                    active
                      ? 'bg-[#46265F]/30 text-[#c4a0e8]'
                      : ''
                  )}>
                    <Icon className="h-[18px] w-[18px]" />
                    {/* Active dot (collapsed) */}
                    {active && isCollapsed && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#6A3D8F]" />
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={cn(
                        'text-[13px] font-semibold leading-tight truncate font-mono tracking-wide uppercase',
                        active ? 'text-[#F8F8FF]' : ''
                      )}>
                        {item.label}
                      </span>
                      <span className={cn(
                        'text-[10px] leading-tight truncate mt-0.5 font-sans',
                        active
                          ? 'text-[#80808A]'
                          : 'text-[#80808A]/60'
                      )}>
                        {item.description}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Expand button when collapsed */}
          {isCollapsed && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setIsCollapsed(false)}
                className="flex items-center justify-center h-9 w-9 rounded-md text-[#80808A] hover:text-[#c4a0e8] hover:bg-[#46265F]/15 border border-transparent hover:border-[#6A3D8F]/30 transition-all duration-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </nav>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-[#2D2D32]">
          <div className={cn(
            'px-4 py-4',
            isCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'
          )}>
            {/* Time display */}
            <div className={cn(
              'flex items-center',
              isCollapsed ? 'justify-center' : 'gap-3'
            )}>
              <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-[#46265F]/15 border border-[#2D2D32] shrink-0">
                <Clock className="h-4 w-4 text-[#80808A]" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#6A3D8F]/80 animate-pulse" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-mono font-bold tabular-nums text-[#c4a0e8] leading-none">
                    {currentTime}
                  </span>
                  <span className="text-[10px] text-[#80808A] mt-1 leading-none font-mono">
                    {new Date().toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Market status */}
            {!isCollapsed ? (
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20">
                <div className="relative shrink-0">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#22C55E] animate-ping opacity-60" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-[#22C55E]" />
                  <span className="text-[11px] font-semibold text-[#22C55E] font-mono tracking-wider">
                    MERCATI APERTI
                  </span>
                </div>
              </div>
            ) : (
              <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-[#22C55E]/10 border border-[#22C55E]/20">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <div className="absolute w-2 h-2 rounded-full bg-[#22C55E] animate-ping opacity-60" />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Content spacer */}
      <div
        className={cn(
          'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hidden lg:block shrink-0',
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      />
    </>
  );
}
