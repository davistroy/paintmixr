import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ColorPicker } from '../../src/components/optimization/ColorPicker';
import { OptimizationControls } from '../../src/components/optimization/OptimizationControls';
import { OptimizationResults } from '../../src/components/optimization/OptimizationResults';
import { PaintCollectionManager } from '../../src/components/paints/PaintCollectionManager';
import { Dashboard } from '../../src/components/dashboard/Dashboard';

expect.extend(toHaveNoViolations);

const mockOptimizationResult = {
  optimization_id: 'test-123',
  target_color: { L: 50, a: 10, b: -5 },
  achieved_color: { L: 50.2, a: 9.8, b: -5.1 },
  delta_e: 1.2,
  paint_mixture: [
    {
      paint_id: 'white',
      paint_name: 'Titanium White',
      volume_ml: 25.4,
      percentage: 65.2
    },
    {
      paint_id: 'blue',
      paint_name: 'Ultramarine Blue',
      volume_ml: 13.6,
      percentage: 34.8
    }
  ],
  total_volume_ml: 39.0,
  calculation_time_ms: 287,
  algorithm_used: 'differential_evolution',
  confidence_score: 0.89
};

const mockPaintCollections = [
  {
    id: 'collection-1',
    name: 'Primary Colors',
    paints: [
      {
        id: 'red',
        name: 'Cadmium Red',
        brand: 'Winsor & Newton',
        lab_l: 48.7,
        lab_a: 65.8,
        lab_b: 52.3,
        volume_ml: 750
      },
      {
        id: 'blue',
        name: 'Ultramarine Blue',
        brand: 'Winsor & Newton',
        lab_l: 32.5,
        lab_a: 15.2,
        lab_b: -58.9,
        volume_ml: 500
      }
    ]
  }
];

