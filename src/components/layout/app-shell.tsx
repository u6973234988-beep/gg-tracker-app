'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F11]">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />

        <main className="flex-1 overflow-y-auto cyber-grid-lines bg-[#0F0F11]">
          {/* Radial ambient glows */}
          <div className="pointer-events-none fixed inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(106,61,143,0.10),transparent_70%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_80%_60%,rgba(106,61,143,0.06),transparent_70%)]" />
          </div>
          <div className="relative z-[1]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
