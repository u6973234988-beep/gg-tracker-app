import type { Metadata } from 'next';
import { Space_Mono, DM_Sans } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

/* ── GG Tracker Fonts ──
   Space Mono → headings, data, display (font-mono)
   DM Sans    → body, UI, labels      (font-sans)
*/
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

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
    <html
      lang="it"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#0F0F11" />
      </head>
      <body
        className={`
          ${spaceMono.variable}
          ${dmSans.variable}
          font-sans
          antialiased
          bg-[#0F0F11]
          text-[#F8F8FF]
        `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
