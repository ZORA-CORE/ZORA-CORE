/**
 * ODIN Web Ingestion v2.0
 * 
 * Service for ingesting web content into the ZORA Knowledge Store.
 * ODIN is the Nordic agent responsible for research and knowledge acquisition.
 * 
 * v2.0 Changes:
 * - Auto-add domains from curated bootstrap jobs
 * - Auto-bootstrap when knowledge thresholds are low
 */

export {
  ingestKnowledgeFromUrl,
  runOdinIngestionJob,
  runBootstrapJob,
  getBootstrapJobNames,
  checkAndEnqueueAutoBootstrap,
  ODIN_BOOTSTRAP_JOBS,
  ODIN_INGESTION_VERSION,
  AUTO_BOOTSTRAP_THRESHOLD,
  AUTO_BOOTSTRAP_COOLDOWN_HOURS,
} from './ingestion';

export type { AutoBootstrapCheckResult } from './ingestion';
