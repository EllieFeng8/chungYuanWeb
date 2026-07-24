const ACCOUNT_PASSWORDS_STORAGE_KEY = 'accountPasswordsByName';

function normalizeAccountName(accountName) {
  return String(accountName ?? '').trim().toLowerCase();
}

function readPasswordMap() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = localStorage.getItem(ACCOUNT_PASSWORDS_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : {};
    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {};
  } catch {
    return {};
  }
}

function writePasswordMap(passwordMap) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ACCOUNT_PASSWORDS_STORAGE_KEY, JSON.stringify(passwordMap));
}

export function getBoundAccountPassword(accountName) {
  const normalizedAccountName = normalizeAccountName(accountName);
  if (!normalizedAccountName) {
    return null;
  }

  const passwordMap = readPasswordMap();
  return passwordMap[normalizedAccountName] ?? null;
}

export function setBoundAccountPassword(accountName, password) {
  const normalizedAccountName = normalizeAccountName(accountName);
  if (!normalizedAccountName) {
    return;
  }

  const passwordMap = readPasswordMap();
  passwordMap[normalizedAccountName] = String(password ?? '');
  writePasswordMap(passwordMap);
}

export function isBoundAccountPassword(accountName, password) {
  const boundPassword = getBoundAccountPassword(accountName);
  return boundPassword !== null && String(password ?? '') === boundPassword;
}
