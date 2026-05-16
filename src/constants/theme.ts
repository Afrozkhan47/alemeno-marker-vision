import type { TextStyle, ViewStyle } from 'react-native';

export const AppTheme = {
  colors: {
    background: '#0E1116',
    surface: '#181D25',
    card: '#1F2630',
    border: '#2A3340',
    text: '#E8ECF2',
    textMuted: '#96A0AF',
    primary: '#5B8CFF',
    accent: '#38D39F',
    danger: '#FF5D73',
  },
  /** 8-point grid */
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  layout: {
    screenPaddingH: 16,
    screenPaddingV: 16,
    /** Keeps Home/Results readable on tablets without widening the whole column */
    maxContentWidth: 560,
  },
  /** Scanner: approximate chrome so the reticle and Back clear the status panel */
  scanner: {
    hudReserve: 52,
    panelReserve: 236,
    frameMin: 140,
    frameMax: 320,
  },
  typography: {
    screenTitle: {
      fontSize: 22,
      lineHeight: 28,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    cardTitle: {
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    body: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '400' as TextStyle['fontWeight'],
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '500' as TextStyle['fontWeight'],
    },
    value: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500' as TextStyle['fontWeight'],
    },
    button: {
      fontSize: 15,
      lineHeight: 20,
      fontWeight: '600' as TextStyle['fontWeight'],
    },
  },
  /** Primary and full-width scanner actions align to this system */
  button: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  overlay: {
    hudPanel: 'rgba(14, 17, 22, 0.94)',
    statusPanel: 'rgba(14, 17, 22, 0.96)',
    modal: 'rgba(14, 17, 22, 0.98)',
    initializing: 'rgba(14, 17, 22, 0.92)',
    border: 'rgba(255, 255, 255, 0.08)',
    borderMuted: 'rgba(255, 255, 255, 0.06)',
  },
  pressedOpacity: 0.85,
  /** Minimal elevation for hierarchy only */
  shadow: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    } satisfies ViewStyle,
  },
};
