import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { LangProvider } from '../lib/LangContext';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Tutorai — AI-Powered Learning',
  description: 'AI-generated adaptive tests, personalised mentorship, and study plans.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
        style={{ fontFamily: 'var(--font-inter, Inter), sans-serif' }}>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
