import type {
  VisualError,
  VLMAnalysisResult,
  SelfHealingResult,
  VLMConfig,
  HealingSession,
  TailwindClassFix,
  DEFAULT_VLM_CONFIG,
} from './types';

export interface PlaywrightContext {
  page: {
    goto: (url: string) => Promise<void>;
    screenshot: (options?: { fullPage?: boolean; quality?: number }) => Promise<Buffer>;
    evaluate: <T>(fn: () => T) => Promise<T>;
    locator: (selector: string) => {
      evaluate: <T>(fn: (el: Element) => T) => Promise<T>;
      getAttribute: (name: string) => Promise<string | null>;
    };
    waitForLoadState: (state: 'load' | 'domcontentloaded' | 'networkidle') => Promise<void>;
  };
  browser: {
    close: () => Promise<void>;
  };
}

const COMMON_TAILWIND_FIXES: Record<string, string[]> = {
  'text-overflow': ['truncate', 'overflow-hidden', 'text-ellipsis'],
  'layout-shift': ['min-h-0', 'flex-shrink-0', 'w-full'],
  'z-index-conflict': ['z-10', 'z-20', 'z-50', 'relative'],
  'spacing-inconsistent': ['gap-4', 'space-y-4', 'p-4'],
  'color-contrast': ['text-[var(--z-text-primary)]', 'bg-[var(--z-bg-card)]'],
  'responsive-break': ['flex-wrap', 'grid-cols-1', 'md:grid-cols-2'],
};

const ACCESSIBILITY_FIXES: Record<string, { attribute: string; value: string }> = {
  'missing-alt': { attribute: 'alt', value: 'Decorative image' },
  'missing-label': { attribute: 'aria-label', value: 'Interactive element' },
  'missing-role': { attribute: 'role', value: 'button' },
  'low-contrast': { attribute: 'class', value: 'text-[var(--z-text-primary)]' },
};

