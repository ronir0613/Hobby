# Play Console walkthrough

Nothing here has been sent to Google Play. Work top to bottom. If Play asks something this page doesn't cover, stop and ask rather than guessing. Menu names can differ slightly from what's written here.

## 1. Create the app

Play Console → Home → **Create app**.

| Field | Answer |
| --- | --- |
| App name | `Hobby` |
| Package name, if asked | `com.hobbydiscovery.app` |
| Default language | English (United States) |
| App or game | App |
| Free or paid | Free (this can't be changed to paid later) |
| Contact email | `curatedclass13@gmail.com` |
| Declarations | Read and accept these yourself |

## 2. App content

Find these under **Policy and programs → App content**, or through the dashboard's setup list.

### Privacy policy

`https://ronir0613.github.io/Hobby/privacy/`

### Ads

No, the app doesn't contain ads.

### App access

All functionality is available without special access. The whole app works without signing in, and anyone can create an account.

### Advertising ID

No. Checked in the .aab: there is no `AD_ID` permission.

### Other declarations

Answer no or none to each one that appears: government app, financial features, health features, news app.

### Permissions

Play shouldn't ask for a permissions declaration. The .aab has no exact-alarm, foreground-service, background-location, `READ_MEDIA_*` or SMS/call-log permissions. If Play does ask, stop and tell me.

### Content rating

Email: `curatedclass13@gmail.com`. Category: the one covering utility, productivity or other apps, since Hobby is neither a game nor a social app.

| Question is about | Answer | Why |
| --- | --- | --- |
| Violence, blood | No | |
| Sexual content, nudity | No | |
| Bad language, crude humour | No | |
| Drugs, alcohol, tobacco | No | I searched the catalogue. "Fermenting" means food such as carrot kanji |
| Gambling, simulated gambling | No | |
| Users can talk to or share content with each other | No | Notes and photos are private to the person |
| Shares the user's location | No | |
| Digital purchases | No | |
| Unrestricted web browsing inside the app | No | Guide links open in the phone's own browser |

Accept whichever rating Play gives. If it asks about dangerous activities or weapons, tell me: a few hobbies mention craft knives or saws, each with a safety note.

### Target audience

**Your decision:** tick **13–15, 16–17 and 18+**, or only **18+**.

- **13 and over (my recommendation):** this matches the privacy policy, which says the app isn't for children under 13. Teenagers can use it, and Play may look at the app a little more closely because of them.
- **18+ only:** this is the strictest reading of "not for children", but it excludes teenagers and differs from the policy, so the policy would need changing to match.

If asked whether the app appeals to children under 13, answer **No**. If it wants a reason, paste this:

> Hobby helps adults and teenagers find a new pastime, with practical steps, costs and safety notes. It has no games, characters or content made for children, and its privacy policy says it isn't meant for children under 13.

### Data safety

**Overview**

| Question | Answer |
| --- | --- |
| Collects or shares required user data types? | Yes |
| All collected data encrypted in transit? | Yes |
| Account creation methods | Username and password; OAuth (Google) |
| Delete account URL | `https://ronir0613.github.io/Hobby/privacy/#delete` |
| Can people ask for data to be deleted without deleting their account? | Yes |

The last row is Yes because notes and photos can each be deleted in the app while the account stays. If Play's wording seems to require something more, tell me.

**Data types.** For every row: collected **Yes**, shared **No**, processed ephemerally **No**.

| Data type | Required or optional | Purpose |
| --- | --- | --- |
| Personal info → Email address | Optional | Account management |
| Personal info → Name | Optional | Account management |
| Personal info → User IDs | Optional | Account management |
| Photos and videos → Photos | Optional | App functionality |
| App activity → In-app actions | Optional | App functionality |
| App activity → Other user-generated content | Optional | App functionality |
| App activity → Other actions | Optional | App functionality, Personalization |
| Device or other IDs | Required | App functionality |

Leave everything else undeclared: location, contacts, financial info, health and fitness, messages, audio, files, calendar, web browsing, crash logs and diagnostics.

These answers use my defaults for the four "Worth a second look" items in `play-listing-draft.md`: Name and Device IDs are declared, while time zone and Android backup are not. Tell me if you decided differently.

## 3. Store settings

**Grow users → Store presence → Store settings**, or the dashboard's link.

| Field | Answer |
| --- | --- |
| App or game | App |
| Category | Lifestyle |
| Tags | Optional, skip them |
| Email | `curatedclass13@gmail.com` |
| Phone | Blank |
| Website | Blank for now. Add it once the home page is live |

## 4. Store listing

**Grow users → Store presence → Main store listing**.

**App name**

```text
Hobby
```

**Short description**

```text
Find a hobby you'll enjoy and take the first small step today.
```

**Full description**

```text
Want to try something new but don't know where to start? Hobby suggests something that suits you and tells you exactly what to do first.

Answer five quick questions about how you want it to feel, indoors or out, on your own or with others, and how much time and money you want to spend. Or skip them and browse.

WHAT YOU GET

• 100 hobbies in 15 categories, from arts and crafts to the outdoors
• 300 starter ideas with direct steps, easiest first
• What you'll need, how long it takes and roughly what it costs
• Links to good guides, and safety notes where a hobby needs them

TRY IT, THEN SEE HOW IT GOES

Pick a hobby and answer one question each day: did you try it or skip it? Seven tried days completes it. Two skipped days in a row drops it, and that's fine. You can give it another go or find something new. There are no streaks and no scores.

KEEP WHAT YOU MAKE

Add notes and photos to each hobby. Media keeps them together in one place.

GENTLE REMINDERS

Choose a morning nudge, an evening check-in or both, on the days you pick. Reminders are off until you turn them on.

YOUR DATA

No account needed: everything can stay on your phone. Sign in with Google or email to back it up and sync it. You can delete your account and everything in it from the app.

No ads. No analytics. Free.
```

**Graphics**, in `docs/store/graphics/`. Upload these only after you've approved them. Alt text is pasted where Play offers it.

| Slot | File | Alt text |
| --- | --- | --- |
| App icon | `icon-512.png` | Hobby logo in cream script on a green background |
| Feature graphic | `feature-1024x500.png` | The Hobby logo beside drawings of nine hobbies, including guitar, bread baking, chess and kite flying |
| Phone screenshot 1 | `screenshot-1-discover.png` | Discover screen suggesting journaling for someone wanting a creative, indoor hobby |
| Phone screenshot 2 | `screenshot-2-steps.png` | Numbered first steps for growing herbs in a pot, with a Try this button |
| Phone screenshot 3 | `screenshot-3-checkin.png` | Daily check-in with Tried and Skipped buttons, above a field for notes and a saved note |
| Phone screenshot 4 | `screenshot-4-explore.png` | Explore screen with search, category filters and a list of 100 hobbies |

## 5. Upload to internal testing

Hold this until you've given the go-ahead for step 3 of the work.

**By hand (my recommendation)**

1. **Test and release → Testing → Internal testing → Testers:** create an email list with your own Google account, and copy the join link.
2. **Create new release.** If asked about signing, use **Play App Signing with a Google-generated key**. Don't upload your own key.
3. Upload the bundle (details below). Play should read version `1.0.0`, versionCode `2`.
4. Release name: `2 (1.0.0)`. Release notes:

   ```text
   First test build.
   ```

5. **Save as draft** if you want to stop here, or review and roll out to reach your tester list. Rolling out to internal testing doesn't publish the app publicly.

| Bundle | Detail |
| --- | --- |
| EAS build | `c4c6337a-ecfa-427e-9492-daa42506c87a` |
| Download | https://expo.dev/artifacts/eas/C_W20oQAi3OiNQMysSfHqRt25OIzVJ_BNUy8wjKCII8.aab (expires 2026-12-06) |
| SHA-256 | `0d05dc349e447782191b407b8edf9c35507a4bf93704b5dcebc8838973b37ec4` |

**With `eas submit` instead.** This needs a Google service account key and a change to `eas.json` (`releaseStatus: "draft"`). It only saves time once you're uploading often, so it isn't worth setting up for one build.

## 6. Next

Once the bundle is on the track, open **Test and release → Setup → App signing** (App integrity) and send me the **App signing key certificate** SHA-1. It is a different key from the upload key `17:1C:F4:84…`. I'll then tell you exactly what to add in Google Cloud and Supabase.
