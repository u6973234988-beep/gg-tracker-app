'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Search, Sun, Moon, Bell } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

const pageLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/registro': 'Registro Operazioni',
  '/playbook': 'Playbook',
  '/configurazioni': 'Configurazioni',
};

export function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [notificationCount] = useState(3);

  const pageTitle = pageLabels[pathname] || 'GG Tracker';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200/80 dark:border-[#1e1e2e] bg-white/80 dark:bg-[#0e0e16]/80 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-3 md:py-4">
        <div className="flex-1 flex items-center gap-4">
          <h1 className="hidden md:block text-lg md:text-xl font-semibold text-gray-800 dark:text-white">
            {pageTitle}
          </h1>

          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Ricerca..."
                className="pl-10 bg-gray-50 dark:bg-[#12121a] border-gray-200 dark:border-[#1e1e2e] text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                type="search"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a24] rounded-lg"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              title="Notifiche"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a24] rounded-lg"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {notificationCount}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10 border-2 border-gray-200 dark:border-[#2a2a3e]">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold">GG</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#161622] border-gray-200 dark:border-[#2a2a3e]">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">GG</AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-gray-800 dark:text-white">Utente</p>
                  <p className="text-xs leading-none text-gray-500 dark:text-gray-500">user@example.com</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#1e1e2e]" />
              <DropdownMenuItem className="text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-[#1a1a24]">Profilo</DropdownMenuItem>
              <DropdownMenuItem className="text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-[#1a1a24]">Impostazioni</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#1e1e2e]" />
              <DropdownMenuItem className="text-gray-700 dark:text-gray-300 focus:bg-gray-50 dark:focus:bg-[#1a1a24]">Esci</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
