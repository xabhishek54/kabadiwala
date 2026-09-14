/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand green — matches the reference image CTA buttons
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Sidebar dark green — matches the reference image left sidebar
        sidebar: {
          bg:      '#1B3A2D',   // Deep forest green
          hover:   '#243F30',   // Slightly lighter on hover
          active:  '#2D5A3D',   // Active item bg
          border:  '#2A4A38',   // Subtle inner border
          text:    '#A8D5B5',   // Muted sidebar text
          textActive: '#FFFFFF',// Active/highlight text
        },
        // Page surfaces
        surface: {
          bg:     '#F2F7F4',    // Very light green-tinted background
          card:   '#FFFFFF',    // Clean white cards
          border: '#E2EBE6',    // Soft green-tinted border
          muted:  '#F7FAF8',    // Ultra-light muted background
          input:  '#F5F9F6',    // Input field background
        },
        // Status accent colors
        accent: {
          amber:  '#d97706',
          blue:   '#2563eb',
          green:  '#16a34a',
          red:    '#dc2626',
          purple: '#7c3aed',
          orange: '#ea580c',
        }
      },
      borderRadius: {
        'card': '16px',
        'card-lg': '20px',
        'btn':  '12px',
        'pill': '999px',
      },
      boxShadow: {
        'soft':      '0 1px 4px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
        'card':      '0 2px 12px rgba(0, 0, 0, 0.07)',
        'elevated':  '0 4px 20px rgba(0, 0, 0, 0.10)',
        'sidebar':   '4px 0 20px rgba(0, 0, 0, 0.15)',
        'nav':       '0 -2px 12px rgba(0, 0, 0, 0.06)',
        'green-glow':'0 4px 16px rgba(22, 163, 74, 0.25)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        'sidebar': '240px',
        'nav-bottom': '68px',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
