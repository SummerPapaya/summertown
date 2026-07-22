/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* Summer Town tokens */
        cream: 'var(--cream)',
        paper: 'var(--paper)',
        sand: 'var(--sand)',
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        sky: 'var(--sky)',
        seafoam: 'var(--seafoam)',
        lagoon: 'var(--lagoon)',
        'deep-sea': 'var(--deep-sea)',
        peach: 'var(--peach)',
        coral: 'var(--coral)',
        rose: 'var(--rose)',
        butter: 'var(--butter)',
        apricot: 'var(--apricot)',
        lavender: 'var(--lavender)',
        lilac: 'var(--lilac)',
        mint: 'var(--mint)',
        leaf: 'var(--leaf)',
        /* shadcn tokens */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'sans-serif'],
        body: ['Nunito', 'ui-sans-serif', 'sans-serif'],
        hand: ['Caveat', 'cursive'],
      },
      borderRadius: {
        card: '28px',
        panel: '32px',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        sticker: '0 12px 32px rgba(74,68,112,0.12), 0 3px 0 rgba(74,68,112,0.06)',
        pop: '0 6px 0 rgba(74,68,112,0.15)',
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      transitionTimingFunction: {
        squash: 'cubic-bezier(0.22, 1.2, 0.36, 1)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
