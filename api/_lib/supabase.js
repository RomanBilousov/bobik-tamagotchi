/* eslint-env node */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_PUBLIC_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();

function getBaseHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLIC_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLIC_KEY}`,
  };
}

function ensureSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    throw new Error('Supabase server env is not configured');
  }
}

export async function callSupabaseRpc(name, body = {}, accessToken) {
  ensureSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: getBaseHeaders(accessToken),
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.error || response.statusText;
    throw new Error(message);
  }

  return data;
}

export async function getSupabaseUser(accessToken) {
  ensureSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: getBaseHeaders(accessToken),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || response.statusText;
    throw new Error(message);
  }

  return data;
}
