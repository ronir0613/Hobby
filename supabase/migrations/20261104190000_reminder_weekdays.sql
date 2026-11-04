-- Reminder days (step 9). One set of days shared by the morning and evening reminders.
-- ISO weekdays: 1 = Monday … 7 = Sunday. Defaults to every day; at least one day.

alter table public.notification_preferences
  add column weekdays smallint[] not null default '{1,2,3,4,5,6,7}'
    constraint notification_preferences_weekdays_valid check (
      cardinality(weekdays) between 1 and 7
      and weekdays <@ '{1,2,3,4,5,6,7}'::smallint[]
    );

grant insert (weekdays), update (weekdays) on public.notification_preferences to authenticated;
