import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export interface MediaPickOptions {
  aspect?: [number, number];
  quality?: number;
  allowsEditing?: boolean;
}

function assetToDataUri(asset: ImagePicker.ImagePickerAsset): string | null {
  if (asset.base64) {
    return `data:image/jpeg;base64,${asset.base64}`;
  }
  return asset.uri || null;
}

/**
 * Pick an image from device gallery and return a compact base64 data URI
 * so it can sync seamlessly between both partner devices.
 */
export async function pickImageFromGallery(
  options: MediaPickOptions = {}
): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Izin Galeri Diperlukan',
          'Aktifkan izin akses foto/galeri untuk MochiDuo di Pengaturan HP ya.'
        );
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect,
      quality: options.quality ?? 0.35,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToDataUri(result.assets[0]);
  } catch {
    Alert.alert('Gagal Membuka Galeri', 'Coba ulangi memilih foto dari galeri.');
    return null;
  }
}

/**
 * Open the device camera directly to snap a photo and return a compact base64 data URI.
 */
export async function takePhotoWithCamera(
  options: MediaPickOptions = {}
): Promise<string | null> {
  try {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Izin Kamera Diperlukan',
          'Aktifkan izin kamera untuk MochiDuo di Pengaturan HP supaya bisa foto langsung.'
        );
        return null;
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: options.allowsEditing ?? true,
      aspect: options.aspect,
      quality: options.quality ?? 0.35,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) return null;
    return assetToDataUri(result.assets[0]);
  } catch {
    Alert.alert(
      'Gagal Membuka Kamera',
      'Pastikan izin kamera sudah aktif dan tidak sedang dipakai aplikasi lain.'
    );
    return null;
  }
}
