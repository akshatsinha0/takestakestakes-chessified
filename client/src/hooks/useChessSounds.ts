import { useEffect } from 'react';

const soundFiles = {
  move: '/assets/Sounds/piece-movement.mp3',
  capture: '/assets/Sounds/capture.mp3',
  castle: '/assets/Sounds/castle.mp3',
  check: '/assets/Sounds/move-check.mp3'
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
