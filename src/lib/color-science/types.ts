/**
 * Color Science Types
 * Re-exports from centralized type system
 */

export type {
  LABColor,
  RGBColor,
  ColorValue,
  KubelkaMunkCoefficients,
  OptimizationVolumeConstraints as VolumeConstraints,
  ExtendedVolumeConstraints
} from '@/lib/types';

// Legacy export for backward compatibility
export interface OpticalProperties {
  k: number // Absorption coefficient
  s: number // Scattering coefficient
}
