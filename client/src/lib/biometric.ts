import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();

export async function isBiometricAvailable(): Promise<boolean> {
  if (!native) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/** Pide huella/rostro. Devuelve true si el usuario se verificó
 *  correctamente, false si canceló o falló. */
export async function verifyBiometric(): Promise<boolean> {
  if (!native) return true;
  try {
    await NativeBiometric.verifyIdentity({
      title: 'Life OS',
      subtitle: 'Desbloquea tu panel personal',
      reason: 'Confirma tu identidad para continuar',
    });
    return true;
  } catch {
    return false;
  }
}
