
interface ColorValue {
  hex: string
  lab: { l: number; a: number; b: number }
}

function isColorValue(value: unknown): value is ColorValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'hex' in value &&
    'lab' in value
  )
}

function processColor(input: unknown) {
  if (isColorValue(input)) {
    // TypeScript knows 'input' is ColorValue here
    return input.hex
  }
  return null
}
