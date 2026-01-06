/**
 * FREYA - The Storyteller & Narrative Intelligence
 * 
 * Exports for the narrative intelligence module
 */

export {
  Freya,
  NarrativeEngine,
  GrowthOrchestrator,
  GreenwashingShield,
  ABTestingEngine,
  createFreya,
} from './freya';

export type {
  AgentId,
  ContentType,
  Channel,
  StoryTone,
  GrowthStrategy,
  ExperimentStatus,
  ClimateImpactStory,
  ClimateStoryEvidence,
  MultimodalContent,
  TextContent,
  ImageContent,
  VideoScriptContent,
  VideoScene,
  InfographicContent,
  InfographicSection,
  SocialPostContent,
  Citation,
  EngagementMetrics,
  GrowthLoop,
  GrowthMetrics,
  GrowthTrigger,
  GrowthAction,
  ActionResult,
  CommunityEngagement,
  ChannelStrategy,
  GreenwashingAudit,
  AuditedClaim,
  ABTest,
  ABVariant,
  ABMetrics,
  ConversionOptimization,
  FreyaStatus,
  FreyaConfig,
} from './types';

export {
  DEFAULT_FREYA_CONFIG,
  STORY_TEMPLATES,
  CHANNEL_GUIDELINES,
} from './types';