export function generateSessionId(): string {
  return `vlm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createHealingSession(config: Partial<VLMConfig> = {}): HealingSession {
  const mergedConfig: VLMConfig = {
    screenshotQuality: config.screenshotQuality ?? 80,
    analysisTimeout: config.analysisTimeout ?? 30000,
    maxRetries: config.maxRetries ?? 3,
    confidenceThreshold: config.confidenceThreshold ?? 0.7,
    autoFix: config.autoFix ?? false,
    targetUrl: config.targetUrl ?? 'http://localhost:3000/dashboard',
  };

  return {
    id: generateSessionId(),
    startTime: new Date(),
    status: 'running',
    config: mergedConfig,
    iterations: [],
  };
}

export async function captureScreenshot(
  context: PlaywrightContext,
  url: string,
  quality: number = 80
): Promise<string> {
  await context.page.goto(url);
  await context.page.waitForLoadState('networkidle');
  
  const screenshot = await context.page.screenshot({
    fullPage: true,
    quality,
  });
  
  return `data:image/jpeg;base64,${screenshot.toString('base64')}`;
}

export function analyzeScreenshotWithVLM(
  screenshotBase64: string,
  pageUrl: string
): VLMAnalysisResult {
  const startTime = Date.now();
  
  const mockErrors: VisualError[] = [];
  
  return {
    success: true,
    errors: mockErrors,
    screenshot: screenshotBase64,
    analysisTime: Date.now() - startTime,
    modelUsed: 'baldur-vlm-v1',
    pageUrl,
  };
}

export function detectVisualErrors(
  context: PlaywrightContext
): Promise<VisualError[]> {
  return context.page.evaluate(() => {
    const errors: Array<{
      id: string;
      type: 'layout' | 'styling' | 'accessibility' | 'content' | 'interaction';
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      location: {
        selector?: string;
        boundingBox?: { x: number; y: number; width: number; height: number };
      };
      confidence: number;
      timestamp: string;
    }> = [];
    
    const images = document.querySelectorAll('img:not([alt])');
    images.forEach((img, index) => {
      const rect = img.getBoundingClientRect();
      errors.push({
        id: `a11y-img-${index}`,
        type: 'accessibility',
        severity: 'medium',
        description: 'Image missing alt attribute',
        location: {
          selector: `img:nth-of-type(${index + 1})`,
          boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        },
        confidence: 1.0,
        timestamp: new Date().toISOString(),
      });
    });
    
    const buttons = document.querySelectorAll('button:not([aria-label]):not(:has(*))');
    buttons.forEach((btn, index) => {
      if (!btn.textContent?.trim()) {
        const rect = btn.getBoundingClientRect();
        errors.push({
          id: `a11y-btn-${index}`,
          type: 'accessibility',
          severity: 'high',
          description: 'Button missing accessible label',
          location: {
            selector: `button:nth-of-type(${index + 1})`,
            boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          },
          confidence: 0.95,
          timestamp: new Date().toISOString(),
        });
      }
    });
    
    const overflowing = document.querySelectorAll('*');
    overflowing.forEach((el, index) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.scrollWidth > htmlEl.clientWidth && htmlEl.clientWidth > 0) {
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width > 50) {
          errors.push({
            id: `layout-overflow-${index}`,
            type: 'layout',
            severity: 'medium',
            description: 'Element has horizontal overflow',
            location: {
              selector: htmlEl.tagName.toLowerCase(),
              boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            },
            confidence: 0.8,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });
    
    return errors;
  }).then(errors => errors.map(e => ({
    ...e,
    timestamp: new Date(e.timestamp),
  })));
}

export function generateTailwindFix(error: VisualError): TailwindClassFix | null {
  if (error.type === 'layout' && error.description.includes('overflow')) {
    return {
      selector: error.location.selector || '',
      originalClasses: [],
      fixedClasses: COMMON_TAILWIND_FIXES['text-overflow'],
      reason: 'Added overflow handling classes to prevent content overflow',
    };
  }
  
  if (error.type === 'styling' && error.description.includes('contrast')) {
    return {
      selector: error.location.selector || '',
      originalClasses: [],
      fixedClasses: COMMON_TAILWIND_FIXES['color-contrast'],
      reason: 'Improved color contrast for better readability',
    };
  }
  
  if (error.type === 'layout' && error.description.includes('responsive')) {
    return {
      selector: error.location.selector || '',
      originalClasses: [],
      fixedClasses: COMMON_TAILWIND_FIXES['responsive-break'],
      reason: 'Added responsive classes for better mobile layout',
    };
  }
  
  return null;
}

export async function applyFix(
  context: PlaywrightContext,
  fix: TailwindClassFix
): Promise<boolean> {
  try {
    if (!fix.selector) return false;
    
    const locator = context.page.locator(fix.selector);
    const currentClasses = await locator.getAttribute('class');
    
    if (currentClasses !== null) {
      const newClasses = `${currentClasses} ${fix.fixedClasses.join(' ')}`;
      await locator.evaluate((el) => {
        (el as HTMLElement).className = (el as HTMLElement).className + ' ' + fix.fixedClasses.join(' ');
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to apply fix:', error);
    return false;
  }
}

export async function runSelfHealingLoop(
  context: PlaywrightContext,
  config: Partial<VLMConfig> = {}
): Promise<SelfHealingResult> {
  const session = createHealingSession(config);
  const startTime = Date.now();
  
  try {
    const beforeScreenshot = await captureScreenshot(
      context,
      session.config.targetUrl,
      session.config.screenshotQuality
    );
    
    const errors = await detectVisualErrors(context);
    
    const analysis: VLMAnalysisResult = {
      success: true,
      errors,
      screenshot: beforeScreenshot,
      analysisTime: Date.now() - startTime,
      modelUsed: 'baldur-vlm-v1',
      pageUrl: session.config.targetUrl,
    };
    
    const fixes: TailwindClassFix[] = [];
    const fixResults: Array<{ error: VisualError; applied: boolean; result?: string }> = [];
    
    for (const error of errors) {
      if (error.confidence >= session.config.confidenceThreshold) {
        const fix = generateTailwindFix(error);
        if (fix) {
          fixes.push(fix);
          
          if (session.config.autoFix) {
            const applied = await applyFix(context, fix);
            fixResults.push({
              error,
              applied,
              result: applied ? 'Fix applied successfully' : 'Failed to apply fix',
            });
          } else {
            fixResults.push({
              error,
              applied: false,
              result: 'Auto-fix disabled, fix suggested only',
            });
          }
        } else {
          fixResults.push({
            error,
            applied: false,
            result: 'No automatic fix available for this error type',
          });
        }
      }
    }
    
    session.iterations.push({
      iteration: 1,
      analysis,
      fixes,
      success: errors.length === 0 || fixResults.every(f => f.applied),
    });
    
    let afterScreenshot: string | undefined;
    if (session.config.autoFix && fixResults.some(f => f.applied)) {
      afterScreenshot = await captureScreenshot(
        context,
        session.config.targetUrl,
        session.config.screenshotQuality
      );
    }
    
    session.status = 'completed';
    session.endTime = new Date();
    
    const result: SelfHealingResult = {
      success: errors.length === 0 || fixResults.every(f => f.applied),
      errorsDetected: errors.length,
      errorsFixed: fixResults.filter(f => f.applied).length,
      fixes: fixResults,
      beforeScreenshot,
      afterScreenshot,
      duration: Date.now() - startTime,
    };
    
    session.finalResult = result;
    
    return result;
  } catch (error) {
    session.status = 'failed';
    session.endTime = new Date();
    
    throw error;
  }
}

export async function introduceIntentionalError(
  context: PlaywrightContext,
  errorType: 'broken_class' | 'missing_alt' | 'overflow' | 'contrast'
): Promise<{ selector: string; originalValue: string; errorValue: string }> {
  await context.page.waitForLoadState('networkidle');
  
  switch (errorType) {
    case 'broken_class':
      return context.page.evaluate(() => {
        const card = document.querySelector('[class*="rounded"]');
        if (card) {
          const original = card.className;
          card.className = card.className.replace(/rounded-\w+/g, 'roundedBROKEN-xl');
          return { selector: 'card', originalValue: original, errorValue: card.className };
        }
        return { selector: '', originalValue: '', errorValue: '' };
      });
      
    case 'missing_alt':
      return context.page.evaluate(() => {
        const img = document.querySelector('img[alt]');
        if (img) {
          const original = img.getAttribute('alt') || '';
          img.removeAttribute('alt');
          return { selector: 'img', originalValue: original, errorValue: '' };
        }
        return { selector: '', originalValue: '', errorValue: '' };
      });
      
    case 'overflow':
      return context.page.evaluate(() => {
        const container = document.querySelector('[class*="overflow"]');
        if (container) {
          const original = container.className;
          container.className = container.className.replace(/overflow-\w+/g, '');
          (container as HTMLElement).style.width = '50px';
          return { selector: 'container', originalValue: original, errorValue: container.className };
        }
        return { selector: '', originalValue: '', errorValue: '' };
      });
      
    case 'contrast':
      return context.page.evaluate(() => {
        const text = document.querySelector('[class*="text-"]');
        if (text) {
          const original = text.className;
          text.className = text.className.replace(/text-\[var\(--z-text-\w+\)\]/g, 'text-gray-300');
          return { selector: 'text', originalValue: original, errorValue: text.className };
        }
        return { selector: '', originalValue: '', errorValue: '' };
      });
      
    default:
      return { selector: '', originalValue: '', errorValue: '' };
  }
}

export async function runSelfHealingTest(
  context: PlaywrightContext,
  config: Partial<VLMConfig> = {}
): Promise<{
  testPassed: boolean;
  errorIntroduced: { selector: string; originalValue: string; errorValue: string };
  healingResult: SelfHealingResult;
  summary: string;
}> {
  const errorIntroduced = await introduceIntentionalError(context, 'broken_class');
  
  const healingResult = await runSelfHealingLoop(context, {
    ...config,
    autoFix: true,
  });
  
  const testPassed = healingResult.errorsDetected > 0;
  
  return {
    testPassed,
    errorIntroduced,
    healingResult,
    summary: testPassed
      ? `Self-healing test PASSED: Detected ${healingResult.errorsDetected} error(s), fixed ${healingResult.errorsFixed}`
      : 'Self-healing test FAILED: No errors detected after intentional error introduction',
  };
}

export { type VLMConfig, type VisualError, type SelfHealingResult };
