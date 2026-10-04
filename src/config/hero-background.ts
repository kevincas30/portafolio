/** ColorBends: real upstream shader controls, plus explicitly local lifecycle/quality controls. */
export const heroBackground = {
  enabled: true,
  colors: {
    light: ['#F76F4F', '#C9F568'],
    dark: ['#C9F568', '#F76F4F'],
  } as const,
  speed: .18,
  intensity: { light: .9, dark: .82 },
  // Local compositing control: soften the full-width effect without darkening its colors.
  opacity: { light: .75, dark: .62 },
  mouseInfluence: .045,
  rotation: 32,
  scale: 1.3,
  frequency: 1.1,
  warpStrength: 1,
  parallax: .08,
  bandWidth: 4.2,
  // Local adaptation: the secondary band contributes less energy than the lead color.
  accentWeight: .24,
  quality: {
    desktop: { resolutionScale: .75, maxPixelRatio: 1.25, maxDimension: 1440, fps: 30, iterations: 2 },
    mobile: { resolutionScale: .65, maxPixelRatio: 1, maxDimension: 900, fps: 20, iterations: 1 },
  },
} as const;
