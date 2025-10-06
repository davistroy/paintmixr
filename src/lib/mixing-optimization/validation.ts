/**
 * Zod Validation Schemas (T015)
 * Feature: 007-enhanced-mode-1
 *
 * Runtime validation schemas for Enhanced Optimization API requests.
 * Ensures type safety and catches malformed requests before processing.
 *
 * Based on types from /src/lib/types/index.ts and contracts/optimize-api.yaml
 */

import { z } from 'zod';

/**
 * LAB Color Schema
 * Validates CIE LAB color space values with proper ranges
 */
export const labColorSchema = z.object({
  l: z.number().min(0, 'Lightness (l) must be >= 0').max(100, 'Lightness (l) must be <= 100'),
  a: z.number().min(-128, 'a-axis must be >= -128').max(127, 'a-axis must be <= 127'),
  b: z.number().min(-128, 'b-axis must be >= -128').max(127, 'b-axis must be <= 127')
});

/**
 * Kubelka-Munk Coefficients Schema
 * Validates absorption (k) and scattering (s) coefficients
 */
export const kubelkaMunkCoefficientsSchema = z.object({
  k: z.number().min(0, 'Absorption coefficient (k) must be >= 0').max(1, 'Absorption coefficient (k) must be <= 1'),
  s: z.number().min(0, 'Scattering coefficient (s) must be >= 0').max(1, 'Scattering coefficient (s) must be <= 1')
});

/**
 * Color Value Schema (hex + LAB)
 * Validates complete color representation
 */
export const colorValueSchema = z.object({
  hex: z.string().regex(/^#[0-9A-F]{6}$/i, 'hex must be in format #RRGGBB'),
  lab: labColorSchema
});

/**
 * Paint Schema (for API requests with Paint[] array)
 * Validates individual paint records with all required fields
 */
export const paintSchema = z.object({
  id: z.string().min(1, 'Paint ID is required'),
  name: z.string().min(1, 'Paint name is required'),
  brand: z.string().min(1, 'Paint brand is required'),
  color: colorValueSchema,
  opacity: z.number().min(0, 'Opacity must be >= 0').max(1, 'Opacity must be <= 1'),
  tintingStrength: z.number().min(0, 'Tinting strength must be >= 0').max(1, 'Tinting strength must be <= 1'),
  kubelkaMunk: kubelkaMunkCoefficientsSchema,
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.string(), // ISO 8601 timestamp
  updatedAt: z.string()  // ISO 8601 timestamp
});

/**
 * Volume Constraints Schema
 * Validates volume requirements and component limits
 */
export const volumeConstraintsSchema = z.object({
  min_total_volume_ml: z.number().positive('min_total_volume_ml must be positive'),
  max_total_volume_ml: z.number().positive('max_total_volume_ml must be positive'),
  minimum_component_volume_ml: z.number().positive('minimum_component_volume_ml must be positive').optional(),
  maximum_component_volume_ml: z.number().positive('maximum_component_volume_ml must be positive').optional(),
  allow_scaling: z.boolean().optional()
}).refine(
  (data) => data.max_total_volume_ml >= data.min_total_volume_ml,
  {
    message: 'max_total_volume_ml must be >= min_total_volume_ml',
    path: ['max_total_volume_ml']
  }
).refine(
  (data) => {
    // If both component limits are defined, max must be >= min
    if (data.minimum_component_volume_ml !== undefined && data.maximum_component_volume_ml !== undefined) {
      return data.maximum_component_volume_ml >= data.minimum_component_volume_ml;
    }
    return true;
  },
  {
    message: 'maximum_component_volume_ml must be >= minimum_component_volume_ml',
    path: ['maximum_component_volume_ml']
  }
);

/**
 * Enhanced Optimization Request Schema
 * Complete validation for /api/optimize POST requests
 *
 * Validates:
 * - Target color (LAB values)
 * - Available paints (2-100 paints)
 * - Mode ('standard' or 'enhanced')
 * - Optional volume constraints
 * - Optional maxPaintCount (2-5)
 * - Optional timeLimit (1000-30000ms)
 * - Optional accuracyTarget (positive number)
 */
export const enhancedOptimizationRequestSchema = z.object({
  targetColor: labColorSchema,
  availablePaints: z.array(z.string().min(1, 'Paint ID cannot be empty'))
    .min(2, 'At least 2 paints required for optimization')
    .max(100, 'Maximum 100 paints allowed for optimization'),
  mode: z.enum(['standard', 'enhanced'], {
    message: 'mode must be "standard" or "enhanced"'
  }),
  volumeConstraints: volumeConstraintsSchema.optional(),
  maxPaintCount: z.number()
    .int('maxPaintCount must be an integer')
    .min(2, 'maxPaintCount must be at least 2')
    .max(5, 'maxPaintCount must be at most 5')
    .optional(),
  timeLimit: z.number()
    .positive('timeLimit must be positive')
    .max(30000, 'timeLimit must not exceed 30000ms (Vercel limit)')
    .optional(),
  accuracyTarget: z.number()
    .positive('accuracyTarget must be positive')
    .optional()
});

/**
 * Paint Ratio Schema (for response validation)
 * Validates individual paint components in optimized formula
 */
export const paintRatioSchema = z.object({
  paint_id: z.string().min(1),
  paint_name: z.string().optional(),
  volume_ml: z.number().nonnegative('volume_ml must be >= 0'),
  percentage: z.number().min(0, 'percentage must be >= 0').max(100, 'percentage must be <= 100'),
  paint_properties: paintSchema.optional()
});

/**
 * Optimized Paint Formula Schema (for response validation)
 * Validates complete optimization result structure
 */
export const optimizedPaintFormulaSchema = z.object({
  paintRatios: z.array(paintRatioSchema)
    .min(2, 'Formula must contain at least 2 paints')
    .max(5, 'Formula must contain at most 5 paints'),
  totalVolume: z.number().positive('totalVolume must be positive'),
  predictedColor: labColorSchema,
  deltaE: z.number().nonnegative('deltaE must be >= 0'),
  accuracyRating: z.enum(['excellent', 'good', 'acceptable', 'poor']),
  mixingComplexity: z.enum(['simple', 'moderate', 'complex']),
  kubelkaMunkK: z.number().min(0).max(1),
  kubelkaMunkS: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1)
});

