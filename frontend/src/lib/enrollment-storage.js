const LEGACY_KEY_PREFIX = 'user_enrolled_';

function getStableUserIds(user) {
  return [user?.id, user?.username, user?.email]
    .map((value) => (value == null ? '' : String(value).trim()))
    .filter(Boolean);
}

export function getEnrollmentStorageKeys(user) {
  const stableIds = getStableUserIds(user);
  const keys = stableIds.map((value) => `${LEGACY_KEY_PREFIX}${value}`);
  return [...new Set(keys)];
}

export function readEnrollmentMap(user) {
  const keys = getEnrollmentStorageKeys(user);
  for (const key of keys) {
    const saved = localStorage.getItem(key);
    if (!saved) continue;

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Ignore malformed legacy storage and keep searching.
    }
  }

  return {};
}

export function writeEnrollmentMap(user, enrollmentMap) {
  const keys = getEnrollmentStorageKeys(user);
  if (keys.length === 0) return;

  const payload = JSON.stringify(enrollmentMap || {});
  keys.forEach((key) => {
    localStorage.setItem(key, payload);
  });
}