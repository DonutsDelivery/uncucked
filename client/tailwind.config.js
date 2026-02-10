/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        discord: {
          darker: '#1e1f22',
          dark: '#2b2d31',
          medium: '#313338',
          light: '#3f4147',
          lighter: '#4e5058',
          lightest: '#b5bac1',
          text: '#dbdee1',
          white: '#f2f3f5',
          blurple: '#5865f2',
          green: '#57f287',
          yellow: '#fee75c',
          fuchsia: '#eb459e',
          red: '#ed4245',
          brand: '#5865f2',
        },
      },
      fontFamily: {
        discord: ['gg sans', 'Noto Sans', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
