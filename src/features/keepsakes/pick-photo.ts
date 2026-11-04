import * as ImagePicker from 'expo-image-picker';

export type PickResult = { kind: 'picked'; uri: string } | { kind: 'canceled' } | { kind: 'camera-denied' };

/** Opens the camera (asking for permission the first time). */
export async function takePhoto(): Promise<PickResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { kind: 'camera-denied' };
  // Full quality here: the photo is compressed once, before upload.
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? { kind: 'picked', uri } : { kind: 'canceled' };
}

/** Opens the Android photo picker (no storage permission needed). */
export async function choosePhoto(): Promise<PickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const uri = result.canceled ? undefined : result.assets[0]?.uri;
  return uri ? { kind: 'picked', uri } : { kind: 'canceled' };
}
