import type {SupabaseClient} from '@supabase/supabase-js';
import {getTemplate} from '@/remotion/generated/registry';

/**
 * Dynamically imports a template's queryData function and executes it.
 * This runs server-side only (in API routes or server components).
 */
export async function executeTemplateData(
  templateId: string,
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const tpl = getTemplate(templateId);
  if (!tpl) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // Dynamic import of the template's queryData module
  const mod = await import(`../remotion/templates/${templateId}/queryData`);
  if (typeof mod.queryData !== 'function') {
    throw new Error(`Template ${templateId} does not export a queryData function`);
  }

  return mod.queryData(supabase, options);
}
