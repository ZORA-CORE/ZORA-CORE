/**
 * FREYA - The Storyteller & Narrative Intelligence
 * Type definitions for multimodal storytelling, growth loops, and ethical marketing
 */

export type AgentId = 'odin' | 'thor' | 'baldur' | 'tyr' | 'eivor' | 'freya' | 'heimdall';

export type ContentType = 'text' | 'image' | 'video_script' | 'infographic' | 'social_post' | 'report';

export type Channel = 'twitter' | 'linkedin' | 'discord' | 'email' | 'dashboard' | 'blog';

export type StoryTone = 'inspiring' | 'urgent' | 'educational' | 'celebratory' | 'cautionary';

export type GrowthStrategy = 'viral' | 'organic' | 'community' | 'partnership' | 'content';

export type ExperimentStatus = 'planned' | 'running' | 'completed' | 'paused' | 'cancelled';

// ============================================
// TASK 1: Narrative Substrate (Multimodal Storytelling)
// ============================================

export interface ClimateImpactStory {
  id: string;
  title: string;
  summary: string;
  fullNarrative: string;
  tone: StoryTone;
  timestamp: number;
  dataSource: {
    tyrValidationId?: string;
    nasaData?: Record<string, unknown>;
    copernicusData?: Record<string, unknown>;
    climateEvidence: ClimateStoryEvidence[];
  };
  content: MultimodalContent;
  targetAudience: string[];
  channels: Channel[];
  ethicsApproval: {
    approved: boolean;
    tyrValidation?: string;
    greenwashingCheck: boolean;
    attestationId?: string;
  };
  engagement: EngagementMetrics;
}

export interface ClimateStoryEvidence {
  sourceId: string;
  dataPoint: string;
  value: number | string;
  unit?: string;
  humanReadable: string;
  visualizationType?: 'chart' | 'map' | 'comparison' | 'timeline';
}

export interface MultimodalContent {
  text: TextContent;
  images?: ImageContent[];
  videoScript?: VideoScriptContent;
  infographic?: InfographicContent;
  socialPosts?: SocialPostContent[];
}

export interface TextContent {
  headline: string;
  subheadline?: string;
  body: string;
  callToAction?: string;
  keyPoints: string[];
  citations: Citation[];
}

export interface ImageContent {
  id: string;
  type: 'generated' | 'chart' | 'map' | 'photo';
  prompt?: string;
  url?: string;
  altText: string;
  caption?: string;
  generationModel?: 'dall-e-3' | 'flux' | 'midjourney';
}

export interface VideoScriptContent {
  id: string;
  duration: number;
  scenes: VideoScene[];
  voiceoverScript: string;
  musicSuggestion?: string;
  targetPlatform: 'youtube' | 'tiktok' | 'instagram' | 'linkedin';
}

export interface VideoScene {
  sceneNumber: number;
  duration: number;
  visualDescription: string;
  narration: string;
  textOverlay?: string;
  dataVisualization?: string;
}

export interface InfographicContent {
  id: string;
  title: string;
  sections: InfographicSection[];
  colorScheme: string[];
  style: 'minimal' | 'detailed' | 'playful' | 'corporate';
}

export interface InfographicSection {
  heading: string;
  content: string;
  dataPoint?: {
    value: string;
    label: string;
    icon?: string;
  };
  visualElement?: string;
}

export interface SocialPostContent {
  id: string;
  platform: Channel;
  text: string;
  hashtags: string[];
  mediaIds?: string[];
  scheduledTime?: number;
  threadParts?: string[];
}

export interface Citation {
  source: string;
  url?: string;
  date?: string;
  reliability: number;
}

export interface EngagementMetrics {
  views: number;
  shares: number;
  likes: number;
  comments: number;
  clickThroughRate: number;
  conversionRate: number;
  sentimentScore: number;
}

// ============================================
// TASK 2: Growth & Viral Loops (Falcon Cloak)
// ============================================

export interface GrowthLoop {
  id: string;
  name: string;
  strategy: GrowthStrategy;
  channels: Channel[];
  status: 'active' | 'paused' | 'completed';
  metrics: GrowthMetrics;
  triggers: GrowthTrigger[];
  actions: GrowthAction[];
  createdAt: number;
  lastExecuted?: number;
}

export interface GrowthMetrics {
  reach: number;
  engagement: number;
  conversions: number;
  viralCoefficient: number;
  costPerAcquisition: number;
  retentionRate: number;
  nps: number;
}

export interface GrowthTrigger {
  id: string;
  type: 'time' | 'event' | 'threshold' | 'manual';
  condition: string;
  parameters: Record<string, unknown>;
}

export interface GrowthAction {
  id: string;
  type: 'post' | 'engage' | 'analyze' | 'optimize' | 'report';
  channel: Channel;
  content?: string;
  parameters: Record<string, unknown>;
  executedAt?: number;
  result?: ActionResult;
}

export interface ActionResult {
  success: boolean;
  metrics?: Partial<EngagementMetrics>;
  error?: string;
}

export interface CommunityEngagement {
  id: string;
  platform: Channel;
  type: 'reply' | 'mention' | 'dm' | 'comment' | 'reaction';
  userId: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  responseGenerated?: string;
  responseApproved: boolean;
  respondedAt?: number;
}

export interface ChannelStrategy {
  channel: Channel;
  priority: number;
  contentTypes: ContentType[];
  postingFrequency: {
    postsPerDay: number;
    optimalTimes: string[];
  };
  audienceProfile: {
    demographics: string[];
    interests: string[];
    climateAwareness: 'low' | 'medium' | 'high';
  };
  performanceMetrics: GrowthMetrics;
}

