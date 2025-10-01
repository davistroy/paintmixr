# Enhanced Color Accuracy API Documentation

This document describes the enhanced color accuracy endpoints for the PaintMixr API, which provide Delta E ≤ 2.0 color matching with asymmetric volume ratios and milliliter precision.

## Base URL

```
https://api.paintmixr.com/api/v2
```

## Authentication

All enhanced accuracy endpoints require authentication via JWT token or API key:

```bash
# JWT Token (recommended)
Authorization: Bearer <jwt-token>

# API Key (for server-to-server)
X-API-Key: <api-key>
```

## Core Enhanced Optimization Endpoints

### POST /api/v2/optimize/enhanced

**Description**: Optimize paint mixing with enhanced accuracy algorithms for Delta E ≤ 2.0 targets.

**Request Body**:

```typescript
{
  // Target color in LAB color space (required)
  target_color: {
    L: number;    // Lightness (0-100)
    a: number;    // Green-Red axis (-128 to 127)
    b: number;    // Blue-Yellow axis (-128 to 127)
  };

  // Paint collection constraints
  collection_id?: string;                    // Optional collection ID
  paint_filter?: {
    color_accuracy_verified?: boolean;      // Use only verified paints
    optical_properties_calibrated?: boolean; // Use only calibrated paints
    min_volume_available_ml?: number;       // Minimum available volume
    brands?: string[];                      // Filter by specific brands
    finish_types?: string[];                // Filter by finish types
    exclude_archived?: boolean;             // Exclude archived paints (default: true)
  };

  // Volume and mixing constraints
  volume_constraints: {
    total_volume_ml: number;                // Target total volume (0.1-10000ml)
    min_volume_per_paint_ml: number;        // Minimum volume per paint (0.1ml precision)
    max_paint_count: number;                // Maximum paints in mixture (1-10)
    allow_waste: boolean;                   // Allow volume waste for better accuracy
    asymmetric_ratios: boolean;             // Enable asymmetric volume ratios (default: true)
  };

  // Enhanced optimization configuration
  optimization_config: {
    target_delta_e: number;                 // Target Delta E (0.5-4.0, default: 2.0)
    algorithm: 'auto' | 'differential_evolution' | 'tpe_hybrid'; // Algorithm selection
    max_iterations: number;                 // Maximum iterations (50-2000, default: 1000)
    time_limit_ms: number;                  // Time limit in milliseconds (1000-60000, default: 30000)
    quality_vs_speed: 'quality' | 'balanced' | 'speed'; // Optimization priority

    // Advanced algorithm parameters (optional)
    advanced_parameters?: {
      population_size?: number;             // DE: Population size (20-200)
      mutation_factor?: number;             // DE: Mutation factor (0.1-2.0)
      crossover_probability?: number;       // DE: Crossover probability (0.1-1.0)
      n_startup_trials?: number;            // TPE: Initial random trials (10-100)
      gamma?: number;                       // TPE: Exploration factor (0.05-0.5)
    };
  };

  // Fallback and compatibility options
  fallback_options?: {
    enable_legacy_fallback: boolean;        // Fall back to legacy algorithm if enhanced fails
    legacy_target_delta_e?: number;         // Delta E target for legacy fallback (default: 4.0)
    require_enhanced_only: boolean;         // Fail if enhanced algorithm unavailable
  };
}
```

**Response**:

