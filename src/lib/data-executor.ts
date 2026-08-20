import type {SupabaseClient} from '@supabase/supabase-js';
import {getQueryDataFn} from '@/remotion/generated/registry';

/**
 * Executes a template's queryData function using the statically-imported registry.
 * All queryData functions are bundled at build time — no dynamic imports needed.
 */
export async function executeTemplateData(
  templateId: string,
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const fn = getQueryDataFn(templateId);
  if (!fn) {
    throw new Error(`Template not found or no queryData: ${templateId}`);
  }

  return fn(supabase, options);
}
