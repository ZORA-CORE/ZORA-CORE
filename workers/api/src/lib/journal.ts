import type { SupabaseClient } from '@supabase/supabase-js';

export interface JournalEventInput {
  tenantId: string;
  eventType: string;
  summary: string;
  metadata?: Record<string, unknown>;
  relatedEntityIds?: string[];
}

export async function insertJournalEntry(
  supabase: SupabaseClient,
  input: JournalEventInput
): Promise<void> {
  const { error } = await supabase.from('journal_entries').insert({
    tenant_id: input.tenantId,
    category: 'system_event',
    title: input.summary,
    body: null,
    details: {
      event_type: input.eventType,
      ...input.metadata,
    },
    related_entity_ids: input.relatedEntityIds || [],
    author: 'climate_os',
  });

  if (error) {
    console.error('Failed to insert journal entry:', error);
  }
}
