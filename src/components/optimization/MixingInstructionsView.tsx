/**
 * Mixing Instructions View Sub-component
 * Step-by-step mixing instructions
 */

'use client';

import React from 'react';

interface MixingInstruction {
  step: number;
  action: string;
  description: string;
  details: string;
  paintId?: string;
  volume?: number;
  color?: string;
}

interface MixingInstructionsViewProps {
  instructions: MixingInstruction[];
}

export default function MixingInstructionsView({ instructions }: MixingInstructionsViewProps) {
  return (
    <div className="px-6 py-4">
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Mixing Instructions</h4>
        <p className="text-sm text-blue-700">
          Follow these steps carefully for accurate color reproduction.
          Use precise measurements and mix thoroughly between additions.
        </p>
      </div>

      <div className="space-y-4">
        {instructions.map((instruction, index) => (
          <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {Math.floor(instruction.step)}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{instruction.description}</div>
              <div className="text-sm text-gray-600 mt-1">{instruction.details}</div>
              {instruction.paintId && (
                <div
                  className="inline-block w-4 h-4 rounded border border-gray-300 mt-2"
                  style={{ backgroundColor: instruction.color }}
                />
              )}
            </div>
            {instruction.volume && (
              <div className="text-right">
                <div className="font-medium text-blue-600">{instruction.volume.toFixed(1)} ml</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <h5 className="font-medium text-yellow-900 mb-2">Important Notes</h5>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>Ensure all paints are well-stirred before measuring</li>
          <li>Use the same lighting conditions as your target assessment</li>
          <li>Allow mixed paint to settle for 2-3 minutes before final evaluation</li>
          <li>Test on a small area before full application</li>
          <li>Record any deviations from instructions for future reference</li>
        </ul>
      </div>
    </div>
  );
}
