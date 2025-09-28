# Paint Mixer App - Color Palette Specification

## Design Philosophy

This color palette is specifically designed for a paint mixing application where **color accuracy and perception are paramount**. The palette prioritizes neutral backgrounds and carefully selected accent colors that won't interfere with paint color evaluation while maintaining excellent usability across desktop and mobile platforms.

## Primary Color Palette

### Neutral Foundation
These colors form the backbone of the interface, providing clean, non-interfering backgrounds for color work.

```css
/* Background Colors */
--bg-primary: #FAFAFA;        /* Main background - warm white */
--bg-secondary: #F5F5F5;      /* Secondary surfaces */
--bg-tertiary: #EEEEEE;       /* Subtle elevation */
--bg-panel: #FFFFFF;          /* Cards, panels, input fields */
--bg-elevated: #FFFFFF;       /* Modals, dropdowns */

/* Dark Mode Alternatives */
--bg-dark-primary: #1A1A1A;   /* Main dark background */
--bg-dark-secondary: #2D2D2D; /* Secondary dark surfaces */
--bg-dark-tertiary: #3A3A3A;  /* Dark elevation */
--bg-dark-panel: #252525;     /* Dark cards/panels */
```

### Text Colors
Carefully calibrated for readability without color cast that could affect paint color perception.

```css
/* Light Mode Text */
--text-primary: #2C2C2C;      /* Primary text - true neutral */
--text-secondary: #5A5A5A;    /* Secondary text */
--text-muted: #8A8A8A;        /* Muted text, labels */
--text-disabled: #B8B8B8;     /* Disabled states */

/* Dark Mode Text */
--text-dark-primary: #F0F0F0;   /* Primary dark text */
--text-dark-secondary: #C0C0C0; /* Secondary dark text */
--text-dark-muted: #909090;     /* Muted dark text */
--text-dark-disabled: #606060;  /* Disabled dark text */
```

## Accent Colors

### Primary Action Color
A carefully chosen blue that provides clear UI functionality without interfering with paint color perception.

```css
--primary: #2563EB;           /* Primary blue - clear, professional */
--primary-hover: #1D4ED8;     /* Hover state */
--primary-pressed: #1E40AF;   /* Pressed state */
--primary-light: #DBEAFE;     /* Light variant for backgrounds */
--primary-dark: #1E3A8A;      /* Dark variant */
```

### Secondary Actions
Neutral accent for secondary buttons and less prominent actions.

```css
--secondary: #6B7280;         /* Neutral gray */
--secondary-hover: #4B5563;   /* Hover state */
--secondary-light: #F3F4F6;   /* Light background */
```

### Functional Colors
These colors provide clear feedback without competing with paint colors.

```css
/* Success - Subtle green */
--success: #059669;           /* Success actions, confirmations */
--success-light: #D1FAE5;     /* Success backgrounds */
--success-dark: #047857;      /* Dark success variant */

/* Warning - Amber for attention */
--warning: #D97706;           /* Warning states */
--warning-light: #FEF3C7;     /* Warning backgrounds */
--warning-dark: #B45309;      /* Dark warning variant */

/* Error - Subtle red */
--error: #DC2626;             /* Error states */
--error-light: #FEE2E2;       /* Error backgrounds */
--error-dark: #B91C1C;        /* Dark error variant */

/* Info - Neutral blue-gray */
--info: #0891B2;              /* Informational elements */
--info-light: #E0F7FA;        /* Info backgrounds */
--info-dark: #0E7490;         /* Dark info variant */
```

## Border and Separator Colors

```css
/* Borders */
--border-primary: #E5E5E5;    /* Primary borders */
--border-secondary: #D4D4D4;  /* Secondary borders */
--border-muted: #F0F0F0;      /* Subtle separators */
--border-focus: #2563EB;      /* Focus states */

/* Dark Mode Borders */
--border-dark-primary: #404040;   /* Dark primary borders */
--border-dark-secondary: #525252; /* Dark secondary borders */
--border-dark-muted: #363636;     /* Dark subtle separators */
```

