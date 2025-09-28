/**
 * TypeScript type definitions for Paint Mixing Color App
 * Generated from API specification - keep in sync with api-spec.yaml
 */

// ==================== Core Types ====================

export interface ColorValue {
  hex: string; // #RRGGBB format
  lab: {
    l: number; // 0-100
    a: number; // -128 to 127
    b: number; // -128 to 127
  };
}

export interface PaintColor {
  id: string;
  name: string;
  brand: string;
  hex_color: string;
  lab: {
    l: number;
    a: number;
    b: number;
  };
  // Kubelka-Munk properties (not exposed in API but used internally)
  k_coefficient?: number;
  s_coefficient?: number;
  opacity: number; // 0-1
  tinting_strength: number; // 0-1
  density?: number; // g/ml
  cost_per_ml?: number;
}

export interface MixingFormula {
  total_volume_ml: number; // 100-1000
  paint_ratios: PaintRatio[];
  mixing_order?: string[]; // Recommended mixing sequence
}

export interface PaintRatio {
  paint_id: string;
  paint_name?: string; // For display purposes
  volume_ml: number;
  percentage: number; // 0-100
}

// ==================== Session Types ====================

export type SessionType = 'color_matching' | 'ratio_prediction';
export type InputMethod = 'hex' | 'picker' | 'image';
export type OptimizationPreference = 'accuracy' | 'cost' | 'simplicity';
export type ExtractionType = 'pixel' | 'average' | 'dominant';

