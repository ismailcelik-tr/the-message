export const COLORS = {
  light: {
    background: '#F4F7F6',
    card: '#FFFFFF',
    primary: '#2A4B3D',
    secondary: '#7FA899',
    accent: '#D4AF37',
    text: '#2E3033',
    mutedText: '#6E7370',
    border: '#E3E8E6',
  },
  dark: {
    background: '#1A1D1C',
    card: '#252928',
    primary: '#A0C4B6',
    secondary: '#5C7E71',
    accent: '#ECCB6A',
    text: '#E1E6E4',
    mutedText: '#9AA19E',
    border: '#323937',
  },
} as const;

export type ColorScheme = typeof COLORS.light;
