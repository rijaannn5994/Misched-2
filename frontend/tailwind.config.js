/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: {
          primary: '#0a0a14',
          secondary: '#0f0f1a',
          tertiary: '#1a1a2e',
        },
        glass: {
          bg: 'rgba(255, 255, 255, 0.04)',
          'bg-hover': 'rgba(255, 255, 255, 0.07)',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-hover': 'rgba(255, 255, 255, 0.15)',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
        'gradient-primary-hover': 'linear-gradient(135deg, #2563eb 0%, #0891b2 100%)',
        'gradient-warm': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        'gradient-green': 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
        'gradient-purple': 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
        'gradient-bg': 'linear-gradient(160deg, #0a0a14 0%, #0f0f1a 40%, #1a1a2e 100%)',
      },
      boxShadow: {
        'glow': '0 0 30px rgba(59, 130, 246, 0.15)',
        'glow-lg': '0 0 40px rgba(59, 130, 246, 0.25)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'elevated': '0 20px 60px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease forwards',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-down': 'slideDown 0.4s ease forwards',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
