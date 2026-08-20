export type WinStreakProps = {
  wrestlerName: string;
  streakCount: number;
  matchType?: string;
  events?: string[];
  promotionColor?: string;
};

export async function queryData(
  _supabase: unknown,
  options: Record<string, unknown>,
): Promise<WinStreakProps> {
  return {
    wrestlerName: (options.wrestlerName as string) ?? 'The Undertaker',
    streakCount: Number(options.streakCount ?? 21),
    matchType: (options.matchType as string) || undefined,
  };
}
