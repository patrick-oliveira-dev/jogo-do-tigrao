import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

const SOUNDS = {
  WIN: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
  LOSS: 'https://assets.mixkit.co/active_storage/sfx/2030/2030-preview.mp3',
  DICE: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
};

export async function playSound(key) {
  try {
    console.log(`[SoundService] Solicitando som e háptico: ${key}`);
    
    // Gatilho Háptico baseado na ação
    if (key === 'WIN') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (key === 'LOSS') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (key === 'CLICK') Haptics.selectionAsync();
    if (key === 'DICE') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { sound } = await Audio.Sound.createAsync({ uri: SOUNDS[key] });
    await sound.playAsync();

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (e) {
    console.log(`[SoundService] Erro ao tocar som [${key}]:`, e);
  }
}

export function triggerHaptic(type = 'LIGHT') {
  try {
    if (type === 'LIGHT') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === 'MEDIUM') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (type === 'HEAVY') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (type === 'SUCCESS') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {}
}
