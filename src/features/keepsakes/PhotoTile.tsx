import { router } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import type { MediaAsset } from '@/services/media';
import { useKeepsakesStore } from './keepsakes-store';

/** A square thumbnail that opens the photo full screen. */
export function PhotoTile({ photo, size, label }: { photo: MediaAsset; size: number; label: string }) {
  const url = useKeepsakesStore((state) => state.urls[photo.storage_path]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Opens the photo"
      onPress={() => router.push({ pathname: '/photo/[id]', params: { id: photo.id } })}
      style={({ pressed }) => ({ width: size, height: size, opacity: pressed ? 0.84 : 1 })}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: 16 }} resizeMode="cover" />
      ) : (
        <View
          style={{ width: size, height: size }}
          className="rounded-2xl border border-border bg-muted dark:border-dark-border dark:bg-dark-muted"
        />
      )}
    </Pressable>
  );
}
