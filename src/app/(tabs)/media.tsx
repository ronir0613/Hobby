import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { SymbolView } from 'expo-symbols';
import { View, useColorScheme, useWindowDimensions } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { PressableScale } from '@/components/PressableScale';
import { AppText } from '@/components/AppText';
import { CategoryArt } from '@/components/CategoryArt';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import { ensureCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { sortAttempts } from '@/features/hobbies/hobbies-model';
import { loadHobbies, useHobbiesStore } from '@/features/hobbies/hobbies-store';
import { useAttemptTitle } from '@/features/hobbies/use-attempt-title';
import { createdLabel } from '@/features/keepsakes/KeepsakesSection';
import { groupByAttempt, keepsakesSummary, notePreview } from '@/features/keepsakes/keepsakes-model';
import { loadKeepsakes, useKeepsakesStore } from '@/features/keepsakes/keepsakes-store';
import { PhotoTile } from '@/features/keepsakes/PhotoTile';
import type { Attempt } from '@/services/attempts';
import type { JournalEntry } from '@/services/journal';
import type { MediaAsset } from '@/services/media';
import { darkColors, lightColors, radius, space } from '@/theme/colors';

const GAP = 8;
const NO_NOTES: JournalEntry[] = [];
const NO_PHOTOS: MediaAsset[] = [];

function HobbyKeepsakes({ attempt, notes, photos }: { attempt: Attempt; notes: JournalEntry[]; photos: MediaAsset[] }) {
  const title = useAttemptTitle(attempt);
  const summary = keepsakesSummary(notes.length, photos.length);
  const { width } = useWindowDimensions();
  // Three tiles across the card's content width (screen gutters and card padding on each side).
  const tile = Math.floor((Math.min(width - space.gutter * 2, 560) - space.card * 2 - GAP * 2) / 3);
  const categorySlug = useCatalogueStore((state) =>
    attempt.interest_id ? state.catalogue?.interests.find((i) => i.id === attempt.interest_id)?.categorySlug : undefined,
  );
  const latest = notes[0];
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;

  return (
    <View className="rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${summary}`}
        accessibilityHint="Opens this hobby to add or change notes and photos"
        onPress={() => router.push({ pathname: '/attempt/[id]', params: { id: attempt.id } })}
        pressedScale={0.99}
        className="min-h-12 flex-row items-center gap-4"
      >
        <CategoryArt slug={categorySlug ?? ''} style={{ width: 48, height: 48, borderRadius: radius.tile - 4 }} />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold">{title}</AppText>
          <AppText tone="secondary" variant="small" style={{ marginTop: 4 }}>
            {summary}
          </AppText>
        </View>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          tintColor={colors.foregroundSecondary}
          size={24}
        />
      </PressableScale>
      {photos.length > 0 ? (
        <View className="mt-4 flex-row" style={{ gap: GAP }}>
          {photos.slice(0, 3).map((photo) => (
            <PhotoTile key={photo.id} photo={photo} size={tile} label={`${title} photo from ${createdLabel(photo.created_at)}`} />
          ))}
        </View>
      ) : null}
      {latest ? (
        <AppText style={{ marginTop: 12 }}>
          <AppText tone="secondary">{`${createdLabel(latest.created_at)} · `}</AppText>
          {notePreview(latest.content)}
        </AppText>
      ) : null}
    </View>
  );
}

export default function MediaScreen() {
  const signedIn = useAuthStore((state) => state.session !== null);
  const authReady = useAuthStore((state) => state.ready);
  const hobbiesStatus = useHobbiesStore((state) => state.status);
  const attempts = useHobbiesStore((state) => state.attempts);
  const keepsakesStatus = useKeepsakesStore((state) => state.status);
  const notes = useKeepsakesStore((state) => state.notes);
  const photos = useKeepsakesStore((state) => state.photos);

  const sorted = useMemo(() => sortAttempts(attempts), [attempts]);
  const notesByAttempt = useMemo(() => groupByAttempt(notes), [notes]);
  const photosByAttempt = useMemo(() => groupByAttempt(photos), [photos]);

  useFocusEffect(
    useCallback(() => {
      if (!authReady) return;
      ensureCatalogue(); // for hobby names
      void loadHobbies();
      void loadKeepsakes(); // also refreshes the signed photo URLs
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signedIn: reload when the space (account or phone) changes
    }, [authReady, signedIn]),
  );

  let body;
  if (!authReady) {
    body = <LoadingMessage label="Loading your notes and photos…" />;
  } else if (hobbiesStatus === 'error' || keepsakesStatus === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load your notes and photos."
        body="Check your connection, then try again."
        onAction={() => {
          void loadHobbies();
          void loadKeepsakes();
        }}
      />
    );
  } else if (hobbiesStatus !== 'ready' || keepsakesStatus !== 'ready') {
    body = <LoadingMessage label="Loading your notes and photos…" />;
  } else if (sorted.length === 0) {
    body = (
      <>
        <AppText weight="semibold">Your keepsakes will go here.</AppText>
        <AppText tone="secondary" style={{ marginTop: 4 }}>
          Pick something to try, then add notes and photos from it whenever you like.
        </AppText>
        <ActionButton label="Find an idea to try" href="/explore" style={{ marginTop: 16, alignSelf: 'flex-start' }} />
      </>
    );
  } else {
    body = (
      <View className="gap-3">
        {sorted.map((attempt) => (
          <HobbyKeepsakes
            key={attempt.id}
            attempt={attempt}
            notes={notesByAttempt[attempt.id] ?? NO_NOTES}
            photos={photosByAttempt[attempt.id] ?? NO_PHOTOS}
          />
        ))}
      </View>
    );
  }

  return (
    <AppScreen>
      <View className="pb-8 pt-8">
        <AppText accessibilityRole="header" variant="display">
          Media
        </AppText>
        <AppText tone="secondary" style={{ marginTop: 8, marginBottom: 32 }}>
          Notes and photos from your hobbies.
        </AppText>
        {body}
      </View>
    </AppScreen>
  );
}
