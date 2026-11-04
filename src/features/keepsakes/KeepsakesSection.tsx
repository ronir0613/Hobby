import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, View, useWindowDimensions } from 'react-native';
import { ActionButton } from '@/components/ActionButton';
import { AppText } from '@/components/AppText';
import { ErrorMessage, LoadingMessage } from '@/components/StatusMessage';
import { TextField } from '@/components/TextField';
import { dayLabel, toLocalDate } from '@/services/checkins';
import type { JournalEntry } from '@/services/journal';
import { keepsakeError } from './keepsakes-copy';
import { MAX_NOTE_LENGTH, cleanNote } from './keepsakes-model';
import { addNote, addPhoto, editNote, loadKeepsakes, removeNote, useKeepsakesStore } from './keepsakes-store';
import { PhotoTile } from './PhotoTile';
import { choosePhoto, takePhoto } from './pick-photo';

const GAP = 8;

export function createdLabel(createdAt: string) {
  return dayLabel(toLocalDate(new Date(createdAt)));
}

function ErrorLine({ message }: { message: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mt-3 rounded-2xl border border-input-border bg-muted p-4 dark:border-dark-input-border dark:bg-dark-muted"
    >
      <AppText accessibilityRole="alert" weight="medium" size={14}>
        {message}
      </AppText>
    </View>
  );
}