export interface MixingSession {
  id: string;
  session_type: SessionType;
  custom_label?: string;
  is_favorite: boolean;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface MixingSessionDetail extends MixingSession {
  input_method: InputMethod;
  target_color?: ColorValue;
  calculated_color?: ColorValue;
  delta_e?: number; // CIE 2000 Delta E
  formula?: MixingFormula;
  notes?: string;
  image_url?: string;
}

// ==================== API Request Types ====================

export interface ColorMatchRequest {
  target_color: ColorValue;
  total_volume_ml: number; // 100-1000
  optimization_preference?: OptimizationPreference;
}

export interface RatioPredictRequest {
  paint_ratios: Array<{
    paint_id: string;
    volume_ml: number;
  }>;
}

export interface CreateSessionRequest {
  session_type: SessionType;
  input_method: InputMethod;
  target_color?: ColorValue;
  calculated_color?: ColorValue;
  formula?: MixingFormula;
  delta_e?: number;
  custom_label?: string;
  notes?: string;
  image_url?: string;
}

export interface UpdateSessionRequest {
  custom_label?: string;
  notes?: string;
  is_favorite?: boolean;
}

export interface ImageExtractRequest {
  image: File;
  x: number;
  y: number;
  extraction_type?: ExtractionType;
}

// ==================== API Response Types ====================

export interface ColorMatchResponse {
  formula: MixingFormula;
  achieved_color: ColorValue;
  delta_e: number;
  alternatives?: Array<{
    formula: MixingFormula;
    delta_e: number;
    description: string;
  }>;
}

export interface ColorMatchErrorResponse {
  error: string;
  message: string;
  closest_achievable?: ColorValue;
  min_delta_e?: number;
}

export interface RatioPredictResponse {
  resulting_color: ColorValue;
  total_volume_ml: number;
  formula: MixingFormula;
}

export interface SessionListResponse {
  sessions: MixingSession[];
  total_count: number;
  has_more: boolean;
}

export interface PaintColorsResponse {
  paints: PaintColor[];
}

export interface ExtractedColorResponse {
  color: ColorValue;
  extraction_type: ExtractionType;
  image_dimensions: {
    width: number;
    height: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any>;
}

// ==================== Query Parameters ====================

export interface SessionListParams {
  limit?: number; // 1-100, default 20
  offset?: number; // default 0
  favorites_only?: boolean; // default false
  session_type?: SessionType;
}

// ==================== Form Types ====================

export interface ColorInputForm {
  method: InputMethod;
  hex_value?: string;
  picker_value?: string;
  image_file?: File;
  image_coordinates?: { x: number; y: number };
  extraction_type?: ExtractionType;
}

export interface MixingRatioForm {
  paint_ratios: Array<{
    paint_id: string;
    volume_ml: string; // String for form input, convert to number
  }>;
  total_volume_ml: string;
}

export interface SessionSaveForm {
  custom_label?: string;
  notes?: string;
  is_favorite?: boolean;
}

// ==================== Component Props ====================

export interface ColorDisplayProps {
  color: ColorValue;
  size?: 'sm' | 'md' | 'lg';
  showHex?: boolean;
  showLab?: boolean;
  className?: string;
}

export interface PaintRatioDisplayProps {
  formula: MixingFormula;
  paints: PaintColor[];
  showPercentages?: boolean;
  className?: string;
}

export interface ColorAccuracyIndicatorProps {
  delta_e: number;
  className?: string;
}

export interface SessionCardProps {
  session: MixingSession;
  onClick?: (session: MixingSession) => void;
  onFavoriteToggle?: (sessionId: string, isFavorite: boolean) => void;
  onDelete?: (sessionId: string) => void;
  className?: string;
}

// ==================== Hook Return Types ====================

export interface UseColorMatchingReturn {
  calculateMatch: (request: ColorMatchRequest) => Promise<ColorMatchResponse>;
  predictColor: (request: RatioPredictRequest) => Promise<RatioPredictResponse>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export interface UseSessionsReturn {
  sessions: MixingSession[];
  totalCount: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  loadSessions: (params?: SessionListParams) => Promise<void>;
  loadMore: () => Promise<void>;
  createSession: (session: CreateSessionRequest) => Promise<MixingSession>;
  updateSession: (id: string, updates: UpdateSessionRequest) => Promise<MixingSession>;
  deleteSession: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface UseImageProcessingReturn {
  extractColor: (request: ImageExtractRequest) => Promise<ExtractedColorResponse>;
  isProcessing: boolean;
  error: string | null;
  previewUrl?: string;
  clearPreview: () => void;
}

export interface UsePaintColorsReturn {
  paints: PaintColor[];
  isLoading: boolean;
  error: string | null;
  getPaintById: (id: string) => PaintColor | undefined;
  getPaintsByBrand: (brand: string) => PaintColor[];
  searchPaints: (query: string) => PaintColor[];
}

// ==================== Utility Types ====================

export type ColorSpace = 'rgb' | 'lab' | 'xyz';
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'lab';

export interface ColorConversion {
  from: ColorSpace;
  to: ColorSpace;
  value: number[];
}

export interface DeltaECalculation {
  color1: ColorValue;
  color2: ColorValue;
  method: 'cie76' | 'cie94' | 'cie2000';
  result: number;
}

// ==================== Database Types (for Supabase) ====================

export interface Database {
  public: {
    Tables: {
      mixing_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: SessionType;
          target_color_hex?: string;
          target_color_lab_l?: number;
          target_color_lab_a?: number;
          target_color_lab_b?: number;
          input_method: InputMethod;
          image_url?: string;
          calculated_color_hex?: string;
          calculated_color_lab_l?: number;
          calculated_color_lab_a?: number;
          calculated_color_lab_b?: number;
          delta_e?: number;
          custom_label?: string;
          notes?: string;
          is_favorite: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mixing_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['mixing_sessions']['Insert']>;
      };
      mixing_formulas: {
        Row: {
          id: string;
          session_id: string;
          total_volume_ml: number;
          mixing_order?: string[];
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mixing_formulas']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['mixing_formulas']['Insert']>;
      };
      formula_items: {
        Row: {
          id: string;
          formula_id: string;
          paint_id: string;
          volume_ml: number;
          percentage: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['formula_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['formula_items']['Insert']>;
      };
    };
  };
}

// ==================== Constants ====================

export const COLOR_ACCURACY_LEVELS = {
  PERFECT: 0,
  EXCELLENT: 1,
  VERY_GOOD: 2,
  GOOD: 3,
  ACCEPTABLE: 4,
  NOTICEABLE: 6,
  POOR: 10,
} as const;

export const VOLUME_CONSTRAINTS = {
  MIN: 100,
  MAX: 1000,
} as const;

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// ==================== Type Guards ====================

export function isColorValue(value: any): value is ColorValue {
  return (
    typeof value === 'object' &&
    typeof value.hex === 'string' &&
    value.hex.match(/^#[0-9A-Fa-f]{6}$/) &&
    typeof value.lab === 'object' &&
    typeof value.lab.l === 'number' &&
    typeof value.lab.a === 'number' &&
    typeof value.lab.b === 'number'
  );
}

export function isPaintColor(value: any): value is PaintColor {
  return (
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.brand === 'string' &&
    typeof value.hex_color === 'string' &&
    typeof value.opacity === 'number' &&
    typeof value.tinting_strength === 'number'
  );
}

export function isMixingFormula(value: any): value is MixingFormula {
  return (
    typeof value === 'object' &&
    typeof value.total_volume_ml === 'number' &&
    Array.isArray(value.paint_ratios) &&
    value.paint_ratios.every((ratio: any) =>
      typeof ratio.paint_id === 'string' &&
      typeof ratio.volume_ml === 'number' &&
      typeof ratio.percentage === 'number'
    )
  );
}