```typescript
{
  success: boolean;
  request_id: string;                       // Unique request identifier

  // Enhanced optimization result
  result: {
    solution: {
      paint_volumes: [
        {
          paint_id: string;
          paint_name: string;
          paint_brand: string;
          volume_ml: number;                // Precise to 0.1ml
          percentage: number;               // Percentage of total volume
          cost_contribution: number;        // Cost for this paint volume
        }
      ];
      total_volume_ml: number;
      total_cost: number;
      volume_efficiency: number;            // 0-1, how efficiently volume was used
      cost_efficiency: number;              // 0-1, cost per unit of accuracy
    };

    // Color accuracy metrics
    quality_metrics: {
      delta_e: number;                      // Achieved Delta E (CIEDE2000)
      achieved_color: {
        L: number;
        a: number;
        b: number;
      };
      color_space_coverage: number;         // 0-1, how well paints cover target color
      accuracy_confidence: number;          // 0-1, confidence in accuracy prediction
    };

    // Performance and algorithm metrics
    performance_metrics: {
      total_time_ms: number;
      iterations_completed: number;
      convergence_achieved: boolean;
      algorithm_used: string;
      memory_usage_mb?: number;
      worker_threads_used?: number;
    };
  };

  // Legacy fallback result (if used)
  legacy_fallback?: {
    used: boolean;
    reason: string;                         // Why fallback was used
    legacy_result: {
      // Similar structure to enhanced result
      paint_ratios: [
        {
          paint_id: string;
          ratio: number;
        }
      ];
      estimated_delta_e: number;
      total_volume_ml: number;
    };
  };

  // Recommendations for accuracy improvement
  recommendations?: {
    upgrade_paint_accuracy?: boolean;       // Recommend verifying more paint colors
    calibrate_optical_properties?: boolean; // Recommend calibrating paint optical properties
    expand_paint_collection?: boolean;      // Recommend adding more paints
    suggested_paints?: [                   // Specific paint suggestions
      {
        suggested_color: { L: number; a: number; b: number };
        reason: string;
        priority: 'high' | 'medium' | 'low';
      }
    ];
  };

  // Accuracy comparison with legacy
  accuracy_comparison?: {
    enhanced_delta_e: number;
    legacy_estimated_delta_e: number;
    improvement_factor: number;             // How much better enhanced is
    accuracy_upgrade_worthwhile: boolean;
  };
}
```

**Example Request**:

```bash
curl -X POST https://api.paintmixr.com/api/v2/optimize/enhanced \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "target_color": {
      "L": 65.2,
      "a": 15.1,
      "b": 28.7
    },
    "collection_id": "collection-123",
    "volume_constraints": {
      "total_volume_ml": 100.0,
      "min_volume_per_paint_ml": 0.5,
      "max_paint_count": 5,
      "allow_waste": false,
      "asymmetric_ratios": true
    },
    "optimization_config": {
      "target_delta_e": 2.0,
      "algorithm": "auto",
      "max_iterations": 1000,
      "time_limit_ms": 30000,
      "quality_vs_speed": "balanced"
    },
    "fallback_options": {
      "enable_legacy_fallback": true,
      "require_enhanced_only": false
    }
  }'
```

### POST /api/v2/optimize/batch

**Description**: Optimize multiple color targets in a single request for batch processing.

**Request Body**:

```typescript
{
  batch_id?: string;                        // Optional batch identifier
  targets: [
    {
      target_id: string;                    // Unique identifier for this target
      target_color: { L: number; a: number; b: number };
      volume_constraints: { /* same as single optimize */ };
      optimization_config?: { /* same as single optimize */ };
    }
  ];
  shared_collection_id?: string;           // Use same collection for all targets
  shared_optimization_config?: { /* Override individual configs */ };
  max_concurrent_optimizations?: number;   // Limit concurrent processing (1-5, default: 3)
}
```

**Response**:

```typescript
{
  success: boolean;
  batch_id: string;
  results: [
    {
      target_id: string;
      success: boolean;
      result?: { /* same structure as single optimize */ };
      error?: string;
      processing_time_ms: number;
    }
  ];
  batch_metrics: {
    total_processing_time_ms: number;
    successful_optimizations: number;
    failed_optimizations: number;
    average_accuracy: number;              // Average Delta E achieved
  };
}
```

### GET /api/v2/optimize/{request_id}/status

**Description**: Check the status of a long-running optimization request.

**Response**:

