/**
 * ODIN Web Ingestion v1.0
 * 
 * Service for ingesting web content into the ZORA Knowledge Store.
 * ODIN is the Nordic agent responsible for research and knowledge acquisition.
 */

export {
  ingestKnowledgeFromUrl,
  runOdinIngestionJob,
  runBootstrapJob,
  getBootstrapJobNames,
  ODIN_BOOTSTRAP_JOBS,
  ODIN_INGESTION_VERSION,
} from './ingestion';
