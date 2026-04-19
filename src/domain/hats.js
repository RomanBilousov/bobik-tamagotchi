export const LEGACY_HAT_ID = 'magic_hat';

export const HAT_CATALOG = [
  {
    id: 'baseball_cap',
    icon: '🧢',
    price: 90,
    titleKey: 'hat_baseball_cap',
    descriptionKey: 'hat_baseball_cap_desc',
  },
  {
    id: 'beanie',
    icon: '🧶',
    price: 120,
    titleKey: 'hat_beanie',
    descriptionKey: 'hat_beanie_desc',
  },
  {
    id: 'bucket_hat',
    icon: '👒',
    price: 150,
    titleKey: 'hat_bucket_hat',
    descriptionKey: 'hat_bucket_hat_desc',
  },
  {
    id: 'antlers',
    icon: '🦌',
    price: 180,
    titleKey: 'hat_antlers',
    descriptionKey: 'hat_antlers_desc',
  },
  {
    id: 'beer_hat',
    icon: '🍺',
    price: 220,
    titleKey: 'hat_beer_hat',
    descriptionKey: 'hat_beer_hat_desc',
  },
  {
    id: LEGACY_HAT_ID,
    icon: '🎩',
    price: 260,
    titleKey: 'magic_hat',
    descriptionKey: 'hat_desc',
  },
];

const HAT_IDS = new Set(HAT_CATALOG.map((hat) => hat.id));

export function normalizeOwnedHats(value, fallbackHasHat = false) {
  const rawOwnedHats = Array.isArray(value) ? value : [];
  const normalizedHats = rawOwnedHats
    .map((hatId) => (typeof hatId === 'string' ? hatId.trim() : ''))
    .filter((hatId) => HAT_IDS.has(hatId));

  if (fallbackHasHat && !normalizedHats.includes(LEGACY_HAT_ID)) {
    normalizedHats.unshift(LEGACY_HAT_ID);
  }

  return Array.from(new Set(normalizedHats));
}

export function normalizeActiveHat(value, ownedHats) {
  if (typeof value === 'string' && ownedHats.includes(value)) {
    return value;
  }

  return ownedHats[0] || null;
}

export function normalizeHatState(petLike = {}) {
  const ownedHats = normalizeOwnedHats(petLike.ownedHats, petLike.hasHat);
  const activeHat = normalizeActiveHat(petLike.activeHat, ownedHats);

  return {
    ownedHats,
    activeHat,
    hasHat: ownedHats.length > 0,
  };
}

export function getHatById(hatId) {
  return HAT_CATALOG.find((hat) => hat.id === hatId) || null;
}
