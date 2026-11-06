import { router } from 'expo-router';
import { useCatalogueStore } from '@/features/explore/catalogue-store';
import { STATUS_LABELS } from '@/features/hobbies/hobbies-model';
import { useAttemptTitle } from '@/features/hobbies/use-attempt-title';
import type { Attempt } from '@/services/attempts';
import { latestCheckinLine, type Checkin } from '@/services/checkins';
import { radius } from '@/theme/colors';
import { HobbyArt } from './HobbyArt';
import { ListRow } from './ListGroup';
import { StatusPill } from './StatusPill';

/** A hobby as a row of the My hobbies list: its category art, name, latest check-in and status. */
export function AttemptCard({ attempt, checkins }: { attempt: Attempt; checkins: Checkin[] }) {
  const title = useAttemptTitle(attempt);
  const hobbySlug = useCatalogueStore((state) =>
    attempt.interest_id ? state.catalogue?.interests.find((i) => i.id === attempt.interest_id)?.slug : undefined,
  );
  const line = latestCheckinLine(checkins) ?? (attempt.status === 'planned' ? 'Not started yet' : null);

  return (
    <ListRow
      title={title}
      detail={line}
      chevron={false}
      onPress={() => router.push({ pathname: '/attempt/[id]', params: { id: attempt.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${STATUS_LABELS[attempt.status]}${line ? `, ${line}` : ''}`}
      accessibilityHint="Opens check-ins and status"
      leading={<HobbyArt slug={hobbySlug ?? ''} style={{ width: 48, height: 48, borderRadius: radius.tile - 4 }} />}
      trailing={<StatusPill status={attempt.status} />}
    />
  );
}
