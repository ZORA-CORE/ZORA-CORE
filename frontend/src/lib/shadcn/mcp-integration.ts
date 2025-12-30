export interface ShadcnComponent {
  name: string;
  description: string;
  category: 'layout' | 'form' | 'data-display' | 'feedback' | 'navigation' | 'overlay';
  variants: string[];
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: string;
    description: string;
  }>;
  accessibility: {
    ariaSupport: boolean;
    keyboardNav: boolean;
    screenReaderFriendly: boolean;
    wcagLevel: 'A' | 'AA' | 'AAA';
  };
  dependencies: string[];
  installCommand: string;
}

export interface ShadcnMCPConfig {
  serverUrl: string;
  apiKey?: string;
  autoInstall: boolean;
  validateAccessibility: boolean;
  targetWcagLevel: 'A' | 'AA' | 'AAA';
  themeCustomization: boolean;
}

export const DEFAULT_SHADCN_CONFIG: ShadcnMCPConfig = {
  serverUrl: 'https://shadcn-mcp.vercel.app',
  autoInstall: true,
  validateAccessibility: true,
  targetWcagLevel: 'AA',
  themeCustomization: true,
};

export interface ComponentLookupResult {
  found: boolean;
  component?: ShadcnComponent;
  alternatives?: ShadcnComponent[];
  installInstructions?: string;
}

export interface ComponentInstallResult {
  success: boolean;
  componentName: string;
  filesCreated: string[];
  dependenciesInstalled: string[];
  error?: string;
}

export interface ThemeCustomization {
  colors: Record<string, string>;
  borderRadius: string;
  fontFamily: string;
  spacing: Record<string, string>;
}

const ZORA_THEME: ThemeCustomization = {
  colors: {
    'climate-green': '#10B981',
    'ocean-blue': '#0EA5E9',
    'solar-gold': '#F59E0B',
    'earth-brown': '#78716C',
    'sky-light': '#E0F2FE',
    'forest-dark': '#064E3B',
  },
  borderRadius: '0.75rem',
  fontFamily: 'var(--font-geist-sans)',
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
};

