import type { Metadata } from 'next';
import './globals.css';
import { TopProgressBar } from '@/components/common/TopProgressBar';

export const metadata: Metadata = {
  metadataBase: new URL('https://glamournails.com.au'),
  title: {
    template: '%s | Glamour Nails & Beauty Lounge Sydney',
    default: 'Glamour Nails & Beauty Lounge Sydney | Bespoke Nail Artistry & Spa',
  },
  description:
    'Sydney CBD premier nail lounge specializing in Russian manicures, bespoke 3D nail art, organic SNS dipping, and luxury spa treatments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-white text-gray-900">
        <TopProgressBar />
        {children}
      </body>
    </html>
  );
}
