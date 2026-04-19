import { requireSupabase } from '../lib/supabase/client';

function normalizeRewardClaims(claims) {
  if (!Array.isArray(claims)) {
    return [];
  }

  return claims
    .filter((claim) => claim && typeof claim === 'object')
    .map((claim) => ({
      type: String(claim.type || '').trim(),
      amount: Number(claim.amount) || 0,
    }))
    .filter((claim) => claim.type);
}

export async function claimPlayerRewards() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('claim_player_rewards');

  if (error) {
    throw error;
  }

  const normalizedCoinsAfter = Number(data?.coinsAfter);

  return {
    granted: Boolean(data?.granted),
    totalAmount: Number(data?.totalAmount) || 0,
    coinsAfter: Number.isFinite(normalizedCoinsAfter) ? normalizedCoinsAfter : null,
    petId: data?.petId || '',
    claims: normalizeRewardClaims(data?.claims),
  };
}
