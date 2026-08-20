import type {SupabaseClient} from '@supabase/supabase-js';

export type HeadToHeadProps = {
  wrestlerA: string;
  wrestlerB: string;
  winsA: number;
  winsB: number;
  draws?: number;
  titleA?: string;
  titleB?: string;
};

interface HeadToHeadRow {
  wrestler_a_name: string;
  wrestler_b_name: string;
  result: 'winner' | 'loser' | 'draw';
}

export async function queryData(
  supabase: SupabaseClient,
  options: Record<string, unknown>,
): Promise<HeadToHeadProps> {
  const wrestlerA = options.wrestlerA as string;
  const wrestlerB = options.wrestlerB as string;

  if (!wrestlerA || !wrestlerB) {
    throw new Error('Both wrestlerA and wrestlerB are required');
  }

  const {data, error} = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('v_head_to_head' as any)
    .select('*')
    .or(
      `and(wrestler_a_name.ilike.%25${wrestlerA}%25,wrestler_b_name.ilike.%25${wrestlerB}%25),and(wrestler_a_name.ilike.%25${wrestlerB}%25,wrestler_b_name.ilike.%25${wrestlerA}%25)`,
    )
    .limit(50);

  if (error) throw error;

  const rows = (data ?? []) as HeadToHeadRow[];
  let winsA = 0;
  let winsB = 0;
  let draws = 0;

  for (const row of rows) {
    const aName = row.wrestler_a_name?.toLowerCase();
    const isADirection = aName?.includes(wrestlerA.toLowerCase());

    if (row.result === 'draw') {
      draws++;
    } else if (isADirection) {
      if (row.result === 'winner') winsA++;
      else winsB++;
    } else {
      if (row.result === 'winner') winsB++;
      else winsA++;
    }
  }

  return {
    wrestlerA,
    wrestlerB,
    winsA,
    winsB,
    draws,
  };
}