function NoteCard({ note }: { note: JournalEntry }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = createdLabel(note.created_at);

  async function save() {
    const content = cleanNote(draft);
    if (!content) return;
    setError(null);
    setBusy(true);
    try {
      await editNote(note.id, content);
      setEditing(false);
    } catch (e) {
      if (__DEV__) console.warn('Saving a note failed', e);
      setError(keepsakeError(e));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this note?', 'It will be removed for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setError(null);
          setBusy(true);
          try {
            await removeNote(note.id);
          } catch (e) {
            if (__DEV__) console.warn('Deleting a note failed', e);
            setError(keepsakeError(e, 'delete'));
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <View className="rounded-card border border-border bg-surface p-5 dark:border-dark-border dark:bg-dark-surface">
      <AppText tone="secondary" weight="medium" size={13}>
        {label}
      </AppText>
      {editing ? (
        <>
          <View className="mt-3">
            <TextField
              label="Edit note"
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={MAX_NOTE_LENGTH}
              autoFocus
            />
          </View>
          <View className="mt-3 flex-row gap-2.5">
            <ActionButton
              label={busy ? 'Saving…' : 'Save'}
              onPress={() => void save()}
              disabled={busy || !cleanNote(draft)}
              style={{ flex: 1 }}
            />
            <ActionButton
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setDraft(note.content);
                setEditing(false);
                setError(null);
              }}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </View>
        </>
      ) : (
        <>
          <AppText size={16} style={{ marginTop: 6 }}>
            {note.content}
          </AppText>
          <View className="mt-4 flex-row gap-2.5">
            <ActionButton
              label="Edit"
              variant="secondary"
              accessibilityLabel={`Edit note from ${label}`}
              onPress={() => {
                setDraft(note.content);
                setEditing(true);
              }}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <ActionButton
              label={busy ? 'Deleting…' : 'Delete'}
              variant="secondary"
              accessibilityLabel={`Delete note from ${label}`}
              onPress={confirmDelete}
              disabled={busy}
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}

/** Notes and photos for one attempt, on its screen. Signed-in only. */
export function KeepsakesSection({ attemptId }: { attemptId: string }) {
  const status = useKeepsakesStore((state) => state.status);
  const allNotes = useKeepsakesStore((state) => state.notes);
  const allPhotos = useKeepsakesStore((state) => state.photos);
  const notes = useMemo(() => allNotes.filter((n) => n.attempt_id === attemptId), [allNotes, attemptId]);
  const photos = useMemo(() => allPhotos.filter((p) => p.attempt_id === attemptId), [allPhotos, attemptId]);

  const [draft, setDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);

  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 44, 560);
  const tile = Math.floor((contentWidth - GAP * 2) / 3);

  useEffect(() => {
    void loadKeepsakes();
  }, []);

  async function saveNote() {
    const content = cleanNote(draft);
    if (!content) return;
    setNoteError(null);
    setSavingNote(true);
    try {
      await addNote(attemptId, content);
      setDraft('');
    } catch (e) {
      if (__DEV__) console.warn('Saving a note failed', e);
      setNoteError(keepsakeError(e));
    } finally {
      setSavingNote(false);
    }
  }

  async function pick(source: 'camera' | 'gallery') {
    setPhotoError(null);
    setCameraDenied(false);
    try {
      const result = source === 'camera' ? await takePhoto() : await choosePhoto();
      if (result.kind === 'camera-denied') {
        setCameraDenied(true);
        return;
      }
      if (result.kind !== 'picked') return;
      setUploading(true);
      await addPhoto(attemptId, result.uri);
    } catch (e) {
      if (__DEV__) console.warn('Adding a photo failed', e);
      setPhotoError(keepsakeError(e));
    } finally {
      setUploading(false);
    }
  }

  let body;
  if (status === 'error') {
    body = (
      <ErrorMessage
        title="We couldn't load your notes and photos."
        body="Check your connection, then try again."
        onAction={() => void loadKeepsakes()}
      />
    );
  } else if (status !== 'ready') {
    body = <LoadingMessage label="Loading notes and photos…" />;
  } else {
    body = (
      <>
        <View className="mt-4">
          <TextField
            label="New note"
            placeholder="What did you try? How did it feel?"
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={MAX_NOTE_LENGTH}
          />
        </View>
        <ActionButton
          label={savingNote ? 'Saving…' : 'Save note'}
          onPress={() => void saveNote()}
          disabled={savingNote || !cleanNote(draft)}
          style={{ marginTop: 12 }}
        />
        {noteError ? <ErrorLine message={noteError} /> : null}

        {notes.length > 0 ? (
          <View className="mt-5 gap-3">
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </View>
        ) : null}

        <AppText weight="semibold" size={16} style={{ marginTop: 24 }}>
          Photos
        </AppText>
        <View className="mt-3 gap-2.5">
          <ActionButton
            label="Take a photo"
            variant="secondary"
            onPress={() => void pick('camera')}
            disabled={uploading}
          />
          <ActionButton
            label="Choose from gallery"
            variant="secondary"
            onPress={() => void pick('gallery')}
            disabled={uploading}
          />
        </View>
        {uploading ? <LoadingMessage label="Saving your photo…" /> : null}
        {cameraDenied ? (
          <View className="mt-3">
            <ErrorMessage
              title="The camera is off for Hobby."
              body="Allow the camera for Hobby in your phone settings, or choose a photo from your gallery instead."
              actionLabel="Open phone settings"
              onAction={() => void Linking.openSettings()}
            />
          </View>
        ) : null}
        {photoError ? <ErrorLine message={photoError} /> : null}
        {photos.length > 0 ? (
          <View className="mt-4 flex-row flex-wrap" style={{ gap: GAP }}>
            {photos.map((photo) => (
              <PhotoTile key={photo.id} photo={photo} size={tile} label={`Photo from ${createdLabel(photo.created_at)}`} />
            ))}
          </View>
        ) : !uploading ? (
          <AppText tone="secondary" size={14} style={{ marginTop: 10 }}>
            No photos yet. Photos are shrunk a little before they’re saved.
          </AppText>
        ) : null}
      </>
    );
  }

  return (
    <>
      <AppText accessibilityRole="header" weight="semibold" size={18} style={{ marginTop: 28 }}>
        Notes and photos
      </AppText>
      <AppText tone="secondary" size={14} style={{ marginTop: 2 }}>
        Only you can see these.
      </AppText>
      {body}
    </>
  );
}
