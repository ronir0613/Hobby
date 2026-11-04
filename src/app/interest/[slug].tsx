import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { requireSignIn, useAuthStore } from '@/features/auth/auth-store';
import { interestTypeLabel } from '@/features/explore/catalogue-model';
import { ensureCatalogue, loadCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { createAttempt } from '@/services/attempts';

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
  const [saving, setSaving] = useState(false);
  const [planned, setPlanned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opened directly (deep link) before Explore loaded the catalogue.
  useEffect(() => ensureCatalogue(), []);

  async function tryThis() {
    if (!interest) return;
    if (!signedIn) {
      requireSignIn({ pathname: '/interest/[slug]', params: { slug: interest.slug } });
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createAttempt({ interest_id: interest.id, starter_idea_id: interest.starterIdeas[0]?.id ?? null });
      setPlanned(true);
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
    const starter = interest.starterIdeas[0];
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
        <View className="mt-5 self-start rounded-full bg-muted px-4 py-2 dark:bg-dark-muted">
          <AppText weight="medium" size={13}>
            {interestTypeLabel(interest.type)}
          </AppText>
        </View>

        {starter ? (
          <View className="mt-7 rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface">
            <AppText tone="secondary" size={13}>
              A first small step
            </AppText>
            <AppText weight="semibold" size={19} style={{ marginTop: 4 }}>
              {starter.title}
            </AppText>
            {starter.estimatedMinutes ? (
              <AppText tone="secondary" size={14} style={{ marginTop: 6 }}>
                About {starter.estimatedMinutes} minutes
              </AppText>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl border border-input-border bg-muted p-4 dark:border-dark-input-border dark:bg-dark-muted">
            <AppText accessibilityRole="alert" weight="medium" size={14}>
              {error}
            </AppText>
          </View>
        ) : null}
        {planned ? (
          <View accessibilityLiveRegion="polite" className="mt-4 rounded-2xl bg-secondary p-4 dark:bg-dark-secondary">
            <AppText size={14}>Added to your plans. Start whenever it suits you.</AppText>
          </View>
        ) : null}

        <ActionButton
          label={planned ? 'In your plans' : saving ? 'Adding…' : 'Try this'}
          onPress={tryThis}
          disabled={saving || planned}
          style={{ marginTop: 20 }}
        />
        {!planned ? (
          <AppText tone="secondary" size={13} style={{ marginTop: 10, textAlign: 'center' }}>
            {signedIn
              ? 'This adds it to your plans. Nothing starts until you are ready.'
              : 'You will sign in first, so your plans stay with your account.'}
          </AppText>
        ) : null}
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
