import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, TextInput, View, useColorScheme } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { InterestCard } from '@/components/InterestCard';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { ensureCatalogue, loadCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { useExploreStore } from '@/features/explore/explore-store';
import { ALL_CATEGORIES, filterInterests } from '@/features/explore/filter-interests';
import { darkColors, lightColors } from '@/theme/colors';

export default function ExploreScreen() {
  const searchText = useExploreStore((state) => state.searchText);
  const selectedCategory = useExploreStore((state) => state.selectedCategory);
  const setSearchText = useExploreStore((state) => state.setSearchText);
  const setSelectedCategory = useExploreStore((state) => state.setSelectedCategory);
  const status = useCatalogueStore((state) => state.status);
  const catalogue = useCatalogueStore((state) => state.catalogue);
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = scheme === 'dark' ? darkColors : lightColors;

  useEffect(() => ensureCatalogue(), []);

  const categories = useMemo(
    () => [ALL_CATEGORIES, ...(catalogue?.categories.map((category) => category.name) ?? [])],
    [catalogue],
  );
  const filteredInterests = useMemo(
    () => filterInterests(catalogue?.interests ?? [], searchText, selectedCategory),
    [catalogue, searchText, selectedCategory],
  );
  const hasFilters = searchText.trim().length > 0 || selectedCategory !== ALL_CATEGORIES;

  return (
    <AppScreen>
      <View className="pb-7 pt-7">
        <AppText tone="secondary" weight="semibold" size={12} style={{ letterSpacing: 1.5 }}>
          FOLLOW A THREAD
        </AppText>
        <AppText accessibilityRole="header" weight="medium" size={34} style={{ lineHeight: 40, marginTop: 13, letterSpacing: -0.7 }}>
          Find your next small thing.
        </AppText>
        <AppText tone="secondary" size={16} style={{ marginTop: 9, marginBottom: 22 }}>
          Browse at your own pace. There is no wrong place to begin.
        </AppText>

        <AppText weight="semibold" size={14} style={{ marginBottom: 7 }}>
          Search interests
        </AppText>
        <TextInput
          accessibilityLabel="Search interests"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-2xl border border-input-border bg-surface px-4 text-base dark:border-dark-input-border dark:bg-dark-surface"
          onChangeText={setSearchText}
          placeholder="Try cooking, music, or outdoors"
          placeholderTextColor={colors.foregroundSecondary}
          returnKeyType="search"
          style={{ color: colors.foreground, fontFamily: 'HankenGrotesk_400Regular' }}
          value={searchText}
        />

        {!catalogue && status === 'error' ? (
          <View className="mt-6">
            <ErrorMessage
              title="We couldn't load interests."
              body="Check your connection, then try again."
              onAction={() => void loadCatalogue()}
            />
          </View>
        ) : !catalogue ? (
          <View className="mt-4">
            <LoadingMessage label="Gathering interests…" />
          </View>
        ) : (
          <>
            <AppText weight="semibold" size={14} style={{ marginTop: 22, marginBottom: 9 }}>
              Browse by category
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
              accessibilityLabel="Interest categories"
            >
              {categories.map((category) => {
                const selected = selectedCategory === category;
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${category}${selected ? ', selected' : ''}`}
                    onPress={() => setSelectedCategory(category)}
                    className={`min-h-12 justify-center rounded-full border px-4 ${
                      selected
                        ? 'border-accent bg-accent dark:border-dark-accent dark:bg-dark-accent'
                        : 'border-border bg-surface dark:border-dark-border dark:bg-dark-surface'
                    }`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
                  >
                    <AppText tone={selected ? 'onAccent' : 'primary'} weight="medium" size={14}>
                      {category}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="mt-6 mb-3 flex-row items-center justify-between">
              <AppText weight="semibold" size={18}>
                {filteredInterests.length} {filteredInterests.length === 1 ? 'interest' : 'interests'}
              </AppText>
              {hasFilters ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search and category filters"
                  onPress={() => {
                    setSearchText('');
                    setSelectedCategory(ALL_CATEGORIES);
                  }}
                  className="min-h-12 justify-center px-2"
                >
                  <AppText tone="secondary" weight="semibold" size={14}>
                    Clear filters
                  </AppText>
                </Pressable>
              ) : null}
            </View>

            {filteredInterests.length > 0 ? (
              filteredInterests.map((interest) => (
                <InterestCard
                  key={interest.id}
                  interest={{ ...interest, starterIdea: interest.starterIdeas[0]?.title }}
                  onPress={() => router.push({ pathname: '/interest/[slug]', params: { slug: interest.slug } })}
                />
              ))
            ) : catalogue.interests.length === 0 ? (
              <ErrorMessage
                title="No interests to show yet."
                body="New ones are on their way. Check back a little later."
                actionLabel="Check again"
                onAction={() => void loadCatalogue()}
                busy={status === 'loading'}
              />
            ) : (
              <View className="mt-2 rounded-card border border-border bg-surface p-6 dark:border-dark-border dark:bg-dark-surface">
                <AppText weight="semibold" size={20}>
                  Nothing here just yet.
                </AppText>
                <AppText tone="secondary" size={15} style={{ marginTop: 7 }}>
                  Try a different word or browse all interests.
                </AppText>
              </View>
            )}
          </>
        )}
      </View>
    </AppScreen>
  );
}
