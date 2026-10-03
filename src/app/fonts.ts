import { Manrope, Fraunces, Dancing_Script, Inter } from 'next/font/google';

export const fontSans = Manrope({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-sans',
});

export const fontDisplay = Fraunces({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const fontScript = Dancing_Script({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-script',
  weight: ['600', '700'],
});

/** Ana sayfa + vitrin header'ı: referans (mixle.net) tipografisi. */
export const fontInter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});