// ============================================
// TASK 3: Ethical Marketing & Brand Integrity
// ============================================

export interface GreenwashingAudit {
  id: string;
  contentId: string;
  timestamp: number;
  claims: AuditedClaim[];
  overallScore: number;
  passed: boolean;
  tyrValidationId?: string;
  recommendations: string[];
}

export interface AuditedClaim {
  claim: string;
  type: 'emission' | 'impact' | 'certification' | 'comparison' | 'projection';
  verified: boolean;
  evidence?: string;
  issue?: string;
  severity?: 'minor' | 'moderate' | 'major' | 'critical';
}

export interface ABTest {
  id: string;
  name: string;
  hypothesis: string;
  status: ExperimentStatus;
  variants: ABVariant[];
  metrics: ABMetrics;
  startDate: number;
  endDate?: number;
  winner?: string;
  statisticalSignificance?: number;
}

export interface ABVariant {
  id: string;
  name: string;
  content: Partial<MultimodalContent>;
  allocation: number;
  metrics: EngagementMetrics;
}

export interface ABMetrics {
  primaryMetric: string;
  secondaryMetrics: string[];
  minimumSampleSize: number;
  currentSampleSize: number;
  confidenceLevel: number;
}

export interface ConversionOptimization {
  id: string;
  missionId: string;
  originalPresentation: string;
  optimizedPresentation: string;
  improvementPercentage: number;
  testId?: string;
}

// ============================================
// FREYA Status & Configuration
// ============================================

export interface FreyaStatus {
  isActive: boolean;
  activatedAt: number;
  mode: 'creative' | 'analytical' | 'growth';
  stats: {
    storiesGenerated: number;
    contentPieces: number;
    growthExperiments: number;
    greenwashingAudits: number;
    abTestsRun: number;
    engagementTotal: number;
  };
  connections: {
    tyr: 'connected' | 'disconnected';
    odin: 'connected' | 'disconnected';
    eivor: 'connected' | 'disconnected';
  };
  activeLoops: GrowthLoop[];
  pendingContent: number;
}

export interface FreyaConfig {
  narrativeEngine: {
    defaultTone: StoryTone;
    maxStoryLength: number;
    citationRequired: boolean;
    imageGeneration: boolean;
    imageModel: 'dall-e-3' | 'flux';
  };
  growthEngine: {
    enabledChannels: Channel[];
    autoPost: boolean;
    engagementThreshold: number;
    viralCoefficientTarget: number;
  };
  ethicsIntegration: {
    tyrValidationRequired: boolean;
    greenwashingThreshold: number;
    autoReject: boolean;
  };
  abTesting: {
    defaultConfidenceLevel: number;
    minimumSampleSize: number;
    maxConcurrentTests: number;
  };
}

export const DEFAULT_FREYA_CONFIG: FreyaConfig = {
  narrativeEngine: {
    defaultTone: 'inspiring',
    maxStoryLength: 5000,
    citationRequired: true,
    imageGeneration: true,
    imageModel: 'dall-e-3',
  },
  growthEngine: {
    enabledChannels: ['twitter', 'linkedin', 'discord'],
    autoPost: false,
    engagementThreshold: 0.05,
    viralCoefficientTarget: 1.2,
  },
  ethicsIntegration: {
    tyrValidationRequired: true,
    greenwashingThreshold: 0.8,
    autoReject: true,
  },
  abTesting: {
    defaultConfidenceLevel: 0.95,
    minimumSampleSize: 100,
    maxConcurrentTests: 3,
  },
};

// Story templates for different climate topics
export const STORY_TEMPLATES = {
  temperature_rise: {
    headline: 'Global Temperature Update: What the Data Shows',
    structure: ['current_state', 'historical_context', 'impact', 'action'],
    tone: 'educational' as StoryTone,
  },
  emissions_reduction: {
    headline: 'Progress Report: Emissions Reduction Journey',
    structure: ['achievement', 'methodology', 'verification', 'next_steps'],
    tone: 'celebratory' as StoryTone,
  },
  climate_action: {
    headline: 'Climate Mission: Making a Difference',
    structure: ['challenge', 'solution', 'impact', 'call_to_action'],
    tone: 'inspiring' as StoryTone,
  },
  urgent_warning: {
    headline: 'Climate Alert: Immediate Action Required',
    structure: ['threat', 'evidence', 'consequences', 'solutions'],
    tone: 'urgent' as StoryTone,
  },
  success_story: {
    headline: 'Climate Victory: Celebrating Progress',
    structure: ['background', 'journey', 'achievement', 'lessons'],
    tone: 'celebratory' as StoryTone,
  },
};

// Channel-specific content guidelines
export const CHANNEL_GUIDELINES: Record<Channel, { maxLength: number; hashtags: number; mediaRequired: boolean }> = {
  twitter: { maxLength: 280, hashtags: 3, mediaRequired: false },
  linkedin: { maxLength: 3000, hashtags: 5, mediaRequired: true },
  discord: { maxLength: 2000, hashtags: 0, mediaRequired: false },
  email: { maxLength: 10000, hashtags: 0, mediaRequired: false },
  dashboard: { maxLength: 50000, hashtags: 0, mediaRequired: true },
  blog: { maxLength: 20000, hashtags: 5, mediaRequired: true },
};
