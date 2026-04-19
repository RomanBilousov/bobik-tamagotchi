const LEGACY_KEYS = {
  pet: 'bobik_pet',
  leaderboard: 'bobik_lb',
  nickname: 'bobik_nickname',
  lang: 'bobik_lang',
  muted: 'bobik_muted',
  password: 'bobik_password',
  mockSession: 'mock_session',
  migrationGlobal: 'bobik_legacy_migrated_v2',
};

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function readString(key) {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  return storage.getItem(key);
}

function writeString(key, value) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(key, value);
}

function removeKey(key) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(key);
}

function readJson(key, fallback) {
  const rawValue = readString(key);
  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

function getMigrationKey(userId) {
  return `bobik_legacy_migrated_v1:${userId}`;
}

export function readLegacyProfileSettings() {
  return {
    nickname: readString(LEGACY_KEYS.nickname) || null,
    lang: readString(LEGACY_KEYS.lang) || 'en',
    isMuted: readString(LEGACY_KEYS.muted) === 'true',
  };
}

export function syncLocalSettingsFromProfile(profile) {
  if (!profile) {
    return;
  }

  if (profile.nickname) {
    writeString(LEGACY_KEYS.nickname, profile.nickname);
  }

  if (profile.lang) {
    writeString(LEGACY_KEYS.lang, profile.lang);
  }

  if (typeof profile.isMuted === 'boolean') {
    writeString(LEGACY_KEYS.muted, String(profile.isMuted));
  }
}

export function readLegacyPet() {
  const pet = readJson(LEGACY_KEYS.pet, null);
  return pet && typeof pet === 'object' ? pet : null;
}

export function readLegacyLeaderboard() {
  const leaderboard = readJson(LEGACY_KEYS.leaderboard, []);
  return Array.isArray(leaderboard) ? leaderboard : [];
}

export function hasLegacyMigrationRun(userId) {
  return readString(LEGACY_KEYS.migrationGlobal) === 'true' || readString(getMigrationKey(userId)) === 'true';
}

export function markLegacyMigrationRun(userId) {
  writeString(LEGACY_KEYS.migrationGlobal, 'true');
  writeString(getMigrationKey(userId), 'true');
}

export function clearLegacySensitiveData() {
  removeKey(LEGACY_KEYS.password);
  removeKey(LEGACY_KEYS.mockSession);
}
