import { useCatalogueStore } from '@/features/explore/catalogue-store';
import type { Attempt } from '@/services/attempts';

/** The interest's name from the catalogue, or the attempt's own title. */
export function useAttemptTitle(attempt: Pick<Attempt, 'interest_id' | 'custom_title'> | undefined) {
  const name = useCatalogueStore((state) =>
    attempt?.interest_id ? state.catalogue?.interests.find((i) => i.id === attempt.interest_id)?.name : undefined,
  );
  const hasCatalogue = useCatalogueStore((state) => state.catalogue !== null);
  if (!attempt) return '';
  return attempt.custom_title?.trim() || name || (hasCatalogue ? 'A hobby' : '…');
}
