/**
 * Feature flags for gradual rollout of enhanced accuracy features
 */

export const FEATURE_FLAGS = {
  // Enhanced accuracy optimization (Delta E ≤ 2.0)
  ENHANCED_OPTIMIZATION: process.env.NEXT_PUBLIC_ENABLE_ENHANCED_OPTIMIZATION === 'true',

  // Paint collection management UI
  PAINT_COLLECTIONS: process.env.NEXT_PUBLIC_ENABLE_PAINT_COLLECTIONS === 'true',

  // Optimization algorithm selection
  ALGORITHM_SELECTION: process.env.NEXT_PUBLIC_ENABLE_ALGORITHM_SELECTION === 'true',

  // Performance monitoring
  PERFORMANCE_MONITORING: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag]
}