import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, TextInput, View, useColorScheme } from 'react-native';
import { AppScreen } from '@/components/AppScreen';
import { AppText } from '@/components/AppText';
import { InterestCard } from '@/components/InterestCard';
import { PressableScale } from '@/components/PressableScale';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { ensureCatalogue, loadCatalogue, useCatalogueStore } from '@/features/explore/catalogue-store';
import { useExploreStore } from '@/features/explore/explore-store';
import { ALL_CATEGORIES, filterInterests } from '@/features/explore/filter-interests';
import { darkColors, lightColors, space } from '@/theme/colors';

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
      <View style={{ paddingTop: space['8'], paddingBottom: space['8'] }}>
        <AppText accessibilityRole="header" variant="display" style={{ marginBottom: space['6'] }}>
          Explore
        </AppText>

        <AppText variant="small" weight="semibold" style={{ marginBottom: space['2'] }}>
          Search interests
        </AppText>
        <TextInput
          accessibilityLabel="Search interests"
          autoCapitalize="none"
          autoCorrect={false}
          className="min-h-12 rounded-tile border border-input-border bg-surface px-4 text-base dark:border-dark-input-border dark:bg-dark-surface"
          onChangeText={setSearchText}
          placeholder="Try cooking, music, or outdoors"
          placeholderTextColor={colors.foregroundSecondary}
          returnKeyType="search"
          style={{ color: colors.foreground, fontFamily: 'HankenGrotesk_400Regular' }}
          value={searchText}
        />

        {!catalogue && status === 'error' ? (
          <View style={{ marginTop: space['6'] }}>
            <ErrorMessage
              title="We couldn't load interests."
              body="Check your connection, then try again."
              onAction={() => void loadCatalogue()}
            />
          </View>
        ) : !catalogue ? (
          <View style={{ marginTop: space['4'] }}>
            <LoadingMessage label="Gathering interests…" />
          </View>
        ) : (
          <>
            <AppText variant="small" weight="semibold" style={{ marginTop: space['6'], marginBottom: space['2'] }}>
              Browse by category
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -space.gutter }}
              contentContainerStyle={{ gap: space['2'], paddingBottom: space['1'], paddingHorizontal: space.gutter }}
              accessibilityLabel="Interest categories"
            >
              {categories.map((category) => {
                const selected = selectedCategory === category;
                return (
                  <PressableScale
                    key={category}
                    pressedScale={0.96}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${category}${selected ? ', selected' : ''}`}
                    onPress={() => setSelectedCategory(category)}
                    className={`min-h-12 justify-center rounded-full border px-4 ${
                      selected
                        ? 'border-accent bg-accent dark:border-dark-accent dark:bg-dark-accent'
                        : 'border-border bg-surface dark:border-dark-border dark:bg-dark-surface'
                    }`}
                  >
                    <AppText tone={selected ? 'onAccent' : 'primary'} variant="small" weight="medium">
                      {category}
                    </AppText>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <View
              className="flex-row items-center justify-between"
              style={{ marginTop: space['8'], marginBottom: space['3'] }}
            >
              <AppText accessibilityRole="header" variant="heading">
                {filteredInterests.length} {filteredInterests.length === 1 ? 'interest' : 'interests'}
              </AppText>
              {hasFilters ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Clear search and category filters"
                  onPress={() => {
                    setSearchText('');
                    setSelectedCategory(ALL_CATEGORIES);
                  }}
                  className="min-h-12 justify-center px-2"
                >
                  <AppText tone="accent" weight="semibold" style={{ textDecorationLine: 'underline' }}>
                    Clear filters
                  </AppText>
                </PressableScale>
              ) : null}
            </View>

            {filteredInterests.length > 0 ? (
              <View style={{ gap: space['3'] }}>
                {filteredInterests.map((interest) => (
                  <InterestCard
                    key={interest.id}
                    interest={interest}
                    onPress={() => router.push({ pathname: '/interest/[slug]', params: { slug: interest.slug } })}
                  />
                ))}
              </View>
            ) : catalogue.interests.length === 0 ? (
              <ErrorMessage
                title="No interests to show yet."
                body="New ones are on their way. Check back a little later."
                actionLabel="Check again"
                onAction={() => void loadCatalogue()}
                busy={status === 'loading'}
              />
            ) : (
              <View>
                <AppText weight="semibold">Nothing matches that.</AppText>
                <AppText tone="secondary" style={{ marginTop: space['1'] }}>
                  Try a different word, or clear the filters to see every interest.
                </AppText>
              </View>
            )}
          </>
        )}
      </View>
    </AppScreen>
  );
}
