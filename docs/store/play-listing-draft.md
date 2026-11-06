# Google Play text (draft)

Nothing here has been sent to Google Play.

## Store listing

**App name:** Hobby

**Short description (80 characters at most):**

Find a hobby you'll enjoy and take the first small step today.

**Full description (4000 characters at most):**

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

## Data safety answers

| Question | Answer |
| --- | --- |
| Does the app collect or share required user data types? | Yes, it collects data. It doesn't share any |
| Is all collected data encrypted in transit? | Yes |
| Can users ask for their data to be deleted? | Yes (in the app, and through the web page) |
| Account creation methods | Username and password; OAuth (Google); the app can also be used without an account |
| Account deletion URL | The privacy page, "How to delete your account and data" section |

Service providers (Supabase, Google sign-in, Expo) don't count as sharing under Play's definition, so "shared" is No for every row.

| Data type | Collected | Required or optional | Purpose |
| --- | --- | --- | --- |
| Personal info: Email address | Yes | Optional | Account management |
| Personal info: Name | Yes (Google sign-in only) | Optional | Account management |
| Personal info: User IDs | Yes | Optional | Account management |
| Photos and videos: Photos | Yes | Optional | App functionality |
| App activity: In-app actions (hobbies tried, check-ins) | Yes | Optional | App functionality |
| App activity: Other user-generated content (notes) | Yes | Optional | App functionality |
| App activity: Other actions (quiz answers, reminder times and days) | Yes | Optional | App functionality, personalization |
| Device or other IDs (random install ID for updates) | Yes | Required | App functionality |

Everything is "Optional" because the app works without signing in, except the update ID, which is sent whoever is using the app.

Not collected: location, contacts, financial info, health and fitness, messages, audio, files, calendar, web browsing, crash logs and diagnostics.

### Worth a second look

1. **Name and profile picture link.** The spec lists only email for Google sign-in, but Google also sends these and Supabase stores them (`auth.users` metadata holds `full_name`, `name` and `avatar_url`). Both are declared here. The picture link is in the privacy policy and has no Data safety row of its own, since no picture is stored.
2. **Install ID.** expo-updates sends an `EAS-Client-ID` header to Expo on each update check. "Device or other IDs" is the cautious answer. The other reading is that it isn't personal data. I recommend declaring it, since declaring too much costs nothing and an omission can draw a policy flag.
3. **Time zone** sits with reminder settings under "Other actions". It isn't declared as location.
4. **Android backup.** `allowBackup` is on, but the backup rules (from expo-secure-store's plugin, read from the APK) include only shared preferences, so guest data, guest photos and the session aren't backed up. Nothing to declare; the policy now says so. A real restore hasn't been tried.

## For the Play Console steps later

- Category: Lifestyle. Price: free. Ads: no.
- Target audience: not for children. The policy says under 13; the exact age bands are chosen in the Console.
- Graphics still to make: 512 px icon, 1024×500 feature graphic, at least 2 phone screenshots.
