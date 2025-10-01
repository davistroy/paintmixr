/**
 * E2E Test: Enhanced Accuracy Workflow (T015)
 *
 * Tests the complete user workflow for enhanced color accuracy optimization
 * from paint selection through precise color matching and volume calculations.
 *
 * This test MUST fail until the enhanced accuracy feature is fully implemented.
 */

describe('Enhanced Accuracy Workflow - E2E Test', () => {
  beforeEach(() => {
    // Mock authentication and user data
    cy.intercept('GET', '/api/auth/session', {
      statusCode: 200,
      body: {
        user: {
          id: 'test-user-id',
          email: 'artist@example.com',
          name: 'Test Artist'
        }
      }
    });

    // Mock user paint collection with high-quality pigments
    cy.intercept('GET', '/api/v1/users/paints', {
      statusCode: 200,
      body: {
        paints: [
          {
            id: 'titanium-white-uuid',
            name: 'Titanium White',
            brand: 'Winsor & Newton',
            color_space: { l: 95.2, a: -0.8, b: 2.1 },
            available_volume_ml: 200,
            cost_per_ml: 0.15
          },
          {
            id: 'ultramarine-blue-uuid',
            name: 'Ultramarine Blue',
            brand: 'Winsor & Newton',
            color_space: { l: 29.8, a: 8.4, b: -46.9 },
            available_volume_ml: 150,
            cost_per_ml: 0.25
          },
          {
            id: 'cadmium-red-medium-uuid',
            name: 'Cadmium Red Medium',
            brand: 'Winsor & Newton',
            color_space: { l: 48.2, a: 68.9, b: 54.3 },
            available_volume_ml: 120,
            cost_per_ml: 0.35
          },
          {
            id: 'cadmium-yellow-light-uuid',
            name: 'Cadmium Yellow Light',
            brand: 'Winsor & Newton',
            color_space: { l: 85.7, a: -8.2, b: 85.4 },
            available_volume_ml: 100,
            cost_per_ml: 0.30
          }
        ]
      }
    });

    cy.visit('/mix');
  });

  it('should complete enhanced accuracy color matching workflow', () => {
    // Step 1: Select target color with color picker
    cy.get('[data-testid="color-picker"]').should('be.visible');
    cy.get('[data-testid="color-input-l"]').clear().type('65.5');
    cy.get('[data-testid="color-input-a"]').clear().type('15.2');
    cy.get('[data-testid="color-input-b"]').clear().type('25.8');

    // Verify color preview updates
    cy.get('[data-testid="target-color-preview"]')
      .should('have.css', 'background-color')
      .and('not.equal', 'rgba(0, 0, 0, 0)'); // Should have actual color

    // Step 2: Set enhanced accuracy target (≤ 2.0 Delta E)
    cy.get('[data-testid="accuracy-mode-toggle"]').click();
    cy.get('[data-testid="enhanced-mode-checkbox"]').should('be.checked');

    cy.get('[data-testid="delta-e-target-slider"]')
      .invoke('val', 1.5)
      .trigger('change');

    cy.get('[data-testid="delta-e-display"]').should('contain.text', '1.5');

    // Step 3: Configure volume with milliliter precision
    cy.get('[data-testid="volume-input"]').clear().type('50.0');
    cy.get('[data-testid="precision-mode-select"]').select('0.1ml');
    cy.get('[data-testid="volume-display"]').should('contain.text', '50.0 ml');

    // Step 4: Select available paints
    cy.get('[data-testid="paint-selector"]').should('be.visible');
    cy.get('[data-testid="paint-titanium-white-checkbox"]').check();
    cy.get('[data-testid="paint-ultramarine-blue-checkbox"]').check();
    cy.get('[data-testid="paint-cadmium-red-medium-checkbox"]').check();
    cy.get('[data-testid="paint-cadmium-yellow-light-checkbox"]').check();

    // Verify 4 paints selected
    cy.get('[data-testid="selected-paints-count"]').should('contain.text', '4 paints selected');

    // Step 5: Initiate enhanced optimization
    cy.intercept('POST', '/api/v1/color/optimize', {
      statusCode: 200,
      body: {
        formula: {
          id: 'formula-enhanced-uuid',
          total_volume_ml: 50.0,
          achieved_delta_e: 1.3,
          paint_components: [
            {
              paint_id: 'titanium-white-uuid',
              volume_ml: 32.4,
              percentage: 64.8,
              mixing_order: 1
            },
            {
              paint_id: 'cadmium-yellow-light-uuid',
              volume_ml: 12.1,
              percentage: 24.2,
              mixing_order: 2
            },
            {
              paint_id: 'cadmium-red-medium-uuid',
              volume_ml: 4.7,
              percentage: 9.4,
              mixing_order: 3
            },
            {
              paint_id: 'ultramarine-blue-uuid',
              volume_ml: 0.8,
              percentage: 1.6,
              mixing_order: 4
            }
          ],
          estimated_cost: 9.85,
          mixing_time_estimate_minutes: 8,
          warnings: []
        },
        optimization_metadata: {
          algorithm_used: 'differential_evolution_tpe_hybrid',
          iterations_performed: 2847,
          performance_metrics: {
            calculation_time_ms: 445,
            convergence_achieved: true,
            color_space_coverage: 0.94
          }
        }
      }
    }).as('optimizeRequest');

    cy.get('[data-testid="optimize-button"]').click();

    // Verify loading state
    cy.get('[data-testid="optimization-spinner"]').should('be.visible');
    cy.get('[data-testid="calculation-progress"]').should('be.visible');

    // Wait for optimization completion
    cy.wait('@optimizeRequest');
    cy.get('[data-testid="optimization-spinner"]').should('not.exist');

    // Step 6: Verify enhanced results display
    cy.get('[data-testid="results-panel"]').should('be.visible');

    // Check achieved accuracy
    cy.get('[data-testid="achieved-delta-e"]')
      .should('contain.text', '1.3')
      .and('have.class', 'success'); // Should be green for meeting target

    cy.get('[data-testid="accuracy-improvement"]')
      .should('contain.text', '67%') // Improvement from standard ~4.0 to 1.3
      .and('be.visible');

    // Verify milliliter precision display
    cy.get('[data-testid="component-titanium-white"] [data-testid="volume-precise"]')
      .should('contain.text', '32.4 ml');

    cy.get('[data-testid="component-cadmium-yellow-light"] [data-testid="volume-precise"]')
      .should('contain.text', '12.1 ml');

    cy.get('[data-testid="component-cadmium-red-medium"] [data-testid="volume-precise"]')
      .should('contain.text', '4.7 ml');

    cy.get('[data-testid="component-ultramarine-blue"] [data-testid="volume-precise"]')
      .should('contain.text', '0.8 ml');

    // Verify asymmetric ratios (not equal percentages)
    cy.get('[data-testid="component-percentages"]').within(() => {
      cy.get('[data-testid="percentage-0"]').should('contain.text', '64.8%');
      cy.get('[data-testid="percentage-1"]').should('contain.text', '24.2%');
      cy.get('[data-testid="percentage-2"]').should('contain.text', '9.4%');
      cy.get('[data-testid="percentage-3"]').should('contain.text', '1.6%');
    });

    // Step 7: Test precision volume calculations
    cy.intercept('GET', '/api/v1/formulas/formula-enhanced-uuid/precision-calculation', {
      statusCode: 200,
      body: {
        formula_id: 'formula-enhanced-uuid',
        total_volume_ml: 50.0,
        precision_level: '0.1ml',
        measured_components: [
          {
            paint_id: 'titanium-white-uuid',
            paint_name: 'Titanium White',
            theoretical_volume_ml: 32.4,
            practical_volume_ml: 32.4,
            measurement_tool: 'digital_scale_0.1g',
            measurement_accuracy: '±0.05ml'
          },
          {
            paint_id: 'cadmium-yellow-light-uuid',
            paint_name: 'Cadmium Yellow Light',
            theoretical_volume_ml: 12.1,
            practical_volume_ml: 12.1,
            measurement_tool: 'digital_scale_0.1g',
            measurement_accuracy: '±0.05ml'
          },
          {
            paint_id: 'cadmium-red-medium-uuid',
            paint_name: 'Cadmium Red Medium',
            theoretical_volume_ml: 4.7,
            practical_volume_ml: 4.7,
            measurement_tool: 'precision_syringe_1ml',
            measurement_accuracy: '±0.02ml'
          },
          {
            paint_id: 'ultramarine-blue-uuid',
            paint_name: 'Ultramarine Blue',
            theoretical_volume_ml: 0.8,
            practical_volume_ml: 0.8,
            measurement_tool: 'precision_syringe_1ml',
            measurement_accuracy: '±0.02ml'
          }
        ],
        mixing_instructions: [
          'Place base (Titanium White) in clean mixing container',
          'Add Cadmium Yellow Light gradually while stirring',
          'Incorporate Cadmium Red Medium in small amounts',
          'Add Ultramarine Blue drop by drop until target achieved',
          'Mix thoroughly for 3-4 minutes until homogeneous'
        ],
        equipment_recommendations: [
          'Digital scale accurate to 0.1g',
          'Precision syringes (1ml and 5ml)',
          'Stainless steel palette knife',
          'Clean glass mixing surface'
        ]
      }
    }).as('precisionRequest');

    cy.get('[data-testid="precision-details-button"]').click();
    cy.wait('@precisionRequest');

    // Verify precision calculation display
    cy.get('[data-testid="precision-panel"]').should('be.visible');

    cy.get('[data-testid="measurement-tools"]').within(() => {
      cy.should('contain.text', 'digital_scale_0.1g');
      cy.should('contain.text', 'precision_syringe_1ml');
    });

    cy.get('[data-testid="mixing-instructions"]').within(() => {
      cy.should('contain.text', 'Place base (Titanium White)');
      cy.should('contain.text', 'Add Cadmium Yellow Light gradually');
      cy.should('contain.text', 'drop by drop');
    });

    // Step 8: Test formula comparison with standard accuracy
    cy.intercept('POST', '/api/v1/color/optimize/compare', {
      statusCode: 200,
      body: {
        target_color: { l: 65.5, a: 15.2, b: 25.8 },
        current_formula: {
          id: 'formula-standard-uuid',
          achieved_delta_e: 3.8,
          total_volume_ml: 50.0,
          paint_components: [
            { paint_id: 'titanium-white-uuid', volume_ml: 30.0, percentage: 60.0 },
            { paint_id: 'cadmium-yellow-light-uuid', volume_ml: 15.0, percentage: 30.0 },
            { paint_id: 'cadmium-red-medium-uuid', volume_ml: 5.0, percentage: 10.0 }
          ]
        },
        enhanced_formula: {
          id: 'formula-enhanced-uuid',
          achieved_delta_e: 1.3,
          total_volume_ml: 50.0,
          paint_components: [
            { paint_id: 'titanium-white-uuid', volume_ml: 32.4, percentage: 64.8 },
            { paint_id: 'cadmium-yellow-light-uuid', volume_ml: 12.1, percentage: 24.2 },
            { paint_id: 'cadmium-red-medium-uuid', volume_ml: 4.7, percentage: 9.4 },
            { paint_id: 'ultramarine-blue-uuid', volume_ml: 0.8, percentage: 1.6 }
          ]
        },
        improvement_metrics: {
          delta_e_improvement: 2.5,
          accuracy_improvement_percentage: 65.8,
          additional_paints_used: 1,
          cost_increase: 2.35
        }
      }
    }).as('compareRequest');

    cy.get('[data-testid="compare-accuracy-button"]').click();
    cy.wait('@compareRequest');

    // Verify comparison results
    cy.get('[data-testid="comparison-panel"]').should('be.visible');

    cy.get('[data-testid="standard-delta-e"]').should('contain.text', '3.8');
    cy.get('[data-testid="enhanced-delta-e"]').should('contain.text', '1.3');
    cy.get('[data-testid="improvement-percentage"]').should('contain.text', '65.8%');

    // Step 9: Save enhanced formula
    cy.intercept('POST', '/api/v1/formulas', {
      statusCode: 201,
      body: {
        id: 'saved-formula-uuid',
        name: 'Enhanced Warm Beige',
        created_at: new Date().toISOString()
      }
    }).as('saveFormula');

    cy.get('[data-testid="formula-name-input"]').type('Enhanced Warm Beige');
    cy.get('[data-testid="save-formula-button"]').click();
    cy.wait('@saveFormula');

    // Verify save confirmation
    cy.get('[data-testid="save-success-message"]')
      .should('be.visible')
      .and('contain.text', 'Formula saved successfully');

    // Step 10: Verify performance metrics display
    cy.get('[data-testid="performance-metrics"]').within(() => {
      cy.get('[data-testid="calculation-time"]')
        .should('contain.text', '445ms')
        .and('have.class', 'performance-good'); // Under 500ms target

      cy.get('[data-testid="algorithm-used"]')
        .should('contain.text', 'differential_evolution_tpe_hybrid');

      cy.get('[data-testid="iterations-count"]')
        .should('contain.text', '2,847');

      cy.get('[data-testid="convergence-status"]')
        .should('contain.text', 'Achieved')
        .and('have.class', 'success');
    });
  });

  it('should handle enhanced accuracy validation workflow', () => {
    // Navigate to validation page
    cy.visit('/validate');

    // Input mixed color for validation
    cy.get('[data-testid="mixed-color-l"]').clear().type('65.2');
    cy.get('[data-testid="mixed-color-a"]').clear().type('15.5');
    cy.get('[data-testid="mixed-color-b"]').clear().type('25.3');

    // Input target color
    cy.get('[data-testid="target-color-l"]').clear().type('65.5');
    cy.get('[data-testid="target-color-a"]').clear().type('15.2');
    cy.get('[data-testid="target-color-b"]').clear().type('25.8');

    // Mock validation API
    cy.intercept('POST', '/api/v1/color/validate-accuracy', {
      statusCode: 200,
      body: {
        target_color: { l: 65.5, a: 15.2, b: 25.8 },
        mixed_color: { l: 65.2, a: 15.5, b: 25.3 },
        validation_results: {
          ciede2000_delta_e: 0.67,
          cie76_delta_e: 0.89,
          meets_enhanced_target: true,
          accuracy_grade: 'A+',
          perceptual_difference: 'Not noticeable to human eye'
        },
        color_analysis: {
          lightness_difference: -0.3,
          chroma_difference: 0.23,
          hue_difference: 0.18,
          dominant_difference: 'chroma'
        },
        suggestions: [
          'Excellent color match achieved!',
          'Result exceeds enhanced accuracy standards',
          'Consider documenting this formula for future reference'
        ]
      }
    }).as('validateAccuracy');

    // Select validation method
    cy.get('[data-testid="validation-method-select"]').select('ciede2000');

    // Perform validation
    cy.get('[data-testid="validate-button"]').click();
    cy.wait('@validateAccuracy');

    // Verify results
    cy.get('[data-testid="validation-results"]').should('be.visible');
    cy.get('[data-testid="delta-e-result"]').should('contain.text', '0.67');
    cy.get('[data-testid="accuracy-grade"]').should('contain.text', 'A+');
    cy.get('[data-testid="perceptual-assessment"]')
      .should('contain.text', 'Not noticeable to human eye');

    // Verify enhanced target achievement
    cy.get('[data-testid="enhanced-target-badge"]')
      .should('be.visible')
      .and('have.class', 'success')
      .and('contain.text', 'Enhanced Target Met');
  });

  it('should demonstrate accessibility compliance in enhanced mode', () => {
    // Verify high contrast mode compatibility
    cy.get('[data-testid="accessibility-settings"]').click();
    cy.get('[data-testid="high-contrast-toggle"]').click();

    // Test keyboard navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'color-input-l');

    cy.tab();
    cy.focused().should('have.attr', 'data-testid', 'color-input-a');

    cy.tab();
    cy.focused().should('have.attr', 'data-testid', 'color-input-b');

    // Test screen reader labels
    cy.get('[data-testid="delta-e-target-slider"]')
      .should('have.attr', 'aria-label')
      .and('contain', 'Delta E accuracy target');

    cy.get('[data-testid="enhanced-mode-checkbox"]')
      .should('have.attr', 'aria-describedby')
      .then((describedBy) => {
        cy.get(`#${describedBy}`)
          .should('contain.text', 'Enable enhanced accuracy mode for Delta E ≤ 2.0');
      });

    // Verify color descriptions for visually impaired users
    cy.get('[data-testid="target-color-description"]')
      .should('contain.text', 'Warm medium beige')
      .and('have.attr', 'aria-live', 'polite');

    // Test focus indicators
    cy.get('[data-testid="optimize-button"]').focus();
    cy.focused().should('have.css', 'outline-width', '2px');
  });

  it('should handle error scenarios gracefully', () => {
    // Test network error handling
    cy.intercept('POST', '/api/v1/color/optimize', {
      statusCode: 500,
      body: { error: 'Internal server error' }
    }).as('optimizeError');

    cy.get('[data-testid="color-input-l"]').clear().type('50');
    cy.get('[data-testid="color-input-a"]').clear().type('0');
    cy.get('[data-testid="color-input-b"]').clear().type('0');

    cy.get('[data-testid="paint-titanium-white-checkbox"]').check();
    cy.get('[data-testid="paint-ultramarine-blue-checkbox"]').check();

    cy.get('[data-testid="optimize-button"]').click();
    cy.wait('@optimizeError');

    // Verify error handling
    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain.text', 'Unable to optimize color');

    cy.get('[data-testid="retry-button"]').should('be.visible');

    // Test impossible color handling
    cy.intercept('POST', '/api/v1/color/optimize', {
      statusCode: 422,
      body: {
        error: 'Color target cannot be achieved',
        message: 'The requested color cannot be achieved with available paints',
        analysis: {
          target_gamut_exceeded: true,
          limiting_factors: ['insufficient_color_saturation']
        },
        suggestions: {
          alternative_targets: [
            {
              color: { l: 65.0, a: 12.0, b: 23.0 },
              estimated_delta_e: 1.8,
              description: 'Closest achievable warm beige'
            }
          ]
        }
      }
    }).as('impossibleColor');

    // Clear error state and try impossible color
    cy.get('[data-testid="clear-error-button"]').click();

    cy.get('[data-testid="color-input-l"]').clear().type('90');
    cy.get('[data-testid="color-input-a"]').clear().type('80');
    cy.get('[data-testid="color-input-b"]').clear().type('-80');

    cy.get('[data-testid="optimize-button"]').click();
    cy.wait('@impossibleColor');

    // Verify impossible color feedback
    cy.get('[data-testid="impossible-color-message"]')
      .should('be.visible')
      .and('contain.text', 'cannot be achieved');

    cy.get('[data-testid="alternative-suggestions"]').should('be.visible');
    cy.get('[data-testid="suggested-color-0"]')
      .should('contain.text', 'Closest achievable warm beige');
  });
});