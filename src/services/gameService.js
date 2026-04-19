import { applyOfflineDecay, buildRandomPetDraft } from '../domain/petLogic';
import { getProfile, updateProfile } from '../repositories/profileRepo';
import { createPet, getActivePet, updatePet } from '../repositories/petRepo';

export async function loadGameData(userId, statsConfig) {
  const [pet, profile] = await Promise.all([
    getActivePet(userId),
    getProfile(userId),
  ]);

  if (!pet || pet.died_at) {
    return { profile, pet };
  }

  const hydratedPet = applyOfflineDecay(pet, statsConfig);
  await updatePet(hydratedPet.id, userId, hydratedPet);

  return {
    profile,
    pet: hydratedPet,
  };
}

export async function adoptPet(userId) {
  return createPet(userId, buildRandomPetDraft());
}

export async function persistPet(userId, pet) {
  if (!pet?.id) {
    return pet;
  }

  return updatePet(pet.id, userId, pet);
}

export async function saveProfileSettings(userId, updates) {
  return updateProfile(userId, updates);
}

