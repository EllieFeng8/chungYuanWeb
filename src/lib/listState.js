export const APPROVAL_LIST_STATE_STORAGE_KEY = 'approvalListState';

const LIST_STATE_STORAGE_KEYS = [
  APPROVAL_LIST_STATE_STORAGE_KEY,
];

export function clearPersistedListStates() {
  LIST_STATE_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
