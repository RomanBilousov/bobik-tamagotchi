const ADJECTIVES = [
  'Шустрый',
  'Пиксельный',
  'Озорной',
  'Ловкий',
  'Бодрый',
  'Звёздный',
  'Смелый',
  'Тёплый',
  'Хитрый',
  'Яркий',
  'Пушистый',
  'Дворовый',
  'Славный',
  'Весёлый',
  'Лунный',
  'Сонный',
];

const NOUNS = [
  'Хвост',
  'Тапок',
  'Носик',
  'Прыгун',
  'Ушастик',
  'Следопыт',
  'Бублик',
  'Трюкач',
  'Шарик',
  'Гавчик',
  'Искатель',
  'Спринтер',
  'Комочек',
  'Барбос',
  'Смайлик',
  'Метеор',
];

const GENERIC_PROFILE_NAMES = new Set(['игрок', 'player', 'guest', 'user']);
const DEFAULT_SEED = 'bobik-guest';
const MAX_NICKNAME_LENGTH = 40;

function hashSeed(seed, salt = '') {
  const normalized = `${String(seed || DEFAULT_SEED)}:${salt}`;
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 33 + normalized.charCodeAt(index)) % 2147483647;
  }

  return hash;
}

export function isGenericProfileName(value) {
  if (typeof value !== 'string') {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return !normalized || GENERIC_PROFILE_NAMES.has(normalized);
}

export function buildFunNickname(seed) {
  const adjective = ADJECTIVES[hashSeed(seed, 'adj') % ADJECTIVES.length] || ADJECTIVES[0];
  const noun = NOUNS[hashSeed(seed, 'noun') % NOUNS.length] || NOUNS[0];
  const suffix = String((hashSeed(seed, 'suffix') % 90) + 10).padStart(2, '0');
  return `${adjective} ${noun} ${suffix}`.slice(0, MAX_NICKNAME_LENGTH);
}

export function resolveProfileNickname(value, seed) {
  if (!isGenericProfileName(value)) {
    return value.trim().slice(0, MAX_NICKNAME_LENGTH);
  }

  return buildFunNickname(seed);
}
