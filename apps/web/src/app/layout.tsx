import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { SmoothScrollProvider } from '../components/providers/SmoothScrollProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'HackJudge — Hackathon Judging Platform',
  description: 'Configure, judge, and export results for any hackathon.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
