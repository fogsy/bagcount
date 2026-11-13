export const colors = {
  background: '#0a0a0a',
  surface: '#141414',
  surfaceElevated: '#1c1c1c',
  border: '#2a2a2a',
  accent: '#E11D2E',
  accentMuted: 'rgba(225, 29, 46, 0.22)',
  accentGlow: 'rgba(225, 29, 46, 0.45)',
  gold: '#EAB308',
  goldMuted: 'rgba(234, 179, 8, 0.25)',
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  danger: '#ef4444',
  onAccent: '#ffffff',
  success: '#22c55e',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '900' as const,
    fontStyle: 'italic' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    fontStyle: 'italic' as const,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
} as const;
