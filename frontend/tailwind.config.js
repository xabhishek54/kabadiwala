/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
          800: '#14532d',
        },
        surface: {
          bg: '#faf9f5',       // Soft off-white background for outdoor glare reduction
          card: '#ffffff',     // Clean white card background
          border: '#e7e5e4',   // High contrast subtle border
          muted: '#f5f5f4',    // Light neutral grey
        },
        accent: {
          amber: '#d97706',    // Pending / Caution status
          blue: '#2563eb',     // Neutral info / nav accent
          green: '#16a34a',    // Paid / Confirmed status
          red: '#dc2626',      // Hazard warning / error
        }
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 14px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