/**
 * Optimization Performance Metrics Schema (for response validation)
 * Validates performance tracking data
 */
export const optimizationPerformanceMetricsSchema = z.object({
  timeElapsed: z.number().nonnegative('timeElapsed must be >= 0'),
  iterationsCompleted: z.number().int().nonnegative('iterationsCompleted must be >= 0'),
  algorithmUsed: z.enum(['differential_evolution', 'tpe_hybrid', 'auto']),
  convergenceAchieved: z.boolean(),
  targetMet: z.boolean(),
  earlyTermination: z.boolean(),
  initialBestDeltaE: z.number().nonnegative('initialBestDeltaE must be >= 0'),
  finalBestDeltaE: z.number().nonnegative('finalBestDeltaE must be >= 0'),
  improvementRate: z.number()
});

/**
 * Enhanced Optimization Response Schema
 * Validates complete API response structure from /api/optimize
 */
export const enhancedOptimizationResponseSchema = z.object({
  success: z.boolean(),
  formula: optimizedPaintFormulaSchema.nullable(),
  metrics: optimizationPerformanceMetricsSchema.nullable(),
  warnings: z.array(z.string()),
  error: z.string().nullable().optional()
});

/**
 * Type inference helpers (TypeScript types inferred from Zod schemas)
 */
export type LABColorInput = z.infer<typeof labColorSchema>;
export type VolumeConstraintsInput = z.infer<typeof volumeConstraintsSchema>;
export type EnhancedOptimizationRequestInput = z.infer<typeof enhancedOptimizationRequestSchema>;
export type EnhancedOptimizationResponseOutput = z.infer<typeof enhancedOptimizationResponseSchema>;

/**
 * Validation helper function
 * Throws ZodError with detailed error messages on validation failure
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Safe validation helper function
 * Returns success/error object instead of throwing
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and data/error
 */
export function safeValidateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Format Zod validation errors for API responses
 * Converts ZodError to user-friendly error messages
 *
 * @param error - ZodError from validation failure
 * @returns Human-readable error message
 */
export function formatZodError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${path}${issue.message}`;
  });

  return `Validation failed: ${issues.join('; ')}`;
}
