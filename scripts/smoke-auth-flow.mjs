import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

const client = createClient(url, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const loginName = `smoke-${Date.now().toString(36)}`;
const password = 'secret123';

function petDraft() {
  const now = new Date().toISOString();

  return {
    born_at: now,
    last_synced_at: now,
    hunger: 100,
    energy: 100,
    happiness: 100,
    is_sick: false,
    has_hat: false,
    owned_hats: [],
    active_hat: null,
    treasure_ready_at: null,
    coins: 50,
    environment: 'day',
    color: '#df7720',
    ear_type: 'pointed',
    snout_length: 0.4,
    died_at: null,
  };
}

function ensureOk(error, label) {
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

const anonOne = await client.auth.signInAnonymously();
ensureOk(anonOne.error, 'anon sign-in #1 failed');

const firstUserId = anonOne.data.user.id;

let result = await client.from('profiles').upsert({
  id: firstUserId,
  nickname: 'Smoke Test',
  lang: 'ru',
  is_muted: false,
});
ensureOk(result.error, 'profile bootstrap failed');

result = await client.rpc('upsert_account_access', {
  input_login_name: loginName,
  input_new_password: password,
  input_current_password: null,
}).single();
ensureOk(result.error, 'account access setup failed');

result = await client.from('pets').insert({
  ...petDraft(),
  user_id: firstUserId,
}).select('id, user_id').single();
ensureOk(result.error, 'pet adopt failed');

result = await client.auth.signOut();
ensureOk(result.error, 'sign out failed');

const anonTwo = await client.auth.signInAnonymously();
ensureOk(anonTwo.error, 'anon sign-in #2 failed');

const secondUserId = anonTwo.data.user.id;

result = await client.rpc('restore_account_access', {
  input_login_name: loginName,
  input_password: password,
}).single();
ensureOk(result.error, 'account restore failed');

const profileCheck = await client
  .from('profiles')
  .select('id, nickname')
  .eq('id', secondUserId)
  .single();
ensureOk(profileCheck.error, 'restored profile lookup failed');

const petCheck = await client
  .from('pets')
  .select('id, user_id')
  .eq('user_id', secondUserId)
  .limit(1)
  .single();
ensureOk(petCheck.error, 'restored pet lookup failed');

const leaderboard = await client.rpc('get_leaderboard', { limit_count: 10 });
ensureOk(leaderboard.error, 'leaderboard lookup failed');

console.log(JSON.stringify({
  ok: true,
  loginName,
  restoredUserId: secondUserId,
  restoredNickname: profileCheck.data.nickname,
  livePetUserId: petCheck.data.user_id,
  leaderboardRows: leaderboard.data?.length ?? 0,
}, null, 2));

await client.auth.signOut();
