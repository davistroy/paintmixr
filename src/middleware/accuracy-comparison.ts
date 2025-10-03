/**
 * Accuracy Comparison Middleware
 * Provides backward compatibility between enhanced and legacy color accuracy systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { LABColor } from '@/lib/color-science/types';
import { hexToLab, rgbToLab } from '@/lib/color-science';

interface LegacyColorRequest {
  target_color_hex?: string;
  target_color_rgb?: { r: number; g: number; b: number };
  accuracy_target?: number; // Legacy Delta E target (usually 4.0)
}

interface EnhancedColorRequest {
  target_color: LABColor;
  target_delta_e?: number; // Enhanced Delta E target (default 2.0)
}

interface AccuracyUpgradeResponse {
  enhanced_available: boolean;
  accuracy_improvement_estimate: number;
  recommended_target_delta_e: number;
  migration_required: boolean;
  compatibility_notes?: string[];
}

export class AccuracyComparisonMiddleware {
  /**
   * Convert legacy color format to enhanced LAB format
   */
  static convertLegacyToEnhanced(legacyRequest: LegacyColorRequest): EnhancedColorRequest {
    let targetColor: LABColor;

    if (legacyRequest.target_color_hex) {
      targetColor = hexToLab(legacyRequest.target_color_hex);
    } else if (legacyRequest.target_color_rgb) {
      targetColor = rgbToLab(legacyRequest.target_color_rgb);
    } else {
      throw new Error('No valid target color provided in legacy request');
    }

    return {
      target_color: targetColor,
      target_delta_e: legacyRequest.accuracy_target && legacyRequest.accuracy_target < 4.0
        ? legacyRequest.accuracy_target
        : 2.0 // Default enhanced target
    };
  }

  /**
   * Assess whether enhanced accuracy would provide significant improvement
   */
  static assessAccuracyUpgrade(
    legacyAccuracy: number,
    availablePaintCount: number,
    calibratedPaintRatio: number
  ): AccuracyUpgradeResponse {
    const enhanced_available = availablePaintCount >= 10 && calibratedPaintRatio >= 0.3;

    // Estimate potential improvement based on paint quality and collection size
    const baseImprovement = Math.max(0, legacyAccuracy - 2.0);
    const qualityMultiplier = 0.5 + (calibratedPaintRatio * 0.5);
    const collectionMultiplier = Math.min(1.0, availablePaintCount / 50);

    const accuracy_improvement_estimate = baseImprovement * qualityMultiplier * collectionMultiplier;

    const recommended_target_delta_e = enhanced_available && accuracy_improvement_estimate > 1.0
      ? 2.0
      : Math.min(3.0, legacyAccuracy * 0.8);

    const migration_required = legacyAccuracy > 3.0 && enhanced_available;

    const compatibility_notes: string[] = [];

    if (!enhanced_available) {
      if (availablePaintCount < 10) {
        compatibility_notes.push('Expand paint collection to at least 10 paints for enhanced accuracy');
      }
      if (calibratedPaintRatio < 0.3) {
        compatibility_notes.push('Calibrate optical properties for at least 30% of paints');
      }
    }

    if (accuracy_improvement_estimate < 0.5) {
      compatibility_notes.push('Current paint collection may not benefit significantly from enhanced accuracy');
    }

    if (migration_required) {
      compatibility_notes.push('Legacy formulas can be automatically upgraded to enhanced accuracy');
    }

    return {
      enhanced_available,
      accuracy_improvement_estimate,
      recommended_target_delta_e,
      migration_required,
      compatibility_notes: compatibility_notes.length > 0 ? compatibility_notes : undefined
    };
  }

  /**
   * Middleware function for handling accuracy compatibility
   */
  static async handleAccuracyComparison(
    request: NextRequest,
    response: NextResponse
  ): Promise<NextResponse> {
    try {
      // Extract request body
      const body = await request.json();

      // Check if this is a legacy accuracy request
      const isLegacyRequest = 'target_color_hex' in body || 'target_color_rgb' in body;
      const hasAccuracyTarget = 'accuracy_target' in body || 'target_delta_e' in body;

      // If not an accuracy-related request, pass through
      if (!hasAccuracyTarget) {
        return response;
      }

      let enhancedRequest: EnhancedColorRequest;
      let upgradeAssessment: AccuracyUpgradeResponse | null = null;

      if (isLegacyRequest) {
        // Convert legacy request to enhanced format
        enhancedRequest = this.convertLegacyToEnhanced(body as LegacyColorRequest);

        // Assess upgrade potential
        const legacyAccuracy = (body as LegacyColorRequest).accuracy_target || 4.0;
        const availablePaintCount = parseInt(request.headers.get('X-Available-Paint-Count') || '0');
        const calibratedRatio = parseFloat(request.headers.get('X-Calibrated-Paint-Ratio') || '0');

        upgradeAssessment = this.assessAccuracyUpgrade(
          legacyAccuracy,
          availablePaintCount,
          calibratedRatio
        );

        // Add enhanced request to headers for downstream processing
        response.headers.set('X-Enhanced-Request', JSON.stringify(enhancedRequest));
        response.headers.set('X-Legacy-Conversion', 'true');
      } else {
        enhancedRequest = body as EnhancedColorRequest;
        response.headers.set('X-Legacy-Conversion', 'false');
      }

      // Add accuracy upgrade assessment to response headers
      if (upgradeAssessment) {
        response.headers.set('X-Accuracy-Upgrade-Assessment', JSON.stringify(upgradeAssessment));
      }

      // Add enhanced accuracy flags
      response.headers.set('X-Enhanced-Available', upgradeAssessment?.enhanced_available.toString() || 'unknown');
      response.headers.set('X-Target-Delta-E', enhancedRequest.target_delta_e?.toString() || '2.0');

      return response;

    } catch (error) {
      console.error('Accuracy comparison middleware error:', error);

      // Add error information but don't block the request
      response.headers.set('X-Accuracy-Middleware-Error', 'true');
      response.headers.set('X-Accuracy-Error-Message', error instanceof Error ? error.message : 'Unknown error');

      return response;
    }
  }

  /**
   * Generate compatibility report for API documentation
   */
  static generateCompatibilityReport(
    legacyEndpoints: string[],
    enhancedEndpoints: string[]
  ) {
    return {
      version: '1.0.0',
      compatibility: {
        legacy_endpoints: legacyEndpoints.map(endpoint => ({
          endpoint,
          status: 'supported',
          migration_path: endpoint.replace('/api/', '/api/v2/'),
          accuracy_upgrade: 'automatic',
          breaking_changes: []
        })),
        enhanced_endpoints: enhancedEndpoints.map(endpoint => ({
          endpoint,
          status: 'enhanced',
          accuracy_target: 'delta_e_2_0',
          performance_target: 'sub_500ms',
          backward_compatible: true
        })),
        migration_guide: {
          automatic_conversion: [
            'target_color_hex → target_color (LAB)',
            'target_color_rgb → target_color (LAB)',
            'accuracy_target → target_delta_e'
          ],
          manual_updates: [
            'Review Delta E targets (4.0 → 2.0 recommended)',
            'Consider paint collection calibration',
            'Update client-side color handling'
          ],
          performance_improvements: [
            'Web Worker optimization (non-blocking)',
            'Advanced algorithms (Differential Evolution, TPE)',
            'Asymmetric volume ratios support'
          ]
        }
      },
      recommendations: {
        immediate: [
          'Test enhanced accuracy with existing paint collections',
          'Calibrate optical properties for high-use paints',
          'Update API integration to use enhanced endpoints'
        ],
        long_term: [
          'Migrate all legacy formulas to enhanced format',
          'Implement client-side Delta E visualization',
          'Consider expanding paint collections for better accuracy'
        ]
      }
    };
  }

  /**
   * Validate accuracy requirements against available paint quality
   */
  static validateAccuracyRequirements(
    targetDeltaE: number,
    availablePaints: {
      color_accuracy_verified: boolean;
      optical_properties_calibrated: boolean;
    }[]
  ): {
    feasible: boolean;
    confidence: number;
    recommendations: string[];
  } {
    const verifiedCount = availablePaints.filter(p => p.color_accuracy_verified).length;
    const calibratedCount = availablePaints.filter(p => p.optical_properties_calibrated).length;
    const totalCount = availablePaints.length;

    const verificationRatio = verifiedCount / totalCount;
    const calibrationRatio = calibratedCount / totalCount;

    let feasible = true;
    let confidence = 1.0;
    const recommendations: string[] = [];

    // Assess feasibility based on target and paint quality
    if (targetDeltaE <= 1.0) {
      // Ultra-high accuracy requirements
      if (verificationRatio < 0.8 || calibrationRatio < 0.6) {
        feasible = false;
        confidence = 0.3;
        recommendations.push('Ultra-high accuracy requires 80%+ verified and 60%+ calibrated paints');
      }
    } else if (targetDeltaE <= 2.0) {
      // Enhanced accuracy requirements
      if (verificationRatio < 0.5 || calibrationRatio < 0.3) {
        confidence *= 0.7;
        recommendations.push('Enhanced accuracy works best with 50%+ verified and 30%+ calibrated paints');
      }
    } else if (targetDeltaE <= 4.0) {
      // Standard accuracy requirements
      if (verificationRatio < 0.2) {
        confidence *= 0.8;
        recommendations.push('Consider verifying color accuracy for key paints');
      }
    }

    // Collection size considerations
    if (totalCount < 5) {
      feasible = false;
      recommendations.push('Minimum 5 paints required for meaningful optimization');
    } else if (totalCount < 10) {
      confidence *= 0.8;
      recommendations.push('Expand collection to 10+ paints for better results');
    }

    return {
      feasible,
      confidence: Math.max(0.1, Math.min(1.0, confidence)),
      recommendations
    };
  }
}

/**
 * Next.js middleware configuration for accuracy comparison
 */
export function middleware(request: NextRequest) {
  // Only apply to optimization and color-related API routes
  if (request.nextUrl.pathname.startsWith('/api/optimize') ||
      request.nextUrl.pathname.startsWith('/api/color') ||
      request.nextUrl.pathname.startsWith('/api/v1/color')) {

    return AccuracyComparisonMiddleware.handleAccuracyComparison(
      request,
      NextResponse.next()
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/optimize/:path*',
    '/api/color/:path*',
    '/api/v1/color/:path*'
  ]
};