## Application-Specific Colors

### Color Workspace
Special considerations for areas where paint colors are displayed and manipulated.

```css
/* Color Display Backgrounds */
--color-workspace: #FFFFFF;     /* Pure white for color accuracy */
--color-workspace-border: #CCCCCC; /* Neutral border for color swatches */
--color-workspace-shadow: rgba(0, 0, 0, 0.1); /* Subtle shadow */

/* Color Picker Elements */
--picker-background: #FAFAFA;   /* Color picker container */
--picker-handle: #FFFFFF;       /* Color picker handles */
--picker-handle-border: #CCCCCC; /* Handle borders */
```

### History and Storage UI
Colors for the mixing history and saved combinations interface.

```css
--history-card: #FFFFFF;        /* History item backgrounds */
--history-border: #E5E5E5;      /* History card borders */
--history-hover: #F8F9FA;       /* Hover state for history items */
--timestamp: #6B7280;           /* Timestamp text color */
--label-bg: #F3F4F6;            /* Background for custom labels */
```

## Semantic Color Applications

### Button Styles
```css
/* Primary Button */
.btn-primary {
  background: var(--primary);
  color: white;
  border: 1px solid var(--primary);
}

/* Secondary Button */
.btn-secondary {
  background: var(--bg-panel);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

/* Success Button */
.btn-success {
  background: var(--success);
  color: white;
  border: 1px solid var(--success);
}
```

### Input Fields
```css
.input-field {
  background: var(--bg-panel);
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
}

.input-field:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--primary-light);
}
```

### Cards and Panels
```css
.card {
  background: var(--bg-panel);
  border: 1px solid var(--border-muted);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

## Mobile Considerations

### Touch Targets
- Maintain minimum 44px touch targets
- Use `--primary` color for all primary touch actions
- Ensure sufficient contrast ratios (4.5:1 minimum for normal text)

### Responsive Adjustments
```css
@media (max-width: 768px) {
  :root {
    /* Slightly larger text on mobile for readability */
    --text-base-size: 16px;
    
    /* Adjusted spacing for touch interfaces */
    --touch-target-min: 44px;
  }
}
```

## Accessibility Guidelines

### Color Contrast Ratios
- **Text on background**: Minimum 4.5:1 ratio
- **Large text**: Minimum 3:1 ratio  
- **UI components**: Minimum 3:1 ratio
- **Focus indicators**: Clearly visible with `--border-focus`

### Color Blindness Considerations
- Primary interactions don't rely solely on color
- Use icons and text labels alongside color coding
- Test with color blindness simulators

## Dark Mode Implementation

### CSS Custom Properties Toggle
```css
/* Light mode (default) */
:root {
  --bg: var(--bg-primary);
  --text: var(--text-primary);
  /* ... other mappings */
}

/* Dark mode */
[data-theme="dark"] {
  --bg: var(--bg-dark-primary);
  --text: var(--text-dark-primary);
  /* ... other dark mappings */
}
```

## Implementation Notes

### Color Accuracy Priority
1. **Workspace areas** should use pure white (`#FFFFFF`) backgrounds
2. **Color swatches** should have neutral gray borders to avoid color contamination
3. **UI elements** should use the neutral palette to avoid influencing color perception

### Performance Considerations
- Use CSS custom properties for easy theme switching
- Minimize color variations to reduce CSS bundle size
- Consider using CSS-in-JS for dynamic color calculations

### Testing Recommendations
1. Test color accuracy on multiple display types
2. Validate with professional color accuracy tools
3. Test under different lighting conditions
4. Verify accessibility with screen readers and contrast checkers

## File Structure Suggestion

```
/styles
  /colors
    - palette.css         (Main color definitions)
    - themes.css          (Light/dark theme mappings)
    - components.css      (Component-specific color applications)
  /utilities
    - color-utils.css     (Color utility classes)
```

This palette provides a professional, color-accurate foundation for your paint mixing application while maintaining excellent usability across all device types.