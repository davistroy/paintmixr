/**
 * Enhanced Color Picker Component
 * Supports LAB color space with Delta E visualization
 * Includes color accuracy indicators and mixing preview
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LABColor, RGBColor } from '@/lib/color-science/types';
import { convertLABtoRGB, convertRGBtoLAB, convertRGBtoHex } from '@/lib/color-science/color-utils';
import { calculateDeltaE } from '@/lib/color-science/delta-e';

interface ColorPickerProps {
  initialColor?: LABColor;
  onColorChange: (color: LABColor) => void;
  onColorAccepted?: (color: LABColor) => void;
  showDeltaE?: boolean;
  referenceColor?: LABColor;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showPreview?: boolean;
  allowManualInput?: boolean;
}

interface ColorInputs {
  L: number;
  a: number;
  b: number;
  r: number;
  g: number;
  b_rgb: number;
  hex: string;
}

export default function ColorPicker({
  initialColor = { L: 50, a: 0, b: 0 },
  onColorChange,
  onColorAccepted,
  showDeltaE = false,
  referenceColor,
  disabled = false,
  className = '',
  size = 'md',
  showPreview = true,
  allowManualInput = true
}: ColorPickerProps) {
  const [currentColor, setCurrentColor] = useState<LABColor>(initialColor);
  const [colorInputs, setColorInputs] = useState<ColorInputs>(() => {
    const rgb = convertLABtoRGB(initialColor);
    return {
      L: initialColor.L,
      a: initialColor.a,
      b: initialColor.b,
      r: rgb.r,
      g: rgb.g,
      b_rgb: rgb.b,
      hex: convertRGBtoHex(rgb)
    };
  });
  const [activeTab, setActiveTab] = useState<'visual' | 'lab' | 'rgb' | 'hex'>('visual');
  const [deltaE, setDeltaE] = useState<number | null>(null);

  // Update derived values when color changes
  const updateColorInputs = useCallback((labColor: LABColor) => {
    const rgb = convertLABtoRGB(labColor);
    const hex = convertRGBtoHex(rgb);

    setColorInputs({
      L: Math.round(labColor.L * 100) / 100,
      a: Math.round(labColor.a * 100) / 100,
      b: Math.round(labColor.b * 100) / 100,
      r: Math.round(rgb.r),
      g: Math.round(rgb.g),
      b_rgb: Math.round(rgb.b),
      hex
    });
  }, []);

  // Calculate Delta E when reference color changes
  useEffect(() => {
    if (showDeltaE && referenceColor) {
      const deltaEValue = calculateDeltaE(currentColor, referenceColor);
      setDeltaE(deltaEValue);
    } else {
      setDeltaE(null);
    }
  }, [currentColor, referenceColor, showDeltaE]);

  // Update color and notify parent
  const handleColorChange = useCallback((newColor: LABColor) => {
    // Clamp LAB values to valid ranges
    const clampedColor: LABColor = {
      L: Math.max(0, Math.min(100, newColor.L)),
      a: Math.max(-128, Math.min(127, newColor.a)),
      b: Math.max(-128, Math.min(127, newColor.b))
    };

    setCurrentColor(clampedColor);
    updateColorInputs(clampedColor);
    onColorChange(clampedColor);
  }, [onColorChange, updateColorInputs]);

  // Handle LAB input changes
  const handleLABInput = (component: 'L' | 'a' | 'b', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newColor = { ...currentColor, [component]: numValue };
    handleColorChange(newColor);
  };

  // Handle RGB input changes
  const handleRGBInput = (component: 'r' | 'g' | 'b_rgb', value: string) => {
    const numValue = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newRGB: RGBColor = {
      r: component === 'r' ? numValue : colorInputs.r,
      g: component === 'g' ? numValue : colorInputs.g,
      b: component === 'b_rgb' ? numValue : colorInputs.b_rgb
    };
    const labColor = convertRGBtoLAB(newRGB);
    handleColorChange(labColor);
  };

  // Handle hex input changes
  const handleHexInput = (value: string) => {
    const hex = value.replace('#', '');
    if (hex.length === 6 && /^[0-9A-Fa-f]+$/.test(hex)) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const labColor = convertRGBtoLAB({ r, g, b });
      handleColorChange(labColor);
    }
  };

  // Visual color picker dimensions based on size
  const pickerSize = {
    sm: { width: 200, height: 150 },
    md: { width: 300, height: 200 },
    lg: { width: 400, height: 300 }
  }[size];

  // Generate visual picker background
  const generatePickerBackground = () => {
    const canvas = document.createElement('canvas');
    canvas.width = pickerSize.width;
    canvas.height = pickerSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const a = ((x / canvas.width) * 255) - 128; // -128 to 127
        const b = (((canvas.height - y) / canvas.height) * 255) - 128; // -128 to 127

        const labColor: LABColor = { L: currentColor.L, a, b };
        const rgb = convertLABtoRGB(labColor);

        const index = (y * canvas.width + x) * 4;
        data[index] = rgb.r;
        data[index + 1] = rgb.g;
        data[index + 2] = rgb.b;
        data[index + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  };

  const currentHex = convertRGBtoHex(convertLABtoRGB(currentColor));
  const deltaEColor = deltaE !== null ? (deltaE <= 2 ? 'text-green-600' : deltaE <= 4 ? 'text-yellow-600' : 'text-red-600') : '';

  return (
    <div className={`color-picker bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Header with preview and Delta E */}
      {showPreview && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div
              className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-inner"
              style={{ backgroundColor: currentHex }}
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Current Color</div>
              <div className="text-xs text-gray-500">{currentHex}</div>
              {deltaE !== null && (
                <div className={`text-xs font-medium ${deltaEColor}`}>
                  ΔE = {deltaE.toFixed(2)}
                </div>
              )}
            </div>
          </div>
          {referenceColor && (
            <div className="flex items-center space-x-4">
              <div>
                <div className="text-sm font-medium text-gray-700">Target</div>
                <div className="text-xs text-gray-500">
                  {convertRGBtoHex(convertLABtoRGB(referenceColor))}
                </div>
              </div>
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-200 shadow-inner"
                style={{ backgroundColor: convertRGBtoHex(convertLABtoRGB(referenceColor)) }}
              />
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { id: 'visual', label: 'Visual' },
          { id: 'lab', label: 'LAB' },
          { id: 'rgb', label: 'RGB' },
          { id: 'hex', label: 'HEX' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            disabled={disabled}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Color Input Interfaces */}
      {activeTab === 'visual' && (
        <div className="space-y-4">
          <div
            className="relative border border-gray-300 rounded cursor-crosshair"
            style={{
              width: pickerSize.width,
              height: pickerSize.height,
              backgroundImage: `url(${generatePickerBackground()})`,
              backgroundSize: 'cover'
            }}
            onClick={(e) => {
              if (disabled) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const a = ((x / pickerSize.width) * 255) - 128;
              const b = (((pickerSize.height - y) / pickerSize.height) * 255) - 128;
              handleColorChange({ ...currentColor, a, b });
            }}
          >
            {/* Current color indicator */}
            <div
              className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg pointer-events-none"
              style={{
                left: ((currentColor.a + 128) / 255) * pickerSize.width - 6,
                top: ((128 - currentColor.b) / 255) * pickerSize.height - 6,
              }}
            />
          </div>

          {/* Lightness slider */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Lightness (L): {colorInputs.L.toFixed(1)}</label>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={currentColor.L}
              onChange={(e) => handleColorChange({ ...currentColor, L: parseFloat(e.target.value) })}
              disabled={disabled}
              className="w-full h-2 bg-gradient-to-r from-black to-white rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}

      {activeTab === 'lab' && allowManualInput && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">L*</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={colorInputs.L}
              onChange={(e) => handleLABInput('L', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">0-100</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">a*</label>
            <input
              type="number"
              min="-128"
              max="127"
              step="0.1"
              value={colorInputs.a}
              onChange={(e) => handleLABInput('a', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">-128 to 127</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">b*</label>
            <input
              type="number"
              min="-128"
              max="127"
              step="0.1"
              value={colorInputs.b}
              onChange={(e) => handleLABInput('b', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="text-xs text-gray-500 mt-1">-128 to 127</div>
          </div>
        </div>
      )}

      {activeTab === 'rgb' && allowManualInput && (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Red</label>
            <input
              type="number"
              min="0"
              max="255"
              value={colorInputs.r}
              onChange={(e) => handleRGBInput('r', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Green</label>
            <input
              type="number"
              min="0"
              max="255"
              value={colorInputs.g}
              onChange={(e) => handleRGBInput('g', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blue</label>
            <input
              type="number"
              min="0"
              max="255"
              value={colorInputs.b_rgb}
              onChange={(e) => handleRGBInput('b_rgb', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {activeTab === 'hex' && allowManualInput && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hex Color</label>
          <input
            type="text"
            value={colorInputs.hex}
            onChange={(e) => handleHexInput(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono"
            placeholder="#RRGGBB"
          />
        </div>
      )}

      {/* Accept Button */}
      {onColorAccepted && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onColorAccepted(currentColor)}
            disabled={disabled}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept Color
          </button>
        </div>
      )}

      {/* Color Accuracy Indicator */}
      {deltaE !== null && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Color Accuracy</span>
            <span className={`text-sm font-medium ${deltaEColor}`}>
              {deltaE <= 2 ? 'Excellent' : deltaE <= 4 ? 'Good' : 'Poor'}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                deltaE <= 2 ? 'bg-green-500' : deltaE <= 4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (5 - Math.min(5, deltaE)) * 20)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: ΔE ≤ 2.0 for optimal accuracy
          </div>
        </div>
      )}
    </div>
  );
}