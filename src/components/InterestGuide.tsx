import * as Linking from 'expo-linking';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import { View, useColorScheme } from 'react-native';
import {
  difficultyLabel,
  formatMinutes,
  guideFacts,
  type CatalogueInterest,
  type IdeaLink,
  type StarterIdea,
} from '@/features/explore/catalogue-model';
import { darkColors, lightColors, space } from '@/theme/colors';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Glyph = ComponentProps<typeof SymbolView>['name'];
type AndroidGlyph = NonNullable<Extract<Glyph, { android?: unknown }>['android']>;
const glyph = (ios: SFSymbol, android: AndroidGlyph): Glyph => ({ ios, android, web: android });

function factGlyphs(interest: CatalogueInterest): Glyph[] {
  const glyphs = [
    interest.setting === 'outdoor' ? glyph('leaf', 'park') : glyph('house', 'home'),
    interest.social === 'solo' ? glyph('person', 'person') : glyph('person.2', 'group'),
  ];
  if (interest.sessionMinutes) glyphs.push(glyph('clock', 'schedule'));
  glyphs.push(glyph('creditcard', 'payments'));
  return glyphs;
}

/** Setting, company, time and cost as a quiet two-column list with icons (no pills). */
export function InterestFacts({ interest }: { interest: CatalogueInterest }) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const facts = guideFacts(interest);
  const glyphs = factGlyphs(interest);
  return (
    <View
      accessible
      accessibilityLabel={facts.join(', ')}
      className="flex-row flex-wrap"
      style={{ marginTop: space['6'], rowGap: space['3'] }}
    >
      {facts.map((fact, index) => (
        <View key={fact} className="w-1/2 flex-row items-center" style={{ gap: space['2'], paddingRight: space['2'] }}>
          <SymbolView name={glyphs[index]} tintColor={colors.foregroundSecondary} size={20} />
          <AppText style={{ flex: 1 }}>{fact}</AppText>
        </View>
      ))}
    </View>
  );
}

function ideaMeta(idea: StarterIdea) {
  return [
    idea.difficulty ? difficultyLabel(idea.difficulty) : null,
    idea.estimatedMinutes ? `About ${formatMinutes(idea.estimatedMinutes)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function IdeaHeader({ idea }: { idea: StarterIdea }) {
  const meta = ideaMeta(idea);
  return (
    <View className="flex-1">
      <AppText weight="semibold">{idea.title}</AppText>
      {meta ? (
        <AppText variant="small" tone="secondary" style={{ marginTop: space['1'] }}>
          {meta}
        </AppText>
      ) : null}
    </View>
  );
}

function IdeaSteps({ steps }: { steps: string[] }) {
  return (
    <View style={{ marginTop: space['3'], gap: space['2'] }}>
      {steps.map((step, index) => (
        <View key={index} className="flex-row" accessible accessibilityLabel={`Step ${index + 1}. ${step}`}>
          <AppText tone="secondary" style={{ width: 24 }}>
            {index + 1}.
          </AppText>
          <AppText style={{ flex: 1 }}>{step}</AppText>
        </View>
      ))}
    </View>
  );
}

/** One reference link. It opens in the phone's browser; a failure shows under it. */
function IdeaLinkRow({ link }: { link: IdeaLink }) {
  const [failed, setFailed] = useState(false);
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;

  async function open() {
    setFailed(false);
    try {
      await Linking.openURL(link.url);
    } catch {
      setFailed(true);
    }
  }

  return (
    <View>
      <PressableScale
        pressedScale={0.99}
        accessibilityRole="link"
        accessibilityLabel={`${link.title}, ${link.publisher}`}
        accessibilityHint="Opens in your browser"
        onPress={() => void open()}
        className="min-h-12 flex-row items-center gap-3"
      >
        <View className="flex-1">
          <AppText tone="accent" weight="semibold" style={{ textDecorationLine: 'underline' }}>
            {link.title}
          </AppText>
          <AppText variant="small" tone="secondary">
            {link.publisher}
          </AppText>
        </View>
        <SymbolView
          name={{ ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' }}
          tintColor={colors.foregroundSecondary}
          size={20}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </PressableScale>
      {failed ? (
        <AppText accessibilityRole="alert" accessibilityLiveRegion="polite" variant="small">
          We couldn&apos;t open this link. Check you have a web browser, then try again.
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * One starter idea as a row of the "Ways to begin" list. The first is open; the others fold to
 * their title and time and open on tap, so the screen reads as one next step.
 */
function IdeaRow({ idea, initiallyOpen }: { idea: StarterIdea; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const hasSteps = idea.steps.length > 0;
  const pad = { paddingHorizontal: space.card, paddingVertical: space['4'] };

  if (!hasSteps) {
    return (
      <View style={pad}>
        <IdeaHeader idea={idea} />
      </View>
    );
  }

  return (
    <View style={pad}>
      <PressableScale
        pressedScale={0.99}
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityHint={open ? 'Hides the steps' : 'Shows the steps'}
        onPress={() => setOpen((value) => !value)}
        className="min-h-12 flex-row items-center gap-3"
      >
        <IdeaHeader idea={idea} />
        <SymbolView
          name={
            open
              ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
              : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }
          }
          tintColor={colors.foregroundSecondary}
          size={24}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </PressableScale>
      {open ? (
        <>
          <IdeaSteps steps={idea.steps} />
          {idea.links.length > 0 ? (
            <View style={{ marginTop: space['3'] }}>
              {idea.links.map((link) => (
                <IdeaLinkRow key={link.id} link={link} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function SafetyNote({ note }: { note: string }) {
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  return (
    <View
      accessible
      accessibilityLabel={`Safety: ${note}`}
      className="flex-row rounded-tile border border-input-border bg-muted dark:border-dark-input-border dark:bg-dark-muted"
      style={{ marginTop: space['3'], padding: space['4'], gap: space['3'] }}
    >
      <SymbolView
        name={{ ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }}
        tintColor={colors.foreground}
        size={20}
      />
      <AppText variant="small" style={{ flex: 1 }}>
        {note}
      </AppText>
    </View>
  );
}

/** "What you'll need" and the starter ideas, easiest first, in one list. */
export function InterestGuide({ interest }: { interest: CatalogueInterest }) {
  return (
    <>
      {interest.needs ? (
        <View style={{ marginTop: space['8'] }}>
          <AppText accessibilityRole="header" variant="heading">
            What you&apos;ll need
          </AppText>
          <AppText tone="secondary" style={{ marginTop: space['2'] }}>
            {interest.needs}
          </AppText>
          {interest.safetyNote ? <SafetyNote note={interest.safetyNote} /> : null}
        </View>
      ) : null}
      {interest.starterIdeas.length > 0 ? (
        <View style={{ marginTop: space['8'] }}>
          <AppText accessibilityRole="header" variant="heading" style={{ marginBottom: space['3'] }}>
            Ways to begin
          </AppText>
          <View className="overflow-hidden rounded-card border border-border bg-surface dark:border-dark-border dark:bg-dark-surface">
            {interest.starterIdeas.map((idea, index) => (
              <View key={idea.id}>
                {index > 0 ? (
                  <View className="h-px bg-border dark:bg-dark-border" style={{ marginLeft: space.card }} />
                ) : null}
                <IdeaRow idea={idea} initiallyOpen={index === 0} />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}
