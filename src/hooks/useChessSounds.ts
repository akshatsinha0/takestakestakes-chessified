import { useEffect, useRef } from 'react'

import moveSoundUrl from '../assets/Sounds/piece-movement.mp3'
import captureSoundUrl from '../assets/Sounds/capture.mp3'
import castleSoundUrl from '../assets/Sounds/castle.mp3'
import checkSoundUrl from '../assets/Sounds/move-check.mp3'

/*
(1.) Provides the four chess move cues (move, capture, castle, check) as imperative play functions
     plus `playForSan`, a single dispatcher that picks the correct cue from a move's SAN. Local play
     calls the typed functions because it holds the chess.js result object; the online board only has
     the SAN string from the reactive query, so it calls `playForSan`, which keeps both surfaces on the
     same sound set without either duplicating the decode-to-sound rules.
(2.) The four `Audio` elements are constructed once and held in a ref, not rebuilt every render, so the
     mp3s decode a single time per mount and rapid moves do not allocate a fresh element each render.
     Each play clones its base element so overlapping moves can sound concurrently without cutting one
     another off, and a failed `play()` (autoplay still locked before the first gesture) is swallowed.
(3.) `playForSan` prioritizes check over capture over castle over a plain move, because a move can be
     several at once (a capture that gives check), and the check cue is the most informative, so it is
     the one that sounds.

This hook is the single place audio is wired, so volume and the SAN-to-cue mapping live here once
rather than being restated by each board. Centralizing the mapping is what lets the online board play a
sound for the opponent's move, which arrives only as SAN through the reactive game query.
*/

const SOUND_VOLUME = 0.3

const soundFiles = {
  move: moveSoundUrl,
  capture: captureSoundUrl,
  castle: castleSoundUrl,
  check: checkSoundUrl,
}

type SoundType = keyof typeof soundFiles

const useChessSounds = () => {
  const audioRef = useRef<Record<SoundType, HTMLAudioElement> | null>(null)
  if (audioRef.current === null) {
    audioRef.current = {
      move: new Audio(soundFiles.move),
      capture: new Audio(soundFiles.capture),
      castle: new Audio(soundFiles.castle),
      check: new Audio(soundFiles.check),
    }
  }

  useEffect(() => {
    const elements = audioRef.current
    if (elements === null) {
      return
    }
    Object.values(elements).forEach((audio) => {
      audio.volume = SOUND_VOLUME
      audio.load()
    })
  }, [])

  const playSound = (type: SoundType) => {
    const base = audioRef.current?.[type]
    if (base === undefined) {
      return
    }
    const audio = base.cloneNode(true) as HTMLAudioElement
    audio.volume = SOUND_VOLUME
    audio.play().catch(() => {})
  }

  const playForSan = (san: string) => {
    if (san.includes('+') || san.includes('#')) {
      playSound('check')
    } else if (san.includes('O-O')) {
      playSound('castle')
    } else if (san.includes('x')) {
      playSound('capture')
    } else {
      playSound('move')
    }
  }

  return {
    playMove: () => playSound('move'),
    playCapture: () => playSound('capture'),
    playCastle: () => playSound('castle'),
    playCheck: () => playSound('check'),
    playForSan,
  }
}

export default useChessSounds
