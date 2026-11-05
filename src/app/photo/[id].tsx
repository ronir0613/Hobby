import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, View, useWindowDimensions } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import { ensureCatalogue } from '@/features/explore/catalogue-store';
import { loadHobbies, useHobbiesStore } from '@/features/hobbies/hobbies-store';
import { useAttemptTitle } from '@/features/hobbies/use-attempt-title';
import { createdLabel } from '@/features/keepsakes/KeepsakesSection';
import { keepsakeError } from '@/features/keepsakes/keepsakes-copy';
import { loadKeepsakes, removePhoto, useKeepsakesStore } from '@/features/keepsakes/keepsakes-store';

export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const signedIn = useAuthStore((state) => state.session !== null);
  const authReady = useAuthStore((state) => state.ready);
  const status = useKeepsakesStore((state) => state.status);
  const photo = useKeepsakesStore((state) => state.photos.find((p) => p.id === id));
  const url = useKeepsakesStore((state) => (photo ? state.urls[photo.storage_path] : undefined));
  const attempt = useHobbiesStore((state) => state.attempts.find((a) => a.id === photo?.attempt_id));
  const title = useAttemptTitle(attempt);
  const { width, height } = useWindowDimensions();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opened directly (deep link) before anything loaded.
  useEffect(() => {
    if (!authReady) return;
    ensureCatalogue();
    if (useKeepsakesStore.getState().status === 'idle') void loadKeepsakes();
    if (useHobbiesStore.getState().status === 'idle') void loadHobbies();
  }, [authReady, signedIn]);

  function confirmDelete() {
    if (!photo) return;
    Alert.alert('Delete this photo?', 'It will be removed for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setBusy(true);
          try {
            await removePhoto(photo);
            if (router.canGoBack()) router.back();
            else router.replace('/media');
          } catch (e) {
            if (__DEV__) console.warn('Deleting a photo failed', e);
            setError(keepsakeError(e, 'delete'));
            setBusy(false);
          }
        },
      },
    ]);
  }

  let body;
  if (!authReady) {
    body = <LoadingMessage label="Opening this photo…" />;
  } else if (!photo && status === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load this photo."
        body="Check your connection, then try again."
        onAction={() => void loadKeepsakes()}
      />
    );
  } else if (!photo && status !== 'ready') {
    body = <LoadingMessage label="Opening this photo…" />;
  } else if (!photo) {
    body = (
      <ErrorMessage
        title="We couldn't find this photo."
        body="It may have been deleted. Your other photos are on the Media tab."
        actionLabel="Go to Media"
        onAction={() => router.replace('/media')}
      />
    );
  } else {
    const imageWidth = Math.min(width - 44, 560);
    const label = createdLabel(photo.created_at);
    body = (
      <>
        {url ? (
          <Image
            source={{ uri: url }}
            accessibilityLabel={`Photo from ${label}`}
            style={{ width: imageWidth, height: Math.round(height * 0.6), borderRadius: 20 }}
            resizeMode="contain"
          />
        ) : (
          <ErrorMessage
            title="This photo didn't load."
            body="Check your connection, then try again."
            onAction={() => void loadKeepsakes()}
          />
        )}
        <AppText weight="semibold" size={18} style={{ marginTop: 18 }}>
          {title || 'Photo'}
        </AppText>
        <AppText tone="secondary" size={15} style={{ marginTop: 2 }}>
          {label}
        </AppText>
        <ActionButton
          label={busy ? 'Deleting…' : 'Delete photo'}
          variant="secondary"
          onPress={confirmDelete}
          disabled={busy}
          style={{ marginTop: 20 }}
        />
        {error ? (
          <View
            accessibilityLiveRegion="polite"
            className="mt-4 rounded-2xl border border-input-border bg-muted p-4 dark:border-dark-input-border dark:bg-dark-muted"
          >
            <AppText accessibilityRole="alert" weight="medium" size={14}>
              {error}
            </AppText>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-3">
        <BackButton fallback="/media" />
        <View className="mt-2.5">{body}</View>
      </View>
    </AppScreen>
  );
}
