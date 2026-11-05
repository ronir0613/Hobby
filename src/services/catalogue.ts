import { supabase } from '@/lib/supabase/client';
import { toCatalogue, type Catalogue } from '@/features/explore/catalogue-model';

/** Published categories, interests (with guide and quiz tags) and starter ideas. RLS returns only published rows. */
export async function fetchCatalogue(): Promise<Catalogue> {
  const [categories, interests] = await Promise.all([
    supabase.from('categories').select('id, slug, name, sort_order'),
    supabase
      .from('interests')
      .select(
        'id, slug, name, description, type, needs, setting, social, session_minutes, cost, moods, category:categories(id, slug, name, sort_order), starter_ideas(id, title, estimated_minutes, sort_order, difficulty, instructions)',
      ),
  ]);
  if (categories.error) throw categories.error;
  if (interests.error) throw interests.error;
  return toCatalogue(categories.data, interests.data);
}
