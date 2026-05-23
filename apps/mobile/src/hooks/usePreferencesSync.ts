import { useEffect, useRef } from 'react';
import i18n from '../i18n';
import { useAuthStore } from '../store/auth.store';
import { usePreferencesStore } from '../store/preferences.store';
import { fetchRemotePreferences, upsertRemotePreferences } from '../lib/prefsSync';

const DEBOUNCE_MS = 1500;

export function usePreferencesSync() {
  const { user, isAnonymous } = useAuthStore();
  const { preferences, setPreferences } = usePreferencesStore();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the last user id so we can detect login/logout transitions
  const lastUserIdRef = useRef<string | null>(null);
  // Prevent the initial load from writing back immediately
  const isSyncingFromRemote = useRef(false);

  // On login (or user change): pull remote prefs, apply if they exist
  useEffect(() => {
    if (!user || isAnonymous) {
      lastUserIdRef.current = null;
      return;
    }

    const userId = user.id;
    if (lastUserIdRef.current === userId) return;
    lastUserIdRef.current = userId;

    (async () => {
      try {
        const remote = await fetchRemotePreferences(userId);
        if (remote) {
          isSyncingFromRemote.current = true;
          setPreferences(remote);
          if (remote.locale) i18n.changeLanguage(remote.locale);
          // Allow a tick for the store to settle before re-enabling writes
          setTimeout(() => { isSyncingFromRemote.current = false; }, 0);
        } else {
          // No remote profile yet — push local prefs up
          await upsertRemotePreferences(userId, preferences);
        }
      } catch {
        // Network failures are silent — local prefs are always the fallback
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAnonymous]);

  // On preferences change: debounced write to Supabase
  useEffect(() => {
    if (!user || isAnonymous || isSyncingFromRemote.current) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      try {
        await upsertRemotePreferences(user.id, preferences);
      } catch {
        // Silent — local state is source of truth
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [preferences, user, isAnonymous]);
}
