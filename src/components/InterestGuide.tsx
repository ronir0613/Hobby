import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import { View, useColorScheme } from 'react-native';
import {
  difficultyLabel,
  formatMinutes,
  guideFacts,
  type CatalogueInterest,
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
      {open ? <IdeaSteps steps={idea.steps} /> : null}
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
