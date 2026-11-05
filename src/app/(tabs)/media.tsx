import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import { ensureCatalogue } from '@/features/explore/catalogue-store';
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

const GAP = 8;
const NO_NOTES: JournalEntry[] = [];
const NO_PHOTOS: MediaAsset[] = [];

function HobbyKeepsakes({ attempt, notes, photos }: { attempt: Attempt; notes: JournalEntry[]; photos: MediaAsset[] }) {
  const title = useAttemptTitle(attempt);
  const summary = keepsakesSummary(notes.length, photos.length);
  const { width } = useWindowDimensions();
  // Card padding is 20 on each side.
  const tile = Math.floor((Math.min(width - 44, 560) - 40 - GAP * 2) / 3);
  const latest = notes[0];

  return (
    <View className="rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${summary}`}
        accessibilityHint="Opens this hobby to add or change notes and photos"
        onPress={() => router.push({ pathname: '/attempt/[id]', params: { id: attempt.id } })}
        className="min-h-12 flex-row items-center justify-between gap-3"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" size={18}>
            {title}
          </AppText>
          <AppText tone="secondary" size={14} style={{ marginTop: 2 }}>
            {summary}
          </AppText>
        </View>
        <AppText weight="semibold" size={15} tone="secondary">
          Open ›
        </AppText>
      </Pressable>
      {photos.length > 0 ? (
        <View className="mt-4 flex-row" style={{ gap: GAP }}>
          {photos.slice(0, 3).map((photo) => (
            <PhotoTile key={photo.id} photo={photo} size={tile} label={`${title} photo from ${createdLabel(photo.created_at)}`} />
          ))}
        </View>
      ) : null}
      {latest ? (
        <AppText size={15} style={{ marginTop: 14 }}>
          <AppText tone="secondary" size={15}>{`${createdLabel(latest.created_at)} · `}</AppText>
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
        <View className="min-h-72 justify-center rounded-[28px] border border-border bg-surface p-7 dark:border-dark-border dark:bg-dark-surface">
          <View className="mb-6 h-24 w-24 items-center justify-center self-center rounded-[26px] bg-secondary dark:bg-dark-secondary">
            <View className="h-14 w-14 rotate-[-8deg] rounded-2xl border-2 border-accent dark:border-dark-accent" />
            <View className="absolute h-14 w-14 translate-x-3 translate-y-2 rotate-[8deg] rounded-2xl border-2 border-accent-soft dark:border-dark-accent-soft" />
          </View>
          <AppText weight="semibold" size={22} style={{ textAlign: 'center' }}>
            Your keepsakes will go here.
          </AppText>
          <AppText tone="secondary" size={15} style={{ textAlign: 'center', marginTop: 8 }}>
            Pick something to try, then add notes and photos from it whenever you like.
          </AppText>
        </View>
        <ActionButton label="Find an idea to try" href="/explore" style={{ marginTop: 22 }} />
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
      <View className="pb-8 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          LITTLE MOMENTS, KEPT
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={34} style={{ lineHeight: 40, marginTop: 13, letterSpacing: -0.7 }}>
          A home for the things you make.
        </AppText>
        <AppText tone="secondary" size={16} style={{ marginTop: 9, marginBottom: 24 }}>
          Notes and photos from each of your hobbies. Open a hobby to add more.
        </AppText>
        {body}
      </View>
    </AppScreen>
  );
}