const CORE_COMPONENTS: ShadcnComponent[] = [
  {
    name: 'Button',
    description: 'Interactive button component with multiple variants',
    category: 'form',
    variants: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    props: [
      { name: 'variant', type: 'string', required: false, default: 'default', description: 'Visual style variant' },
      { name: 'size', type: 'string', required: false, default: 'default', description: 'Button size' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disable interaction' },
    ],
    accessibility: { ariaSupport: true, keyboardNav: true, screenReaderFriendly: true, wcagLevel: 'AA' },
    dependencies: ['@radix-ui/react-slot'],
    installCommand: 'npx shadcn-ui@latest add button',
  },
  {
    name: 'Card',
    description: 'Container component for grouping related content',
    category: 'layout',
    variants: ['default', 'bordered', 'elevated'],
    props: [
      { name: 'className', type: 'string', required: false, description: 'Additional CSS classes' },
    ],
    accessibility: { ariaSupport: true, keyboardNav: false, screenReaderFriendly: true, wcagLevel: 'AA' },
    dependencies: [],
    installCommand: 'npx shadcn-ui@latest add card',
  },
  {
    name: 'Dialog',
    description: 'Modal dialog component for focused interactions',
    category: 'overlay',
    variants: ['default', 'sheet'],
    props: [
      { name: 'open', type: 'boolean', required: false, description: 'Controlled open state' },
      { name: 'onOpenChange', type: 'function', required: false, description: 'Callback when open state changes' },
    ],
    accessibility: { ariaSupport: true, keyboardNav: true, screenReaderFriendly: true, wcagLevel: 'AA' },
    dependencies: ['@radix-ui/react-dialog'],
    installCommand: 'npx shadcn-ui@latest add dialog',
  },
  {
    name: 'Input',
    description: 'Text input component for form data entry',
    category: 'form',
    variants: ['default', 'error', 'success'],
    props: [
      { name: 'type', type: 'string', required: false, default: 'text', description: 'Input type' },
      { name: 'placeholder', type: 'string', required: false, description: 'Placeholder text' },
      { name: 'disabled', type: 'boolean', required: false, default: 'false', description: 'Disable input' },
    ],
    accessibility: { ariaSupport: true, keyboardNav: true, screenReaderFriendly: true, wcagLevel: 'AA' },
    dependencies: [],
    installCommand: 'npx shadcn-ui@latest add input',
  },
  {
    name: 'Badge',
    description: 'Small status indicator component',
    category: 'data-display',
    variants: ['default', 'secondary', 'destructive', 'outline'],
    props: [
      { name: 'variant', type: 'string', required: false, default: 'default', description: 'Visual style variant' },
    ],
    accessibility: { ariaSupport: true, keyboardNav: false, screenReaderFriendly: true, wcagLevel: 'AA' },
    dependencies: [],
    installCommand: 'npx shadcn-ui@latest add badge',
  },
];

export class ShadcnMCPClient {
  private config: ShadcnMCPConfig;
  private componentCache: Map<string, ShadcnComponent>;

  constructor(config: Partial<ShadcnMCPConfig> = {}) {
    this.config = { ...DEFAULT_SHADCN_CONFIG, ...config };
    this.componentCache = new Map();
    
    CORE_COMPONENTS.forEach(comp => {
      this.componentCache.set(comp.name.toLowerCase(), comp);
    });
  }

  async lookupComponent(name: string): Promise<ComponentLookupResult> {
    const normalizedName = name.toLowerCase();
    
    const cached = this.componentCache.get(normalizedName);
    if (cached) {
      return {
        found: true,
        component: cached,
        installInstructions: cached.installCommand,
      };
    }

    const alternatives = CORE_COMPONENTS.filter(c => 
      c.name.toLowerCase().includes(normalizedName) ||
      c.description.toLowerCase().includes(normalizedName)
    );

    return {
      found: false,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
    };
  }

  async installComponent(name: string): Promise<ComponentInstallResult> {
    const lookup = await this.lookupComponent(name);
    
    if (!lookup.found || !lookup.component) {
      return {
        success: false,
        componentName: name,
        filesCreated: [],
        dependenciesInstalled: [],
        error: `Component "${name}" not found in Shadcn registry`,
      };
    }

    const component = lookup.component;

    return {
      success: true,
      componentName: component.name,
      filesCreated: [`src/components/ui/${component.name.toLowerCase()}.tsx`],
      dependenciesInstalled: component.dependencies,
    };
  }

  async generateVariant(
    componentName: string,
    variantName: string,
    customization: Partial<ThemeCustomization> = {}
  ): Promise<{ success: boolean; code?: string; error?: string }> {
    const lookup = await this.lookupComponent(componentName);
    
    if (!lookup.found || !lookup.component) {
      return {
        success: false,
        error: `Component "${componentName}" not found`,
      };
    }

    const theme = { ...ZORA_THEME, ...customization };
    
    const variantCode = `
// Auto-generated ${variantName} variant for ${componentName}
// Theme: ZORA Climate-First Design System

import { cva } from 'class-variance-authority';

export const ${componentName.toLowerCase()}Variants = cva(
  'inline-flex items-center justify-center rounded-[${theme.borderRadius}] font-medium transition-colors',
  {
    variants: {
      variant: {
        ${variantName}: 'bg-[${theme.colors['climate-green']}] text-white hover:bg-[${theme.colors['forest-dark']}]',
      },
    },
    defaultVariants: {
      variant: '${variantName}',
    },
  }
);
`;

    return {
      success: true,
      code: variantCode,
    };
  }

  async validateAccessibility(componentName: string): Promise<{
    valid: boolean;
    level: 'A' | 'AA' | 'AAA';
    issues: string[];
    recommendations: string[];
  }> {
    const lookup = await this.lookupComponent(componentName);
    
    if (!lookup.found || !lookup.component) {
      return {
        valid: false,
        level: 'A',
        issues: [`Component "${componentName}" not found`],
        recommendations: [],
      };
    }

    const component = lookup.component;
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!component.accessibility.ariaSupport) {
      issues.push('Missing ARIA attribute support');
      recommendations.push('Add aria-label and aria-describedby props');
    }

    if (!component.accessibility.keyboardNav) {
      recommendations.push('Consider adding keyboard navigation support');
    }

    const meetsTarget = this.wcagLevelMeetsTarget(
      component.accessibility.wcagLevel,
      this.config.targetWcagLevel
    );

    if (!meetsTarget) {
      issues.push(`Component WCAG level (${component.accessibility.wcagLevel}) does not meet target (${this.config.targetWcagLevel})`);
    }

    return {
      valid: issues.length === 0,
      level: component.accessibility.wcagLevel,
      issues,
      recommendations,
    };
  }

  private wcagLevelMeetsTarget(actual: 'A' | 'AA' | 'AAA', target: 'A' | 'AA' | 'AAA'): boolean {
    const levels = { 'A': 1, 'AA': 2, 'AAA': 3 };
    return levels[actual] >= levels[target];
  }

  async customizeTheme(customization: Partial<ThemeCustomization>): Promise<{
    success: boolean;
    cssVariables: string;
    tailwindConfig: string;
  }> {
    const theme = { ...ZORA_THEME, ...customization };

    const cssVariables = Object.entries(theme.colors)
      .map(([name, value]) => `  --z-${name}: ${value};`)
      .join('\n');

    const tailwindConfig = `
// tailwind.config.ts extension for ZORA theme
export const zoraTheme = {
  colors: {
${Object.entries(theme.colors).map(([name, value]) => `    '${name}': '${value}',`).join('\n')}
  },
  borderRadius: {
    DEFAULT: '${theme.borderRadius}',
  },
  fontFamily: {
    sans: ['${theme.fontFamily}', 'system-ui', 'sans-serif'],
  },
};
`;

    return {
      success: true,
      cssVariables: `:root {\n${cssVariables}\n}`,
      tailwindConfig,
    };
  }

  getAvailableComponents(): ShadcnComponent[] {
    return Array.from(this.componentCache.values());
  }

  getZoraTheme(): ThemeCustomization {
    return { ...ZORA_THEME };
  }
}

export async function initializeShadcnMCP(
  config: Partial<ShadcnMCPConfig> = {}
): Promise<ShadcnMCPClient> {
  const client = new ShadcnMCPClient(config);
  return client;
}

export { ZORA_THEME, CORE_COMPONENTS };
