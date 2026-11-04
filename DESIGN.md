# Visual foundation

The app uses a custom, quiet visual system: warm paper surfaces, botanical green accents, generous space, rounded cards, and Hanken Grotesk. There are no progress streaks, productivity scores, gradients, or social counters.

## Shared tokens

`src/theme/tokens.json` is the source of truth for light and dark colors. `src/theme/colors.ts` exposes the typed palettes to React Native; `tailwind.config.js` maps the same values to NativeWind utility classes. Light text and controls use a tested high-contrast palette, with a system dark-mode counterpart.

## Interface decisions

- The four primary tabs are Discover, Explore, Media, and Profile.
- Search and category chips work against local starter content. The screen labels this content as local so it does not imply a connected catalogue.
- Media explains which later-phase capabilities are not connected yet. Profile shows the signed-in account (sign out, delete account with confirmation) or a sign-in prompt; browsing never requires an account.
- The tab bar pairs text labels with `expo-symbols` icons (Material Symbols on Android: spa, search, photo_library, person). The active tab is marked by the accent colour. Buttons, chips, and filter controls have a 48dp minimum target height.
- Sign-in is a full screen opened from Profile: Google first, then email and password with a sign-in / create-account switch. Errors use plain, non-blaming copy in a muted box; there is no separate danger colour yet.
- System font scaling remains enabled, page titles expose heading roles, and input and category controls have accessibility labels and states.
- The search field boundary keeps at least 3:1 contrast against its surface, and the active tab label at least 4.5:1, in both themes; those ratios are covered by a small token test.
