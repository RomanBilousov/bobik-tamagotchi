import { normalizeHatState } from './hats';

export const MAX_STAT = 100;
export const DEFAULT_PROFILE_NAME = 'Игрок';
export const DECAY_RATE_PER_MINUTE = 2;
export const DEFAULT_PET_COLOR = '#df7720';

export function createStatsConfig(t) {
  return {
    hunger: { label: t('hunger'), color: 'fill-hunger', drain: 0.8 },
    energy: { label: t('energy'), color: 'fill-energy', drain: 1.0 },
    happiness: { label: t('happiness'), color: 'fill-happiness', drain: 1.2 },
  };
}

export function clampStat(value) {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_STAT, numericValue));
}

export function calculateTimeAlive(start, end) {
  const diff = Math.floor((end - start) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function buildRandomPetDraft(random = Math.random) {
  const now = new Date().toISOString();
  const colors = ['#fbbf24', '#f87171', '#60a5fa', '#a78bfa', '#34d399', '#f97316', '#e879f9'];

  return {
    born_at: now,
    last_synced_at: now,
    hunger: 100,
    energy: 100,
    happiness: 100,
    isSick: false,
    hasHat: false,
    ownedHats: [],
    activeHat: null,
    coins: 50,
    genetics: {
      color: colors[Math.floor(random() * colors.length)] || DEFAULT_PET_COLOR,
      earType: random() > 0.5 ? 'pointed' : 'floppy',
      snoutLength: 0.2 + (random() * 0.3),
    },
    environment: ['day', 'sunset', 'night'][Math.floor(random() * 3)] || 'day',
    died_at: null,
  };
}

export function buildPetState(basePet, updates = {}) {
  const nowIso = updates.last_synced_at ?? new Date().toISOString();
  const hatState = normalizeHatState({
    ...basePet,
    ...updates,
  });
  const nextPet = {
    ...basePet,
    ...updates,
    ...hatState,
    hunger: clampStat(updates.hunger ?? basePet.hunger),
    energy: clampStat(updates.energy ?? basePet.energy),
    happiness: clampStat(updates.happiness ?? basePet.happiness),
    coins: Math.max(0, Math.floor(updates.coins ?? basePet.coins ?? 0)),
    last_synced_at: nowIso,
  };

  if (nextPet.hunger <= 0 || nextPet.energy <= 0 || nextPet.happiness <= 0) {
    nextPet.died_at = updates.died_at ?? nowIso;
    nextPet.hunger = Math.max(0, nextPet.hunger);
    nextPet.energy = Math.max(0, nextPet.energy);
    nextPet.happiness = Math.max(0, nextPet.happiness);
  }

  return nextPet;
}

export function applyOfflineDecay(pet, statsConfig, random = Math.random, now = new Date()) {
  if (!pet || pet.died_at) {
    return pet;
  }

  const lastSynced = new Date(pet.last_synced_at);
  let diffMinutes = (now - lastSynced) / (1000 * 60);
  if (diffMinutes < 0) {
    diffMinutes = 0;
  }

  let isSick = pet.isSick || false;
  if (diffMinutes > 30 && random() > 0.5) {
    isSick = true;
  }

  const multiplier = isSick ? 2 : 1;

  return buildPetState(pet, {
    hunger: pet.hunger - (diffMinutes * DECAY_RATE_PER_MINUTE * statsConfig.hunger.drain * multiplier),
    energy: pet.energy - (diffMinutes * DECAY_RATE_PER_MINUTE * statsConfig.energy.drain * multiplier),
    happiness: pet.happiness - (diffMinutes * DECAY_RATE_PER_MINUTE * statsConfig.happiness.drain * multiplier),
    isSick,
    coins: (pet.coins || 0) + Math.floor(diffMinutes * 10),
    ownedHats: pet.ownedHats || [],
    activeHat: pet.activeHat || null,
    last_synced_at: now.toISOString(),
  });
}

export function applyRuntimeDecayTick(pet, statsConfig, random = Math.random) {
  if (!pet || pet.died_at) {
    return pet;
  }

  const mins = 10 / 60;
  let newlySick = pet.isSick;
  if (!newlySick && random() < 0.02) {
    newlySick = true;
  }

  const multiplier = newlySick ? 2 : 1;

  return buildPetState(pet, {
    hunger: pet.hunger - (mins * DECAY_RATE_PER_MINUTE * statsConfig.hunger.drain * multiplier),
    energy: pet.energy - (mins * DECAY_RATE_PER_MINUTE * statsConfig.energy.drain * multiplier),
    happiness: pet.happiness - (mins * DECAY_RATE_PER_MINUTE * statsConfig.happiness.drain * multiplier),
    isSick: newlySick,
    coins: (pet.coins || 0) + 1,
  });
}

export function getEvolutionData(mins, t) {
  const ranks = [
    { t: 0, name: t('evo_0') },
    { t: 1, name: t('evo_1') },
    { t: 5, name: t('evo_5') },
    { t: 15, name: t('evo_15') },
    { t: 30, name: t('evo_30') },
    { t: 60, name: t('evo_60') },
    { t: 120, name: t('evo_120') },
    { t: 240, name: t('evo_240') },
    { t: 480, name: t('evo_480') },
    { t: 720, name: t('evo_720') },
    { t: 1440, name: t('evo_1440') },
    { t: 2880, name: t('evo_2880') },
    { t: 10080, name: t('evo_10000') },
  ];

  let current = ranks[0];
  let next = ranks[1];

  for (let i = 0; i < ranks.length; i += 1) {
    if (mins >= ranks[i].t) {
      current = ranks[i];
      next = ranks[i + 1] || null;
    } else {
      break;
    }
  }

  return { name: current.name, currentT: current.t, nextT: next ? next.t : null };
}

export function getStatusMessage(pet, aliveMins, t) {
  if (!pet || pet.died_at) {
    return 'ОК';
  }

  if (pet.isSick) {
    return t('sick');
  }

  if (pet.hunger < 20) {
    return t('hungry');
  }

  if (pet.energy < 20) {
    return t('need_sleep');
  }

  if (pet.happiness < 20) {
    return t('sad');
  }

  if (pet.hunger > 80 && pet.energy > 80 && pet.happiness > 80 && aliveMins >= 0) {
    return t('feels_great');
  }

  return 'ОК';
}
