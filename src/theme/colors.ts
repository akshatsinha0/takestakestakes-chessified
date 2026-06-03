/*
(1.) Typed mirror of the semantic color tokens declared in src/styles/theme.css, intended for
     TSX inline styles and the MUI theme. Each value is a `var(--token)` POINTER, not a raw hex,
     so the actual color is defined in exactly one place (theme.css) and this module only names
     it for type-safe, autocompleted access; the two can never drift to different values.
(2.) Only SEMANTIC tokens are exposed (accent, surface, danger, ...) rather than raw primitives,
     so consuming code expresses intent and automatically inherits any brand refresh applied at
     the primitive layer in theme.css.
(3.) The object is `as const`, yielding a literal union `ColorToken` of valid keys, which lets
     props and helpers accept "a color token" with compile-time checking instead of an arbitrary
     string, catching typos that raw hex or free-form var() strings would not.

This module is the TypeScript half of the color system. Inline styles use `colors.accent`
instead of `'#e5a356'`, and a MUI theme can be assembled from these pointers so Material
components share the same palette as hand-written CSS. Because every entry resolves to a CSS
custom property, theming, dark/light variants, and runtime adjustments remain controllable from
theme.css without recompiling, while TSX retains full type safety over the available tokens.
*/

export const colors = {
  bgDeep: 'var(--color-bg-deep)',
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceRaised: 'var(--color-surface-raised)',
  textPrimary: 'var(--text-primary)',
  textMuted: 'var(--text-muted)',

  accent: 'var(--color-accent)',
  accentStrong: 'var(--color-accent-strong)',
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',

  google: 'var(--brand-google)',
  facebook: 'var(--brand-facebook)',

  borderSubtle: 'var(--border-subtle)',
  shadowSoft: 'var(--shadow-soft)',
  shadowStrong: 'var(--shadow-strong)',

  overlayWhite05: 'var(--alpha-white-05)',
  overlayWhite10: 'var(--alpha-white-10)',
  overlayWhite20: 'var(--alpha-white-20)',
  overlayAccent10: 'var(--alpha-accent-10)',
  overlayAccent20: 'var(--alpha-accent-20)',
  overlayAccent30: 'var(--alpha-accent-30)',
  overlaySurface40: 'var(--alpha-surface-40)',
} as const

export type ColorToken = keyof typeof colors
