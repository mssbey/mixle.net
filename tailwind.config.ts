import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

/**
 * Nefis Aroma tasarım token'ları.
 *
 * Referans e-ticaret dili: beyaz zemin, kırmızı CTA, koyu lacivert metin,
 * ince gri borderlar, hafif gölgeler. Token *adları* geriye dönük uyumluluk
 * için korunur (`purple` = lacivert/mürekkep rampası, `gold` = kehribar aksan),
 * değerleri yeni sisteme göre yeniden eşlendi. Yeni kırmızı CTA rampası
 * `brand` altındadır.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        // Kırmızı CTA / badge / aktif durum rampası
        brand: {
          50: '#FFF1F1',
          100: '#FFDFDF',
          200: '#FFC2C4',
          300: '#FF9599',
          400: '#F5484F',
          500: '#E31B23', // ana kırmızı
          600: '#C9151C', // hover
          700: '#A5111A',
          800: '#7F0E15',
          900: '#5C0B10',
        },
        // "purple" adı korunur ama artık lacivert/mürekkep nötr rampasıdır
        purple: {
          50: '#F5F7FA',
          100: '#E5E7EB', // border (global `*` border-color)
          200: '#D6DBE2', // input / chip border
          300: '#AEB7C2',
          400: '#8A94A3', // sönük ikon
          500: '#5C6675',
          600: '#3A4557',
          700: '#28303F',
          800: '#1B2130', // başlık / nav metni
          900: '#0F1729', // ana metin
          950: '#080D18', // koyu yüzey
        },
        // "gold" adı korunur ama artık kehribar (puan / yıldız / uyarı) rampasıdır
        gold: {
          50: '#FFF8EC',
          100: '#FDECC8',
          200: '#F8D488',
          300: '#F0B44E',
          400: '#E1922A', // yıldız dolgusu / aksan
          500: '#B26C09',
          600: '#8A5207',
          700: '#6B3F05',
        },
        cream: '#FFFFFF',
        mist: '#F7F8FA', // açık bölüm arka planı
        line: '#E5E7EB', // standart border
        'line-soft': '#EEF0F3',
        ink: '#0F1729',
        'ink-soft': '#64748B',
        success: '#16A34A',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'serif'],
        script: ['var(--font-script)', 'cursive'],
      },
      fontSize: {
        'display-sm': ['clamp(1.75rem, 3vw, 2.25rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(2rem, 4vw, 3rem)', { lineHeight: '1.08', letterSpacing: '-0.025em' }],
        'display-lg': ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        xl: '0.625rem',
        '2xl': '0.875rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,41,0.05)',
        soft: '0 1px 2px rgba(15,23,41,0.04), 0 1px 3px rgba(15,23,41,0.07)',
        lift: '0 8px 28px -10px rgba(15,23,41,0.18)',
        glow: '0 0 0 1px rgba(227,27,35,0.22)',
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        grain: "url('/images/texture/grain.png')",
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 7s ease-in-out infinite',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [typography],
};

export default config;
