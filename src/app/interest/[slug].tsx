import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { InterestFacts, InterestGuide } from '@/components/InterestGuide';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import { ensureCatalogue, loadCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { giveAnotherGo, loadHobbies, startAttempt, useHobbiesStore } from '@/features/hobbies/hobbies-store';

function friendlyError(error: unknown) {
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
  if (/network|fetch/i.test(message)) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return "We couldn't add this just now. Please try again.";
}

export default function InterestScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const status = useCatalogueStore((state) => state.status);
  const interest = useCatalogueStore((state) => state.catalogue?.interests.find((item) => item.slug === slug));
  const hasCatalogue = useCatalogueStore((state) => state.catalogue !== null);
  const signedIn = useAuthStore((state) => state.session !== null);
  const authReady = useAuthStore((state) => state.ready);
  const hobbiesStatus = useHobbiesStore((state) => state.status);
  const existing = useHobbiesStore((state) =>
    interest ? state.attempts.find((attempt) => attempt.interest_id === interest.id) : undefined,
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Opened directly (deep link) before Explore loaded the catalogue.
  useEffect(() => ensureCatalogue(), []);
  // Know whether this interest is already in My hobbies (one attempt per interest).
  useEffect(() => {
    if (authReady && useHobbiesStore.getState().status === 'idle') void loadHobbies();
  }, [authReady, signedIn]);

  async function tryThis() {
    if (!interest) return;
    setError(null);
    setSaving(true);
    try {
      if (!existing) {
        await startAttempt(interest.id, interest.starterIdeas[0]?.id ?? null);
        setNotice('Added to your plans. Start whenever it suits you.');
      } else if (existing.status === 'completed' || existing.status === 'dropped') {
        await giveAnotherGo(existing.id);
        setNotice('Back in your plans. Your new go starts with your next check-in.');
      }
    } catch (e) {
      if (__DEV__) console.warn('Creating an attempt failed', e);
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  let body;
  if (!hasCatalogue && status === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load this interest."
        body="Check your connection, then try again."
        onAction={() => void loadCatalogue()}
      />
    );
  } else if (!hasCatalogue) {
    body = <LoadingMessage label="Opening this interest…" />;
  } else if (!interest) {
    body = (
      <ErrorMessage
        title="We couldn't find that interest."
        body="It may have moved. Have a look around Explore instead."
        actionLabel="Go to Explore"
        onAction={() => router.replace('/explore')}
      />
    );
  } else {
    body = (
      <>
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
          {interest.category}
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={34} style={{ lineHeight: 40, marginTop: 13, letterSpacing: -0.7 }}>
          {interest.name}
        </AppText>
        {interest.description ? (
          <AppText tone="secondary" size={16} style={{ marginTop: 9 }}>
            {interest.description}
          </AppText>
        ) : null}
        <InterestFacts interest={interest} />
        <InterestGuide interest={interest} />

        {error ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl border border-input-border bg-muted p-4 dark:border-dark-input-border dark:bg-dark-muted">
            <AppText accessibilityRole="alert" weight="medium" size={14}>
              {error}
            </AppText>
          </View>
        ) : null}
        {notice ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl bg-secondary p-4 dark:bg-dark-secondary">
            <AppText size={14}>{notice}</AppText>
          </View>
        ) : null}

        {hobbiesStatus !== 'ready' && hobbiesStatus !== 'error' ? (
          <LoadingMessage label="Checking your hobbies…" />
        ) : existing && (existing.status === 'planned' || existing.status === 'active') ? (
          <>
            <ActionButton
              label="Open in My hobbies"
              onPress={() => router.push({ pathname: '/attempt/[id]', params: { id: existing.id } })}
              style={{ marginTop: 32 }}
            />
            {!notice ? (
              <AppText tone="secondary" size={13} style={{ marginTop: 10, textAlign: 'center' }}>
                {existing.status === 'active' ? 'You are already giving this a go.' : 'This is already in your plans.'}
              </AppText>
            ) : null}
          </>
        ) : existing ? (
          <>
            <ActionButton
              label={saving ? 'Starting…' : 'Give it another go'}
              onPress={tryThis}
              disabled={saving}
              style={{ marginTop: 32 }}
            />
            <AppText tone="secondary" size={13} style={{ marginTop: 10, textAlign: 'center' }}>
              {`${existing.status === 'completed' ? 'You gave this a real go before.' : 'You set this aside before.'} This starts a new go, and your earlier days stay in its history.`}
            </AppText>
          </>
        ) : (
          <>
            <ActionButton
              label={saving ? 'Adding…' : 'Try this'}
              onPress={tryThis}
              disabled={saving}
              style={{ marginTop: 32 }}
            />
            <AppText tone="secondary" size={13} style={{ marginTop: 10, textAlign: 'center' }}>
              {signedIn
                ? 'This adds it to your plans. Nothing starts until you are ready.'
                : 'This adds it to your plans, saved on this phone. Nothing starts until you are ready.'}
            </AppText>
          </>
        )}
      </>
    );
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-3">
        <BackButton fallback="/explore" />
        <View className="mt-2.5">{body}</View>
      </View>
    </AppScreen>
  );
}
