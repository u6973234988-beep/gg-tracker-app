'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const pageLabels: Record<string, string> = {
  '/dashboard':       'Dashboard',
  '/registro':        'Registro Operazioni',
  '/playbook':        'Playbook',
  '/configurazioni':  'Configurazioni',
};

export function Header() {
  const pathname = usePathname();
  const [notificationCount] = useState(3);

  const pageTitle = pageLabels[pathname] || 'GG Tracker';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#2D2D32] bg-[#0F0F11]">
      <div className="flex items-center justify-between gap-4 h-[68px] px-4 md:px-6">

        {/* Page title */}
        <div className="flex-1 flex items-center gap-4">
          <h1 className="hidden md:block text-lg md:text-xl font-mono font-bold tracking-widest text-[#F8F8FF] uppercase">
            {pageTitle}
          </h1>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              title="Notifiche"
              className="text-[#80808A] hover:text-[#c4a0e8] hover:bg-[#46265F]/15 rounded-lg border border-transparent hover:border-[#6A3D8F]/30 transition-all duration-200"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-[#DC2626] text-white border-0"
              >
                {notificationCount}
              </Badge>
            )}
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-lg p-0 border border-[#2D2D32] hover:border-[#6A3D8F] transition-all duration-200"
              >
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-[#46265F] text-[#c4a0e8] font-mono font-bold rounded-lg">
                    GG
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-[#1C1C1F] border border-[#2D2D32] shadow-[0_0_20px_rgba(106,61,143,0.2)]"
            >
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-[#46265F] text-[#c4a0e8] font-mono font-bold rounded-lg">
                    GG
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-semibold leading-none text-[#F8F8FF] font-mono">
                    Utente
                  </p>
                  <p className="text-xs leading-none text-[#80808A]">
                    user@example.com
                  </p>
                </div>
              </div>

              <DropdownMenuSeparator className="bg-[#2D2D32]" />

              <DropdownMenuItem className="text-[#80808A] hover:text-[#F8F8FF] focus:bg-[#46265F]/15 focus:text-[#F8F8FF] cursor-pointer">
                Profilo
              </DropdownMenuItem>
              <DropdownMenuItem className="text-[#80808A] hover:text-[#F8F8FF] focus:bg-[#46265F]/15 focus:text-[#F8F8FF] cursor-pointer">
                Impostazioni
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-[#2D2D32]" />

              <DropdownMenuItem className="text-[#DC2626] hover:text-[#DC2626] focus:bg-[#DC2626]/10 focus:text-[#DC2626] cursor-pointer">
                Esci
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
