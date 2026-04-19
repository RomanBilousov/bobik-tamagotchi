import {
  getAccountAccessStatus,
  restoreAccountAccess,
  upsertAccountAccess,
} from '../repositories/accountRepo';

export async function loadAccountAccess() {
  return getAccountAccessStatus();
}

export async function saveAccountAccess(payload) {
  return upsertAccountAccess(payload);
}

export async function restoreAccountSession(payload) {
  return restoreAccountAccess(payload);
}
