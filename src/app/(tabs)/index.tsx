import { router } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import { formatMinutes, localDayNumber, type CatalogueInterest } from '@/features/explore/catalogue-model';
import { ensureCatalogue, loadCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { discoverPicks } from '@/features/quiz/quiz-model';
import { loadQuiz, useQuizStore } from '@/features/quiz/quiz-store';

/** The first starter idea's time, else a typical session. */
function minutesToBegin(interest: CatalogueInterest) {
  return interest.starterIdeas[0]?.estimatedMinutes ?? interest.sessionMinutes;
}

export default function DiscoverScreen() {
  const status = useCatalogueStore((state) => state.status);
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const openInterest = (slug: string) => router.push({ pathname: '/interest/[slug]', params: { slug } });

  const authReady = useAuthStore((state) => state.ready);
  const quizStatus = useQuizStore((state) => state.status);
  const answers = useQuizStore((state) => state.answers);
  const seen = useQuizStore((state) => state.seen);
  const quizSettled = quizStatus === 'ready' || quizStatus === 'error';

  useEffect(() => ensureCatalogue(), []);
  // The answers belong to the space (account or phone), so wait until the session is known.
  useEffect(() => {
    if (authReady && quizStatus === 'idle') void loadQuiz();
  }, [authReady, quizStatus]);

  // First open on this phone: offer the quiz once.
  const offered = useRef(false);
  useEffect(() => {
    if (!quizSettled || seen !== false || offered.current) return;
    offered.current = true;
    router.push('/quiz');
  }, [quizSettled, seen]);

  // Ranked by the quiz answers, or today's rotation without them. Ties and the rotation change at
  // local midnight (or when the catalogue or answers change).
  const picks = useMemo(
    () => (quizSettled ? discoverPicks(catalogue?.interests ?? [], answers, localDayNumber(new Date())) : null),
    [catalogue, answers, quizSettled],
  );

  return (
    <AppScreen>
      <View className="pb-7 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          MAKE ROOM FOR PLAY
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={38} style={{ lineHeight: 44, marginTop: 15, letterSpacing: -1.2 }}>
          A little curiosity can go a long way.
        </AppText>
        <AppText tone="secondary" size={17} style={{ marginTop: 14, maxWidth: 430 }}>
          Find an interest that feels like you, then try it in a small, unhurried way.
        </AppText>

        {!catalogue && status === 'error' ? (
          <View className="mt-8">
            <ErrorMessage
              title="We couldn't load ideas just now."
              body="Check your connection, then try again."
              onAction={() => void loadCatalogue()}
            />
          </View>
        ) : !catalogue || !quizSettled ? (
          <View className="mt-6">
            <LoadingMessage label="Finding a few ideas…" />
          </View>
        ) : !picks ? (
          <View className="mt-8">
            <ErrorMessage
              title="No interests to show yet."
              body="New ones are on their way. Check back a little later."
              actionLabel="Check again"
              onAction={() => void loadCatalogue()}
              busy={status === 'loading'}
            />
          </View>
        ) : (
          <FeaturedCard
            interest={picks.featured.interest}
            reason={picks.featured.reason}
            onPress={() => openInterest(picks.featured.interest.slug)}
          />
        )}

        <ActionButton label="Explore all interests" href="/explore" style={{ marginTop: 22 }} />
        {picks && !answers ? (
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Five quick questions that shape these picks"
            onPress={() => router.push('/quiz')}
            className="mt-2 min-h-12 items-center justify-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <AppText weight="semibold" size={15} style={{ textDecorationLine: 'underline' }}>
              Get picks that suit you
            </AppText>
          </Pressable>
        ) : null}

        {picks && picks.more.length > 0 ? (
          <View className="mt-10">
            <AppText weight="semibold" size={21}>
              Or start anywhere
            </AppText>
            <AppText tone="secondary" size={15} style={{ marginTop: 4, marginBottom: 13 }}>
              No plan needed. Just follow a small spark.
            </AppText>
            <View className="flex-row gap-3">
              {picks.more.map(({ interest, reason }) => {
                const minutes = minutesToBegin(interest);
                return (
                  <Pressable
                    key={interest.id}
                    accessibilityRole="button"
                    accessibilityHint="Opens this interest"
                    onPress={() => openInterest(interest.slug)}
                    className="min-h-24 flex-1 justify-between rounded-2xl border border-border bg-surface p-4 dark:border-dark-border dark:bg-dark-surface"
                    style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
                  >
                    <View>
                      <AppText weight="semibold" size={16}>
                        {interest.name}
                      </AppText>
                      {reason ? (
                        <AppText tone="secondary" size={13} style={{ marginTop: 4 }}>
                          {reason}
                        </AppText>
                      ) : null}
                    </View>
                    {minutes && !reason ? (
                      <AppText tone="secondary" size={13}>
                        {formatMinutes(minutes)} to begin
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}

function FeaturedCard({ interest, reason, onPress }: { interest: CatalogueInterest; reason: string | null; onPress: () => void }) {
  const minutes = minutesToBegin(interest);
  const starter = interest.starterIdeas[0];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens this interest"
      onPress={onPress}
      className="mt-8 overflow-hidden rounded-[28px] bg-secondary p-6 dark:bg-dark-secondary"
      style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="absolute -right-7 -top-8 h-36 w-36 rounded-full border-[18px] border-accent-soft dark:border-dark-accent-soft"
      />
      <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.3 }}>
        {reason ? 'PICKED FOR YOU' : 'A GENTLE PLACE TO START'}
      </AppText>
      <AppText weight="semibold" size={26} style={{ marginTop: 17 }}>
        {interest.name}
      </AppText>
      <AppText size={16} style={{ marginTop: 5, maxWidth: 300 }}>
        {interest.description}
      </AppText>
      {reason ? (
        <View className="mt-6 self-start rounded-full bg-surface px-4 py-2 dark:bg-dark-surface">
          <AppText weight="medium" size={13}>
            {reason}
          </AppText>
        </View>
      ) : minutes ? (
        <View className="mt-6 self-start rounded-full bg-surface px-4 py-2 dark:bg-dark-surface">
          <AppText weight="medium" size={13}>
            About {formatMinutes(minutes)}
          </AppText>
        </View>
      ) : null}
      {starter ? (
        <View className="mt-6 border-t border-border/70 pt-4 dark:border-dark-border">
          <AppText tone="secondary" size={13}>
            TRY THIS
          </AppText>
          <AppText weight="medium" size={17} style={{ marginTop: 4, maxWidth: 420 }}>
            {starter.title}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}
