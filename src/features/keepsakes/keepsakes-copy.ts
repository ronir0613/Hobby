/** Plain, non-blaming copy for a failed save or delete. */
export function keepsakeError(error: unknown, action: 'save' | 'delete' = 'save') {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (/network|fetch/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  if (/larger than 10 MB/.test(message)) return 'That photo is too large to save, even after shrinking it.';
  if (/could not be read/.test(message)) return 'That photo couldn’t be opened. Please try another one.';
  return action === 'delete' ? "That didn't delete just now. Please try again." : "That didn't save just now. Please try again.";
}
