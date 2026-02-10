// Discord theme definitions — matches Discord's 4 default themes
// Colors stored as space-separated RGB for Tailwind opacity modifier support

const themes = {
  light: {
    label: 'Light',
    preview: '#fbfbfb',
    colors: {
      'dc-darker': '242 242 244',   // #f2f2f4  guild bar
      'dc-dark': '251 251 251',     // #fbfbfb  sidebar + chat
      'dc-medium': '251 251 251',   // #fbfbfb  sidebar + chat (same)
      'dc-light': '235 237 239',    // #ebedef  hover/selected
      'dc-lighter': '192 194 199',  // #c0c2c7  dim interactive
      'dc-lightest': '78 80 88',    // #4e5058  hover text (dark on light)
      'dc-text': '51 51 56',        // #333338  --text-default
      'dc-white': '6 6 7',          // #060607  headings
      'dc-muted': '109 109 119',    // #6d6d77  --text-muted
      'dc-channels': '102 103 112', // #666770  --channels-default
      'dc-embed': '234 236 236',    // #eaecec  --background-secondary-alt
      'dc-input': '234 236 236',    // #eaecec  --channeltextarea-background
      'dc-scrollbar': '138 140 149', // #8a8c95
      'dc-scrollbar-hover': '120 122 131',
      'dc-spoiler': '192 194 199',
      'dc-spoiler-revealed': '170 172 177',
      'dc-separator': 'rgba(150, 150, 158, 0.28)',
    },
  },
  ash: {
    label: 'Ash',
    preview: '#333338',
    colors: {
      'dc-darker': '45 44 50',      // #2d2c32  --background-base-lowest
      'dc-dark': '51 51 56',        // #333338  --background-base-lower (sidebar)
      'dc-medium': '51 51 56',      // #333338  --background-base-lower (chat = sidebar)
      'dc-light': '55 54 62',       // #37363e  --background-base-low
      'dc-lighter': '78 80 88',     // #4e5058  dim interactive
      'dc-lightest': '186 188 194', // #babcc2  hover text
      'dc-text': '221 221 223',     // #dddddf  --text-default
      'dc-white': '242 243 245',    // #f2f3f5  headings
      'dc-muted': '171 173 179',    // #abadb3  --text-muted
      'dc-channels': '152 155 161', // #989ba1  --channels-default
      'dc-embed': '36 36 41',       // #242429  --background-secondary-alt
      'dc-input': '56 59 65',       // #383b41  --channeltextarea-background
      'dc-scrollbar': '119 119 129', // #777781
      'dc-scrollbar-hover': '95 96 106',
      'dc-spoiler': '51 51 56',     // same as chat
      'dc-spoiler-revealed': '78 80 88',
      'dc-separator': 'rgba(149, 148, 157, 0.12)',
    },
  },
  dark: {
    label: 'Dark',
    preview: '#1a1a1e',
    colors: {
      'dc-darker': '18 18 20',      // #121214  --background-base-lowest
      'dc-dark': '26 26 30',        // #1a1a1e  --background-base-lower (sidebar)
      'dc-medium': '26 26 30',      // #1a1a1e  --background-base-lower (chat = sidebar)
      'dc-light': '32 33 37',       // #202125  --background-base-low
      'dc-lighter': '65 67 74',     // #41434a  dim interactive
      'dc-lightest': '171 173 179', // #abadb3  hover text
      'dc-text': '239 238 240',     // #efeef0  --text-default
      'dc-white': '242 243 245',    // #f2f3f5  headings
      'dc-muted': '151 151 159',    // #97979f  --text-muted
      'dc-channels': '128 130 139', // #80828b  --channels-default
      'dc-embed': '56 59 65',       // #383b41  --background-secondary-alt
      'dc-input': '56 59 65',       // #383b41  --channeltextarea-background
      'dc-scrollbar': '95 96 106',  // #5f606a
      'dc-scrollbar-hover': '78 80 88',
      'dc-spoiler': '26 26 30',     // same as chat
      'dc-spoiler-revealed': '65 67 74',
      'dc-separator': 'rgba(149, 148, 157, 0.12)',
    },
  },
  onyx: {
    label: 'Onyx',
    preview: '#060708',
    colors: {
      'dc-darker': '0 1 1',         // #000101  --background-base-lowest
      'dc-dark': '6 7 8',           // #060708  --background-base-lower (sidebar)
      'dc-medium': '6 7 8',         // #060708  --background-base-lower (chat = sidebar)
      'dc-light': '12 13 15',       // #0c0d0f  --background-base-low
      'dc-lighter': '53 55 60',     // #35373c  dim interactive
      'dc-lightest': '151 151 159', // #97979f  hover text
      'dc-text': '221 221 223',     // #dddddf  --text-default
      'dc-white': '242 243 245',    // #f2f3f5  headings
      'dc-muted': '137 136 145',    // #898891  --text-muted
      'dc-channels': '123 122 131', // #7b7a83  --channels-default
      'dc-embed': '45 44 50',       // #2d2c32  --background-secondary-alt
      'dc-input': '18 21 22',       // #121516  --channeltextarea-background
      'dc-scrollbar': '88 91 99',   // #585b63
      'dc-scrollbar-hover': '68 71 79',
      'dc-spoiler': '6 7 8',        // same as chat
      'dc-spoiler-revealed': '53 55 60',
      'dc-separator': 'rgba(151, 151, 160, 0.20)',
    },
  },
};

const THEME_KEY = 'discord-relay-theme';

// Migration: rename old theme names
const THEME_ALIASES = { midnight: 'onyx' };

export function getThemes() {
  return themes;
}

export function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    return THEME_ALIASES[saved] || (themes[saved] ? saved : 'dark');
  } catch {
    return 'dark';
  }
}

export function applyTheme(name) {
  const theme = themes[name];
  if (!theme) return;

  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.colors)) {
    root.style.setProperty(`--${key}`, value);
  }

  try {
    localStorage.setItem(THEME_KEY, name);
  } catch {}
}

// Initialize on load
applyTheme(getSavedTheme());
