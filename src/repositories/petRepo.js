import { requireSupabase } from '../lib/supabase/client';

const PET_COLUMNS = [
  'id',
  'user_id',
  'born_at',
  'died_at',
  'last_synced_at',
  'hunger',
  'energy',
  'happiness',
  'is_sick',
  'has_hat',
  'coins',
  'environment',
  'color',
  'ear_type',
  'snout_length',
].join(', ');

function clampStat(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, numericValue));
}

function normalizeCoins(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(numericValue));
}

function normalizeTimestamp(value, fallback = new Date().toISOString()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeEnvironment(value) {
  return ['day', 'sunset', 'night'].includes(value) ? value : 'day';
}

function normalizeEarType(value) {
  return value === 'floppy' ? 'floppy' : 'pointed';
}

function normalizeSnoutLength(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 0.4;
  }

  return Math.max(0.2, Math.min(0.8, numericValue));
}

function mapRowToPet(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    born_at: row.born_at,
    died_at: row.died_at,
    last_synced_at: row.last_synced_at,
    hunger: Number(row.hunger),
    energy: Number(row.energy),
    happiness: Number(row.happiness),
    isSick: Boolean(row.is_sick),
    hasHat: Boolean(row.has_hat),
    coins: Number(row.coins),
    environment: row.environment,
    genetics: {
      color: row.color,
      earType: row.ear_type,
      snoutLength: Number(row.snout_length),
    },
  };
}

function mapPetToInsertRow(userId, pet) {
  return {
    user_id: userId,
    born_at: normalizeTimestamp(pet.born_at),
    died_at: pet.died_at ? normalizeTimestamp(pet.died_at) : null,
    last_synced_at: normalizeTimestamp(pet.last_synced_at),
    hunger: clampStat(pet.hunger),
    energy: clampStat(pet.energy),
    happiness: clampStat(pet.happiness),
    is_sick: Boolean(pet.isSick),
    has_hat: Boolean(pet.hasHat),
    coins: normalizeCoins(pet.coins),
    environment: normalizeEnvironment(pet.environment),
    color: pet.genetics?.color || '#df7720',
    ear_type: normalizeEarType(pet.genetics?.earType),
    snout_length: normalizeSnoutLength(pet.genetics?.snoutLength),
  };
}

function mapPetToUpdateRow(pet) {
  const row = {};

  if ('born_at' in pet) {
    row.born_at = normalizeTimestamp(pet.born_at);
  }

  if ('died_at' in pet) {
    row.died_at = pet.died_at ? normalizeTimestamp(pet.died_at) : null;
  }

  if ('last_synced_at' in pet) {
    row.last_synced_at = normalizeTimestamp(pet.last_synced_at);
  }

  if ('hunger' in pet) {
    row.hunger = clampStat(pet.hunger);
  }

  if ('energy' in pet) {
    row.energy = clampStat(pet.energy);
  }

  if ('happiness' in pet) {
    row.happiness = clampStat(pet.happiness);
  }

  if ('isSick' in pet) {
    row.is_sick = Boolean(pet.isSick);
  }

  if ('hasHat' in pet) {
    row.has_hat = Boolean(pet.hasHat);
  }

  if ('coins' in pet) {
    row.coins = normalizeCoins(pet.coins);
  }

  if ('environment' in pet) {
    row.environment = normalizeEnvironment(pet.environment);
  }

  if ('genetics' in pet && pet.genetics) {
    if ('color' in pet.genetics) {
      row.color = pet.genetics.color || '#df7720';
    }

    if ('earType' in pet.genetics) {
      row.ear_type = normalizeEarType(pet.genetics.earType);
    }

    if ('snoutLength' in pet.genetics) {
      row.snout_length = normalizeSnoutLength(pet.genetics.snoutLength);
    }
  }

  return row;
}

export async function getPetCount(userId) {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('pets')
    .select('id', { head: true, count: 'exact' })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getActivePet(userId) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('pets')
    .select(PET_COLUMNS)
    .eq('user_id', userId)
    .is('died_at', null)
    .order('born_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return mapRowToPet(data);
}

export async function createPet(userId, petDraft) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('pets')
    .insert(mapPetToInsertRow(userId, petDraft))
    .select(PET_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRowToPet(data);
}

export async function updatePet(petId, userId, updates) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('pets')
    .update(mapPetToUpdateRow(updates))
    .eq('id', petId)
    .eq('user_id', userId)
    .select(PET_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapRowToPet(data);
}

export async function deletePet(petId, userId) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('pets')
    .delete()
    .eq('id', petId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function importLegacyPet(userId, legacyPet) {
  if (!legacyPet) {
    return null;
  }

  return createPet(userId, {
    born_at: legacyPet.born_at,
    died_at: legacyPet.died_at,
    last_synced_at: legacyPet.last_synced_at,
    hunger: legacyPet.hunger,
    energy: legacyPet.energy,
    happiness: legacyPet.happiness,
    isSick: legacyPet.isSick,
    hasHat: legacyPet.hasHat,
    coins: legacyPet.coins,
    environment: legacyPet.environment,
    genetics: legacyPet.genetics,
  });
}

export async function importLegacyLeaderboard(userId, entries) {
  const leaderboardEntries = Array.isArray(entries)
    ? entries.filter((entry) => entry?.born_at && entry?.died_at)
    : [];

  if (!leaderboardEntries.length) {
    return [];
  }

  const supabase = requireSupabase();
  const payload = leaderboardEntries.map((entry) =>
    mapPetToInsertRow(userId, {
      born_at: entry.born_at,
      died_at: entry.died_at,
      last_synced_at: entry.died_at,
      hunger: entry.hunger ?? 0,
      energy: entry.energy ?? 0,
      happiness: entry.happiness ?? 0,
      isSick: entry.isSick,
      hasHat: entry.hasHat,
      coins: entry.coins ?? 0,
      environment: entry.environment,
      genetics: entry.genetics,
    }),
  );

  const { data, error } = await supabase
    .from('pets')
    .insert(payload)
    .select(PET_COLUMNS);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRowToPet);
}

