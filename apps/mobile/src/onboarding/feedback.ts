import { Platform, Vibration } from 'react-native';

export type HapticIntent =
  | 'selection'
  | 'impact-light'
  | 'impact-medium'
  | 'success'
  | 'warning'
  | 'error';

let hapticsModule: typeof import('expo-haptics') | null | undefined;

async function getHapticsModule() {
  if (hapticsModule !== undefined) return hapticsModule;
  try {
    hapticsModule = await import('expo-haptics');
  } catch {
    hapticsModule = null;
  }
  return hapticsModule;
}

function fallbackVibrate(intent: HapticIntent) {
  if (Platform.OS === 'web') return;
  if (intent === 'warning' || intent === 'error') {
    Vibration.vibrate(24);
    return;
  }
  Vibration.vibrate(10);
}

export async function triggerHaptic(intent: HapticIntent) {
  try {
    const Haptics = await getHapticsModule();
    if (!Haptics) {
      fallbackVibrate(intent);
      return;
    }

    switch (intent) {
      case 'selection':
        await Haptics.selectionAsync();
        break;
      case 'impact-light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'impact-medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        break;
    }
  } catch {
    fallbackVibrate(intent);
  }
}
