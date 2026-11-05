import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, View, useColorScheme } from 'react-native';
import {
  difficultyLabel,
  formatMinutes,
  guideFacts,
  interestTypeLabel,
  type CatalogueInterest,
  type StarterIdea,
} from '@/features/explore/catalogue-model';
import { darkColors, lightColors } from '@/theme/colors';
import { AppText } from './AppText';

/** Quick facts as quiet pills: hobby/habit, setting, company, time, cost. */
export function InterestFacts({ interest }: { interest: CatalogueInterest }) {
  const facts = [interestTypeLabel(interest.type), ...guideFacts(interest)];
  return (
    <View accessibilityLabel={facts.join(', ')} accessible className="mt-6 flex-row flex-wrap gap-2">
      {facts.map((fact) => (
        <View key={fact} className="rounded-full bg-muted px-4 py-2 dark:bg-dark-muted">
          <AppText weight="medium" size={13}>
            {fact}
          </AppText>
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
    <View className="flex-1 gap-1">
      {meta ? (
        <AppText tone="secondary" weight="medium" size={13}>
          {meta}
        </AppText>
      ) : null}
      <AppText weight="semibold" size={18}>
        {idea.title}
      </AppText>
    </View>
  );
}

function IdeaSteps({ steps }: { steps: string[] }) {
  return (
    <View className="mt-3 gap-2">
      {steps.map((step, index) => (
        <View key={index} className="flex-row" accessible accessibilityLabel={`Step ${index + 1}. ${step}`}>
          <AppText tone="secondary" weight="semibold" size={15} style={{ width: 24 }}>
            {index + 1}.
          </AppText>
          <AppText size={15} style={{ flex: 1 }}>
            {step}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * One starter idea. The first is shown open; the others fold to their title and time and open
 * on tap, so the screen reads as one next step instead of a page of instructions.
 */
function IdeaCard({ idea, initiallyOpen }: { idea: StarterIdea; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const colors = useColorScheme() === 'dark' ? darkColors : lightColors;
  const hasSteps = idea.steps.length > 0;
  const cardClass = 'rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface';

  if (!hasSteps || initiallyOpen) {
    return (
      <View className={cardClass}>
        <IdeaHeader idea={idea} />
        {hasSteps ? <IdeaSteps steps={idea.steps} /> : null}
      </View>
    );
  }

  return (
    <View className={cardClass}>
      <Pressable
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityHint={open ? 'Hides the steps' : 'Shows the steps'}
        onPress={() => setOpen((value) => !value)}
        className="min-h-12 flex-row items-center gap-3"
        style={({ pressed }) => ({ opacity: pressed ? 0.84 : 1 })}
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
      </Pressable>
      {open ? <IdeaSteps steps={idea.steps} /> : null}
    </View>
  );
}

/** "What you'll need" and the starter ideas, easiest first. */
export function InterestGuide({ interest }: { interest: CatalogueInterest }) {
  return (
    <>
      {interest.needs ? (
        <View className="mt-8 gap-1">
          <AppText accessibilityRole="header" weight="semibold" size={17}>
            What you&apos;ll need
          </AppText>
          <AppText tone="secondary" size={16}>
            {interest.needs}
          </AppText>
        </View>
      ) : null}
      {interest.starterIdeas.length > 0 ? (
        <View className="mt-8">
          <AppText accessibilityRole="header" weight="semibold" size={17}>
            Ways to begin
          </AppText>
          <View className="mt-3 gap-3">
            {interest.starterIdeas.map((idea, index) => (
              <IdeaCard key={idea.id} idea={idea} initiallyOpen={index === 0} />
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}