```typescript
{
  request_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress?: {
    current_iteration: number;
    max_iterations: number;
    best_delta_e_so_far: number;
    estimated_completion_ms: number;
  };
  result?: { /* Full result when status is 'completed' */ };
  error?: string;                          // Error message if status is 'failed'
}
```

## Paint Collection Management

### GET /api/v2/collections/{collection_id}/accuracy-status

**Description**: Get color accuracy and calibration status for paints in a collection.

**Response**:

```typescript
{
  collection_id: string;
  collection_name: string;
  accuracy_metrics: {
    total_paints: number;
    color_accuracy_verified: number;
    optical_properties_calibrated: number;
    high_accuracy_paints: number;          // Paints suitable for Delta E ≤ 2.0
    verification_percentage: number;
    calibration_percentage: number;
  };
  enhanced_accuracy_available: boolean;    // Whether collection supports enhanced accuracy
  recommended_improvements: [
    {
      type: 'verify_colors' | 'calibrate_optical' | 'add_paints';
      priority: 'high' | 'medium' | 'low';
      description: string;
      estimated_improvement: number;        // Estimated Delta E improvement
    }
  ];
}
```

### POST /api/v2/paints/{paint_id}/verify-accuracy

**Description**: Verify and update the color accuracy of a specific paint.

**Request Body**:

```typescript
{
  measured_color: {
    L: number;
    a: number;
    b: number;
  };
  measurement_method: 'spectrophotometer' | 'colorimeter' | 'visual_match' | 'calibrated_display';
  measurement_conditions: {
    illuminant: 'D65' | 'D50' | 'A' | 'F2' | 'F11';
    observer: '2' | '10';                  // Observer angle in degrees
    geometry: '45/0' | '0/45' | 'd/8' | 'other';
  };
  optical_properties?: {
    reflectance_spectrum: number[];        // 40-point reflectance spectrum (380-780nm, 10nm intervals)
    finish_type: 'matte' | 'satin' | 'gloss' | 'metallic';
    opacity: number;                       // 0-1
    texture_factor?: number;               // Surface texture influence (0-1)
  };
}
```

**Response**:

```typescript
{
  success: boolean;
  paint_id: string;
  accuracy_verification: {
    original_color: { L: number; a: number; b: number };
    measured_color: { L: number; a: number; b: number };
    delta_e_difference: number;
    accuracy_grade: 'excellent' | 'good' | 'fair' | 'poor'; // Based on Delta E
    color_updated: boolean;
    optical_properties_updated: boolean;
  };
  enhanced_accuracy_impact: {
    previous_suitability: boolean;
    new_suitability: boolean;              // Suitable for enhanced accuracy
    collection_impact: string;             // How this affects collection accuracy
  };
}
```

## Color Analysis and Compatibility

### POST /api/v2/color/analyze-target

**Description**: Analyze a target color and assess optimization feasibility.

**Request Body**:

```typescript
{
  target_color: { L: number; a: number; b: number };
  collection_id?: string;
  analysis_depth: 'quick' | 'thorough';   // Analysis thoroughness
}
```

**Response**:

```typescript
{
  target_color: { L: number; a: number; b: number };
  analysis_results: {
    color_classification: {
      hue_category: string;                // 'red', 'orange', 'yellow', etc.
      saturation_level: 'low' | 'medium' | 'high';
      lightness_level: 'dark' | 'medium' | 'light';
      color_temperature: 'warm' | 'neutral' | 'cool';
    };

    optimization_feasibility: {
      enhanced_accuracy_achievable: boolean;
      estimated_best_delta_e: number;
      confidence_level: number;            // 0-1
      required_paint_count: number;        // Estimated paints needed
      complexity_rating: 'simple' | 'moderate' | 'complex';
    };

    collection_coverage: {
      closest_paint_delta_e: number;
      paint_diversity_score: number;       // 0-1, how well collection covers color space
      missing_color_regions: string[];     // Color areas not well covered
      recommended_paint_additions: [
        {
          suggested_color: { L: number; a: number; b: number };
          color_name: string;
          priority: 'high' | 'medium' | 'low';
          improvement_estimate: number;     // Estimated Delta E improvement
        }
      ];
    };
  };
}
```

