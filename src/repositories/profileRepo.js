import { requireAuthenticatedUserId, requireSupabase } from '../lib/supabase/client';
import { resolveProfileNickname } from '../lib/profile/funNickname';

const PROFILE_COLUMNS = 'id, nickname, lang, is_muted, created_at, updated_at';
const SUPPORTED_LANGS = new Set(['en', 'ua', 'ru']);

function normalizeNickname(value, userId) {
  return resolveProfileNickname(value, userId);
}

function normalizeLang(value) {
  return SUPPORTED_LANGS.has(value) ? value : 'en';
}

function mapRowToProfile(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nickname: row.nickname,
    lang: row.lang,
    isMuted: row.is_muted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProfileInputToRow(input = {}, userId) {
  const row = {};

  if ('nickname' in input) {
    row.nickname = normalizeNickname(input.nickname, userId);
  }

  if ('lang' in input) {
    row.lang = normalizeLang(input.lang);
  }

  if ('isMuted' in input) {
    row.is_muted = Boolean(input.isMuted);
  }

  return row;
}

export async function getProfile(userId) {
  const supabase = requireSupabase();
  const resolvedUserId = await requireAuthenticatedUserId(userId);
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', resolvedUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapRowToProfile(data);
}

export async function ensureProfile(userId, defaults = {}) {
  const resolvedUserId = await requireAuthenticatedUserId(userId);
  const existing = await getProfile(resolvedUserId);
  if (existing) {
    return existing;
  }

  const supabase = requireSupabase();
  const payload = {
    id: resolvedUserId,
    nickname: normalizeNickname(defaults.nickname, resolvedUserId),
    lang: normalizeLang(defaults.lang),
    is_muted: Boolean(defaults.isMuted),
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(payload)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRowToProfile(data);
}

export async function updateProfile(userId, updates) {
  const supabase = requireSupabase();
  const resolvedUserId = await requireAuthenticatedUserId(userId);
  const payload = mapProfileInputToRow(updates, resolvedUserId);

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', resolvedUserId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRowToProfile(data);
}
