# Visual foundation

The app uses a custom, quiet visual system: warm paper surfaces, botanical green accents, generous space, rounded cards, and Hanken Grotesk. There are no progress streaks, productivity scores, gradients, or social counters.

## Shared tokens

`src/theme/tokens.json` is the source of truth for light and dark colors. `src/theme/colors.ts` exposes the typed palettes to React Native; `tailwind.config.js` maps the same values to NativeWind utility classes. Light text and controls use a tested high-contrast palette, with a system dark-mode counterpart.

## Interface decisions

- The four primary tabs are Discover, Explore, Media, and Profile.
- Explore reads the catalogue (categories, interests, starter ideas) from Supabase, with a loading line, a muted error box with "Try again", and an empty state. Search and category chips filter the loaded catalogue. Discover still shows local starter content, but its cards open the same live detail screen (local ids match catalogue slugs).
- Tapping an interest card opens its detail screen (category, name, description, hobby/habit label, first small step, "Try this"). "Try this" adds a planned attempt; there is one per interest, so if it is already in My hobbies the button reads "Open in My hobbies", and a completed or dropped one offers "Give it another go" (back to planned, history kept, a new go starts with the next check-in). Signed-out users are sent to sign-in first and brought back to the interest afterwards. Success uses the soft green notice box.
- Profile (signed in) starts with "My hobbies": a card per attempt with the interest name, a status pill (Active: accent-soft with accent text; Planned and Dropped: muted; Completed: soft green) and the latest check-in. A card opens the attempt screen: "How did today go?" is a Tried / Skipped segmented control for today only (switchable until midnight); "Your days" lists past answers read-only; "Where is it at?" is a read-only list of the four statuses with how each is reached, the current one marked. Status follows the answers: 7 tried days completes it ("You gave this a real go."), two skipped days in a row drops it ("Maybe it wasn't your thing. That's okay." with "Give it another go" and "Find something new"). Signed-out users opening an attempt get a sign-in prompt that returns them to it.
- Media explains which later-phase capabilities are not connected yet. Profile shows the signed-in account (sign out, delete account with confirmation) or a sign-in prompt; browsing never requires an account.
- The tab bar pairs text labels with `expo-symbols` icons (Material Symbols on Android: spa, search, photo_library, person). The active tab is marked by the accent colour. Buttons, chips, and filter controls have a 48dp minimum target height.
- Sign-in is a full screen opened from Profile: Google first, then email and password with a sign-in / create-account switch. Errors use plain, non-blaming copy in a muted box; there is no separate danger colour yet.
- System font scaling remains enabled, page titles expose heading roles, and input and category controls have accessibility labels and states.
- The search field boundary keeps at least 3:1 contrast against its surface, and the active tab label at least 4.5:1, in both themes; those ratios are covered by a small token test.
