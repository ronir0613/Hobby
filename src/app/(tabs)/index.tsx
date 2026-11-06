import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef } from 'react';
import { View, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { HOBBY_ART_ASPECT, HobbyArt } from '@/components/HobbyArt';
import { LockedChallengeCard } from '@/components/LockedChallengeCard';
import { PressableScale } from '@/components/PressableScale';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { useAuthStore } from '@/features/auth/auth-store';
import { formatMinutes, localDayNumber, type CatalogueInterest } from '@/features/explore/catalogue-model';
import { ensureCatalogue, loadCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { discoverPicks } from '@/features/quiz/quiz-model';
import { loadQuiz, useQuizStore } from '@/features/quiz/quiz-store';
import { darkColors, lightColors, space } from '@/theme/colors';

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

  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const total = catalogue?.interests.length ?? 0;

  return (
    <AppScreen>
      <View style={{ paddingTop: space['8'], paddingBottom: space['8'] }}>
        <AppText accessibilityRole="header" variant="display">
          {answers ? 'Picked for you' : 'A place to start'}
        </AppText>
        {picks?.featured.reason ? (
          <AppText tone="secondary" style={{ marginTop: space['2'] }}>
            {`${picks.featured.reason}.`}
          </AppText>
        ) : null}
        {picks && !answers ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityHint="Five quick questions that shape these picks"
            onPress={() => router.push('/quiz')}
            className="min-h-12 justify-center self-start"
          >
            <AppText tone="accent" weight="semibold" style={{ textDecorationLine: 'underline' }}>
              Get picks that suit you
            </AppText>
          </PressableScale>
        ) : null}

        {!catalogue && status === 'error' ? (
          <View style={{ marginTop: space['8'] }}>
            <ErrorMessage
              title="We couldn't load ideas just now."
              body="Check your connection, then try again."
              onAction={() => void loadCatalogue()}
            />
          </View>
        ) : !catalogue || !quizSettled ? (
          <View style={{ marginTop: space['6'] }}>
            <LoadingMessage label="Finding a few ideas…" />
          </View>
        ) : !picks ? (
          <View style={{ marginTop: space['8'] }}>
            <ErrorMessage
              title="No interests to show yet."
              body="New ones are on their way. Check back a little later."
              actionLabel="Check again"
              onAction={() => void loadCatalogue()}
              busy={status === 'loading'}
            />
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(240)}>
            <FeaturedCard interest={picks.featured.interest} onPress={() => openInterest(picks.featured.interest.slug)} />

            {picks.more.length > 0 ? (
              <>
                <AppText
                  accessibilityRole="header"
                  variant="heading"
                  style={{ marginTop: space['12'], marginBottom: space['4'] }}
                >
                  {answers ? 'More for you' : 'Or start anywhere'}
                </AppText>
                <View className="flex-row" style={{ gap: space['3'] }}>
                  {picks.more.map(({ interest }) => (
                    <SmallCard key={interest.id} interest={interest} onPress={() => openInterest(interest.slug)} />
                  ))}
                </View>
              </>
            ) : null}

            <PressableScale
              accessibilityRole="link"
              onPress={() => router.push('/explore')}
              className="min-h-12 flex-row items-center justify-between"
              style={{ marginTop: space['6'] }}
            >
              <AppText weight="semibold">{`See all ${total} interests`}</AppText>
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={colors.foregroundSecondary}
                size={24}
              />
            </PressableScale>

            <LockedChallengeCard />
          </Animated.View>
        )}
      </View>
    </AppScreen>
  );
}

const cardClass = 'overflow-hidden rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface';

function FeaturedCard({ interest, onPress }: { interest: CatalogueInterest; onPress: () => void }) {
  const starter = interest.starterIdeas[0];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityHint="Opens this interest"
      onPress={onPress}
      className={cardClass}
      style={{ marginTop: space['6'] }}
    >
      <HobbyArt slug={interest.slug} style={{ aspectRatio: HOBBY_ART_ASPECT }} />
      <View style={{ padding: space.card }}>
        <AppText variant="title">{interest.name}</AppText>
        {interest.description ? (
          <AppText tone="secondary" style={{ marginTop: space['1'] }}>
            {interest.description}
          </AppText>
        ) : null}
        {starter ? (
          <AppText style={{ marginTop: space['4'] }}>
            <AppText weight="semibold">First step: </AppText>
            {starter.title}
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}

function SmallCard({ interest, onPress }: { interest: CatalogueInterest; onPress: () => void }) {
  const minutes = minutesToBegin(interest);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityHint="Opens this interest"
      onPress={onPress}
      className={`flex-1 ${cardClass}`}
    >
      <HobbyArt slug={interest.slug} style={{ aspectRatio: HOBBY_ART_ASPECT }} />
      <View style={{ padding: space.tile }}>
        <AppText weight="semibold">{interest.name}</AppText>
        {minutes ? (
          <AppText variant="small" tone="secondary" style={{ marginTop: space['1'] }}>
            {formatMinutes(minutes)} to begin
          </AppText>
        ) : null}
      </View>
    </PressableScale>
  );
}
