import { useEffect } from 'react';

import moveSoundUrl from '../assets/Sounds/piece-movement.mp3';
import captureSoundUrl from '../assets/Sounds/capture.mp3';
import castleSoundUrl from '../assets/Sounds/castle.mp3';
import checkSoundUrl from '../assets/Sounds/move-check.mp3';

const soundFiles = {
  move: moveSoundUrl,
  capture: captureSoundUrl,
  castle: castleSoundUrl,
  check: checkSoundUrl
};

const useChessSounds = () => {
  const audioElements = {
    move: new Audio(soundFiles.move),
    capture: new Audio(soundFiles.capture),
    castle: new Audio(soundFiles.castle),
    check: new Audio(soundFiles.check)
  };

  // Preload sounds and set volume
  useEffect(() => {
    Object.values(audioElements).forEach(audio => {
      audio.volume = 0.3; // Adjust volume (0-1)
      audio.load();
    });
  }, []);

  const playSound = (type: keyof typeof audioElements) => {
    const audio = audioElements[type].cloneNode(true) as HTMLAudioElement;
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  return {
    playMove: () => playSound('move'),
    playCapture: () => playSound('capture'),
    playCastle: () => playSound('castle'),
    playCheck: () => playSound('check')
  };
};

export default useChessSounds;
