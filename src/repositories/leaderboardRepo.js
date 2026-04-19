import { requireSupabase } from '../lib/supabase/client';

function mapLeaderboardRow(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    nickname: row.nickname,
    born_at: row.born_at,
    died_at: row.died_at,
    timeLivedMs: Number(row.time_lived_ms ?? 0),
    environment: row.environment,
    hasHat: row.has_hat,
    color: row.color,
  };
}

export async function getLeaderboard(limit = 10) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('get_leaderboard', {
    limit_count: limit,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapLeaderboardRow);
}

