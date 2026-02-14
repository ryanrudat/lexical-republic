import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Terminal palette — authoritarian CRT
        terminal: {
          bg: '#0A0E0A',
          green: '#33FF33',
          'green-dim': '#1A8C1A',
          'green-dark': '#0D1A0D',
          amber: '#FFAA00',
          red: '#FF3333',
          border: '#1A4D1A',
          input: '#0D1A0D',
        },
        // Ministry palette (kept for TeacherDashboard)
        ministry: {
          dark: '#1a1a2e',
          mid: '#16213e',
          accent: '#0f3460',
          highlight: '#e94560',
          text: '#c8c8c8',
          muted: '#6b7280',
        },
        // CRT / terminal legacy aliases (pastel variant)
        crt: {
          green: '#33FF33',
          amber: '#FFAA00',
          blue: '#66D9FF',
          glow: '#33FF3333',
        },
        // Resistance palette (Act III)
        resistance: {
          warm: '#d4a574',
          gold: '#f0c040',
          wood: '#8b6914',
          paper: '#f5e6c8',
        },
        // PEARL
        pearl: {
          iris: '#55FF55',
          sclera: '#d8f0d8',
          glow: '#33FF3344',
          'glow-chrome': '#33FF3344',
        },
        // Retrofuturist office palette
        retro: {
          'mint-cream': '#E8F5E9',
          'powder-blue': '#B3E5FC',
          'pale-rose': '#FCE4EC',
          buttercream: '#FFF9C4',
          'warm-gray': '#F5F0E8',
          'cream-wall': '#EDE8D0',
          'warm-wood': '#8B7355',
          'desk-brown': '#5c3a1e',
        },
        // Neon accents
        neon: {
          pink: '#FF4081',
          cyan: '#00E5FF',
          mint: '#69F0AE',
        },
        // Chrome metallic
        chrome: {
          light: '#E8E8E8',
          mid: '#C0C0C0',
          dark: '#808080',
          shine: '#F5F5F5',
        },
        // iOS-Dystopia terminal palette
        ios: {
          bg: '#0E1628',
          'bg-subtle': '#131D35',
          surface: '#1A2540',
        },
      },
      fontFamily: {
        'special-elite': ['"Special Elite"', 'cursive'],
        'ibm-sans': ['"IBM Plex Sans"', 'sans-serif'],
        'ibm-mono': ['"IBM Plex Mono"', 'monospace'],
        'merriweather': ['"Merriweather"', 'serif'],
        'caveat': ['"Caveat"', 'cursive'],
        'dseg7': ['"DSEG7Classic"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite',
        'typewriter': 'typewriter 2s steps(40) forwards',
        'scanline': 'scanline 8s linear infinite',
        'eye-pulse': 'eyePulse 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'cursor-blink': 'cursorBlink 1s step-end infinite',
        'screen-flicker': 'screenFlicker 0.1s ease-in-out',
        'boot-typewriter': 'bootTypewriter 0.5s steps(20) forwards',
        'scanline-drift': 'scanlineDrift 6s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'float-particle': 'floatParticle 10s ease-in-out infinite',
        'glitch-tear': 'glitchTear 0.3s ease-out',
        'resist-shake': 'resistShake 0.4s ease-in-out',
        'queue-tick': 'queueTick 0.3s ease-out',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        eyePulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        screenFlicker: {
          '0%': { opacity: '1' },
          '25%': { opacity: '0.85' },
          '50%': { opacity: '0.95' },
          '75%': { opacity: '0.88' },
          '100%': { opacity: '1' },
        },
        bootTypewriter: {
          from: { width: '0', opacity: '0' },
          '1%': { opacity: '1' },
          to: { width: '100%', opacity: '1' },
        },
        scanlineDrift: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(91,184,212,0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(91,184,212,0.4)' },
        },
        floatParticle: {
          '0%': { transform: 'translateY(100vh) scale(0)', opacity: '0' },
          '10%': { opacity: '0.4' },
          '90%': { opacity: '0.3' },
          '100%': { transform: 'translateY(-10vh) scale(1)', opacity: '0' },
        },
        viewTransition: {
          '0%': { opacity: '0' },
          '30%': { opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        scanSweep: {
          '0%': { top: '-2px' },
          '100%': { top: '100%' },
        },
        glitchTear: {
          '0%': { transform: 'translateY(4px) skewX(-1deg)', opacity: '0' },
          '40%': { transform: 'translateY(-2px) skewX(0.5deg)', opacity: '1' },
          '100%': { transform: 'translateY(0) skewX(0)', opacity: '1' },
        },
        resistShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        queueTick: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
