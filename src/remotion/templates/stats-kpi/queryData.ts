export type StatsKpiProps = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  description?: string;
  color?: string;
};

export async function queryData(
  _supabase: unknown,
  options: Record<string, unknown>,
): Promise<StatsKpiProps> {
  return {
    label: (options.label as string) ?? 'Total de Eventos',
    value: Number(options.value ?? 2847),
    suffix: (options.suffix as string) || undefined,
    description: (options.description as string) || undefined,
  };
}
