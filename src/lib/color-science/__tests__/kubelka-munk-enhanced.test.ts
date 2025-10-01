/**
 * Unit Tests for Enhanced Kubelka-Munk Color Theory Implementation
 * Tests advanced color mixing calculations with surface reflection corrections
 */

import {
  KubelkaMunkCalculator,
  calculateMixtureColor,
  calculateReflectanceSpectrum,
  applyFinishCorrections,
  calculateScatteringAbsorption,
  modelSubstrateInteraction
} from '../kubelka-munk-enhanced';
import { LABColor } from '../types';

describe('KubelkaMunkCalculator', () => {
  let calculator: KubelkaMunkCalculator;

  beforeEach(() => {
    calculator = new KubelkaMunkCalculator();
  });

  describe('Basic Kubelka-Munk Theory', () => {
    test('should calculate K/S values for single pigment', () => {
      const reflectanceSpectrum = [
        0.85, 0.82, 0.78, 0.75, 0.72, 0.68, 0.65, 0.62, 0.58, 0.55,
        0.52, 0.48, 0.45, 0.42, 0.38, 0.35, 0.32, 0.28, 0.25, 0.22,
        0.18, 0.15, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01, 0.01,
        0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.15, 0.18, 0.22, 0.25
      ];

      const ksValues = calculator.calculateKSValues(reflectanceSpectrum);

      expect(ksValues).toHaveLength(40);
      ksValues.forEach(ks => {
        expect(ks).toBeGreaterThan(0);
        expect(ks).toBeLessThan(50); // Reasonable range for K/S
        expect(Number.isFinite(ks)).toBe(true);
      });

      // K/S should be higher where reflectance is lower (more absorption)
      const lowReflectanceIndex = reflectanceSpectrum.indexOf(Math.min(...reflectanceSpectrum));
      const highReflectanceIndex = reflectanceSpectrum.indexOf(Math.max(...reflectanceSpectrum));

      expect(ksValues[lowReflectanceIndex]).toBeGreaterThan(ksValues[highReflectanceIndex]);
    });

    test('should calculate reflectance from K/S values', () => {
      const ksValues = [
        2.5, 2.8, 3.2, 3.6, 4.0, 4.5, 5.0, 5.5, 6.0, 6.8,
        7.5, 8.2, 9.0, 9.8, 10.5, 11.2, 12.0, 12.8, 13.5, 14.2,
        15.0, 15.8, 16.5, 17.2, 18.0, 18.5, 18.8, 19.0, 19.2, 19.0,
        18.5, 18.0, 17.2, 16.5, 15.8, 15.0, 14.2, 13.5, 12.8, 12.0
      ];

      const reflectanceSpectrum = calculator.calculateReflectanceFromKS(ksValues);

      expect(reflectanceSpectrum).toHaveLength(40);
      reflectanceSpectrum.forEach(r => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
        expect(Number.isFinite(r)).toBe(true);
      });

      // Higher K/S should result in lower reflectance
      const maxKSIndex = ksValues.indexOf(Math.max(...ksValues));
      const minKSIndex = ksValues.indexOf(Math.min(...ksValues));

      expect(reflectanceSpectrum[maxKSIndex]).toBeLessThan(reflectanceSpectrum[minKSIndex]);
    });

    test('should maintain K/S to reflectance round-trip consistency', () => {
      const originalReflectance = [
        0.75, 0.72, 0.68, 0.65, 0.60, 0.55, 0.50, 0.45, 0.40, 0.35,
        0.30, 0.25, 0.20, 0.15, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04,
        0.03, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12, 0.15, 0.20, 0.25,
        0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.68, 0.72
      ];

      const ksValues = calculator.calculateKSValues(originalReflectance);
      const reconstructedReflectance = calculator.calculateReflectanceFromKS(ksValues);

      for (let i = 0; i < originalReflectance.length; i++) {
        expect(reconstructedReflectance[i]).toBeCloseTo(originalReflectance[i], 3);
      }
    });
  });

  describe('Color Mixture Calculations', () => {
    const whiteReflectance = new Array(40).fill(0.9).map((_, i) =>
      0.9 - (i / 40) * 0.1 // Slight decrease across spectrum
    );

    const blackReflectance = new Array(40).fill(0.05).map((_, i) =>
      0.05 + (i / 40) * 0.03 // Slight increase across spectrum
    );

    const redReflectance = [
      0.08, 0.07, 0.06, 0.05, 0.04, 0.03, 0.03, 0.03, 0.03, 0.04,
      0.05, 0.07, 0.10, 0.15, 0.22, 0.32, 0.45, 0.60, 0.75, 0.85,
      0.88, 0.87, 0.86, 0.85, 0.84, 0.83, 0.82, 0.81, 0.80, 0.79,
      0.78, 0.77, 0.76, 0.75, 0.74, 0.73, 0.72, 0.71, 0.70, 0.69
    ];

    test('should mix two colors according to volume ratios', () => {
      const mixture = calculator.mixColors([
        { reflectanceSpectrum: whiteReflectance, volumeRatio: 0.7 },
        { reflectanceSpectrum: blackReflectance, volumeRatio: 0.3 }
      ]);

      expect(mixture.reflectanceSpectrum).toHaveLength(40);

      // Mixed reflectance should be between the two component reflectances
      for (let i = 0; i < 40; i++) {
        expect(mixture.reflectanceSpectrum[i]).toBeGreaterThan(blackReflectance[i]);
        expect(mixture.reflectanceSpectrum[i]).toBeLessThan(whiteReflectance[i]);
      }

      // Should be closer to white since it has higher volume ratio
      const avgWhite = whiteReflectance.reduce((a, b) => a + b) / 40;
      const avgBlack = blackReflectance.reduce((a, b) => a + b) / 40;
      const avgMixture = mixture.reflectanceSpectrum.reduce((a, b) => a + b) / 40;

      expect(Math.abs(avgMixture - avgWhite)).toBeLessThan(Math.abs(avgMixture - avgBlack));
    });

    test('should handle complex multi-component mixtures', () => {
      const blueReflectance = [
        0.15, 0.18, 0.22, 0.28, 0.35, 0.45, 0.58, 0.72, 0.82, 0.88,
        0.85, 0.78, 0.68, 0.55, 0.42, 0.30, 0.20, 0.12, 0.08, 0.06,
        0.05, 0.04, 0.04, 0.04, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09,
        0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19
      ];

      const mixture = calculator.mixColors([
        { reflectanceSpectrum: whiteReflectance, volumeRatio: 0.4 },
        { reflectanceSpectrum: redReflectance, volumeRatio: 0.35 },
        { reflectanceSpectrum: blueReflectance, volumeRatio: 0.25 }
      ]);

      expect(mixture.reflectanceSpectrum).toHaveLength(40);

      // Verify the mixture is physically reasonable
      mixture.reflectanceSpectrum.forEach(r => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
        expect(Number.isFinite(r)).toBe(true);
      });

      // Should show characteristics of all three components
      const shortWaveReflectance = mixture.reflectanceSpectrum.slice(0, 13).reduce((a, b) => a + b) / 13;
      const midWaveReflectance = mixture.reflectanceSpectrum.slice(13, 27).reduce((a, b) => a + b) / 14;
      const longWaveReflectance = mixture.reflectanceSpectrum.slice(27).reduce((a, b) => a + b) / 13;

      // Should show some variation across spectrum due to different color components
      expect(Math.max(shortWaveReflectance, midWaveReflectance, longWaveReflectance) -
             Math.min(shortWaveReflectance, midWaveReflectance, longWaveReflectance))
        .toBeGreaterThan(0.1);
    });

    test('should handle asymmetric volume ratios correctly', () => {
      const mixture = calculator.mixColors([
        { reflectanceSpectrum: whiteReflectance, volumeRatio: 0.95 },
        { reflectanceSpectrum: redReflectance, volumeRatio: 0.05 }
      ]);

      // With 95% white, should be very close to white but with slight red tint
      const avgWhite = whiteReflectance.reduce((a, b) => a + b) / 40;
      const avgMixture = mixture.reflectanceSpectrum.reduce((a, b) => a + b) / 40;

      expect(avgMixture).toBeGreaterThan(avgWhite * 0.9); // Should still be quite bright

      // Red wavelengths should be relatively more reflected than blue
      const redRegion = mixture.reflectanceSpectrum.slice(17, 25).reduce((a, b) => a + b) / 8;
      const blueRegion = mixture.reflectanceSpectrum.slice(5, 13).reduce((a, b) => a + b) / 8;

      expect(redRegion).toBeGreaterThan(blueRegion * 1.05); // Slight red bias
    });
  });

  describe('Enhanced Features', () => {
    test('should apply finish-specific corrections', () => {
      const baseReflectance = [
        0.60, 0.58, 0.55, 0.52, 0.48, 0.45, 0.42, 0.38, 0.35, 0.32,
        0.28, 0.25, 0.22, 0.18, 0.15, 0.12, 0.08, 0.05, 0.03, 0.02,
        0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12, 0.15,
        0.18, 0.22, 0.25, 0.28, 0.32, 0.35, 0.38, 0.42, 0.45, 0.48
      ];

      const matteCorrected = calculator.applyFinishCorrections(baseReflectance, 'matte');
      const glossyCorrected = calculator.applyFinishCorrections(baseReflectance, 'gloss');
      const satinCorrected = calculator.applyFinishCorrections(baseReflectance, 'satin');

      expect(matteCorrected).toHaveLength(40);
      expect(glossyCorrected).toHaveLength(40);
      expect(satinCorrected).toHaveLength(40);

      // Different finishes should produce different reflectance curves
      let matteGlossyDiff = 0;
      let mateSatinDiff = 0;

      for (let i = 0; i < 40; i++) {
        matteGlossyDiff += Math.abs(matteCorrected[i] - glossyCorrected[i]);
        mateSatinDiff += Math.abs(matteCorrected[i] - satinCorrected[i]);
      }

      expect(matteGlossyDiff).toBeGreaterThan(0.01); // Should show measurable difference
      expect(mateSatinDiff).toBeGreaterThan(0.005);
    });

    test('should model substrate interactions', () => {
      const paintReflectance = [
        0.45, 0.42, 0.38, 0.35, 0.32, 0.28, 0.25, 0.22, 0.18, 0.15,
        0.12, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01, 0.01, 0.01, 0.02,
        0.03, 0.05, 0.08, 0.12, 0.15, 0.18, 0.22, 0.25, 0.28, 0.32,
        0.35, 0.38, 0.42, 0.45, 0.48, 0.52, 0.55, 0.58, 0.60, 0.62
      ];

      const whiteSubstrate = new Array(40).fill(0.9);
      const graySubstrate = new Array(40).fill(0.5);

      const onWhite = calculator.modelSubstrateInteraction(paintReflectance, whiteSubstrate, 0.8);
      const onGray = calculator.modelSubstrateInteraction(paintReflectance, graySubstrate, 0.8);

      expect(onWhite).toHaveLength(40);
      expect(onGray).toHaveLength(40);

      // Paint on white substrate should generally be brighter than on gray
      const avgOnWhite = onWhite.reduce((a, b) => a + b) / 40;
      const avgOnGray = onGray.reduce((a, b) => a + b) / 40;

      expect(avgOnWhite).toBeGreaterThan(avgOnGray);

      // Both should be between original paint and substrate values
      const avgPaint = paintReflectance.reduce((a, b) => a + b) / 40;

      expect(avgOnWhite).toBeGreaterThan(avgPaint);
      expect(avgOnGray).toBeGreaterThan(Math.min(avgPaint, 0.5));
      expect(avgOnGray).toBeLessThan(Math.max(avgPaint, 0.5));
    });

    test('should calculate scattering and absorption coefficients', () => {
      const reflectanceSpectrum = [
        0.70, 0.68, 0.65, 0.62, 0.58, 0.54, 0.50, 0.45, 0.40, 0.35,
        0.30, 0.25, 0.20, 0.16, 0.13, 0.11, 0.09, 0.08, 0.07, 0.06,
        0.06, 0.07, 0.08, 0.09, 0.11, 0.13, 0.16, 0.20, 0.25, 0.30,
        0.35, 0.40, 0.45, 0.50, 0.54, 0.58, 0.62, 0.65, 0.68, 0.70
      ];

      const result = calculator.calculateScatteringAbsorption(reflectanceSpectrum);

      expect(result.scattering).toHaveLength(40);
      expect(result.absorption).toHaveLength(40);

      // All coefficients should be positive
      result.scattering.forEach(s => {
        expect(s).toBeGreaterThan(0);
        expect(Number.isFinite(s)).toBe(true);
      });

      result.absorption.forEach(a => {
        expect(a).toBeGreaterThan(0);
        expect(Number.isFinite(a)).toBe(true);
      });

      // Absorption should be higher where reflectance is lower
      const minReflIndex = reflectanceSpectrum.indexOf(Math.min(...reflectanceSpectrum));
      const maxReflIndex = reflectanceSpectrum.indexOf(Math.max(...reflectanceSpectrum));

      expect(result.absorption[minReflIndex]).toBeGreaterThan(result.absorption[maxReflIndex]);
    });
  });

  describe('Integration with LAB Color Space', () => {
    test('should convert mixture result to accurate LAB values', () => {
      const mixture = calculator.mixColors([
        {
          reflectanceSpectrum: new Array(40).fill(0).map((_, i) =>
            i < 20 ? 0.1 : 0.8 // Red-like spectrum
          ),
          volumeRatio: 0.6
        },
        {
          reflectanceSpectrum: new Array(40).fill(0.9), // White
          volumeRatio: 0.4
        }
      ]);

      const labColor = calculator.reflectanceToLAB(mixture.reflectanceSpectrum);

      expect(labColor.L).toBeGreaterThan(30); // Should be reasonably bright
      expect(labColor.L).toBeLessThan(90);
      expect(labColor.a).toBeGreaterThan(5);  // Should show red component
      expect(labColor.b).toBeGreaterThan(-10);
      expect(labColor.b).toBeLessThan(30);

      // All values should be in valid LAB range
      expect(labColor.L).toBeGreaterThanOrEqual(0);
      expect(labColor.L).toBeLessThanOrEqual(100);
      expect(labColor.a).toBeGreaterThanOrEqual(-128);
      expect(labColor.a).toBeLessThanOrEqual(127);
      expect(labColor.b).toBeGreaterThanOrEqual(-128);
      expect(labColor.b).toBeLessThanOrEqual(127);
    });

    test('should handle edge case color conversions', () => {
      // Pure white
      const whiteSpectrum = new Array(40).fill(0.95);
      const whiteLab = calculator.reflectanceToLAB(whiteSpectrum);

      expect(whiteLab.L).toBeGreaterThan(90);
      expect(Math.abs(whiteLab.a)).toBeLessThan(5);
      expect(Math.abs(whiteLab.b)).toBeLessThan(5);

      // Pure black
      const blackSpectrum = new Array(40).fill(0.03);
      const blackLab = calculator.reflectanceToLAB(blackSpectrum);

      expect(blackLab.L).toBeLessThan(20);
      expect(Math.abs(blackLab.a)).toBeLessThan(10);
      expect(Math.abs(blackLab.b)).toBeLessThan(10);

      // Neutral gray
      const graySpectrum = new Array(40).fill(0.5);
      const grayLab = calculator.reflectanceToLAB(graySpectrum);

      expect(grayLab.L).toBeGreaterThan(40);
      expect(grayLab.L).toBeLessThan(70);
      expect(Math.abs(grayLab.a)).toBeLessThan(5);
      expect(Math.abs(grayLab.b)).toBeLessThan(5);
    });
  });

  describe('Performance and Numerical Stability', () => {
    test('should handle extreme reflectance values', () => {
      // Test with very low reflectance
      const lowReflectance = new Array(40).fill(0.001);
      const lowKS = calculator.calculateKSValues(lowReflectance);

      lowKS.forEach(ks => {
        expect(Number.isFinite(ks)).toBe(true);
        expect(ks).toBeGreaterThan(0);
      });

      // Test with very high reflectance
      const highReflectance = new Array(40).fill(0.999);
      const highKS = calculator.calculateKSValues(highReflectance);

      highKS.forEach(ks => {
        expect(Number.isFinite(ks)).toBe(true);
        expect(ks).toBeGreaterThan(0);
        expect(ks).toBeLessThan(1000); // Should not explode
      });
    });

    test('should maintain numerical precision with small volume ratios', () => {
      const baseSpectrum = new Array(40).fill(0.5);
      const tintSpectrum = new Array(40).fill(0).map((_, i) => i > 25 ? 0.8 : 0.1);

      // Test with very small tint ratio
      const mixture = calculator.mixColors([
        { reflectanceSpectrum: baseSpectrum, volumeRatio: 0.999 },
        { reflectanceSpectrum: tintSpectrum, volumeRatio: 0.001 }
      ]);

      mixture.reflectanceSpectrum.forEach(r => {
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
      });

      // Should be very close to base spectrum but slightly influenced by tint
      const avgBase = baseSpectrum.reduce((a, b) => a + b) / 40;
      const avgMixture = mixture.reflectanceSpectrum.reduce((a, b) => a + b) / 40;

      expect(Math.abs(avgMixture - avgBase)).toBeLessThan(0.01);
    });

    test('should perform efficiently with complex mixtures', () => {
      const components = Array.from({ length: 8 }, (_, i) => ({
        reflectanceSpectrum: new Array(40).fill(0).map((_, j) =>
          Math.sin((j + i * 5) * Math.PI / 20) * 0.4 + 0.5
        ),
        volumeRatio: 1.0 / 8
      }));

      const startTime = Date.now();
      const mixture = calculator.mixColors(components);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly

      expect(mixture.reflectanceSpectrum).toHaveLength(40);
      mixture.reflectanceSpectrum.forEach(r => {
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe('Module-level Functions', () => {
  test('calculateMixtureColor should produce consistent results', () => {
    const paints = [
      {
        color: { L: 95, a: -1, b: 3 } as LABColor,
        volumeRatio: 0.7,
        opticalProperties: {
          scattering: new Array(40).fill(10),
          absorption: new Array(40).fill(0.5)
        }
      },
      {
        color: { L: 25, a: 2, b: -3 } as LABColor,
        volumeRatio: 0.3,
        opticalProperties: {
          scattering: new Array(40).fill(15),
          absorption: new Array(40).fill(8)
        }
      }
    ];

    const result = calculateMixtureColor(paints);

    expect(result.L).toBeGreaterThan(paints[1].color.L);
    expect(result.L).toBeLessThan(paints[0].color.L);
    expect(Number.isFinite(result.L)).toBe(true);
    expect(Number.isFinite(result.a)).toBe(true);
    expect(Number.isFinite(result.b)).toBe(true);
  });

  test('calculateReflectanceSpectrum should handle various inputs', () => {
    const ksValues = Array.from({ length: 40 }, (_, i) => 2 + Math.sin(i * Math.PI / 20) * 3);
    const reflectance = calculateReflectanceSpectrum(ksValues);

    expect(reflectance).toHaveLength(40);
    reflectance.forEach(r => {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(Number.isFinite(r)).toBe(true);
    });
  });

  test('applyFinishCorrections should modify spectrum appropriately', () => {
    const baseSpectrum = new Array(40).fill(0.5);

    const matte = applyFinishCorrections(baseSpectrum, 'matte');
    const gloss = applyFinishCorrections(baseSpectrum, 'gloss');
    const satin = applyFinishCorrections(baseSpectrum, 'satin');

    [matte, gloss, satin].forEach(spectrum => {
      expect(spectrum).toHaveLength(40);
      spectrum.forEach(r => {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
        expect(Number.isFinite(r)).toBe(true);
      });
    });

    // Should produce different results
    let matteSatinDiff = 0;
    for (let i = 0; i < 40; i++) {
      matteSatinDiff += Math.abs(matte[i] - satin[i]);
    }
    expect(matteSatinDiff).toBeGreaterThan(0);
  });

  test('modelSubstrateInteraction should blend paint and substrate', () => {
    const paintSpectrum = new Array(40).fill(0.3);
    const substrateSpectrum = new Array(40).fill(0.8);
    const opacity = 0.7;

    const result = modelSubstrateInteraction(paintSpectrum, substrateSpectrum, opacity);

    expect(result).toHaveLength(40);
    result.forEach((r, i) => {
      expect(r).toBeGreaterThanOrEqual(paintSpectrum[i]);
      expect(r).toBeLessThanOrEqual(substrateSpectrum[i]);
      expect(Number.isFinite(r)).toBe(true);
    });
  });
});