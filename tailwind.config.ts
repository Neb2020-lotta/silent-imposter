import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'poppins': ['Rubik', 'sans-serif'],
				'game': ['"Space Mono"', 'monospace'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
				secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
				destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
				muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
				accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
				popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
				card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
				'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
				'fade-in': { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
				'slide-up': { '0%': { opacity: '0', transform: 'translateY(24px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
				'logo-pulse': {
					'0%, 100%': { textShadow: '0 0 10px hsla(var(--game-accent), 0.4)' },
					'50%': { textShadow: '0 0 30px hsla(var(--game-accent), 0.9), 0 0 60px hsla(var(--game-accent), 0.4)' },
				},
				'press-pulse': {
					'0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 hsla(var(--game-accent), 0.7)' },
					'70%': { transform: 'scale(0.97)', boxShadow: '0 0 0 14px hsla(var(--game-accent), 0)' },
					'100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 hsla(var(--game-accent), 0)' },
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 0 0 hsla(var(--game-accent), 0.0)' },
					'50%': { boxShadow: '0 0 24px 2px hsla(var(--game-accent), 0.45)' },
				},
				'timer-pulse-red': {
					'0%, 100%': { color: 'hsl(0 85% 60%)', transform: 'scale(1)' },
					'50%': { color: 'hsl(0 100% 70%)', transform: 'scale(1.08)' },
				},
				'flip-in': {
					'0%': { transform: 'rotateY(90deg)', opacity: '0' },
					'100%': { transform: 'rotateY(0deg)', opacity: '1' },
				},
				'particle-float': {
					'0%': { transform: 'translateY(0) translateX(0)', opacity: '0' },
					'10%': { opacity: '0.6' },
					'90%': { opacity: '0.4' },
					'100%': { transform: 'translateY(-120vh) translateX(20px)', opacity: '0' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.35s ease-out both',
				'slide-up': 'slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
				'logo-pulse': 'logo-pulse 3.2s ease-in-out infinite',
				'press-pulse': 'press-pulse 0.45s ease-out',
				'glow-pulse': 'glow-pulse 1.8s ease-in-out infinite',
				'timer-pulse-red': 'timer-pulse-red 0.9s ease-in-out infinite',
				'flip-in': 'flip-in 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) both',
			},
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
