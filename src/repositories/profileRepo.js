import { requireSupabase } from '../lib/supabase/client';

const PROFILE_COLUMNS = 'id, nickname, lang, is_muted, created_at, updated_at';
const SUPPORTED_LANGS = new Set(['en', 'ua', 'ru']);

function normalizeNickname(value) {
  const fallback = 'Игрок';
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 40) : fallback;
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

function mapProfileInputToRow(input = {}) {
  const row = {};

  if ('nickname' in input) {
    row.nickname = normalizeNickname(input.nickname);
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
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapRowToProfile(data);
}

export async function ensureProfile(userId, defaults = {}) {
  const existing = await getProfile(userId);
  if (existing) {
    return existing;
  }

  const supabase = requireSupabase();
  const payload = {
    id: userId,
    nickname: normalizeNickname(defaults.nickname),
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
  const payload = mapProfileInputToRow(updates);

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRowToProfile(data);
}

