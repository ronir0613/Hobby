import { SymbolView } from 'expo-symbols';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, BackHandler, Text, View, useColorScheme } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { PressableScale } from '@/components/PressableScale';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { QUIZ_QUESTIONS, type QuizAnswers } from '@/features/quiz/quiz-model';
import { markQuizSeen, saveQuiz, useQuizStore } from '@/features/quiz/quiz-store';
import { darkColors, lightColors } from '@/theme/colors';

/** Long enough to see the chosen option fill before the next question. */
const ADVANCE_DELAY_MS = 160;

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function QuizScreen() {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const retake = useLocalSearchParams<{ retake?: string }>().retake === '1';
  const saved = useQuizStore((state) => state.answers);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<QuizAnswers>>(() => (retake && saved ? saved : {}));
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const advancing = useRef(false);
  const heading = useRef<ComponentRef<typeof Text>>(null);

  const question = QUIZ_QUESTIONS[step];
  const total = QUIZ_QUESTIONS.length;
  const isLast = step === total - 1;

  // Showing the quiz once is enough: skipping, closing or finishing all count.
  useEffect(() => markQuizSeen(), []);

  // Each question is a new screen for a screen reader.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
    }, 50);
    return () => clearTimeout(timer);
  }, [step]);

  const goBack = useCallback(() => {
    if (step === 0 || saving) return false;
    setFailed(false);
    setStep((s) => s - 1);
    return true;
  }, [step, saving]);

  // Android back steps through the questions; on the first it leaves, like Skip.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => sub.remove();
    }, [goBack]),
  );

  async function finish(answers: QuizAnswers) {
    setSaving(true);
    setFailed(false);
    try {
      await saveQuiz(answers);
      close();
    } catch (error) {
      if (__DEV__) console.warn('Saving quiz answers failed', error);
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  function choose(value: string) {
    if (advancing.current || saving) return;
    const next = { ...draft, [question.key]: value } as Partial<QuizAnswers>;
    setDraft(next);
    advancing.current = true;
    setTimeout(() => {
      advancing.current = false;
      if (isLast) void finish(next as QuizAnswers);
      else setStep((s) => s + 1);
    }, ADVANCE_DELAY_MS);
  }

  const chosen = draft[question.key];

  return (
    <AppScreen>
      <View className="flex-row items-center justify-between pt-2">
        {step > 0 ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Previous question"
            onPress={goBack}
            disabled={saving}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ marginLeft: -12 }}
          >
            <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={colors.foreground} size={24} />
          </PressableScale>
        ) : (
          <View className="h-12 w-12" />
        )}
        <PressableScale
          accessibilityRole="button"
          accessibilityHint={retake ? 'Keeps your earlier answers' : 'Shows today’s ideas instead'}
          onPress={close}
          disabled={saving}
          className="min-h-12 justify-center px-3"
          style={{ marginRight: -12 }}
        >
          <AppText weight="semibold" style={{ textDecorationLine: 'underline' }}>
            {retake ? 'Cancel' : 'Skip'}
          </AppText>
        </PressableScale>
      </View>

      <View className="pb-8 pt-8">
        <AppText tone="secondary" variant="small" weight="medium">
          {`Question ${step + 1} of ${total}`}
        </AppText>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Quiz progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={step + 1}
          className="mt-3 h-1 overflow-hidden rounded-full bg-border dark:bg-dark-border"
        >
          <View className="h-full rounded-full bg-accent dark:bg-dark-accent" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </View>

        <AppText
          ref={heading}
          accessibilityRole="header"
          variant="display"
          style={{ marginTop: 32 }}
        >
          {question.title}
        </AppText>
        {step === 0 ? (
          <AppText tone="secondary" style={{ marginTop: 8 }}>
            {retake ? 'Change what you like. Discover updates when you finish.' : 'Five quick taps, and Discover suggests ideas that suit you.'}
          </AppText>
        ) : null}

        <View accessibilityRole="radiogroup" accessibilityLabel={question.title} className="mt-8 gap-3">
          {question.options.map((option) => {
            const selected = option.value === chosen;
            return (
              <PressableScale
                key={option.value}
                accessibilityRole="radio"
                aria-checked={selected}
                aria-disabled={saving}
                disabled={saving}
                onPress={() => choose(option.value)}
                className={`min-h-14 flex-row items-center justify-between rounded-tile border px-4 py-4 ${
                  selected
                    ? 'border-accent bg-accent dark:border-dark-accent dark:bg-dark-accent'
                    : 'border-border bg-surface dark:border-dark-border dark:bg-dark-surface'
                }`}
              >
                <AppText tone={selected ? 'onAccent' : 'primary'} weight={selected ? 'semibold' : 'medium'} >
                  {option.label}
                </AppText>
                {selected ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    tintColor={colors.accentForeground}
                    size={24}
                  />
                ) : null}
              </PressableScale>
            );
          })}
        </View>

        {saving ? (
          <View className="mt-6">
            <LoadingMessage label="Saving your answers…" />
          </View>
        ) : failed ? (
          <View className="mt-6">
            <ErrorMessage
              title="We couldn’t save your answers."
              body="Check your connection, then try again."
              onAction={() => void finish(draft as QuizAnswers)}
            />
          </View>
        ) : null}
      </View>
    </AppScreen>
  );
}
