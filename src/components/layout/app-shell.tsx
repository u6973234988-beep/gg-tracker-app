'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0a0a0f]">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto cyber-grid-lines bg-gray-50/50 dark:bg-transparent">
          {/* Radial ambient glows */}
          <div className="pointer-events-none fixed inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(139,92,246,0.04),transparent_70%)] dark:bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(109,40,217,0.12),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_80%_60%,rgba(139,92,246,0.03),transparent_70%)] dark:bg-[radial-gradient(circle_600px_at_80%_60%,rgba(109,40,217,0.08),transparent_70%)]" />
          </div>
          <div className="relative z-[1]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
