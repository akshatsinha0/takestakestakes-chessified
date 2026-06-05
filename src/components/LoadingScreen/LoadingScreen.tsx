import { ChessPawn } from 'lucide-react'
import './LoadingScreen.css'

/*
(1.) A full-viewport loading state built around a single chess pawn mark, used wherever the app is
     waiting on a lazy route chunk or the initial authentication check. It is presentational only and
     holds no state, so it can be rendered from any suspense or gating boundary as a drop-in fallback.
(2.) The composition layers three independently rotating dashed contours and two counter-rotating
     light streaks behind the pawn, each on its own duration and direction, so the overlapping cycles
     never visibly repeat in lockstep and the mark reads as continuously alive rather than looping.
(3.) The pawn scales and brightens on a slow pulse while the whole emblem performs a one-time scale
     and unblur entrance, which gives a deliberate reveal on first paint without delaying interaction,
     since the animation is purely decorative and the underlying load proceeds independently.
(4.) A reduced-motion media query collapses every animation for users who request it, and all color,
     glow, and border values resolve from the shared theme tokens, so the screen restyles with a brand
     change and never carries a literal color of its own.

This component is the single waiting surface for the application. Centralizing it means every boundary
that can suspend shows the same identity instead of an ad hoc spinner, and expressing the motion in CSS
keyframes driven by theme tokens keeps it dependency-light and consistent with the rest of the system.
*/

const DEFAULT_CAPTION = 'Setting the board'

const LoadingScreen = ({ caption = DEFAULT_CAPTION }: { caption?: string }) => (
  <div className='loading-stage'>
    <div className='loading-emblem'>
      <span className='loading-contour contour-outer' aria-hidden='true' />
      <span className='loading-contour contour-mid' aria-hidden='true' />
      <span className='loading-contour contour-inner' aria-hidden='true' />
      <span className='loading-streak streak-a' aria-hidden='true' />
      <span className='loading-streak streak-b' aria-hidden='true' />
      <ChessPawn className='loading-pawn' size={64} aria-hidden='true' />
    </div>
    <output className='loading-caption'>{caption}</output>
  </div>
)

export default LoadingScreen
