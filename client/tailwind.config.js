/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          darker: 'rgb(var(--dc-darker) / <alpha-value>)',
          dark: 'rgb(var(--dc-dark) / <alpha-value>)',
          medium: 'rgb(var(--dc-medium) / <alpha-value>)',
          light: 'rgb(var(--dc-light) / <alpha-value>)',
          lighter: 'rgb(var(--dc-lighter) / <alpha-value>)',
          lightest: 'rgb(var(--dc-lightest) / <alpha-value>)',
          text: 'rgb(var(--dc-text) / <alpha-value>)',
          white: 'rgb(var(--dc-white) / <alpha-value>)',
          muted: 'rgb(var(--dc-muted) / <alpha-value>)',
          'channels-default': 'rgb(var(--dc-channels) / <alpha-value>)',
          embed: 'rgb(var(--dc-embed) / <alpha-value>)',
          input: 'rgb(var(--dc-input) / <alpha-value>)',
          // Fixed colors (same across all themes)
          blurple: '#5865f2',
          green: '#57f287',
          yellow: '#fee75c',
          fuchsia: '#eb459e',
          red: '#ed4245',
          brand: '#5865f2',
          link: '#00a8fc',
          separator: 'var(--dc-separator)',
        },
      },
      fontFamily: {
        discord: ['gg sans', 'Noto Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
