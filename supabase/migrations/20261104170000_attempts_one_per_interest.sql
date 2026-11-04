-- One attempt per catalogue interest per user. Coming back to a hobby (after completing or
-- dropping it) moves the same attempt back to planned instead of starting a second one.
-- Custom attempts (no interest) are not limited.
create unique index attempts_one_per_interest
  on public.attempts (user_id, interest_id)
  where interest_id is not null;
