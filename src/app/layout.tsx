import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'GG Tracker - Trading Journal',
  description:
    'GG Tracker: il tuo diario di trading personale. Analizza le tue operazioni, migliora le tue strategie e raggiungi i tuoi obiettivi nel trading.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#7F00FF" />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-[#0a0a0f] text-gray-800 dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
