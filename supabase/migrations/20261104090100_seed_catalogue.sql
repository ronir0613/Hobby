-- Starter catalogue, mirrored from src/data/interest-catalog.ts.
-- Slugs match the app's local interest ids so the two can be joined.
-- Safe to re-run.

insert into public.categories (name, slug, sort_order, is_published) values
  ('Arts & Crafts',        'arts-crafts',          1, true),
  ('Music',                'music',                2, true),
  ('Outdoors & Nature',    'outdoors-nature',      3, true),
  ('Cooking & Food',       'cooking-food',         4, true),
  ('Home & Garden',        'home-garden',          5, true),
  ('Fitness & Movement',   'fitness-movement',     6, true),
  ('Mindfulness',          'mindfulness',          7, true),
  ('Learning & Culture',   'learning-culture',     8, true),
  ('Travel & Exploration', 'travel-exploration',   9, true)
on conflict (slug) do nothing;

insert into public.interests (category_id, name, slug, description, type, is_published)
select c.id, v.name, v.slug, v.description, v.type, true
from (values
  ('arts-crafts',        'Photography', 'photography', 'Notice light and small details in familiar places.',      'hobby'),
  ('arts-crafts',        'Drawing',     'drawing',     'Make a quick sketch of one everyday object.',             'hobby'),
  ('music',              'Guitar',      'guitar',      'Get to know a few chords at your own pace.',              'hobby'),
  ('cooking-food',       'Cooking',     'cooking',     'Try one new ingredient in a familiar meal.',              'both'),
  ('home-garden',        'Gardening',   'gardening',   'Grow something small and watch it change.',               'both'),
  ('fitness-movement',   'Cycling',     'cycling',     'Take a familiar route at an unhurried pace.',             'both'),
  ('mindfulness',        'Meditation',  'meditation',  'Take a quiet pause and notice your breathing.',           'habit'),
  ('learning-culture',   'Reading',     'reading',     'Spend a little time with a subject that interests you.',  'both'),
  ('travel-exploration', 'City walks',  'city-walks',  'See a nearby place from a different direction.',          'both')
) as v(category_slug, name, slug, description, type)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

insert into public.starter_ideas (interest_id, title, estimated_minutes, sort_order, is_published)
select i.id, v.title, v.minutes, 1, true
from (values
  ('photography', 'Photograph a reflection you pass today.',            20),
  ('drawing',     'Sketch a cup, plant, or window nearby.',             15),
  ('guitar',      'Try two chords and notice how they sound together.', 20),
  ('cooking',     'Choose a seasonal vegetable and build dinner around it.', 30),
  ('gardening',   'Plant a few herb seeds in a pot.',                   15),
  ('cycling',     'Ride one street you have not explored yet.',         25),
  ('meditation',  'Sit comfortably and follow five slow breaths.',       5),
  ('reading',     'Read one short article or a few pages of a book.',   15),
  ('city-walks',  'Walk a route you usually travel by car or bus.',     20)
) as v(interest_slug, title, minutes)
join public.interests i on i.slug = v.interest_slug
where not exists (
  select 1 from public.starter_ideas s where s.interest_id = i.id and s.title = v.title
);
