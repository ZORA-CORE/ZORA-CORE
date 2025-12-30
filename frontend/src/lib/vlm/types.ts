export interface VisualError {
  id: string;
  type: 'layout' | 'styling' | 'accessibility' | 'content' | 'interaction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: {
    selector?: string;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    screenshot?: string;
  };
  suggestedFix?: {
    type: 'tailwind_class' | 'component_prop' | 'structure' | 'content';
    original?: string;
    replacement?: string;
    file?: string;
    line?: number;
  };
  confidence: number;
  timestamp: Date;
}

export interface VLMAnalysisResult {
  success: boolean;
  errors: VisualError[];
  screenshot: string;
  analysisTime: number;
  modelUsed: string;
  pageUrl: string;
}

export interface SelfHealingResult {
  success: boolean;
  errorsDetected: number;
  errorsFixed: number;
  fixes: Array<{
    error: VisualError;
    applied: boolean;
    result?: string;
  }>;
  beforeScreenshot: string;
  afterScreenshot?: string;
  duration: number;
}

export interface VLMConfig {
  screenshotQuality: number;
  analysisTimeout: number;
  maxRetries: number;
  confidenceThreshold: number;
  autoFix: boolean;
  targetUrl: string;
}

export const DEFAULT_VLM_CONFIG: VLMConfig = {
  screenshotQuality: 80,
  analysisTimeout: 30000,
  maxRetries: 3,
  confidenceThreshold: 0.7,
  autoFix: false,
  targetUrl: 'http://localhost:3000/dashboard',
};

export interface TailwindClassFix {
  selector: string;
  originalClasses: string[];
  fixedClasses: string[];
  reason: string;
}

export interface ComponentFix {
  componentName: string;
  filePath: string;
  originalCode: string;
  fixedCode: string;
  reason: string;
}

export type FixType = TailwindClassFix | ComponentFix;

export interface HealingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  config: VLMConfig;
  iterations: Array<{
    iteration: number;
    analysis: VLMAnalysisResult;
    fixes: FixType[];
    success: boolean;
  }>;
  finalResult?: SelfHealingResult;
}
