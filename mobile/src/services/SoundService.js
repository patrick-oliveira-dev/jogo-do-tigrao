import { Audio } from 'expo-av';

const SOUNDS = {
  WIN: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
  LOSS: 'https://assets.mixkit.co/active_storage/sfx/2030/2030-preview.mp3',
  DICE: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'
};

export async function playSound(key) {
  try {
    console.log(`[SoundService] Solicitando som: ${key}`);
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
