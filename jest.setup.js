import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock Canvas API
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Array(4) })),
  putImageData: jest.fn(),
  createImageData: jest.fn(() => []),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
}))

// Mock File and FileReader for image processing tests
global.File = class MockFile {
  constructor(bits, name, options = {}) {
    this.bits = bits
    this.name = name
    this.type = options.type || ''
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0)
  }
}

global.FileReader = class MockFileReader {
  constructor() {
    this.result = null
    this.error = null
    this.readyState = 0
    this.onload = null
    this.onerror = null
  }

  readAsDataURL() {
    this.readyState = 2
    this.result = 'data:image/png;base64,mock-data'
    if (this.onload) this.onload()
  }
}

// Mock matchMedia for accessibility and responsive testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock focus management for accessibility testing
let focusedElement = null;

Object.defineProperty(document, 'activeElement', {
  get: () => focusedElement,
  configurable: true,
});

HTMLElement.prototype.focus = jest.fn().mockImplementation(function() {
  focusedElement = this;
});

HTMLElement.prototype.blur = jest.fn().mockImplementation(function() {
  if (focusedElement === this) {
    focusedElement = null;
  }
});

// Setup accessibility testing defaults
global.axeConfig = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'aria-labels': { enabled: true },
    'focus-management': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
};

// Clean up after each test
afterEach(() => {
  focusedElement = null;
  jest.clearAllMocks();
});