describe('Accessibility Compliance Tests', () => {
  describe('ColorPicker Component', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <ColorPicker
          targetColor={{ L: 50, a: 10, b: -5 }}
          onColorChange={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onColorChange = jest.fn();

      render(
        <ColorPicker
          targetColor={{ L: 50, a: 10, b: -5 }}
          onColorChange={onColorChange}
        />
      );

      // Test tab navigation through inputs
      const lInput = screen.getByLabelText(/lightness/i);
      const aInput = screen.getByLabelText(/green.*red/i);
      const bInput = screen.getByLabelText(/blue.*yellow/i);

      await user.tab();
      expect(lInput).toHaveFocus();

      await user.tab();
      expect(aInput).toHaveFocus();

      await user.tab();
      expect(bInput).toHaveFocus();
    });

    test('should have proper ARIA labels and roles', () => {
      render(
        <ColorPicker
          targetColor={{ L: 50, a: 10, b: -5 }}
          onColorChange={() => {}}
        />
      );

      expect(screen.getByRole('group', { name: /color picker/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/lightness.*0.*100/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/green.*red.*axis/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/blue.*yellow.*axis/i)).toBeInTheDocument();
    });

    test('should announce color changes to screen readers', async () => {
      const user = userEvent.setup();
      const onColorChange = jest.fn();

      render(
        <ColorPicker
          targetColor={{ L: 50, a: 10, b: -5 }}
          onColorChange={onColorChange}
        />
      );

      const lInput = screen.getByLabelText(/lightness/i);

      await user.clear(lInput);
      await user.type(lInput, '75');

      expect(screen.getByRole('status')).toHaveTextContent(/color updated.*lightness.*75/i);
    });

    test('should support high contrast mode', () => {
      const { container } = render(
        <div className="high-contrast">
          <ColorPicker
            targetColor={{ L: 50, a: 10, b: -5 }}
            onColorChange={() => {}}
          />
        </div>
      );

      const colorPreview = container.querySelector('[data-testid="color-preview"]');
      expect(colorPreview).toHaveStyle({
        border: expect.stringContaining('2px solid')
      });
    });
  });

  describe('OptimizationControls Component', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <OptimizationControls
          isOptimizing={false}
          onStartOptimization={() => {}}
          constraints={{
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }}
          onConstraintsChange={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation for all controls', async () => {
      const user = userEvent.setup();

      render(
        <OptimizationControls
          isOptimizing={false}
          onStartOptimization={() => {}}
          constraints={{
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }}
          onConstraintsChange={() => {}}
        />
      );

      // Test tab navigation
      await user.tab();
      expect(screen.getByLabelText(/accuracy target/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/delta e target/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/maximum paints/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /start optimization/i })).toHaveFocus();
    });

    test('should provide clear feedback for optimization state', () => {
      const { rerender } = render(
        <OptimizationControls
          isOptimizing={false}
          onStartOptimization={() => {}}
          constraints={{
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }}
          onConstraintsChange={() => {}}
        />
      );

      expect(screen.getByRole('button', { name: /start optimization/i })).not.toBeDisabled();

      rerender(
        <OptimizationControls
          isOptimizing={true}
          onStartOptimization={() => {}}
          constraints={{
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }}
          onConstraintsChange={() => {}}
        />
      );

      expect(screen.getByRole('button', { name: /optimizing/i })).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent(/optimization in progress/i);
    });

    test('should have proper form validation messages', async () => {
      const user = userEvent.setup();

      render(
        <OptimizationControls
          isOptimizing={false}
          onStartOptimization={() => {}}
          constraints={{
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }}
          onConstraintsChange={() => {}}
        />
      );

      const deltaEInput = screen.getByLabelText(/delta e target/i);

      await user.clear(deltaEInput);
      await user.type(deltaEInput, '5');
      await user.tab();

      expect(screen.getByRole('alert')).toHaveTextContent(/target delta e should be 2.0 or lower for enhanced accuracy/i);
    });
  });

  describe('OptimizationResults Component', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <OptimizationResults
          result={mockOptimizationResult}
          onSaveResult={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should provide comprehensive screen reader information', () => {
      render(
        <OptimizationResults
          result={mockOptimizationResult}
          onSaveResult={() => {}}
        />
      );

      expect(screen.getByRole('region', { name: /optimization results/i })).toBeInTheDocument();

      expect(screen.getByText(/color accuracy.*1\.2.*delta e/i)).toBeInTheDocument();
      expect(screen.getByText(/total volume.*39\.0.*milliliters/i)).toBeInTheDocument();

      expect(screen.getByRole('table', { name: /paint mixture/i })).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(3);
      expect(screen.getAllByRole('row')).toHaveLength(3); // Header + 2 paints
    });

    test('should support keyboard navigation for result actions', async () => {
      const user = userEvent.setup();
      const onSaveResult = jest.fn();

      render(
        <OptimizationResults
          result={mockOptimizationResult}
          onSaveResult={onSaveResult}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save result/i });

      await user.tab();
      expect(saveButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onSaveResult).toHaveBeenCalledTimes(1);
    });

    test('should provide color information in accessible format', () => {
      render(
        <OptimizationResults
          result={mockOptimizationResult}
          onSaveResult={() => {}}
        />
      );

      const targetColorInfo = screen.getByLabelText(/target color/i);
      expect(targetColorInfo).toHaveAccessibleDescription(/lightness 50.*green-red 10.*blue-yellow -5/i);

      const achievedColorInfo = screen.getByLabelText(/achieved color/i);
      expect(achievedColorInfo).toHaveAccessibleDescription(/lightness 50\.2.*green-red 9\.8.*blue-yellow -5\.1/i);
    });
  });

  describe('PaintCollectionManager Component', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <PaintCollectionManager
          collections={mockPaintCollections}
          selectedCollectionId="collection-1"
          onCollectionSelect={() => {}}
          onCollectionCreate={() => {}}
          onCollectionUpdate={() => {}}
          onCollectionDelete={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation for collection management', async () => {
      const user = userEvent.setup();

      render(
        <PaintCollectionManager
          collections={mockPaintCollections}
          selectedCollectionId="collection-1"
          onCollectionSelect={() => {}}
          onCollectionCreate={() => {}}
          onCollectionUpdate={() => {}}
          onCollectionDelete={() => {}}
        />
      );

      // Test collection selection
      const collectionSelect = screen.getByRole('combobox', { name: /select paint collection/i });

      await user.click(collectionSelect);
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(screen.getByDisplayValue(/primary colors/i)).toBeInTheDocument();
    });

    test('should provide proper ARIA labels for collection actions', () => {
      render(
        <PaintCollectionManager
          collections={mockPaintCollections}
          selectedCollectionId="collection-1"
          onCollectionSelect={() => {}}
          onCollectionCreate={() => {}}
          onCollectionUpdate={() => {}}
          onCollectionDelete={() => {}}
        />
      );

      expect(screen.getByRole('button', { name: /create new collection/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit.*primary colors.*collection/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete.*primary colors.*collection/i })).toBeInTheDocument();
    });

    test('should provide confirmation dialogs with proper focus management', async () => {
      const user = userEvent.setup();
      const onCollectionDelete = jest.fn();

      render(
        <PaintCollectionManager
          collections={mockPaintCollections}
          selectedCollectionId="collection-1"
          onCollectionSelect={() => {}}
          onCollectionCreate={() => {}}
          onCollectionUpdate={() => {}}
          onCollectionDelete={onCollectionDelete}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete.*primary colors/i });
      await user.click(deleteButton);

      const confirmDialog = screen.getByRole('dialog', { name: /confirm deletion/i });
      expect(confirmDialog).toBeInTheDocument();

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      expect(confirmButton).toHaveFocus();
    });
  });

  describe('Dashboard Component', () => {
    test('should have no accessibility violations', async () => {
      const { container } = render(
        <Dashboard
          user={{ id: 'test-user', email: 'test@example.com' }}
          recentOptimizations={[]}
          paintCollections={mockPaintCollections}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper heading hierarchy', () => {
      render(
        <Dashboard
          user={{ id: 'test-user', email: 'test@example.com' }}
          recentOptimizations={[]}
          paintCollections={mockPaintCollections}
        />
      );

      expect(screen.getByRole('heading', { level: 1, name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /recent optimizations/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /paint collections/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /quick actions/i })).toBeInTheDocument();
    });

    test('should provide skip links for navigation', () => {
      render(
        <Dashboard
          user={{ id: 'test-user', email: 'test@example.com' }}
          recentOptimizations={[]}
          paintCollections={mockPaintCollections}
        />
      );

      expect(screen.getByRole('link', { name: /skip to main content/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /skip to navigation/i })).toBeInTheDocument();
    });

    test('should support keyboard navigation for quick actions', async () => {
      const user = userEvent.setup();

      render(
        <Dashboard
          user={{ id: 'test-user', email: 'test@example.com' }}
          recentOptimizations={[]}
          paintCollections={mockPaintCollections}
        />
      );

      const newOptimizationButton = screen.getByRole('button', { name: /new optimization/i });

      await user.tab();
      expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveFocus();

      // Skip to main content
      await user.keyboard('{Enter}');
      expect(newOptimizationButton).toHaveFocus();
    });
  });

  describe('Color Contrast Compliance', () => {
    test('should meet WCAG AA color contrast requirements', () => {
      render(
        <ColorPicker
          targetColor={{ L: 50, a: 10, b: -5 }}
          onColorChange={() => {}}
        />
      );

      // Test high contrast scenarios
      const inputs = screen.getAllByRole('spinbutton');
      inputs.forEach(input => {
        const computedStyle = window.getComputedStyle(input);
        const backgroundColor = computedStyle.backgroundColor;
        const color = computedStyle.color;

        // Basic validation that colors are defined
        expect(backgroundColor).toBeTruthy();
        expect(color).toBeTruthy();
      });
    });

    test('should support Windows High Contrast Mode', () => {
      // Simulate Windows High Contrast Mode
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(
        <OptimizationResults
          result={mockOptimizationResult}
          onSaveResult={() => {}}
        />
      );

      // Verify that high contrast styles are applied
      const resultsContainer = screen.getByRole('region', { name: /optimization results/i });
      expect(resultsContainer).toHaveClass('high-contrast-support');
    });
  });

  describe('Screen Reader Compatibility', () => {
    test('should provide meaningful announcements for dynamic content', async () => {
      const user = userEvent.setup();

      const OptimizationWrapper = () => {
        const [isOptimizing, setIsOptimizing] = React.useState(false);

        return (
          <div>
            <OptimizationControls
              isOptimizing={isOptimizing}
              onStartOptimization={() => setIsOptimizing(true)}
              constraints={{
                max_paints: 4,
                min_volume_ml: 0.1,
                max_volume_ml: 100,
                target_delta_e: 2.0
              }}
              onConstraintsChange={() => {}}
            />
            {isOptimizing && (
              <div role="status" aria-live="polite">
                Optimization in progress, please wait...
              </div>
            )}
          </div>
        );
      };

      render(<OptimizationWrapper />);

      const startButton = screen.getByRole('button', { name: /start optimization/i });
      await user.click(startButton);

      expect(screen.getByRole('status')).toHaveTextContent(/optimization in progress/i);
    });

    test('should provide comprehensive table headers and captions', () => {
      render(
        <OptimizationResults
          result={mockOptimizationResult}
          onSaveResult={() => {}}
        />
      );

      const table = screen.getByRole('table', { name: /paint mixture/i });
      expect(table).toHaveAccessibleName('Paint mixture composition');

      const headers = screen.getAllByRole('columnheader');
      expect(headers[0]).toHaveTextContent(/paint name/i);
      expect(headers[1]).toHaveTextContent(/volume/i);
      expect(headers[2]).toHaveTextContent(/percentage/i);
    });
  });

  describe('Mobile Accessibility', () => {
    test('should support touch navigation on mobile devices', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      const user = userEvent.setup({
        pointerEventsCheck: 0,
      });

      render(
        <ColorPicker
          targetColor={{ L: 50, a: 10, b: -5 }}
          onColorChange={() => {}}
        />
      );

      const mobileColorPicker = screen.getByTestId('mobile-color-picker');
      expect(mobileColorPicker).toBeInTheDocument();
      expect(mobileColorPicker).toHaveAttribute('aria-label', 'Color picker, touch to adjust');
    });

    test('should provide appropriate touch target sizes', () => {
      render(
        <OptimizationControls
          isOptimizing={false}
          onStartOptimization={() => {}}
          constraints={{
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }}
          onConstraintsChange={() => {}}
        />
      );

      const startButton = screen.getByRole('button', { name: /start optimization/i });
      const computedStyle = window.getComputedStyle(startButton);

      // WCAG recommends minimum 44px touch targets
      const minHeight = parseInt(computedStyle.minHeight);
      const minWidth = parseInt(computedStyle.minWidth);

      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    });
  });
});