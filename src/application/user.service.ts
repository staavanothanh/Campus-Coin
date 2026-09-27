import { invalidInput, notFound } from '../domain/errors.js';
import { withConnection } from '../infrastructure/db/pool.ts';
import { updateUserProfile } from '../infrastructure/persistence/user.repository.ts';

export async function updateUserPreferences(userId: number, input: Record<string, unknown>) {
  if (!Number.isSafeInteger(userId) || userId < 1) throw notFound();
  const allowedKeys = new Set(['displayName', 'locale']);
  if (Object.keys(input).some(key => !allowedKeys.has(key))) throw invalidInput('unsupported preference');

  const patch: { displayName?: string; locale?: 'en' | 'vi' } = {};
  if (input.displayName !== undefined) {
    if (typeof input.displayName !== 'string') throw invalidInput('displayName must be text');
    const displayName = input.displayName.trim();
    if (displayName.length < 2 || displayName.length > 120) throw invalidInput('displayName length is invalid');
    patch.displayName = displayName;
  }
  if (input.locale !== undefined) {
    if (input.locale !== 'en' && input.locale !== 'vi') throw invalidInput('locale must be en or vi');
    patch.locale = input.locale;
  }
  if (Object.keys(patch).length === 0) throw invalidInput('at least one preference is required');

  return withConnection(async connection => {
    const user = await updateUserProfile(connection, userId, patch);
    if (!user) throw notFound();
    return user;
  });
}