### POST /api/v2/color/convert-legacy

**Description**: Convert legacy color mixing requests to enhanced format.

**Request Body**:

```typescript
{
  legacy_request: {
    target_color_hex?: string;
    target_color_rgb?: { r: number; g: number; b: number };
    accuracy_target?: number;              // Legacy Delta E target
    paint_ratios?: [
      {
        paint_id: string;
        ratio: number;
      }
    ];
  };
  enhance_accuracy?: boolean;              // Whether to upgrade to enhanced accuracy
}
```

**Response**:

```typescript
{
  success: boolean;
  enhanced_request: {
    target_color: { L: number; a: number; b: number };
    recommended_target_delta_e: number;
    volume_constraints: {
      // Inferred from legacy request
    };
    optimization_config: {
      // Recommended enhanced settings
    };
  };
  conversion_notes: string[];
  accuracy_improvement_estimate: number;   // Expected improvement in Delta E
  migration_recommended: boolean;
}
```

## Performance and Monitoring

### GET /api/v2/system/performance-metrics

**Description**: Get enhanced accuracy system performance metrics.

**Response**:

```typescript
{
  timestamp: string;                       // ISO 8601 timestamp
  system_health: {
    service_status: 'healthy' | 'degraded' | 'critical';
    enhanced_accuracy_availability: number; // 0-1, system availability
    average_optimization_time_ms: number;
    p95_optimization_time_ms: number;
    accuracy_success_rate: number;         // % achieving target Delta E
  };

  performance_trends: {
    optimization_count_24h: number;
    average_delta_e_achieved: number;
    algorithm_usage: {
      differential_evolution: number;      // % usage
      tpe_hybrid: number;
      legacy_fallback: number;
    };
    resource_utilization: {
      memory_usage_percent: number;
      worker_thread_utilization: number;
      database_response_time_ms: number;
    };
  };

  quality_metrics: {
    ultra_high_accuracy_rate: number;      // % achieving Delta E ≤ 1.0
    enhanced_accuracy_rate: number;        // % achieving Delta E ≤ 2.0
    standard_accuracy_rate: number;        // % achieving Delta E ≤ 4.0
    average_paint_count: number;           // Average paints per mixture
    asymmetric_ratio_usage: number;        // % using asymmetric ratios
  };
}
```

### GET /api/v2/system/capacity-status

**Description**: Check system capacity and load balancing status.

**Response**:

```typescript
{
  capacity_status: {
    current_load: number;                  // 0-1, current system load
    optimization_queue_length: number;
    estimated_wait_time_ms: number;
    capacity_available: boolean;
    max_concurrent_optimizations: number;
    active_optimizations: number;
  };

  recommendations: {
    optimal_request_timing: string;        // When to send requests for best performance
    batch_size_recommendation: number;     // Recommended batch size
    algorithm_recommendations: {
      for_speed: string;                   // Recommended algorithm for speed
      for_quality: string;                 // Recommended algorithm for quality
      for_balanced: string;                // Recommended algorithm for balance
    };
  };
}
```

## Error Handling

### Error Response Format

All endpoints return errors in this consistent format:

```typescript
{
  success: false;
  error: {
    code: string;                          // Error code (see codes below)
    message: string;                       // Human-readable error message
    details?: string;                      // Additional technical details
    request_id?: string;                   // Request ID for tracking
    retry_after_ms?: number;               // Milliseconds to wait before retry
    fallback_available?: boolean;          // Whether fallback options exist
  };
  troubleshooting?: {
    common_causes: string[];
    recommended_actions: string[];
    documentation_links: string[];
  };
}
```

### Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_TARGET_COLOR` | Target color values are invalid or out of range | 400 |
| `INSUFFICIENT_PAINT_COLLECTION` | Not enough paints for meaningful optimization | 400 |
| `INVALID_VOLUME_CONSTRAINTS` | Volume constraints are invalid or impossible | 400 |
| `OPTIMIZATION_TIMEOUT` | Optimization exceeded time limit | 408 |
| `ALGORITHM_CONVERGENCE_FAILED` | Algorithm could not find suitable solution | 422 |
| `ENHANCED_ACCURACY_UNAVAILABLE` | Enhanced accuracy temporarily unavailable | 503 |
| `COLLECTION_NOT_FOUND` | Specified paint collection not found | 404 |
| `PAINT_DATA_CORRUPTED` | Paint color data appears corrupted | 422 |
| `SYSTEM_CAPACITY_EXCEEDED` | System at capacity, try again later | 503 |
| `INVALID_API_KEY` | API key is invalid or expired | 401 |
| `RATE_LIMIT_EXCEEDED` | Too many requests, rate limit exceeded | 429 |

## Rate Limits

- **Enhanced Optimization**: 100 requests per hour per API key
- **Batch Optimization**: 20 requests per hour per API key (max 10 targets per batch)
- **Analysis Endpoints**: 200 requests per hour per API key
- **System Metrics**: 60 requests per hour per API key

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

## SDK and Integration Examples

### JavaScript/TypeScript SDK

```typescript
import { PaintMixrClient } from '@paintmixr/sdk';

const client = new PaintMixrClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.paintmixr.com/api/v2'
});

// Enhanced color optimization
const result = await client.optimize.enhanced({
  targetColor: { L: 65.2, a: 15.1, b: 28.7 },
  volumeConstraints: {
    totalVolumeML: 100,
    minVolumePerpaintML: 0.5,
    maxPaintCount: 5,
    allowWaste: false,
    asymmetricRatios: true
  },
  optimizationConfig: {
    targetDeltaE: 2.0,
    algorithm: 'auto',
    qualityVsSpeed: 'balanced'
  }
});

console.log(`Achieved Delta E: ${result.qualityMetrics.deltaE}`);
```

### Python SDK

```python
from paintmixr import PaintMixrClient, LABColor, VolumeConstraints, OptimizationConfig

client = PaintMixrClient(api_key='your-api-key')

# Enhanced optimization
result = client.optimize.enhanced(
    target_color=LABColor(L=65.2, a=15.1, b=28.7),
    volume_constraints=VolumeConstraints(
        total_volume_ml=100.0,
        min_volume_per_paint_ml=0.5,
        max_paint_count=5,
        allow_waste=False,
        asymmetric_ratios=True
    ),
    optimization_config=OptimizationConfig(
        target_delta_e=2.0,
        algorithm='auto',
        quality_vs_speed='balanced'
    )
)

print(f"Achieved Delta E: {result.quality_metrics.delta_e}")
```

## Migration from Legacy API

### Automatic Migration

The enhanced API provides automatic migration support for legacy requests:

```bash
# Legacy request format (still supported)
curl -X POST https://api.paintmixr.com/api/v1/color/mix \
  -d '{"target_color_hex": "#A67C52", "accuracy_target": 4.0}'

# Response includes migration suggestion
{
  "legacy_result": { /* legacy format result */ },
  "enhanced_migration": {
    "available": true,
    "estimated_improvement": 1.8,
    "enhanced_endpoint": "/api/v2/optimize/enhanced",
    "converted_request": { /* enhanced format */ }
  }
}
```

### Migration Best Practices

1. **Gradual Migration**: Start with `fallback_options.enable_legacy_fallback: true`
2. **Test Enhanced Accuracy**: Compare results with existing legacy implementations
3. **Update Color Specifications**: Convert HEX/RGB colors to LAB for better precision
4. **Calibrate Paint Collections**: Verify paint colors and optical properties
5. **Monitor Performance**: Use system metrics to ensure enhanced accuracy meets requirements

For detailed migration guidance, see the [Migration Guide](./migration-guide.md).